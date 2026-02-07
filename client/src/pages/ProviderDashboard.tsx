import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Avatar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Science as ScienceIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as CartIcon,
  AttachMoney as MoneyIcon,
  Assessment as AnalyticsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { setsApi, ordersApi, providerApi, providerPaymentsApi, Order, OrderItem, ProviderSet } from '../services/api';
import ProviderSetManagement from '../components/ProviderSetManagement';
import ProviderReportsSection from '../components/ProviderReportsSection';
import { generateShopName } from '../utils/shopNameGenerator';

interface ProviderStats {
  totalSets: number;
  activeSets: number;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  pendingOrders: number;
}

interface ExtendedProviderSet extends ProviderSet {
  name: string;
  sales_count?: number;
  revenue?: number;
  rating?: number;
}

interface ReportsData {
  provider: {
    user_id: number;
    username: string;
    company_name: string;
    provider_code: string;
  };
  period: {
    year: number;
    month: number;
    month_name: string;
  };
  sales: {
    total_orders: number;
    total_revenue: number;
    pending_payments: number;
    completed_payments: number;
    orders: Array<{
      order_id: number;
      order_number: string;
      created_at: string;
      total_amount: number;
      status: string;
      set_id: number;
      quantity: number;
      unit_price: number;
      line_total: number;
      set_name: string;
      provider_price: number;
      provider_id: number;
    }>;
  };
  ai_motivation: string;
  generated_at: string;
}

const ProviderDashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProviderStats>({
    totalSets: 0,
    activeSets: 0,
    totalSales: 0,
    totalRevenue: 0,
    averageRating: 0,
    pendingOrders: 0,
  });
  const [providerSets, setProviderSets] = useState<ExtendedProviderSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSetManagement, setShowSetManagement] = useState(false);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [ordersToFulfill, setOrdersToFulfill] = useState<any[]>([]);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(false);
  const [shippingDialog, setShippingDialog] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user?.user_id) {
      fetchProviderData();
      fetchOrdersToFulfill();
    }
  }, [user]);

  // Update stats when reports data changes
  useEffect(() => {
    if (reportsData && providerSets.length > 0) {
      const totalSales = reportsData.sales.total_orders;
      const totalRevenue = reportsData.sales.total_revenue;
      const pendingOrders = reportsData.sales.pending_payments;

      // Update provider sets with real sales data
      const providerSetsWithRealData: ExtendedProviderSet[] = providerSets.map((set: any) => {
        const setOrders = reportsData.sales.orders.filter((order: any) => order.set_id === set.set_id);
        
        let salesCount = 0;
        let revenue = 0;
        
        setOrders.forEach((order: any) => {
          salesCount += order.quantity || 0;
          revenue += order.line_total || 0;
        });

        return {
          ...set,
          sales_count: salesCount,
          revenue: Math.round(revenue * 100) / 100,
        };
      });

      setProviderSets(providerSetsWithRealData);

      // Update stats with real data
      setStats(prevStats => ({
        ...prevStats,
        totalSales,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        pendingOrders,
      }));
    }
  }, [reportsData, providerSets.length]);

  const fetchOrdersToFulfill = async () => {
    if (!user?.user_id) return;
    
    try {
      setFulfillmentLoading(true);
      console.log('📦 Fetching orders to fulfill for provider:', user.user_id);
      
      // Fetch all orders for this provider (not filtering by status)
      const response = await ordersApi.getByProvider(user.user_id, 'all');
      const allOrders = response.data?.orders || [];
      
      // Filter to only show orders that are ready to ship (payment_received) and not yet shipped
      const orders = allOrders.filter((order: any) => 
        order.status === 'payment_received' && order.status !== 'shipped'
      );
      
      console.log('✅ Orders to fulfill fetched:', orders.length);
      setOrdersToFulfill(orders);
    } catch (error) {
      console.error('Error fetching orders to fulfill:', error);
      setOrdersToFulfill([]);
    } finally {
      setFulfillmentLoading(false);
    }
  };

  const handleMarkAsShipped = (order: any) => {
    setShippingDialog({ open: true, order });
    setTrackingNumber('');
    setShippingNotes('');
  };

  const handleConfirmShipping = async () => {
    if (!shippingDialog.order) return;
    
    try {
      setUpdatingStatus(true);
      
      const response = await ordersApi.updateProviderStatus(
        shippingDialog.order.order_id,
        'shipped',
        shippingNotes || undefined,
        trackingNumber || undefined
      );
      
      // Refresh the orders list
      await fetchOrdersToFulfill();
      
      // Show success message
      const notificationsSent = response.data?.notifications_sent;
      let message = `Order #${shippingDialog.order.order_id} marked as shipped successfully!`;
      
      if (notificationsSent) {
        message += ` Notifications sent to admin`;
        if (notificationsSent.customer) {
          message += ` and customer`;
        }
        message += `.`;
      }
      
      setSuccessMessage(message);
      
      // Close dialog
      setShippingDialog({ open: false, order: null });
      setTrackingNumber('');
      setShippingNotes('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      
      console.log('✅ Order marked as shipped successfully');
    } catch (error) {
      console.error('Error marking order as shipped:', error);
      setSuccessMessage('Error marking order as shipped. Please try again.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fetchProviderData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.user_id) {
        setError('User not authenticated');
        return;
      }

      console.log('🔄 Fetching provider data for user:', user.user_id);

      // Fetch provider-specific sets
      console.log('📦 Fetching provider sets...');
      const providerSetsResponse = await providerApi.getProviderSets(user.user_id, true);
      const providerSets = providerSetsResponse.data?.provider_sets || [];
      console.log('✅ Provider sets fetched:', providerSets.length);

      // Fetch monthly reports for real sales data
      console.log('📊 Fetching reports...');
      try {
        const reportsResponse = await providerPaymentsApi.getReports({
          provider_id: user.user_id,
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1
        });
        setReportsData(reportsResponse.data);
        console.log('✅ Reports fetched:', reportsResponse.data);
      } catch (reportsError) {
        console.warn('⚠️ Reports API failed, using empty data:', reportsError);
        setReportsData({
          provider: {
            user_id: user.user_id,
            username: user.username || '',
            company_name: user.company_name || '',
            provider_code: user.provider_code || ''
          },
          period: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            month_name: new Date().toLocaleString('default', { month: 'long' })
          },
          sales: {
            total_orders: 0,
            total_revenue: 0,
            pending_payments: 0,
            completed_payments: 0,
            orders: []
          },
          ai_motivation: 'Keep up the great work!',
          generated_at: new Date().toISOString()
        });
      }

      // Fetch payment history
      console.log('💰 Fetching payments...');
      let paymentsData = null;
      try {
        const paymentsResponse = await providerPaymentsApi.getPayments({
          provider_id: user.user_id
        });
        paymentsData = paymentsResponse.data;
        console.log('✅ Payments fetched:', paymentsData);
      } catch (paymentsError) {
        console.warn('⚠️ Payments API failed, using empty data:', paymentsError);
        paymentsData = { payments: [] };
      }
      
      setReportsData(reportsData);

      // Process provider sets with basic data first
      const providerSetsWithBasicData: ExtendedProviderSet[] = providerSets.map((set: any) => ({
        ...set,
        name: set.name || set.set_name || `${set.category} Set ${set.set_id}`,
        sales_count: 0,
        revenue: 0,
        rating: set.average_rating || 0,
      }));

      setProviderSets(providerSetsWithBasicData);

      // Calculate basic stats
      const totalSets = providerSets.length;
      const activeSets = providerSets.filter((set: any) => set.is_active).length;
      const averageRating = providerSets.length > 0 
        ? providerSets.reduce((sum: number, set: any) => sum + (set.average_rating || 0), 0) / providerSets.length 
        : 0;

      setStats({
        totalSets,
        activeSets,
        totalSales: 0,
        totalRevenue: 0,
        averageRating: Math.round(averageRating * 10) / 10,
        pendingOrders: 0,
      });
      console.log('✅ Provider dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error fetching provider data:', error);
      setError('Failed to load provider dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSet = () => {
    setShowSetManagement(true);
  };

  const handleViewAnalytics = () => {
    navigate('/provider-analytics');
  };

  const handleEditSet = (setId: number) => {
    navigate(`/sets?edit=${setId}`);
  };

  const handleViewSet = (setId: number) => {
    navigate(`/set-details/${setId}`);
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.8 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading provider dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Show Provider Set Management if requested */}
      {showSetManagement ? (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setShowSetManagement(false)}
            >
              ← Back to Dashboard
            </Button>
            <Typography variant="h5" component="h1">
              Manage My Sets
            </Typography>
          </Box>
          <ProviderSetManagement />
        </Box>
      ) : (
        <>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography variant="h4" component="h1" gutterBottom>
                  Provider Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Welcome back, {user?.first_name || 'Provider'}! Manage your sets and track your performance.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<AnalyticsIcon />}
                  onClick={handleViewAnalytics}
                >
                  View Analytics
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateSet}
                  sx={{ minWidth: 150 }}
                >
                  Manage My Sets
                </Button>
              </Box>
            </Box>
          </Box>

      {/* Provider Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Provider Information
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {user?.first_name?.[0] || user?.email?.[0] || 'P'}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.company_name || 'No company name'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              {user?.provider_code && (
                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  Provider Code: {user.provider_code}
                </Typography>
              )}
              {user?.user_id && (
                <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600, mt: 0.5 }}>
                  🏪 Shop Name: {generateShopName({ userId: user.user_id })}
                </Typography>
              )}
              <Chip 
                label={user?.role?.toUpperCase() || 'PROVIDER'} 
                size="small" 
                color="primary" 
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {renderError(error)}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 3 }}>
          <Box>
            <StatCard
              title="Total Sets"
              value={stats.totalSets}
              icon={<ScienceIcon sx={{ fontSize: 40 }} />}
              color="primary.main"
              subtitle={`${stats.activeSets} active`}
            />
          </Box>
          <Box>
            <StatCard
              title="Total Sales"
              value={stats.totalSales}
              icon={<CartIcon sx={{ fontSize: 40 }} />}
              color="success.main"
            />
          </Box>
          <Box>
            <StatCard
              title="Revenue"
              value={`€${stats.totalRevenue.toFixed(2)}`}
              icon={<MoneyIcon sx={{ fontSize: 40 }} />}
              color="success.main"
            />
          </Box>
          <Box>
            <StatCard
              title="Avg Rating"
              value={stats.averageRating.toFixed(1)}
              icon={<StarIcon sx={{ fontSize: 40 }} />}
              color="warning.main"
            />
          </Box>
          <Box>
            <StatCard
              title="Pending Orders"
              value={stats.pendingOrders}
              icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
              color="info.main"
            />
          </Box>
        </Box>
      </Box>

      {/* Recent Activity */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <List>
            {reportsData?.sales?.orders?.slice(0, 3).map((order: any, index: number) => (
              <ListItem key={order.order_id}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <CartIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`Order #${order.order_number}`}
                  secondary={`${order.set_name} - €${order.line_total?.toFixed(2) || '0.00'} - ${new Date(order.created_at).toLocaleDateString()}`}
                />
              </ListItem>
            )) || (
              <ListItem>
                <ListItemText
                  primary="No recent activity"
                  secondary="Your recent orders and updates will appear here"
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Orders to Fulfill */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">
              Orders to Fulfill
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={fetchOrdersToFulfill}
              disabled={fulfillmentLoading}
            >
              {fulfillmentLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>

          {fulfillmentLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : ordersToFulfill.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ordersToFulfill.map((order) => (
                <Card key={order.order_id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Order #{order.order_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Customer: {order.customer_first_name} {order.customer_last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Email: {order.customer_email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total: €{Number(order.total_amount).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Date: {new Date(order.created_at).toLocaleDateString()}
                      </Typography>
                      {order.shipping_address && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          <strong>Shipping Address:</strong> {order.shipping_address}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                      <Chip 
                        label={order.status === 'shipped' ? 'Shipped' : order.status === 'payment_received' ? 'Payment Received' : order.status}
                        color={order.status === 'shipped' ? 'primary' : order.status === 'payment_received' ? 'success' : 'default'} 
                        size="small" 
                      />
                      {order.status !== 'shipped' && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleMarkAsShipped(order)}
                        >
                          Mark as Shipped
                        </Button>
                      )}
                      {order.tracking_number && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          <strong>Tracking:</strong> {order.tracking_number}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                        Items to Ship:
                      </Typography>
                      {order.items.map((item: any, index: number) => (
                        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                          <Typography variant="body2">
                            {item.set_name || `Item ${item.set_id}`} × {item.quantity}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            €{Number(item.line_total).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No orders ready for fulfillment
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Orders with "Payment Received" status will appear here
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Provider Sets */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">
              Your Sets
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateSet}
            >
              Add New Set
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Set Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Sales</TableCell>
                  <TableCell>Revenue</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providerSets.map((set) => (
                  <TableRow key={set.set_id}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {set.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {set.difficulty_level}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={set.category} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        €{Number(set.base_price || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {set.sales_count || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        €{(set.revenue || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {[...Array(5)].map((_, i) => (
                          <Box key={i} sx={{ color: i < Math.floor(set.rating || 0) ? 'warning.main' : 'grey.300' }}>
                            {i < Math.floor(set.rating || 0) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                          </Box>
                        ))}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {(set.rating || 0).toFixed(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={set.is_active ? 'Active' : 'Inactive'}
                        color={set.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewSet(set.set_id)}
                          title="View Set"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEditSet(set.set_id)}
                          title="Edit Set"
                        >
                          <EditIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* AI Motivation Assistant & Reports Section */}
      <Box sx={{ mt: 4 }}>
        <ProviderReportsSection />
      </Box>
        </>
      )}

      {/* Shipping Dialog */}
      <Dialog 
        open={shippingDialog.open} 
        onClose={() => setShippingDialog({ open: false, order: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Mark Order as Shipped
        </DialogTitle>
        <DialogContent>
          {shippingDialog.order && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Order #{shippingDialog.order.order_id} - €{Number(shippingDialog.order.total_amount).toFixed(2)}
              </Typography>
              
              <TextField
                fullWidth
                label="Tracking Number (Optional)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="Enter tracking number if available"
              />
              
              <TextField
                fullWidth
                label="Shipping Notes (Optional)"
                value={shippingNotes}
                onChange={(e) => setShippingNotes(e.target.value)}
                multiline
                rows={3}
                placeholder="Add any notes about the shipment..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShippingDialog({ open: false, order: null })}
            disabled={updatingStatus}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmShipping}
            variant="contained"
            disabled={updatingStatus}
            startIcon={updatingStatus ? <CircularProgress size={20} /> : null}
          >
            {updatingStatus ? 'Updating...' : 'Mark as Shipped'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProviderDashboardPage;
