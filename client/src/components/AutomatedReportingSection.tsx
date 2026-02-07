import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box, Typography, Card, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Alert, Snackbar, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Divider, List, ListItem, ListItemText, ListItemSecondaryAction,
  Badge, Tooltip, Paper, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Schedule as ScheduleIcon, Download as DownloadIcon, Refresh as RefreshIcon,
  Notifications as NotificationsIcon, Visibility as VisibilityIcon, GetApp as GetAppIcon,
  CalendarMonth as CalendarMonthIcon, Receipt as ReceiptIcon, CheckCircle as CheckCircleIcon,
  Error as ErrorIcon, Info as InfoIcon, ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { ordersApi } from '../services/api';

interface MonthlyReport {
  report_id: number;
  month: number;
  year: number;
  total_providers: number;
  total_revenue: number;
  total_platform_fees: number;
  total_provider_payments: number;
  report_data: any;
  generated_at: string;
  generated_by_name: string;
  status: string;
}

interface ProviderInvoice {
  invoice_id: number;
  provider_id: number;
  provider_name: string;
  provider_company: string;
  month: number;
  year: number;
  total_revenue: number;
  provider_markup_percentage: number;
  provider_payment: number;
  platform_fee: number;
  invoice_pdf_path: string;
  status: string;
  created_at: string;
}

interface Notification {
  notification_id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  priority: string;
}

