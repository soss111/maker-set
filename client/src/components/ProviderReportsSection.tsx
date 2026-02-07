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
  Error as ErrorIcon, Info as InfoIcon, ExpandMore as ExpandMoreIcon, AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon, Assessment as AssessmentIcon
} from '@mui/icons-material';
import { ordersApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ProviderReport {
  report_id: number;
  month: number;
  year: number;
  total_providers: number;
  total_revenue: number;
  total_platform_fees: number;
  total_provider_payments: number;
  report_data: any;
  generated_at: string;
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
  created_for?: number;
}

interface MotivationData {
  message: string;
  performance_trend: string;
  suggestions: string[];
  motivational_tone: string;
  generated_at: string;
}

const ProviderReportsSection: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ProviderReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dialog states
  const [reportDetailsOpen, setReportDetailsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProviderReport | null>(null);
  const [reportInvoices, setReportInvoices] = useState<ProviderInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

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

  const handleViewReportDetails = async (report: ProviderReport) => {
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
      case 'provider_monthly_report': return <ReceiptIcon />;
      case 'monthly_report': return <CalendarMonthIcon />;
      case 'provider_payment': return <ReceiptIcon />;
      case 'invoice_generated': return <DownloadIcon />;
      case 'system_error': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  // Get the latest motivational message
  const getLatestMotivationMessage = () => {
    const reportNotification = myNotifications.find(n => n.type === 'provider_monthly_report' && n.data?.motivation);
    return reportNotification?.data?.motivation || null;
  };

  const getMotivationToneColor = (tone: string) => {
    switch (tone) {
      case 'celebratory': return 'success';
      case 'positive': return 'info';
      case 'encouraging': return 'primary';
      case 'supportive': return 'warning';
      case 'motivational': return 'error';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'excellent': return '🚀';
      case 'good': return '📈';
      case 'stable': return '📊';
      case 'declining': return '📉';
      case 'challenging': return '💪';
      case 'new': return '🆕';
      default: return '📊';
    }
  };

  // Filter reports to show only those relevant to this provider
  const myReports = reports.filter(report => {
    if (!report.report_data || !report.report_data.providers) return false;
    return report.report_data.providers.some((provider: any) => provider.provider_id === user?.user_id);
  });

  // Filter notifications to show only those for this provider
  const myNotifications = notifications.filter(notification => 
    notification.created_for === user?.user_id || notification.type === 'provider_monthly_report'
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          My Monthly Reports & Payments
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
        {/* AI Motivation Assistant */}
        {getLatestMotivationMessage() && (
          <Box sx={{ width: '100%' }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🤖 AI Motivation Assistant
                  <Chip 
                    label={getLatestMotivationMessage().motivational_tone} 
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Chip 
                    label={`${getTrendIcon(getLatestMotivationMessage().performance_trend)} ${getLatestMotivationMessage().performance_trend}`}
                    size="small" 
                    sx={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      fontWeight: 'bold'
                    }} 
                  />
                </Typography>
                
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(255,255,255,0.1)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <Typography variant="body1" sx={{ 
                    whiteSpace: 'pre-line', 
                    lineHeight: 1.6,
                    fontFamily: 'monospace'
                  }}>
                    {getLatestMotivationMessage().message}
                  </Typography>
                </Paper>
                
                {getLatestMotivationMessage().suggestions && getLatestMotivationMessage().suggestions.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      💡 AI Suggestions:
                    </Typography>
                    <List dense>
                      {getLatestMotivationMessage().suggestions.map((suggestion: string, index: number) => (
                        <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                          <ListItemText 
                            primary={
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                                • {suggestion}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
                       </Box>
        )}

        {/* Notifications Summary */}
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
                My Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your payment notifications and report alerts.
              </Typography>
              
              {myNotifications.length > 0 ? (
                <List dense>
                  {myNotifications.slice(0, 5).map((notification) => (
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

        {/* Payment Summary */}
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon />
                Payment Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your earnings overview from monthly reports.
              </Typography>
              
              {myReports.length > 0 ? (
                <Box>
                  {myReports.slice(0, 1).map((report) => {
                    const myProviderData = report.report_data?.providers?.find((p: any) => p.provider_id === user?.user_id);
                    return myProviderData ? (
                      <Box key={report.report_id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">Latest Payment:</Typography>
                          <Typography variant="h6" color="success.main">
                            €{myProviderData.provider_payment.toFixed(2)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">Total Revenue:</Typography>
                          <Typography variant="body2">€{myProviderData.total_revenue.toFixed(2)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">Orders:</Typography>
                          <Typography variant="body2">{myProviderData.total_orders}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="subtitle2">Period:</Typography>
                          <Typography variant="body2">
                            {new Date(report.year, report.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </Typography>
                        </Box>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          startIcon={<DownloadIcon />}
                          onClick={async () => {
                            try {
                              const response = await fetch(`http://localhost:5001/api/provider-payments/invoice/${user?.user_id}`, {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify({ 
                                  month: report.month, 
                                  year: report.year 
                                })
                              });
                              
                              if (response.ok) {
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                // Open PDF in new tab
                                window.open(url, '_blank');
                                setSuccessMessage('Invoice opened in new tab');
                              } else {
                                setError('Failed to generate invoice');
                              }
                            } catch (err) {
                              console.error('Error downloading invoice:', err);
                              setError('Failed to download invoice');
                            }
                          }}
                        >
                          📄 Open Invoice
                        </Button>
                      </Box>
                    ) : null;
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No payment data available yet.
                </Typography>
              )}
            </CardContent>
          </Card>
                       </Box>

        {/* My Reports History */}
        <Box sx={{ width: '100%' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssessmentIcon />
                My Reports History
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : myReports.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Period</TableCell>
                      <TableCell>Orders</TableCell>
                      <TableCell>Revenue</TableCell>
                      <TableCell>My Payment</TableCell>
                      <TableCell>Platform Fee</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Generated</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {myReports.map((report) => {
                      const myProviderData = report.report_data?.providers?.find((p: any) => p.provider_id === user?.user_id);
                      return myProviderData ? (
                        <TableRow key={report.report_id}>
                          <TableCell>
                            {new Date(report.year, report.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </TableCell>
                          <TableCell>{myProviderData.total_orders}</TableCell>
                          <TableCell>€{myProviderData.total_revenue.toFixed(2)}</TableCell>
                          <TableCell>€{myProviderData.provider_payment.toFixed(2)}</TableCell>
                          <TableCell>€{myProviderData.platform_fee_amount.toFixed(2)}</TableCell>
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
                      ) : null;
                    })}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  No monthly reports available yet.
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
              {(() => {
                const myProviderData = selectedReport.report_data?.providers?.find((p: any) => p.provider_id === user?.user_id);
                return myProviderData ? (
                  <Box>
                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                       <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                        <Typography variant="subtitle2" color="text.secondary">Total Orders</Typography>
                        <Typography variant="h6">{myProviderData.total_orders}</Typography>
                       </Box>
                       <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                        <Typography variant="subtitle2" color="text.secondary">Total Revenue</Typography>
                        <Typography variant="h6">€{myProviderData.total_revenue.toFixed(2)}</Typography>
                       </Box>
                       <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                        <Typography variant="subtitle2" color="text.secondary">Your Payment</Typography>
                        <Typography variant="h6" color="success.main">€{myProviderData.provider_payment.toFixed(2)}</Typography>
                       </Box>
                       <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
                        <Typography variant="subtitle2" color="text.secondary">Platform Fee</Typography>
                        <Typography variant="h6" color="primary.main">€{myProviderData.platform_fee_amount.toFixed(2)}</Typography>
                       </Box>
                       </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>Invoice</Typography>
                    
                    {loadingInvoices ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress />
                      </Box>
                    ) : reportInvoices.length > 0 ? (
                      <Box>
                        {reportInvoices.filter(invoice => invoice.provider_id === user?.user_id).map((invoice) => (
                          <Box key={invoice.invoice_id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="subtitle2">Invoice #{invoice.invoice_id}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Amount: €{invoice.provider_payment.toFixed(2)}
                                </Typography>
                              </Box>
                              <Box>
                                <Chip label={invoice.status} color={getStatusColor(invoice.status) as any} size="small" sx={{ mr: 1 }} />
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
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No invoice generated for this report.
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No data available for this report.
                  </Typography>
                );
              })()}
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

export default ProviderReportsSection;
