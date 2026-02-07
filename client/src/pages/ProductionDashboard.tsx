import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Science as ScienceIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as CartIcon,
  Build as BuildIcon,
  Inventory as InventoryIcon,
  Assessment as AnalyticsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Engineering as EngineeringIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { setsApi, partsApi, toolsApi, ordersApi } from '../services/api';

interface ProductionStats {
  totalSets: number;
  activeSets: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalParts: number;
  lowStockParts: number;
  totalTools: number;
  maintenanceTools: number;
  productionEfficiency: number;
}

interface ProductionOrder {
  order_id: number;
  order_number: string;
  customer_name: string;
  status: string;
  total_amount: number;
  created_at: string;
  priority: 'high' | 'medium' | 'low';
  estimated_completion: string;
}

interface LowStockItem {
  part_id: number;
  part_name: string;
  current_stock: number;
  minimum_stock: number;
  category: string;
  urgency: 'critical' | 'warning' | 'info';
}

const ProductionDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProductionStats>({
    totalSets: 0,
    activeSets: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalParts: 0,
    lowStockParts: 0,
    totalTools: 0,
    maintenanceTools: 0,
    productionEfficiency: 0,
  });
  const [recentOrders, setRecentOrders] = useState<ProductionOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [ordersToFulfill, setOrdersToFulfill] = useState<any[]>([]);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductionData();
    fetchOrdersToFulfill();
  }, []);

  const fetchOrdersToFulfill = async () => {
    try {
      setFulfillmentLoading(true);
      // Fetch orders with payment_received status for admin sets (set_type = 'admin')
      const response = await ordersApi.getAll();
      const allOrders = response.data?.orders || [];
      
      // Filter for admin orders that are ready to ship (payment_received, not yet shipped)
      const orders = allOrders.filter((order: any) => 
        order.status === 'payment_received' && 
        order.set_type === 'admin' &&
        order.status !== 'shipped'
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

  const handleMarkAsShipped = async (orderId: number) => {
    try {
      await ordersApi.updateStatus(orderId, 'shipped', 'Order shipped by production', user?.user_id || 1);
      await fetchOrdersToFulfill();
      await fetchProductionData();
    } catch (error) {
      console.error('Error marking order as shipped:', error);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }
    
    try {
      await ordersApi.updateStatus(orderId, 'cancelled', 'Order cancelled by production', user?.user_id || 1);
      await fetchOrdersToFulfill();
      await fetchProductionData();
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const fetchProductionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from multiple APIs
      const [setsResponse, partsResponse, toolsResponse, ordersResponse] = await Promise.all([
        setsApi.getAll(),
        partsApi.getAll(),
        toolsApi.getAll(),
        ordersApi.getAll(),
      ]);

      const sets = setsResponse.data?.sets || [];
      const parts = partsResponse.data?.parts || [];
      const tools = toolsResponse.data?.tools || [];
      const orders = ordersResponse.data?.orders || [];

      // Calculate production stats
      const totalSets = sets.length;
      const activeSets = sets.filter(set => set.active).length;
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const completedOrders = orders.filter(order => order.status === 'completed').length;
      const totalParts = parts.length;
      const lowStockParts = parts.filter((part: any) => 
        part.stock_quantity <= part.minimum_stock_level
      ).length;
      const totalTools = tools.length;
      const maintenanceTools = tools.filter(tool => 
        tool.condition_status === 'maintenance' || tool.condition_status === 'repair'
      ).length;
      const productionEfficiency = totalOrders > 0 ? 
        Math.round((completedOrders / totalOrders) * 100) : 100;

      setStats({
        totalSets,
        activeSets,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalParts,
        lowStockParts,
        totalTools,
        maintenanceTools,
        productionEfficiency,
      });

      // Generate recent orders for production
      const recentOrders: ProductionOrder[] = orders.slice(0, 5).map((order, index) => ({
        order_id: order.order_id,
        order_number: order.order_number || `ORD-${order.order_id}`,
        customer_name: `${order.customer_first_name || 'Customer'} ${order.customer_last_name || 'Name'}`,
        status: order.status,
        total_amount: Number(order.total_amount) || 0,
        created_at: order.created_at,
        priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
        estimated_completion: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
      }));

      setRecentOrders(recentOrders);

      // Generate low stock items
      const lowStockItems: LowStockItem[] = parts
        .filter((part: any) => part.stock_quantity <= part.minimum_stock_level)
        .slice(0, 5)
        .map((part: any) => ({
          part_id: part.part_id,
          part_name: part.part_name || part.part_number,
          current_stock: part.stock_quantity,
          minimum_stock: part.minimum_stock_level,
          category: part.category,
          urgency: part.stock_quantity === 0 ? 'critical' : 
                   part.stock_quantity <= part.minimum_stock_level * 0.5 ? 'warning' : 'info',
        }));

      setLowStockItems(lowStockItems);

    } catch (error) {
      console.error('Error fetching production data:', error);
      setError('Failed to load production dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrders = () => {
    navigate('/orders');
  };

  const handleViewInventory = () => {
    navigate('/parts');
  };

  const handleViewTools = () => {
    navigate('/tools');
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'stable';
  }> = ({ title, value, icon, color, subtitle, trend }) => (
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography>Loading production dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Production Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome back, {user?.first_name || 'Production Manager'}! Monitor production efficiency and manage resources.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<InventoryIcon />}
              onClick={handleViewInventory}
            >
              View Inventory
            </Button>
            <Button
              variant="contained"
              startIcon={<CartIcon />}
              onClick={handleViewOrders}
            >
              Manage Orders
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {typeof error === 'string' ? error : 'An error occurred while loading production data'}
        </Alert>
      )}

      {/* Production Stats */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 3 }}>
          <Box>
            <StatCard
              title="Production Efficiency"
              value={`${stats.productionEfficiency}%`}
              icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
              color="success.main"
              subtitle={`${stats.completedOrders}/${stats.totalOrders} orders completed`}
            />
          </Box>
          <Box>
            <StatCard
              title="Active Sets"
              value={stats.activeSets}
              icon={<ScienceIcon sx={{ fontSize: 40 }} />}
              color="primary.main"
              subtitle={`${stats.totalSets} total sets`}
            />
          </Box>
          <Box>
            <StatCard
              title="Orders to Fulfill"
              value={ordersToFulfill.length}
              icon={<ScheduleIcon sx={{ fontSize: 40 }} />}
              color="warning.main"
              subtitle="Ready to ship"
            />
          </Box>
          <Box>
            <StatCard
              title="Low Stock Items"
              value={stats.lowStockParts}
              icon={<WarningIcon sx={{ fontSize: 40 }} />}
              color="error.main"
              subtitle={`${stats.totalParts} total parts`}
            />
          </Box>
          <Box>
            <StatCard
              title="Tools Available"
              value={stats.totalTools - stats.maintenanceTools}
              icon={<BuildIcon sx={{ fontSize: 40 }} />}
              color="info.main"
              subtitle={`${stats.maintenanceTools} in maintenance`}
            />
          </Box>
        </Box>
      </Box>

      {/* Orders to Fulfill */}
      {ordersToFulfill.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Orders Ready to Fulfill ({ordersToFulfill.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ordersToFulfill.map((order: any) => (
                <Card key={order.order_id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">
                          Order #{order.order_id} - {order.order_number || `ORD-${order.order_id}`}
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
                        {order.shipping_address && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          <strong>Shipping Address:</strong> {order.shipping_address}
                        </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => handleMarkAsShipped(order.order_id)}
                          disabled={fulfillmentLoading}
                        >
                          Mark as Shipped
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleCancelOrder(order.order_id)}
                          disabled={fulfillmentLoading}
                        >
                          Cancel Order
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Recent Orders */}
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">
                  Recent Orders
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handleViewOrders}
                >
                  View All Orders
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Est. Completion</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {order.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {order.customer_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={order.status === 'completed' ? 'success' : 
                                   order.status === 'processing' ? 'warning' : 'info'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={order.priority}
                            color={getPriorityColor(order.priority) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            €{order.total_amount.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(order.estimated_completion).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Low Stock Alerts */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Low Stock Alerts
              </Typography>
              
              {lowStockItems.length === 0 ? (
                <Alert severity="success">
                  All inventory levels are healthy!
                </Alert>
              ) : (
                <List>
                  {lowStockItems.map((item) => (
                    <ListItem key={item.part_id} divider>
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: item.urgency === 'critical' ? 'error.main' : 
                                   item.urgency === 'warning' ? 'warning.main' : 'info.main' 
                        }}>
                          <WarningIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.part_name}
                        secondary={
                          <Typography variant="body2" color="text.secondary" component="span">
                            Stock: {item.current_stock} / Min: {item.minimum_stock}
                          </Typography>
                        }
                      />
                      <Chip
                        label={item.urgency}
                        color={getUrgencyColor(item.urgency) as any}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<InventoryIcon />}
                onClick={handleViewInventory}
                sx={{ mt: 2 }}
              >
                Manage Inventory
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default ProductionDashboard;
