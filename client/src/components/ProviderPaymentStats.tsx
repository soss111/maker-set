import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Pending as PendingIcon,
  CheckCircle as CompletedIcon,
  Error as FailedIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { providerApi } from '../services/api';

interface PaymentStats {
  total_orders: number;
  total_revenue: number;
  platform_fee_percentage: number;
  platform_fee_amount: number;
  provider_earnings: number;
  payment_stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  earnings_by_status: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

interface Order {
  order_id: number;
  set_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  provider_price: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  payment_reference?: string;
  payment_amount?: number;
  payment_date?: string;
  payment_confirmed_by?: number;
  payment_confirmed_at?: string;
  created_at: string;
}

interface PaymentStatsData {
  success: boolean;
  provider_id: number;
  month: number;
  year: number;
  statistics: PaymentStats;
  orders: Order[];
}

const ProviderPaymentStats: React.FC = () => {
  const [data, setData] = useState<PaymentStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);

  const fetchPaymentStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await providerApi.getPaymentStats();
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load payment statistics');
      console.error('Error fetching payment stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentStats();
  }, []);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CompletedIcon />;
      case 'processing': return <PendingIcon />;
      case 'failed': return <FailedIcon />;
      default: return <PendingIcon />;
    }
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {renderError(error)}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info">
        No payment data available.
      </Alert>
    );
  }

  const { statistics, orders, month, year } = data;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          💰 Payment Statistics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => setRefreshDialogOpen(true)}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <ReceiptIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Orders</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {statistics.total_orders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {month}/{year}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <MoneyIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Your Earnings</Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {formatCurrency(statistics.provider_earnings)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              80% of revenue
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <PendingIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Pending</Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {statistics.payment_stats.pending}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCurrency(statistics.earnings_by_status.pending)}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <CompletedIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Completed</Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {statistics.payment_stats.completed}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCurrency(statistics.earnings_by_status.completed)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Payment Status Breakdown */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment Status Breakdown
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {statistics.payment_stats.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(statistics.earnings_by_status.pending)}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {statistics.payment_stats.processing}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processing
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(statistics.earnings_by_status.processing)}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {statistics.payment_stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(statistics.earnings_by_status.completed)}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="error.main">
                {statistics.payment_stats.failed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Failed
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(statistics.earnings_by_status.failed)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Order Details
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Set Name</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment Status</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Payment Date</TableCell>
                  <TableCell>Order Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell>{order.order_id}</TableCell>
                    <TableCell>{order.set_name}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{formatCurrency(order.unit_price)}</TableCell>
                    <TableCell>{formatCurrency(order.line_total)}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.status}
                        color={order.status === 'delivered' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getPaymentStatusIcon(order.payment_status)}
                        label={order.payment_status}
                        color={getPaymentStatusColor(order.payment_status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{order.payment_method || '-'}</TableCell>
                    <TableCell>
                      {order.payment_date ? formatDate(order.payment_date) : '-'}
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Refresh Confirmation Dialog */}
      <Dialog open={refreshDialogOpen} onClose={() => setRefreshDialogOpen(false)}>
        <DialogTitle>Refresh Payment Data</DialogTitle>
        <DialogContent>
          <Typography>
            This will fetch the latest payment statistics from the server. Continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefreshDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setRefreshDialogOpen(false);
              fetchPaymentStats();
            }}
            variant="contained"
          >
            Refresh
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProviderPaymentStats;