const AutomatedReportingSection: React.FC = () => {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Manual generation states
  const [manualMonth, setManualMonth] = useState<number>(new Date().getMonth() + 1);
  const [manualYear, setManualYear] = useState<number>(new Date().getFullYear());
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Dialog states
  const [reportDetailsOpen, setReportDetailsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [reportInvoices, setReportInvoices] = useState<ProviderInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsResponse, notificationsResponse, unreadResponse] = await Promise.all([
        ordersApi.getMonthlyReports(),
        ordersApi.getNotifications(),
        ordersApi.getUnreadNotificationCount()
      ]);
      
      setReports(reportsResponse.data.reports || []);
      setNotifications(notificationsResponse.data.notifications || []);
      setUnreadCount(unreadResponse.data.count || 0);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setError(null);
    
    try {
      await ordersApi.generateMonthlyReport(manualMonth, manualYear);
      setSuccessMessage(`Monthly report generation started for ${manualMonth}/${manualYear}`);
      setTimeout(() => fetchData(), 2000); // Refresh data after 2 seconds
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.error || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleViewReportDetails = async (report: MonthlyReport) => {
    setSelectedReport(report);
    setReportDetailsOpen(true);
    setLoadingInvoices(true);
    
    try {
      const response = await ordersApi.getMonthlyReportInvoices(report.report_id);
      setReportInvoices(response.data.invoices || []);
    } catch (err: any) {
      console.error('Error fetching report invoices:', err);
      setError(err.response?.data?.error || 'Failed to fetch report invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleDownloadInvoice = async (filename: string) => {
    try {
      const response = await ordersApi.downloadInvoice(filename);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage(`Invoice ${filename} downloaded successfully`);
    } catch (err: any) {
      console.error('Error downloading invoice:', err);
      setError(err.response?.data?.error || 'Failed to download invoice');
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: number) => {
    try {
      await ordersApi.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'success';
      case 'processed': return 'info';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'monthly_report': return <CalendarMonthIcon />;
      case 'provider_payment': return <ReceiptIcon />;
      case 'invoice_generated': return <DownloadIcon />;
      case 'system_error': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon />
          Automated Reporting & Notifications
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{renderError(error)}</Alert>}
      {successMessage && <Snackbar open={true} autoHideDuration={6000} onClose={() => setSuccessMessage(null)}>
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Manual Report Generation */}
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthIcon />
                Manual Report Generation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Generate monthly reports manually for any month/year combination.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                 <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                  <FormControl fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={manualMonth}
                      label="Month"
                      onChange={(e) => setManualMonth(Number(e.target.value))}
                    >
                      {months.map(month => (
                        <MenuItem key={month} value={month}>
                          {new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                 </Box>
                 <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                  <FormControl fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={manualYear}
                      label="Year"
                      onChange={(e) => setManualYear(Number(e.target.value))}
                    >
                      {years.map(year => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                 </Box>
                 </Box>
              
              <Button
                variant="contained"
                startIcon={generatingReport ? <CircularProgress size={20} /> : <ScheduleIcon />}
                onClick={handleGenerateReport}
                disabled={generatingReport}
                fullWidth
              >
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>
                 </Box>

        {/* Notifications Summary */}
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
                System Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Recent automated notifications and system alerts.
              </Typography>
              
              {notifications.length > 0 ? (
                <List dense>
                  {notifications.slice(0, 3).map((notification) => (
                    <ListItem key={notification.notification_id} sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getNotificationIcon(notification.type)}
                            <Typography variant="subtitle2" sx={{ fontWeight: notification.is_read ? 'normal' : 'bold' }}>
                              {notification.title}
                            </Typography>
                            <Chip 
                              label={notification.priority} 
                              size="small" 
                              color={getPriorityColor(notification.priority) as any}
                            />
                          </Box>
                        }
                        secondary={notification.message}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Mark as read">
                          <IconButton
                            size="small"
                            onClick={() => handleMarkNotificationAsRead(notification.notification_id)}
                            disabled={notification.is_read}
                          >
                            <CheckCircleIcon color={notification.is_read ? 'disabled' : 'primary'} />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No notifications available.
                </Typography>
              )}
            </CardContent>
          </Card>
                 </Box>

        {/* Monthly Reports History */}
        <Box sx={{ width: '100%' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptIcon />
                Monthly Reports History
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : reports.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Period</TableCell>
                      <TableCell>Providers</TableCell>
                      <TableCell>Total Revenue</TableCell>
                      <TableCell>Provider Payments</TableCell>
                      <TableCell>Platform Fees</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Generated</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.report_id}>
                        <TableCell>
                          {new Date(report.year, report.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell>{report.total_providers}</TableCell>
                        <TableCell>€{report.total_revenue.toFixed(2)}</TableCell>
                        <TableCell>€{report.total_provider_payments.toFixed(2)}</TableCell>
                        <TableCell>€{report.total_platform_fees.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip label={report.status} color={getStatusColor(report.status) as any} size="small" />
                        </TableCell>
                        <TableCell>
                          {new Date(report.generated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewReportDetails(report)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No monthly reports generated yet.
                </Typography>
              )}
            </CardContent>
          </Card>
                 </Box>
                 </Box>

      {/* Report Details Dialog */}
      <Dialog open={reportDetailsOpen} onClose={() => setReportDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Report Details - {selectedReport && new Date(selectedReport.year, selectedReport.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                 <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Total Providers</Typography>
                  <Typography variant="h6">{selectedReport.total_providers}</Typography>
                 </Box>
                 <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Total Revenue</Typography>
                  <Typography variant="h6">€{selectedReport.total_revenue.toFixed(2)}</Typography>
                 </Box>
                 <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Provider Payments</Typography>
                  <Typography variant="h6" color="success.main">€{selectedReport.total_provider_payments.toFixed(2)}</Typography>
                 </Box>
                 <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Platform Fees</Typography>
                  <Typography variant="h6" color="primary.main">€{selectedReport.total_platform_fees.toFixed(2)}</Typography>
                 </Box>
                 </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Provider Invoices</Typography>
              
              {loadingInvoices ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress />
                </Box>
              ) : reportInvoices.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Provider</TableCell>
                      <TableCell>Revenue</TableCell>
                      <TableCell>Markup %</TableCell>
                      <TableCell>Payment</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportInvoices.map((invoice) => (
                      <TableRow key={invoice.invoice_id}>
                        <TableCell>
                          <Typography variant="subtitle2">{invoice.provider_company}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {invoice.provider_name}
                          </Typography>
                        </TableCell>
                        <TableCell>€{invoice.total_revenue.toFixed(2)}</TableCell>
                        <TableCell>{invoice.provider_markup_percentage}%</TableCell>
                        <TableCell>€{invoice.provider_payment.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip label={invoice.status} color={getStatusColor(invoice.status) as any} size="small" />
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_pdf_path && (
                            <Tooltip title="Download PDF">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadInvoice(invoice.invoice_pdf_path.split('/').pop() || '')}
                              >
                                <GetAppIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No invoices generated for this report.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutomatedReportingSection;
