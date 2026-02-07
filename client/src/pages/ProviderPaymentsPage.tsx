import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Email as EmailIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Upload as UploadIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
} from '@mui/icons-material';
import { ordersApi, setsApi, providerPaymentsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ProviderPaymentData {
  provider_id: number;
  provider_name: string;
  provider_company: string;
  provider_email: string;
  provider_markup_percentage: number;
  total_orders: number;
  total_revenue: number;
  platform_fee_percentage: number;
  platform_fee_amount: number;
  provider_payment: number;
  orders: Array<{
    order_id: number;
    order_number: string;
    order_date: string;
    total_amount: number;
    status: string;
    payment_status: string;
  }>;
}

interface MonthlyReport {
  month: string;
  year: number;
  total_providers: number;
  total_revenue: number;
  total_platform_fees: number;
  total_provider_payments: number;
  providers: ProviderPaymentData[];
}

const ProviderPaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [currentReport, setCurrentReport] = useState<MonthlyReport | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderPaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate months and years for selection
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchMonthlyReports();
  }, []);

  const fetchMonthlyReports = async () => {
    try {
      setLoading(true);
      // This would call a new API endpoint to get monthly reports
      const response = await fetch('http://localhost:5001/api/provider-payments/monthly-reports', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (response.ok) {
        const reports = await response.json();
        setMonthlyReports(reports);
      }
    } catch (error) {
      console.error('Error fetching monthly reports:', error);
      setError('Failed to load monthly reports');
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyReport = async () => {
    try {
      console.log('🚀 Generate report button clicked');
      setLoading(true);
      setError(null);
      
      const monthIndex = months.indexOf(selectedMonth) + 1;
      console.log(`📅 Generating report for month: ${selectedMonth} (index: ${monthIndex}), year: ${selectedYear}`);
      
      // Use the provider payments API to generate report - this will use authentication properly
      const response = await providerPaymentsApi.generateMonthlyReports({ month: monthIndex, year: selectedYear });
      
      console.log('📊 Report response:', response);
      console.log('📊 Report response.data:', response.data);
      console.log('📊 Report response.data.data:', response.data?.data);
      
      if (response.data) {
        console.log('✅ Report data received:', response.data);
        console.log('📋 Report providers count:', response.data?.providers?.length);
        setCurrentReport(response.data);
        setSuccess(`Monthly report for ${selectedMonth} ${selectedYear} generated successfully!`);
        await fetchMonthlyReports(); // Refresh the list
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error: any) {
      console.error('❌ Error generating report:', error);
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.error || error.message || 'Failed to generate monthly report');
    } finally {
      setLoading(false);
      setGenerateDialogOpen(false);
    }
  };

  const downloadProviderInvoice = async (provider: ProviderPaymentData) => {
    try {
      const response = await fetch(`http://localhost:5001/api/provider-payments/invoice/${provider.provider_id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ 
          month: months.indexOf(selectedMonth) + 1, 
          year: selectedYear 
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${provider.provider_company}-${selectedMonth}-${selectedYear}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(`Invoice downloaded for ${provider.provider_company}`);
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setError('Failed to download invoice');
    }
  };

  const emailProviderInvoice = async (provider: ProviderPaymentData) => {
    try {
      const response = await fetch('http://localhost:5001/api/provider-payments/email-invoice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          provider_id: provider.provider_id,
          month: months.indexOf(selectedMonth) + 1,
          year: selectedYear
        })
      });
      
      if (response.ok) {
        setSuccess(`Invoice sent to ${provider.provider_email}`);
        setEmailDialogOpen(false);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      setError('Failed to send invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'success';
      case 'processing': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const handleEmailAllProviders = async () => {
    if (!currentReport || !currentReport.providers || currentReport.providers.length === 0) {
      setError('No monthly report data available. Please generate a monthly report first.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const provider of currentReport.providers) {
        try {
          await fetch(`http://localhost:5001/api/provider-payments/email-invoice/${provider.provider_id}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              month: months.indexOf(selectedMonth) + 1,
              year: selectedYear
            })
          });
          successCount++;
        } catch (error) {
          console.error(`Error emailing provider ${provider.provider_id}:`, error);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setSuccess(`Successfully notified ${successCount} ${successCount === 1 ? 'provider' : 'providers'}`);
        if (errorCount > 0) {
          setError(`Failed to notify ${errorCount} ${errorCount === 1 ? 'provider' : 'providers'}`);
        }
      } else {
        setError('Failed to notify all providers');
      }
    } catch (error) {
      console.error('Error notifying providers:', error);
      setError('Failed to notify providers');
    } finally {
      setLoading(false);
    }
  };

  const exportReportToCSV = (report: MonthlyReport) => {
    // Create CSV content
    let csv = 'Provider Payment Report\n\n';
    csv += `Month: ${selectedMonth} ${selectedYear}\n`;
    csv += `Total Revenue: €${report.total_revenue.toFixed(2)}\n`;
    csv += `Platform Fees: €${report.total_platform_fees.toFixed(2)}\n`;
    csv += `Provider Payments: €${report.total_provider_payments.toFixed(2)}\n`;
    csv += `Active Providers: ${report.total_providers}\n\n`;
    
    csv += 'Provider,Company,Total Orders,Revenue,Platform Fee,Provider Payment\n';
    
    report.providers.forEach(provider => {
      csv += `"${provider.provider_name}","${provider.provider_company}",${provider.total_orders},${provider.total_revenue},${provider.platform_fee_amount},${provider.provider_payment}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `provider-payments-${selectedMonth}-${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    setSuccess('CSV report downloaded successfully!');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Provider Payments
        </Typography>
        <Button
          variant="contained"
          startIcon={<CalendarIcon />}
          onClick={() => setGenerateDialogOpen(true)}
          sx={{ backgroundColor: 'primary.main' }}
        >
          Generate Monthly Report
        </Button>
      </Box>

      {/* Alerts */}
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

      {/* Summary Cards */}
      {currentReport && (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Total Revenue</Typography>
                  </Box>
                  <Typography variant="h4" color="primary.main">
                    €{currentReport.total_revenue.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MoneyIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6">Platform Fees</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    €{currentReport.total_platform_fees.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PaymentIcon sx={{ mr: 1, color: 'info.main' }} />
                    <Typography variant="h6">Provider Payments</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main">
                    €{currentReport.total_provider_payments.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ReceiptIcon sx={{ mr: 1, color: 'secondary.main' }} />
                    <Typography variant="h6">Active Providers</Typography>
                  </Box>
                  <Typography variant="h4" color="secondary.main">
                    {currentReport.total_providers}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Analytics Summary */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
                  Analytics Summary
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Average revenue per provider: <strong>€{(currentReport.total_revenue / currentReport.total_providers || 0).toFixed(2)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Average orders per provider: <strong>{(currentReport.providers.reduce((sum, p) => sum + p.total_orders, 0) / currentReport.total_providers || 0).toFixed(1)}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Average platform fee: <strong>{((currentReport.total_platform_fees / currentReport.total_revenue) * 100 || 0).toFixed(1)}%</strong>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                      (Weighted average across all providers)
                    </Typography>
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PieChartIcon sx={{ mr: 1, color: 'secondary.main' }} />
                  Top Performers
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {currentReport.providers
                    .sort((a, b) => b.total_revenue - a.total_revenue)
                    .slice(0, 3)
                    .map((provider, index) => (
                      <Box key={provider.provider_id} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {index + 1}. {provider.provider_company}
                        </Typography>
                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                          €{provider.total_revenue.toFixed(2)}
                        </Typography>
                      </Box>
                    ))}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Export and Send Buttons */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => exportReportToCSV(currentReport)}
            >
              Export Report to CSV
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<EmailIcon />}
              onClick={handleEmailAllProviders}
            >
              Notify All Providers
            </Button>
          </Box>
        </>
      )}

      {/* Provider Payments Table */}
      {currentReport && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Provider Payment Details - {selectedMonth} {selectedYear}
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Provider</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Platform Fee</TableCell>
                    <TableCell align="right">Provider Payment</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentReport.providers.map((provider) => (
                    <TableRow key={provider.provider_id}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {provider.provider_company}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {provider.provider_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={provider.total_orders} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" fontWeight="bold">
                          €{provider.total_revenue.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" color="success.main">
                          €{provider.platform_fee_amount.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({100 - (provider.provider_markup_percentage || 0)}%)
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" color="info.main" fontWeight="bold">
                          €{provider.provider_payment.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Download Invoice">
                            <IconButton
                              size="small"
                              onClick={() => downloadProviderInvoice(provider)}
                              color="primary"
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Email Invoice">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedProvider(provider);
                                setEmailDialogOpen(true);
                              }}
                              color="secondary"
                            >
                              <EmailIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Generate Report Dialog */}
      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Monthly Report</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="Month"
              >
                {months.map((month) => (
                  <MenuItem key={month} value={month}>{month}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value as number)}
                label="Year"
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={generateMonthlyReport}
            disabled={!selectedMonth || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CalendarIcon />}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Invoice Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Email Invoice to Provider</DialogTitle>
        <DialogContent>
          {selectedProvider && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Send invoice for <strong>{selectedProvider.provider_company}</strong> to:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedProvider.provider_email}
              </Typography>
              <Typography variant="body2">
                Amount: <strong>€{selectedProvider.provider_payment.toFixed(2)}</strong>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => selectedProvider && emailProviderInvoice(selectedProvider)}
            startIcon={<EmailIcon />}
          >
            Send Invoice
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProviderPaymentsPage;
