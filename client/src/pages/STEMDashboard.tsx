/**
 * STEM/MakerLab Dashboard
 * 
 * Modern engineering dashboard with:
 * - Real-time metrics
 * - System status cards
 * - Technical visualizations
 * - Engineering elements
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import {
  EngineeringHeader,
  EngineeringStatusCard,
  TechnicalMetric,
  STEMActionButton,
  CircuitBoardPattern,
  STEMIcons,
} from '../components/STEMComponents';
import { stemColors } from '../theme/stemTheme';
import { dashboardService, DashboardData } from '../services/dashboardService';
import { ordersApi, setsApi } from '../services/api';
import SystemSettingsDialog from '../components/SystemSettingsDialog';

const STEMDashboard: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [confirmingPayment, setConfirmingPayment] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchAlerts();
    updateTimestamp();
    
    // Update timestamp every 30 seconds
    const timestampInterval = setInterval(updateTimestamp, 30000);
    
    // Refresh dashboard data every 30 seconds for more responsive updates
    const dataInterval = setInterval(fetchDashboardData, 30000);
    
    // Refresh alerts every 60 seconds
    const alertsInterval = setInterval(fetchAlerts, 60000);
    
    // Refresh data when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboardData();
        fetchAlerts();
        updateTimestamp();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(timestampInterval);
      clearInterval(dataInterval);
      clearInterval(alertsInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const updateTimestamp = () => {
    setLastUpdate(new Date().toLocaleTimeString());
  };

  const fetchAlerts = async () => {
    try {
      setAlertsLoading(true);
      const response = await fetch('http://localhost:5001/api/system/alerts');
      const result = await response.json();
      
      if (result.success) {
        setAlerts(result.data || []);
      } else {
        console.error('Failed to fetch alerts:', result.error);
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      console.log('🔄 Fetching dashboard data...');
      
      // Test direct API call first
      try {
        const directResponse = await fetch('http://localhost:5001/api/dashboard/stats');
        const directData = await directResponse.json();
        console.log('🔍 Direct API test:', directData);
      } catch (directError) {
        console.error('❌ Direct API test failed:', directError);
      }
      
      const data = await dashboardService.fetchDashboardData();
      console.log('📊 Dashboard data received:', data);
      setDashboardData(data);
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      // Don't fall back to mock data - show error instead
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchAlerts(), fetchPendingOrders()]);
    updateTimestamp();
    setIsRefreshing(false);
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await ordersApi.getAll();
      const orders = response.data?.orders || response.data || [];
      const pending = orders.filter((order: any) => 
        order.payment_status === 'pending' && order.invoice_required
      );
      setPendingOrders(pending);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  const handleConfirmPayment = async (orderId: number) => {
    try {
      setConfirmingPayment(orderId);
      const paymentReference = prompt('Enter payment reference:');
      const paymentAmount = prompt('Enter payment amount:');
      
      if (paymentReference && paymentAmount) {
        await setsApi.confirmPayment(orderId, {
          payment_reference: paymentReference,
          payment_amount: parseFloat(paymentAmount),
          payment_method: 'bank_transfer'
        });
        
        // Refresh pending orders
        await fetchPendingOrders();
        alert('Payment confirmed successfully!');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment');
    } finally {
      setConfirmingPayment(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon sx={{ color: stemColors.accent.green, fontSize: 16 }} />;
      case 'warning':
        return <WarningIcon sx={{ color: stemColors.accent.yellow, fontSize: 16 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: stemColors.accent.red, fontSize: 16 }} />;
      default:
        return <ScheduleIcon sx={{ color: stemColors.primary[500], fontSize: 16 }} />;
    }
  };

  return (
    <CircuitBoardPattern>
      <Box sx={{ p: 3, minHeight: '100vh', background: stemColors.background.primary }}>
        {/* Header */}
        <EngineeringHeader
          title="MakerLab Control Center"
          subtitle="STEM Engineering Platform - Real-time System Monitoring"
          status="online"
          lastUpdate={lastUpdate}
        />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {typeof error === 'string' ? error : 'An error occurred while loading dashboard data'}
          </Alert>
        )}

        {/* Action Bar */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              System Overview
            </Typography>
            {dashboardData && (
              <Typography variant="caption" color="text.secondary">
                Last updated: {dashboardData.lastUpdated}
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={2}>
            <STEMActionButton
              icon="performance"
              label={isRefreshing ? "Refreshing..." : "Refresh Data"}
              onClick={handleRefresh}
              loading={isRefreshing}
            />
            <STEMActionButton
              icon="automation"
              label="System Settings"
              onClick={() => setSettingsOpen(true)}
              variant="secondary"
            />
          </Box>
        </Box>

        {/* System Metrics */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
          {dashboardData?.systemMetrics?.map((metric, index) => (
            <TechnicalMetric
              key={index}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              trend={metric.trend}
              color={metric.color as "success" | "warning" | "error" | "primary"}
              icon={metric.icon as "engineering" | "science" | "technology" | "mathematics" | "robotics" | "biotechnology" | "ai" | "manufacturing" | "electronics" | "automation" | "performance" | "innovation"}
            />
          ))}
        </Box>

        {/* Main Content Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          {/* System Status Cards */}
          <Box>
            <Typography variant="h6" fontWeight={600} mb={2}>
              System Status
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <EngineeringStatusCard
                title="Inventory System"
                status="active"
                progress={dashboardData?.inventory.efficiency || 0}
                icon="manufacturing"
                description="Automated inventory management with real-time tracking"
                metrics={[
                  { label: 'Total Items', value: (dashboardData?.inventory.totalItems || 0).toString() },
                  { label: 'Available', value: (dashboardData?.inventory.available || 0).toString() },
                  { label: 'Reserved', value: (dashboardData?.inventory.reserved || 0).toString() },
                ]}
              />
              
              <EngineeringStatusCard
                title="Tool Management"
                status="active"
                progress={dashboardData?.tools.efficiency || 0}
                icon="manufacturing"
                description="Advanced tool tracking and maintenance scheduling"
                metrics={[
                  { label: 'Total Tools', value: (dashboardData?.tools.total || 0).toString() },
                  { label: 'Active', value: (dashboardData?.tools.active || 0).toString() },
                  { label: 'Maintenance', value: (dashboardData?.tools.maintenance || 0).toString() },
                ]}
              />
              
              <EngineeringStatusCard
                title="Order Processing"
                status="active"
                progress={dashboardData?.orders.efficiency || 0}
                icon="automation"
                description="Intelligent order processing and fulfillment"
                metrics={[
                  { label: 'Pending', value: (dashboardData?.orders.pending || 0).toString() },
                  { label: 'Processing', value: (dashboardData?.orders.processing || 0).toString() },
                  { label: 'Completed', value: (dashboardData?.orders.completed || 0).toString() },
                ]}
              />
              
              <EngineeringStatusCard
                title="User Management"
                status="idle"
                progress={dashboardData?.users.efficiency || 0}
                icon="engineering"
                description="User access control and activity monitoring"
                metrics={[
                  { label: 'Active Users', value: (dashboardData?.users.active || 0).toString() },
                  { label: 'Total Users', value: (dashboardData?.users.total || 0).toString() },
                ]}
              />
            </Box>
          </Box>

          {/* Recent Activity */}
          <Box>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${stemColors.background.card} 0%, ${stemColors.background.surface} 100%)`,
                border: `1px solid ${stemColors.secondary[200]}`,
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Recent Activity
                  </Typography>
                  <IconButton size="small" onClick={handleRefresh}>
                    <RefreshIcon />
                  </IconButton>
                </Box>
                
                <Stack spacing={2}>
                  {dashboardData?.recentActivity?.map((activity, index) => (
                    <Box key={activity.id}>
                      <Box display="flex" alignItems="flex-start" gap={2}>
                        {getStatusIcon(activity.status)}
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {activity.action}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.item}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {activity.time}
                          </Typography>
                        </Box>
                        <Chip
                          label={activity.type}
                          size="small"
                          sx={{
                            background: stemColors.primary[100],
                            color: stemColors.primary[700],
                            fontWeight: 500,
                          }}
                        />
                      </Box>
                      {index < (dashboardData?.recentActivity?.length || 0) - 1 && (
                        <Divider sx={{ mt: 2 }} />
                      )}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* System Alerts */}
        <Box mt={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              System Alerts
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" color="text.secondary">
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
              </Typography>
              <IconButton 
                size="small" 
                onClick={fetchAlerts}
                disabled={alertsLoading}
                sx={{ ml: 1 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          {alertsLoading ? (
            <Box display="flex" alignItems="center" gap={2} p={2}>
              <LinearProgress sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Loading alerts...
              </Typography>
            </Box>
          ) : alerts.length === 0 ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                No active alerts - all systems operating normally
              </Typography>
            </Alert>
          ) : (
            <Stack spacing={2}>
              {alerts.map((alert) => {
                const getAlertIcon = () => {
                  switch (alert.type) {
                    case 'maintenance':
                      return <STEMIcons.manufacturing />;
                    case 'inventory':
                      return <STEMIcons.electronics />;
                    case 'system':
                      return <STEMIcons.innovation />;
                    default:
                      return <InfoIcon />;
                  }
                };

                const getAlertColors = () => {
                  switch (alert.severity) {
                    case 'error':
                      return {
                        background: `linear-gradient(135deg, ${stemColors.accent.red}15 0%, ${stemColors.accent.red}25 100%)`,
                        border: `1px solid ${stemColors.accent.red}40`,
                        iconColor: stemColors.accent.red,
                      };
                    case 'warning':
                      return {
                        background: `linear-gradient(135deg, ${stemColors.accent.yellow}15 0%, ${stemColors.accent.yellow}25 100%)`,
                        border: `1px solid ${stemColors.accent.yellow}40`,
                        iconColor: stemColors.accent.yellow,
                      };
                    case 'info':
                    default:
                      return {
                        background: `linear-gradient(135deg, ${stemColors.primary[50]} 0%, ${stemColors.primary[100]} 100%)`,
                        border: `1px solid ${stemColors.primary[200]}`,
                        iconColor: stemColors.primary[600],
                      };
                  }
                };

                const colors = getAlertColors();

                return (
                  <Alert
                    key={alert.id}
                    severity={alert.severity}
                    icon={getAlertIcon()}
                    sx={{
                      background: colors.background,
                      border: colors.border,
                      '& .MuiAlert-icon': {
                        color: colors.iconColor,
                      },
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {alert.title}
                    </Typography>
                    <Typography variant="caption">
                      {alert.message}
                    </Typography>
                    {alert.data && (
                      <Box mt={1}>
                        <Chip 
                          label={alert.type} 
                          size="small" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    )}
                  </Alert>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>

      {/* Pending Payment Orders */}
      {pendingOrders.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ color: stemColors.primary[500], fontWeight: 'bold' }}>
            <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Pending Payment Orders
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {pendingOrders.map((order) => (
              <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Card sx={{ 
                  border: '2px solid', 
                  borderColor: stemColors.accent.orange,
                  backgroundColor: 'rgba(255, 152, 0, 0.05)'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: stemColors.primary[700] }}>
                          Order #{order.order_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Customer ID: {order.customer_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Set Type: {order.set_type === 'admin' ? 'Platform Set' : 'Provider Set'}
                        </Typography>
                      </Box>
                      <Chip 
                        label="Pending Payment" 
                        color="warning" 
                        size="small"
                        icon={<ReceiptIcon />}
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ color: stemColors.accent.green, fontWeight: 'bold' }}>
                        €{order.total_amount?.toFixed(2) || '0.00'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Payment Method: {order.payment_method || 'Invoice'}
                      </Typography>
                    </Box>
                    
                    {order.notes && (
                      <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                        "{order.notes}"
                      </Typography>
                    )}
                    
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<PaymentIcon />}
                      onClick={() => handleConfirmPayment(order.order_id)}
                      disabled={confirmingPayment === order.order_id}
                      fullWidth
                      sx={{
                        backgroundColor: stemColors.accent.green,
                        '&:hover': { backgroundColor: stemColors.accent.green + 'dd' }
                      }}
                    >
                      {confirmingPayment === order.order_id ? 'Confirming...' : 'Confirm Payment'}
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* System Settings Dialog */}
      <SystemSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </CircuitBoardPattern>
  );
};

export default STEMDashboard;
