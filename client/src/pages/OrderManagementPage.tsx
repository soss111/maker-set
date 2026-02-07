import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useRole } from '../contexts/RoleContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrderNotification } from '../contexts/OrderNotificationContext';
import PackingList from '../components/PackingList';
import InvoiceGenerator from '../components/InvoiceGenerator';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CompletedIcon,
  CheckCircle,
  Pending as PendingIcon,
  Cancel as CancelledIcon,
  Print as PrintIcon,
  Receipt as InvoiceIcon,
  Payment as PaymentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { setsApi, ordersApi, Set as SetType, Order } from '../services/api';
import { pdfTemplateService, InvoiceData } from '../services/pdfTemplateService';

interface FormOrderItem {
  item_id: number;
  set_id: number;
  set_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

/** Order status values allowed by the order-status Select (backend may still return legacy 'pending'). */
const ORDER_STATUS_SELECT_VALUES = ['pending_payment', 'payment_received', 'shipped', 'delivered', 'cancelled'] as const;
function orderStatusForSelect(status: string | undefined): string {
  if (!status) return 'pending_payment';
  if (ORDER_STATUS_SELECT_VALUES.includes(status as any)) return status;
  if (status === 'pending') return 'pending_payment';
  return 'pending_payment';
}

const OrderManagementPage: React.FC = () => {
  const { t } = useLanguage();
  const { isAdmin, isProduction } = useRole();
  const { user } = useAuth();
  const { refreshOrderCount } = useOrderNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    customer_first_name: '',
    customer_last_name: '',
    customer_email: '',
    company_name: '',
    status: 'pending_payment',
    shipping_address: '',
    notes: '',
  });

  const [sets, setSets] = useState<SetType[]>([]);
  const [orderItems, setOrderItems] = useState<FormOrderItem[]>([]);
  const [packingListOpen, setPackingListOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Determine view mode based on user role
  const getViewMode = () => {
    if (isAdmin) return 'admin'; // Show all orders
    if (isProduction) return 'production'; // Show open orders
    if (user?.role === 'customer') return 'customer'; // Show only customer's orders
    if (user?.role === 'provider') return 'provider'; // Show provider's orders
    return 'public'; // Default fallback
  };

  const currentViewMode = getViewMode();

  // Get page title and subtitle based on role
  const getPageInfo = () => {
    switch (currentViewMode) {
      case 'customer':
        return {
          title: 'My Orders',
          subtitle: 'View and track your order history'
        };
      case 'production':
        return {
          title: 'Production Orders',
          subtitle: 'Manage open orders in production'
        };
      case 'admin':
        return {
          title: 'Order Management',
          subtitle: 'Manage all orders and customers'
        };
      case 'provider':
        return {
          title: 'My Orders',
          subtitle: 'Manage orders for your sets'
        };
      default:
        return {
          title: 'Orders',
          subtitle: 'View orders'
        };
    }
  };

  const pageInfo = getPageInfo();

  useEffect(() => {
    fetchOrders();
    fetchSets();
  }, []);

  // Validate filterStatus when view mode changes (must match MenuItem values)
  // '' = "All Orders" (MUI Select requires value to match a MenuItem; we use '' not 'all')
  useEffect(() => {
    if (currentViewMode) {
      const validValues = currentViewMode === 'production'
        ? ['', 'pending_payment', 'payment_received', 'shipped']
        : currentViewMode === 'admin'
        ? ['', 'pending_payment', 'payment_received', 'shipped', 'delivered', 'cancelled']
        : [''];
      if (!validValues.includes(filterStatus)) {
        setFilterStatus('');
      }
    }
  }, [currentViewMode, filterStatus]);

  // Refetch orders when filters change
  useEffect(() => {
    fetchOrders();
  }, [filterStatus, sortBy, sortOrder, currentViewMode]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Build query parameters based on user role
      const params: any = {
        language: 'en',
        sort_by: sortBy === 'date' ? 'created_at' : sortBy === 'amount' ? 'total_amount' : 'status',
        sort_order: sortOrder
      };

      // Role-based filtering
      switch (currentViewMode) {
        case 'customer':
          // Customer: Show only their own orders
          params.customer_id = user?.user_id;
          break;
        case 'production':
          // Production: Show only open orders (pending, confirmed, processing)
          params.status = (filterStatus === '' || filterStatus === 'all') ? 'open' : filterStatus;
          break;
        case 'admin':
          // Admin: Show all orders, but can filter by status
          if (filterStatus !== '' && filterStatus !== 'all') {
            params.status = filterStatus;
          }
          break;
        case 'provider':
          // Provider: Show orders containing their sets
          params.provider_id = user?.user_id;
          if (filterStatus !== '' && filterStatus !== 'all') {
            params.status = filterStatus;
          }
          break;
        default:
          // Public: Show no orders or limited view
          break;
      }

      const response = await ordersApi.getAll(params);
      setOrders(response.data.orders);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSets = async () => {
    try {
      console.log('Fetching sets for order management...');
      const response = await setsApi.getAll();
      console.log('Sets API response:', response);
      console.log('Sets data:', response.data);
      setSets(response.data.sets || []);
    } catch (err: any) {
      console.error('Error fetching sets:', err);
      console.error('Error response:', err?.response);
      console.error('Error response data:', err?.response?.data);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setError(null);
    setEditingOrder(null);
    setFormData({
      customer_first_name: '',
      customer_last_name: '',
      customer_email: '',
      company_name: '',
      status: 'pending_payment',
      shipping_address: '',
      notes: '',
    });
    setOrderItems([]);
  };

  const handleAddOrder = async () => {
    console.log('Opening new order dialog...');
    console.log('Current sets state:', sets);
    console.log('Sets length:', sets.length);
    
    // If sets are empty, try to fetch them again
    if (sets.length === 0) {
      console.log('Sets are empty, fetching sets again...');
      await fetchSets();
    }
    
    setEditingOrder(null);
    setFormData({
      customer_first_name: '',
      customer_last_name: '',
      customer_email: '',
      company_name: '',
      status: 'pending_payment',
      shipping_address: '',
      notes: '',
    });
    setOrderItems([]);
    setError(null);
    
    setDialogOpen(true);
  };

  const handleEditOrder = async (order: Order) => {
    setEditingOrder(order);
    
    const newFormData = {
      customer_first_name: order.customer_first_name || '',
      customer_last_name: order.customer_last_name || '',
      customer_email: order.customer_email || '',
      company_name: order.customer_company_name || order.company_name || '',
      status: orderStatusForSelect(order.status),
      shipping_address: order.shipping_address || '',
      notes: order.notes || '',
    };
    
    setFormData(newFormData);
    
    // Set error to null and open dialog immediately
    setError(null);
    setDialogOpen(true);
    
    // Fetch order items with proper error handling
    try {
      const response = await ordersApi.getById(order.order_id);
      
      // Handle different response structures
      const orderData = response.data.order || response.data;
      
      if (orderData && orderData.items && orderData.items.length > 0) {
        // Fetch set names for items that don't have them
        const formattedItems: FormOrderItem[] = await Promise.all(
          orderData.items.map(async (item: any) => {
            let set_name = item.set_name || (item.set_id ? `Set ${item.set_id}` : 'Handling Fee');
            
            // If set_name is empty, try to fetch it from sets API
            if (!item.set_name || item.set_name.trim() === '') {
              try {
                const setsResponse = await setsApi.getAll('en');
                const sets = setsResponse.data.sets || [];
                const matchingSet = sets.find((set: any) => set.set_id === item.set_id);
                if (matchingSet) {
                  set_name = matchingSet.name || (item.set_id ? `Set ${item.set_id}` : 'Handling Fee');
                }
              } catch (error) {
                console.error('Error fetching set name:', error);
                set_name = item.set_id ? `Set ${item.set_id}` : 'Handling Fee';
              }
            }
            
            return {
              item_id: item.order_item_id || item.item_id,
              set_id: item.set_id,
              set_name: set_name,
              quantity: item.quantity,
              unit_price: parseFloat(item.unit_price || item.price || 0),
              total_price: parseFloat(item.line_total || item.total_price || 0)
            };
          })
        );
        
        setOrderItems(formattedItems);
      } else {
        setOrderItems([]);
      }
    } catch (error) {
      console.error('Error fetching order items:', error);
      setError('Failed to load order details');
      setOrderItems([]);
    }
  };

  const sendOrderStatusNotification = async (orderId: number, newStatus: string) => {
    try {
      // Get order details to determine who to notify
      const orderResponse = await ordersApi.getById(orderId);
      const order = orderResponse.data.order || orderResponse.data;
      
      if (!order) return;
      
      const notifications = [];
      
      // Determine order type and who should be notified
      if (order.items && order.items.length > 0) {
        const setIds = order.items.map((item: any) => item.set_id).filter(Boolean);
        
        if (setIds.length > 0) {
          try {
            // Get set details to find provider information
            const setsResponse = await setsApi.getAll('en');
            const allSets = setsResponse.data.sets || [];
            
            // Find sets in this order
            const orderSets = allSets.filter((set: any) => setIds.includes(set.set_id));
            const providerSets = orderSets.filter((set: any) => set.set_type === 'provider');
            const adminSets = orderSets.filter((set: any) => set.set_type === 'admin');
            
            // Determine order type
            const isProviderOrder = providerSets.length > 0;
            const isProductionOrder = adminSets.length > 0;
            
            if (isProviderOrder) {
              // Provider Order Workflow
              const providerIds = Array.from(new Set(providerSets.map((set: any) => set.provider_id).filter(Boolean)));
              
              if (newStatus === 'payment_received') {
                // Notify provider that payment is confirmed and they can ship
                for (const providerId of providerIds) {
                  notifications.push({
                    type: 'payment_confirmed',
                    title: `💰 Payment Confirmed - Order #${orderId}`,
                    message: `Payment confirmed for your order #${orderId}. You can now prepare and ship the items.`,
                    created_for: providerId,
                    priority: 'high'
                  });
                }
              } else if (newStatus === 'shipped') {
                // Notify customer that their order has been shipped
                notifications.push({
                  type: 'order_shipped',
                  title: `🚚 Order Shipped - Order #${orderId}`,
                  message: `Your order #${orderId} has been shipped by the provider. Track your delivery!`,
                  created_for: order.customer_id,
                  priority: 'medium'
                });
              } else if (newStatus === 'delivered') {
                // Notify customer that their order has been delivered
                notifications.push({
                  type: 'order_delivered',
                  title: `✅ Order Delivered - Order #${orderId}`,
                  message: `Your order #${orderId} has been delivered successfully!`,
                  created_for: order.customer_id,
                  priority: 'medium'
                });
              } else if (newStatus === 'payment_pending') {
                // Notify admin that provider is requesting payment
                notifications.push({
                  type: 'provider_payment_request',
                  title: `💰 Payment Request - Order #${orderId}`,
                  message: `Provider is requesting payment for delivered order #${orderId}. Review and process payment.`,
                  created_for: null, // All admins
                  priority: 'high'
                });
              } else if (newStatus === 'payment_completed') {
                // Notify provider that payment has been completed
                for (const providerId of providerIds) {
                  notifications.push({
                    type: 'payment_completed',
                    title: `💳 Payment Completed - Order #${orderId}`,
                    message: `Payment for order #${orderId} has been completed and processed.`,
                    created_for: providerId,
                    priority: 'high'
                  });
                }
              }
            }
            
            if (isProductionOrder) {
              // Production Order Workflow
              if (newStatus === 'payment_received') {
                // Notify production team that payment is confirmed
                notifications.push({
                  type: 'production_order_confirmed',
                  title: `🏭 Production Order Confirmed - Order #${orderId}`,
                  message: `Payment confirmed for production order #${orderId}. Prepare items for shipping.`,
                  created_for: null, // All production staff
                  priority: 'high'
                });
              } else if (newStatus === 'shipped') {
                // Notify customer that their order has been shipped
                notifications.push({
                  type: 'order_shipped',
                  title: `🚚 Order Shipped - Order #${orderId}`,
                  message: `Your order #${orderId} has been shipped by MakerSet production. Track your delivery!`,
                  created_for: order.customer_id,
                  priority: 'medium'
                });
              } else if (newStatus === 'delivered') {
                // Notify customer that their order has been delivered
                notifications.push({
                  type: 'order_delivered',
                  title: `✅ Order Delivered - Order #${orderId}`,
                  message: `Your order #${orderId} has been delivered successfully!`,
                  created_for: order.customer_id,
                  priority: 'medium'
                });
              }
            }
          } catch (err) {
            console.error('Error fetching set details for notifications:', err);
          }
        }
      }
      
      // Always notify admins about status changes
      notifications.push({
        type: 'order_status_change',
        title: `Order #${orderId} Status Update`,
        message: `Order #${orderId} status has been updated to: ${newStatus}`,
        created_for: null, // All admins
        priority: 'medium'
      });
      
      // Send notifications via API
      for (const notification of notifications) {
        try {
          await ordersApi.createNotification(notification);
        } catch (err) {
          console.error('Error sending notification:', err);
        }
      }
      
    } catch (err) {
      console.error('Error preparing notifications:', err);
    }
  };

  const handleQuickStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await ordersApi.updateStatus(orderId, newStatus, `Status changed to ${newStatus}`, 1);
      
      // Show success message
      setError(null);
      setSuccess(`Order #${orderId} status updated to ${newStatus}!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Refresh orders and notification count
      await fetchOrders();
      refreshOrderCount();
      
      // Send notifications to providers/production
      await sendOrderStatusNotification(orderId, newStatus);
      
    } catch (err: any) {
      console.error('Error updating order status:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update order status');
    }
  };

  const handleSaveOrder = async () => {
    try {
      let statusChanged = false; // Declare outside the if block
      
      if (editingOrder) {
        // For existing orders, skip item validation - we're just updating status/details
        // Compare normalized status (backend may return legacy 'pending')
        statusChanged = formData.status !== orderStatusForSelect(editingOrder.status);
        
        // Update existing order via API - include status in main update
        const updateData = {
          status: formData.status,
          shipping_address: formData.shipping_address,
          notes: formData.notes,
          payment_method: 'credit_card',
          items: orderItems.map(item => ({
            set_id: item.set_id,
            quantity: item.quantity
          }))
        };

        await ordersApi.update(editingOrder.order_id, updateData);
        
        // Update the local orders state immediately to reflect the change
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.order_id === editingOrder.order_id 
              ? { ...order, status: formData.status }
              : order
          )
        );
        
        // If status changed, also update it via status API for notifications
        if (statusChanged) {
          try {
            await ordersApi.updateStatus(editingOrder.order_id, formData.status, 'Status updated via edit dialog', 1);
            
            // Send notifications for status change
            await sendOrderStatusNotification(editingOrder.order_id, formData.status);
            
            // Refresh notification count after status change
            refreshOrderCount();
          } catch (statusError) {
            console.error('Error updating status:', statusError);
            // Don't fail the entire operation if status update fails
          }
        }
        
        // Refresh orders from API to ensure consistency
        await fetchOrders();
        
        // Refresh order items in the edit dialog
        if (editingOrder) {
          try {
            const response = await ordersApi.getById(editingOrder.order_id);
            const orderData = response.data.order || response.data;
            
            if (orderData && orderData.items && orderData.items.length > 0) {
              // Fetch set names for items that don't have them
              const formattedItems: FormOrderItem[] = await Promise.all(
                orderData.items.map(async (item: any) => {
                  let set_name = item.set_name || `Set ${item.set_id}`;
                  
                  // If set_name is empty, try to fetch it from sets API
                  if (!item.set_name || item.set_name.trim() === '') {
                    try {
                      const setsResponse = await setsApi.getAll('en');
                      const sets = setsResponse.data.sets || [];
                      const matchingSet = sets.find((set: any) => set.set_id === item.set_id);
                      if (matchingSet) {
                        set_name = matchingSet.name || `Set ${item.set_id}`;
                      }
                    } catch (error) {
                      console.error('Error fetching set name:', error);
                      set_name = `Set ${item.set_id}`;
                    }
                  }
                  
                  return {
                    item_id: item.order_item_id || item.item_id,
                    set_id: item.set_id,
                    set_name: set_name,
                    quantity: item.quantity,
                    unit_price: parseFloat(item.unit_price || item.price || 0),
                    total_price: parseFloat(item.line_total || item.total_price || 0)
                  };
                })
              );
              
              setOrderItems(formattedItems);
            } else {
              setOrderItems([]);
            }
          } catch (error) {
            console.error('Error refreshing order items:', error);
          }
        }
      } else {
        // Validate order items for new orders only
        if (!orderItems || orderItems.length === 0) {
          setError('Please add at least one item to the order');
          return;
        }

        // Validate that all items have valid set_id
        const invalidItems = orderItems.filter(item => !item.set_id || item.set_id === 0);
        if (invalidItems.length > 0) {
          setError('Please select a set for all order items');
          return;
        }

        // Validate that all items have valid quantity
        const invalidQuantities = orderItems.filter(item => !item.quantity || item.quantity <= 0);
        if (invalidQuantities.length > 0) {
          setError('Please enter a valid quantity (at least 1) for all order items');
          return;
        }

        // Create new order via API
        const orderData = {
          customer_id: 1, // Default customer ID
          provider_id: 1, // Default provider ID
          items: orderItems.map(item => ({
            set_id: item.set_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          shipping_address: formData.shipping_address,
          notes: formData.notes,
          payment_method: 'credit_card'
        };

        await ordersApi.create(orderData);
        
        // Refresh orders from API
        await fetchOrders();
      }
      
      // Show success message and close dialog immediately
      setError(null);
      const statusMessage = statusChanged ? `Order #${editingOrder?.order_id || 'New'} updated successfully! Status changed to ${formData.status}.` : `Order #${editingOrder?.order_id || 'New'} updated successfully!`;
      setSuccess(statusMessage);
      
      // Close dialog immediately
      handleCloseDialog();
      
      // Clear success message after showing it
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error saving order:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save order');
    }
  };

  const handleDeleteOrder = (order: Order) => {
    setOrderToDelete(order);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      // Always return parts to stock when permanently deleting
      await ordersApi.permanentDelete(orderToDelete.order_id, true);
      
      // Show success message
      setError(null);
      alert(`Order #${orderToDelete.order_id} has been permanently deleted and parts have been returned to stock.`);
      
      // Close dialog and refresh orders
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
      await fetchOrders();
      
      // Refresh order count notification
      if (refreshOrderCount) {
        refreshOrderCount();
      }
    } catch (err: any) {
      console.error('Error permanently deleting order:', err);
      setError(err.response?.data?.error || err.message || 'Failed to permanently delete order');
    }
  };

  const cancelDeleteOrder = () => {
    setDeleteConfirmOpen(false);
    setOrderToDelete(null);
  };

  const generateInvoicePDF = async (order: Order) => {
    setPdfLoading(order.order_id);
    try {
      console.log('Generating invoice for order:', order);
      
      // Validate order data
      if (!order || !order.order_id) {
        throw new Error('Invalid order data');
      }

        // Generate invoice using the pdf template service
        console.log('Generating invoice using PDF template service');
        
        // Create proper InvoiceData structure
        const invoiceData: InvoiceData = {
          invoiceNumber: `INV-${order.order_id.toString().padStart(6, '0')}`,
          orderNumber: order.order_number || `ORD-${order.order_id}`,
          date: order.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 30 days from now
          company: {
            name: 'MakerSet Solutions',
            address: '123 Innovation Street, Tech City, TC 12345, Estonia',
            phone: '+372 123 4567',
            email: 'info@makerset.com',
            website: 'www.makerset.com',
            taxId: 'EE123456789',
            bankAccount: {
              bankName: 'Estonian Bank',
              accountNumber: '1234567890',
              iban: 'EE123456789012345678',
              swift: 'ESTBEE2X'
            }
          },
          customer: {
            name: `${order.customer_first_name || 'Customer'} ${order.customer_last_name || 'Name'}`,
            company: order.company_name || '',
            email: order.customer_email || 'customer@example.com',
            address: order.shipping_address || 'No address provided'
          },
          items: (order.items && Array.isArray(order.items) && order.items.length > 0) 
            ? order.items.map((item: any) => ({
                description: item.set_name || item.name || `Set #${item.set_id || 'Unknown'}`,
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unit_price) || Number(item.price) || 0,
                total: (Number(item.quantity) || 1) * (Number(item.unit_price) || Number(item.price) || 0)
              }))
            : [{
                description: 'Order Items',
                quantity: 1,
                unitPrice: Number(order.total_amount) || 0,
                total: Number(order.total_amount) || 0
              }],
          subtotal: Number(order.total_amount) || 0,
          taxRate: 20, // 20% VAT
          taxAmount: (Number(order.total_amount) || 0) * 0.2,
          total: (Number(order.total_amount) || 0) * 1.2,
          notes: order.notes || 'Thank you for your business!',
          status: order.status || 'pending',
          paymentTerms: 'prepayment'
        };

        // Generate PDF using template service
        const pdfBytes = await pdfTemplateService.generateInvoicePDF(invoiceData);
        
        // Download the PDF
        const filename = `Invoice_${invoiceData.invoiceNumber}_${invoiceData.orderNumber}.pdf`;
        await pdfTemplateService.downloadPDF(pdfBytes, filename);
        
        console.log('PDF generated successfully');
      setError(null);
    } catch (err) {
      console.error('Error generating invoice:', err);
      setError(`Failed to generate invoice PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPdfLoading(null);
    }
  };


  const handleAddOrderItem = () => {
    const newItem: FormOrderItem = {
      item_id: Date.now(), // Temporary ID
      set_id: 0,
      set_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    };
    setOrderItems([...orderItems, newItem]);
  };

  const handleRemoveOrderItem = (itemId: number) => {
    setOrderItems((orderItems || []).filter(item => item.item_id !== itemId));
  };

  const handleOpenPackingList = (orderId: number) => {
    console.log('Opening packing list for order ID:', orderId);
    setSelectedOrderId(orderId);
    setPackingListOpen(true);
  };

  const handleClosePackingList = () => {
    setPackingListOpen(false);
    setSelectedOrderId(null);
  };

  const handleOpenInvoiceDialog = (order: Order) => {
    console.log('Opening invoice dialog for order:', order.order_id);
    setSelectedOrderForInvoice(order);
    setInvoiceDialogOpen(true);
  };

  const handleCloseInvoiceDialog = () => {
    setInvoiceDialogOpen(false);
    setSelectedOrderForInvoice(null);
  };

  const handleOrderItemChange = (itemId: number, field: keyof FormOrderItem, value: any) => {
    const updatedItems = (orderItems || []).map(item => {
      if (item.item_id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // If set_id changed, update set_name and unit_price
        if (field === 'set_id') {
          const selectedSet = sets.find(set => set.set_id === value);
          if (selectedSet) {
            updatedItem.set_name = selectedSet.name;
            updatedItem.unit_price = Number(selectedSet.base_price || 0); // Use actual set base price
          }
        }
        
        // Recalculate total_price
        updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
        
        return updatedItem;
      }
      return item;
    });
    setOrderItems(updatedItems);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment': return 'warning';
      case 'payment_received': return 'success';
      case 'delivered': return 'success';
      case 'payment_completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'pending_payment': return 'payment_received';
      case 'payment_received': return 'delivered'; // Skip shipped for now
      case 'delivered': return 'payment_completed';
      case 'payment_completed': return null; // No next status after payment completed
      case 'cancelled': return null; // No next status after cancelled
      default: return null;
    }
  };

  const handleStatusClick = async (orderId: number, currentStatus: string) => {
    console.log('Status clicked:', { orderId, currentStatus });
    const nextStatus = getNextStatus(currentStatus);
    console.log('Next status:', nextStatus);
    if (nextStatus) {
      console.log('Calling handleQuickStatusChange with:', { orderId, nextStatus });
      await handleQuickStatusChange(orderId, nextStatus);
    } else {
      console.log('No next status available for:', currentStatus);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment': return <PendingIcon />;
      case 'payment_received': return <PaymentIcon />;
      case 'delivered': return <CompletedIcon />;
      case 'payment_completed': return <CompletedIcon />;
      case 'cancelled': return <CancelledIcon />;
      default: return <PendingIcon />;
    }
  };

  const formatTimestamp = (label: string, timestamp?: string) => {
    if (!timestamp) return null;
    return (
      <Typography variant="caption" color="text.secondary" display="block">
        {label}: {new Date(timestamp).toLocaleString()}
      </Typography>
    );
  };

  const getStatusTimestamps = (order: Order) => {
    const timestamps = [];
    
    if (order.confirmed_at) {
      timestamps.push(formatTimestamp('Confirmed', order.confirmed_at));
    }
    if (order.in_production_at) {
      timestamps.push(formatTimestamp('In Production', order.in_production_at));
    }
    if (order.shipped_at) {
      timestamps.push(formatTimestamp('Shipped', order.shipped_at));
    }
    if (order.delivered_at) {
      timestamps.push(formatTimestamp('Delivered', order.delivered_at));
    }
    if (order.cancelled_at) {
      timestamps.push(formatTimestamp('Cancelled', order.cancelled_at));
    }
    
    return timestamps;
  };

  const filteredOrders = (orders || []).filter(order =>
    filterStatus === '' || filterStatus === 'all' || order.status === filterStatus
  );

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'amount':
        comparison = parseFloat(a.total_amount) - parseFloat(b.total_amount);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          {pageInfo.title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {pageInfo.subtitle}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {renderError(error)}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            {/* Add Order Button - Only for Admin */}
            {isAdmin && (
              <Box sx={{ minWidth: 200 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddOrder}
                  fullWidth
                >
                  Add Order
                </Button>
              </Box>
            )}
            
            {/* Status Filter */}
            {(currentViewMode === 'production' || currentViewMode === 'admin') && (
            <Box sx={{ minWidth: 150 }}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">Status Filter</InputLabel>
                <Select
                  id="status-filter"
                  name="status-filter"
                  labelId="status-filter-label"
                  value={(() => {
                    // Ensure value matches a MenuItem ('' or specific status)
                    if (currentViewMode === 'production') {
                      return ['', 'pending_payment', 'payment_received', 'shipped'].includes(filterStatus) ? filterStatus : '';
                    }
                    if (currentViewMode === 'admin') {
                      return ['', 'pending_payment', 'payment_received', 'shipped', 'delivered', 'cancelled'].includes(filterStatus) ? filterStatus : '';
                    }
                    return '';
                  })()}
                  onChange={(e) => setFilterStatus(e.target.value as string)}
                  displayEmpty
                >
                  <MenuItem value="">All Orders</MenuItem>
                  {currentViewMode === 'production' ? (
                    <>
                      <MenuItem value="pending_payment">Payment Pending</MenuItem>
                      <MenuItem value="payment_received">Payment Received</MenuItem>
                      <MenuItem value="shipped">Shipped</MenuItem>
                    </>
                  ) : currentViewMode === 'admin' ? (
                    <>
                      <MenuItem value="pending_payment">Payment Pending</MenuItem>
                      <MenuItem value="payment_received">Payment Received</MenuItem>
                      <MenuItem value="shipped">Shipped</MenuItem>
                      <MenuItem value="delivered">Delivered</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </>
                  ) : (
                    <>
                      <MenuItem value="pending_payment">Payment Pending</MenuItem>
                      <MenuItem value="payment_received">Payment Received</MenuItem>
                      <MenuItem value="shipped">Shipped</MenuItem>
                      <MenuItem value="delivered">Delivered</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </>
                  )}
                </Select>
              </FormControl>
            </Box>
            )}

            <Box sx={{ minWidth: 150 }}>
              <FormControl fullWidth>
                <InputLabel id="sort-by-label">{t('orders.sortBy')}</InputLabel>
                <Select
                  id="sort-by"
                  name="sort-by"
                  labelId="sort-by-label"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <MenuItem value="date">{t('orders.date')}</MenuItem>
                  <MenuItem value="status">{t('orders.status')}</MenuItem>
                  <MenuItem value="amount">{t('orders.amount')}</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ minWidth: 120 }}>
              <ToggleButtonGroup
                value={sortOrder}
                exclusive
                onChange={(e, value) => value && setSortOrder(value)}
                size="small"
                fullWidth
              >
                <ToggleButton value="asc">{t('orders.ascending')}</ToggleButton>
                <ToggleButton value="desc">{t('orders.descending')}</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ minWidth: 120 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, value) => value && setViewMode(value)}
                size="small"
                fullWidth
              >
                <ToggleButton value="grid">
                  <GridViewIcon />
                </ToggleButton>
                <ToggleButton value="list">
                  <ListViewIcon />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Orders Display */}
      {viewMode === 'grid' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(350px, 1fr))' }, gap: 3 }}>
          {sortedOrders.map((order) => (
            <Card key={order.order_id} sx={{ height: 'fit-content', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Header with Order ID and Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                      Order #{order.order_id}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(order.status)}
                      label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      color={getStatusColor(order.status) as any}
                      size="small"
                      sx={{ 
                        fontWeight: 500,
                        cursor: getNextStatus(order.status) ? 'pointer' : 'default',
                        '&:hover': getNextStatus(order.status) ? {
                          opacity: 0.8,
                          transform: 'scale(1.05)'
                        } : {}
                      }}
                      onClick={() => handleStatusClick(order.order_id, order.status)}
                      title={getNextStatus(order.status) ? `Click to advance to ${getNextStatus(order.status)?.replace('_', ' ')}` : 'No next status available'}
                    />
                  </Box>
                  
                {/* Customer Information */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <strong>Customer:</strong> {order.customer_first_name} {order.customer_last_name}
                  </Typography>
                  
                  {order.company_name && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      <strong>Company:</strong> {order.company_name}
                    </Typography>
                  )}
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <strong>Email:</strong> {order.customer_email}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <strong>Date:</strong> {new Date(order.order_date).toLocaleDateString()}
                  </Typography>
                </Box>

                {/* Provider Information */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <strong>Provider:</strong> {
                      order.provider_id === null || order.provider_id === 0 
                        ? 'MakerSet Platform' 
                        : (order.provider_code || order.provider_company_name || `Provider #${order.provider_id}`)
                    }
                  </Typography>
                  
                  {order.provider_code && order.provider_id !== null && order.provider_id !== 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      <strong>Provider Code:</strong> {order.provider_code}
                    </Typography>
                  )}
                  
                  {order.provider_company_name && order.provider_id !== null && order.provider_id !== 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      <strong>Provider Company:</strong> {order.provider_company_name}
                    </Typography>
                  )}
                </Box>
                  
                {/* Status Timestamps - More subtle design */}
                  {getStatusTimestamps(order).length > 0 && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                        Status Timeline:
                      </Typography>
                      {getStatusTimestamps(order)}
                    </Box>
                  )}
                  
                {/* Order Summary */}
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                      <strong>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</strong>
                  </Typography>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                      €{order.total_amount}
                    </Typography>
                  </Box>
                </Box>
                </CardContent>
                
              {/* Action Buttons */}
              <CardActions sx={{ pt: 0, px: 2, pb: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => handleEditOrder(order)}
                    sx={{ minWidth: 'auto' }}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    onClick={() => handleOpenPackingList(order.order_id)}
                    disabled={!order.items || order.items.length === 0}
                    title={(!order.items || order.items.length === 0) ? "No items to pack - add sets to this order first" : "Generate packing list"}
                    sx={{ minWidth: 'auto' }}
                  >
                    Pack
                  </Button>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button 
                    size="small" 
                    variant="contained"
                    startIcon={<InvoiceIcon />}
                    onClick={() => handleOpenInvoiceDialog(order)}
                    title="Show Invoice"
                    sx={{ minWidth: 'auto' }}
                  >
                    Show Invoice
                  </Button>
                  {isAdmin && (
                    <Button 
                      size="small" 
                      color="error" 
                      variant="outlined"
                      onClick={() => handleDeleteOrder(order)}
                      sx={{ minWidth: 'auto' }}
                    >
                      Delete
                    </Button>
                  )}
                </Box>
                
                {/* Quick Status Change Buttons */}
                {(isAdmin || user?.role === 'provider') && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    
                    {/* Dynamic Status Update Button for Admin */}
                    {isAdmin && (() => {
                      let nextStatus = '';
                      let buttonText = '';
                      let buttonColor: 'success' | 'info' | 'warning' | 'primary' = 'success';
                      
                      switch (order.status) {
                        case 'pending':
                        case 'pending_payment':
                          nextStatus = 'payment_received';
                          buttonText = '✓ Confirm Payment Received';
                          buttonColor = 'success';
                          break;
                        case 'payment_received':
                          nextStatus = 'shipped';
                          buttonText = '🚚 Mark as Shipped';
                          buttonColor = 'info';
                          break;
                        case 'shipped':
                          nextStatus = 'delivered';
                          buttonText = '✅ Mark as Delivered';
                          buttonColor = 'success';
                          break;
                        case 'delivered':
                          nextStatus = 'payment_pending';
                          buttonText = '💰 Mark Payment Pending';
                          buttonColor = 'warning';
                          break;
                        case 'payment_pending':
                          nextStatus = 'payment_completed';
                          buttonText = '💳 Complete Payment';
                          buttonColor = 'success';
                          break;
                        default:
                          return null;
                      }
                      
                      // Check if status is one of the final states (use type assertion since TypeScript narrows the type in switch statement)
                      const isFinalStatus = (order.status as string) === 'payment_completed' || (order.status as string) === 'cancelled';
                      const showCancel = !isFinalStatus;
                      
                      return (
                        <>
                          <Button 
                            size="small" 
                            variant="contained"
                            color={buttonColor}
                            onClick={() => handleQuickStatusChange(order.order_id, nextStatus)}
                            sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                          >
                            {buttonText}
                          </Button>
                          {showCancel && (
                            <Button 
                              size="small" 
                              variant="outlined"
                              color="error"
                              onClick={() => handleQuickStatusChange(order.order_id, 'cancelled')}
                              sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                            >
                              ❌ Cancel Order
                            </Button>
                          )}
                        </>
                      );
                    })()}
                    
                    {/* Provider Status Change Buttons - Only for Provider Orders */}
                    {user?.role === 'provider' && !isAdmin && (
                      <>
                        <Button 
                          size="small" 
                          variant={order.status === 'payment_received' ? 'contained' : 'outlined'}
                          color="info"
                          onClick={() => handleQuickStatusChange(order.order_id, 'shipped')}
                          disabled={order.status !== 'payment_received'}
                          sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                        >
                          🚚 Ship Order
                        </Button>
                        
                        <Button 
                          size="small" 
                          variant={order.status === 'shipped' ? 'contained' : 'outlined'}
                          color="success"
                          onClick={() => handleQuickStatusChange(order.order_id, 'delivered')}
                          disabled={order.status !== 'shipped'}
                          sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                        >
                          ✅ Confirm Delivery
                        </Button>
                        
                        <Button 
                          size="small" 
                          variant={order.status === 'delivered' ? 'contained' : 'outlined'}
                          color="warning"
                          onClick={() => handleQuickStatusChange(order.order_id, 'payment_pending')}
                          disabled={order.status !== 'delivered'}
                          sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                        >
                          💰 Request Payment
                        </Button>
                      </>
                    )}
                    
                    {/* Production Status Change Buttons - Only for Production Orders */}
                    {isProduction && (
                      <>
                        <Button 
                          size="small" 
                          variant={order.status === 'payment_received' ? 'contained' : 'outlined'}
                          color="info"
                          onClick={() => handleQuickStatusChange(order.order_id, 'shipped')}
                          disabled={order.status !== 'payment_received'}
                          sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                        >
                          🏭 Ship from Production
                        </Button>
                        
                        <Button 
                          size="small" 
                          variant={order.status === 'shipped' ? 'contained' : 'outlined'}
                          color="success"
                          onClick={() => handleQuickStatusChange(order.order_id, 'delivered')}
                          disabled={order.status !== 'shipped'}
                          sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                        >
                          ✅ Confirm Delivery
                        </Button>
                      </>
                    )}
                  </Box>
                )}
                </CardActions>
              </Card>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders.map((order) => (
                <TableRow key={order.order_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>
                      #{order.order_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.customer_first_name} {order.customer_last_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {order.company_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {order.customer_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(order.order_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(order.status)}
                      label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      color={getStatusColor(order.status) as any}
                      size="small"
                      sx={{ 
                        fontWeight: 500,
                        cursor: getNextStatus(order.status) ? 'pointer' : 'default',
                        '&:hover': getNextStatus(order.status) ? {
                          opacity: 0.8,
                          transform: 'scale(1.05)'
                        } : {}
                      }}
                      onClick={() => handleStatusClick(order.order_id, order.status)}
                      title={getNextStatus(order.status) ? `Click to advance to ${getNextStatus(order.status)?.replace('_', ' ')}` : 'No next status available'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      €{order.total_amount}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.items?.length || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {/* Quick Status Change Buttons - Step by Step Only */}
                      {isAdmin && (
                        <>
                          {/* Step 1: Payment Pending → Payment Received */}
                          {order.status === 'pending_payment' && (
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleQuickStatusChange(order.order_id, 'payment_received')}
                              title="Confirm Payment Received"
                            >
                              <PaymentIcon fontSize="small" />
                            </IconButton>
                          )}
                          
                          {/* Step 2: Payment Received → Shipped */}
                          {order.status === 'payment_received' && (
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => handleQuickStatusChange(order.order_id, 'shipped')}
                              title="Mark as Shipped"
                            >
                              <ShippingIcon fontSize="small" />
                            </IconButton>
                          )}
                          
                          {/* Step 3: Shipped → Delivered */}
                          {order.status === 'shipped' && (
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleQuickStatusChange(order.order_id, 'delivered')}
                              title="Mark as Delivered"
                            >
                              <CompletedIcon fontSize="small" />
                            </IconButton>
                          )}
                          
                          {/* Cancel Available at Any Step (except cancelled) */}
                          {order.status !== 'cancelled' && (
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleQuickStatusChange(order.order_id, 'cancelled')}
                              title="Cancel Order"
                            >
                              <CancelledIcon fontSize="small" />
                            </IconButton>
                          )}
                        </>
                      )}
                      
                      {/* Existing Action Buttons */}
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditOrder(order)}
                        title="Edit Order"
                        sx={{ color: 'primary.main' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenPackingList(order.order_id)}
                      disabled={!order.items || order.items.length === 0}
                      title={(!order.items || order.items.length === 0) ? "No items to pack - add sets to this order first" : "Generate packing list"}
                        sx={{ color: 'info.main' }}
                    >
                        <PrintIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenInvoiceDialog(order)}
                      title="Show Invoice"
                      sx={{ color: 'success.main' }}
                    >
                      <InvoiceIcon fontSize="small" />
                    </IconButton>
                    {isAdmin && (
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteOrder(order)}
                          title="Delete Order"
                        >
                          <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Order Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingOrder ? t('orders.editOrder') : t('orders.addNewOrder')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                id="customer-first-name"
                name="customer-first-name"
                fullWidth
                label="Customer First Name"
                value={formData.customer_first_name}
                onChange={(e) => setFormData({ ...formData, customer_first_name: e.target.value })}
              />
              <TextField
                id="customer-last-name"
                name="customer-last-name"
                fullWidth
                label="Customer Last Name"
                value={formData.customer_last_name}
                onChange={(e) => setFormData({ ...formData, customer_last_name: e.target.value })}
              />
              <TextField
                id="customer-email"
                name="customer-email"
                fullWidth
                label={t('orders.customerEmail')}
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              />
            </Box>
            <TextField
              id="company-name"
              name="company-name"
              fullWidth
              label="Company Name"
              value={formData.company_name || ''}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Enter company name (optional)"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="order-status-label">
                  {t('orders.status')} {editingOrder && <span style={{ fontSize: '0.7rem', color: '#666' }}>(Admin Edit Mode)</span>}
                </InputLabel>
                <Select
                  id="order-status"
                  name="order-status"
                  labelId="order-status-label"
                  value={orderStatusForSelect(formData.status)}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Order['status'] })}
                >
                  {/* Always show all status options */}
                  <MenuItem value="pending_payment">Payment Pending</MenuItem>
                  <MenuItem value="payment_received">Payment Received</MenuItem>
                  <MenuItem value="shipped">{t('orders.shipped')}</MenuItem>
                  <MenuItem value="delivered">{t('orders.delivered')}</MenuItem>
                  <MenuItem value="cancelled">{t('orders.cancelled')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              id="shipping-address"
              name="shipping-address"
              fullWidth
              label={t('orders.shippingAddress')}
              multiline
              rows={2}
              value={formData.shipping_address}
              onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
            />
            <TextField
              id="order-notes"
              name="order-notes"
              fullWidth
              label={t('orders.notes')}
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />

            {/* Order Items Section */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Order Items ({(orderItems || []).length}) <span style={{ color: 'red' }}>*</span>
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddOrderItem}
                  size="small"
                >
                  Add Item
                </Button>
              </Box>
              
              {(orderItems || []).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3, border: '2px dashed #f44336', borderRadius: 1, backgroundColor: '#ffebee' }}>
                  <Typography variant="body2" color="error">
                    <strong>At least one item is required.</strong> Click "Add Item" to add sets to this order.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(orderItems || []).map((item, index) => (
                    <Card key={item.item_id || index} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <FormControl sx={{ minWidth: 200 }} required>
                          <InputLabel id={`set-select-label-${index}`} htmlFor={`set-select-${index}`}>Set *</InputLabel>
                          <Select
                            id={`set-select-${index}`}
                            name={`set-select-${index}`}
                            labelId={`set-select-label-${index}`}
                            value={item.set_id ? item.set_id.toString() : "0"}
                            onChange={(e) => handleOrderItemChange(item.item_id || 0, 'set_id', parseInt(e.target.value))}
                            error={item.set_id === 0}
                          >
                            <MenuItem value="0">Select Set</MenuItem>
                            {(sets || []).map((set) => (
                              <MenuItem key={set.set_id} value={set.set_id ? set.set_id.toString() : "0"}>
                                {set.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <TextField
                          label="Quantity *"
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => handleOrderItemChange(item.item_id || 0, 'quantity', parseInt(e.target.value))}
                          sx={{ width: 100 }}
                          inputProps={{ min: 1 }}
                          required
                          error={item.quantity <= 0}
                          helperText={item.quantity <= 0 ? 'Quantity must be at least 1' : ''}
                        />
                        
                        <TextField
                          label="Unit Price"
                          type="number"
                          value={item.unit_price || 0}
                          onChange={(e) => handleOrderItemChange(item.item_id || 0, 'unit_price', parseFloat(e.target.value))}
                          sx={{ width: 120 }}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Total:
                          </Typography>
                          <Typography variant="h6" color="primary" fontWeight="bold">
                            €{(item.total_price || 0).toFixed(2)}
                          </Typography>
                        </Box>
                        
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveOrderItem(item.item_id || 0)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Card>
                  ))}
                  
                  {/* Order Total */}
                  <Card sx={{ p: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        Order Total:
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        €{(orderItems || []).reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Card>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('orders.cancel')}</Button>
          <Button onClick={handleSaveOrder} variant="contained">
            {editingOrder ? t('orders.update') : t('orders.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Packing List Dialog */}
      {selectedOrderId && (
        <PackingList
          orderId={selectedOrderId}
          open={packingListOpen}
          onClose={handleClosePackingList}
        />
      )}

      {/* Delete Order Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={cancelDeleteOrder}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningIcon />
          Delete Order Confirmation
        </DialogTitle>
        <DialogContent>
          {orderToDelete && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600}>
                  ⚠️ This action will PERMANENTLY DELETE the order and cannot be undone!
                </Typography>
              </Alert>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Order Details:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>Order #:</strong> {orderToDelete.order_id}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>Customer:</strong> {orderToDelete.customer_first_name} {orderToDelete.customer_last_name}
                </Typography>
                {orderToDelete.company_name && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <strong>Company:</strong> {orderToDelete.company_name}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>Total Amount:</strong> €{orderToDelete.total_amount}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <strong>Items:</strong> {orderToDelete.items?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> {orderToDelete.status}
                </Typography>
              </Box>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight={600} color="info.dark">
                  ⚠️ Important: All parts from this order will be returned to inventory
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  When you permanently delete this order, all parts will be automatically restored to stock quantities.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={cancelDeleteOrder} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteOrder} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete Order Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Generator Dialog */}
      <InvoiceGenerator
        open={invoiceDialogOpen}
        onClose={handleCloseInvoiceDialog}
        order={selectedOrderForInvoice}
      />
    </Box>
  );
};

export default OrderManagementPage;
