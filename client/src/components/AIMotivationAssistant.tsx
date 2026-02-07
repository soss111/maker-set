import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box, Typography, Card, CardContent, Button, Table, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Alert, Snackbar, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Divider, List, ListItem, ListItemText, ListItemSecondaryAction,
  Badge, Tooltip, Paper, Accordion, AccordionSummary, AccordionDetails, TextField, Tabs, Tab
} from '@mui/material';
import {
  Schedule as ScheduleIcon, Download as DownloadIcon, Refresh as RefreshIcon,
  Notifications as NotificationsIcon, Visibility as VisibilityIcon, GetApp as GetAppIcon,
  CalendarMonth as CalendarMonthIcon, Receipt as ReceiptIcon, CheckCircle as CheckCircleIcon,
  Error as ErrorIcon, Info as InfoIcon, ExpandMore as ExpandMoreIcon, AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon, Assessment as AssessmentIcon, Psychology as PsychologyIcon,
  Send as SendIcon, Preview as PreviewIcon, AutoAwesome as AIIcon, People as PeopleIcon
} from '@mui/icons-material';
import { ordersApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ProviderData {
  provider_id: number;
  provider_name: string;
  provider_company: string;
  provider_email: string;
  provider_markup_percentage: number;
  total_orders: number;
  total_revenue: number;
  provider_payment: number;
  platform_fee_amount: number;
}

interface MotivationData {
  message: string;
  performance_trend: string;
  suggestions: string[];
  motivational_tone: string;
  generated_at: string;
}

const AIMotivationAssistant: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const [motivationData, setMotivationData] = useState<MotivationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Manual generation states
  const [manualMonth, setManualMonth] = useState<number>(new Date().getMonth() + 1);
  const [manualYear, setManualYear] = useState<number>(new Date().getFullYear());
  const [generatingMotivation, setGeneratingMotivation] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      // Get providers from users table
      const response = await ordersApi.getMonthlyReports();
      // For now, we'll create mock provider data since we need provider info
      const mockProviders: ProviderData[] = [
        {
          provider_id: 8,
          provider_name: 'John Provider',
          provider_company: 'TechMakers Ltd',
          provider_email: 'john@techmakers.com',
          provider_markup_percentage: 80,
          total_orders: 5,
          total_revenue: 250.00,
          provider_payment: 200.00,
          platform_fee_amount: 50.00
        },
        {
          provider_id: 9,
          provider_name: 'Sarah Creator',
          provider_company: 'CraftStudio',
          provider_email: 'sarah@craftstudio.com',
          provider_markup_percentage: 75,
          total_orders: 3,
          total_revenue: 150.00,
          provider_payment: 112.50,
          platform_fee_amount: 37.50
        }
      ];
      setProviders(mockProviders);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
      setError(err.response?.data?.error || 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const generateMotivationMessage = async (provider: ProviderData) => {
    setGeneratingMotivation(true);
    setError(null);
    
    try {
      // Simulate AI motivation generation
      const mockMotivationData: MotivationData = {
        message: `Hello ${provider.provider_company}! 👋\n\n` +
                `🎉 AMAZING WORK this ${new Date(manualYear, manualMonth - 1, 1).toLocaleString('default', { month: 'long' })}! ` +
                `You've earned €${provider.provider_payment.toFixed(2)} from ${provider.total_orders} orders - that's fantastic growth! ` +
                `Your dedication to quality sets is really paying off.\n\n` +
                `💡 Here are some ideas to help you succeed:\n` +
                `• Christmas is coming! Gift sets and holiday themes\n` +
                `• Consider creating sets for different skill levels\n` +
                `• High-quality photos and descriptions boost sales\n\n` +
                `🎯 Remember: Every successful provider started exactly where you are now. ` +
                `Keep creating amazing sets, and your customers will keep coming back!\n\n` +
                `Looking forward to seeing your success next month! 🌟\n\n` +
                `Best regards,\nThe MakerSet Team`,
        performance_trend: provider.total_orders > 4 ? 'excellent' : provider.total_orders > 2 ? 'good' : 'stable',
        suggestions: [
          'Christmas is coming! Gift sets and holiday themes',
          'Consider creating sets for different skill levels',
          'High-quality photos and descriptions boost sales'
        ],
        motivational_tone: provider.total_orders > 4 ? 'celebratory' : provider.total_orders > 2 ? 'positive' : 'encouraging',
        generated_at: new Date().toISOString()
      };
      
      setMotivationData(mockMotivationData);
      setSelectedProvider(provider);
      setSuccessMessage(`Motivation message generated for ${provider.provider_company}`);
    } catch (err: any) {
      console.error('Error generating motivation:', err);
      setError(err.response?.data?.error || 'Failed to generate motivation message');
    } finally {
      setGeneratingMotivation(false);
    }
  };

  const sendMotivationToProvider = async (provider: ProviderData, motivation: MotivationData) => {
    try {
      // This would send the motivation to the provider's dashboard
      setSuccessMessage(`Motivation message sent to ${provider.provider_company}`);
    } catch (err: any) {
      console.error('Error sending motivation:', err);
      setError(err.response?.data?.error || 'Failed to send motivation message');
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

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'celebratory': return 'success';
      case 'positive': return 'info';
      case 'encouraging': return 'primary';
      case 'supportive': return 'warning';
      case 'motivational': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon />
          AI Motivation Assistant
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchProviders}
          disabled={loading}
        >
          Refresh Providers
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{renderError(error)}</Alert>}
      {successMessage && <Snackbar open={true} autoHideDuration={6000} onClose={() => setSuccessMessage(null)}>
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>}

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Generate Motivation" icon={<AIIcon />} />
        <Tab label="Provider Management" icon={<PeopleIcon />} />
        <Tab label="Motivation History" icon={<AssessmentIcon />} />
      </Tabs>

      {/* Generate Motivation Tab */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Manual Generation Controls */}
          <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthIcon />
                  Generate Motivation Message
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create personalized motivational messages for providers based on their performance.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
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
                  <Box sx={{ flex: 1 }}>
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
                
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Provider:
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Provider</InputLabel>
                  <Select
                    value={selectedProvider?.provider_id || ''}
                    label="Provider"
                    onChange={(e) => {
                      const provider = providers.find(p => p.provider_id === Number(e.target.value));
                      setSelectedProvider(provider || null);
                    }}
                  >
                    {providers.map(provider => (
                      <MenuItem key={provider.provider_id} value={provider.provider_id}>
                        {provider.provider_company} ({provider.provider_name})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Button
                  variant="contained"
                  startIcon={generatingMotivation ? <CircularProgress size={20} /> : <AIIcon />}
                  onClick={() => selectedProvider && generateMotivationMessage(selectedProvider)}
                  disabled={generatingMotivation || !selectedProvider}
                  fullWidth
                >
                  {generatingMotivation ? 'Generating...' : 'Generate AI Motivation'}
                </Button>
              </CardContent>
            </Card>
          </Box>

          {/* Generated Motivation Preview */}
          {motivationData && selectedProvider && (
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    🤖 Generated Motivation
                    <Chip 
                      label={motivationData.motivational_tone} 
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                    <Chip 
                      label={`${getTrendIcon(motivationData.performance_trend)} ${motivationData.performance_trend}`}
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
                    border: '1px solid rgba(255,255,255,0.2)',
                    mb: 2
                  }}>
                    <Typography variant="body2" sx={{ 
                      whiteSpace: 'pre-line', 
                      lineHeight: 1.6,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      {motivationData.message}
                    </Typography>
                  </Paper>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={() => sendMotivationToProvider(selectedProvider, motivationData)}
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                      }}
                    >
                      Send to Provider
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PreviewIcon />}
                      sx={{ 
                        borderColor: 'rgba(255,255,255,0.5)',
                        color: 'white',
                        '&:hover': { 
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)'
                        }
                      }}
                    >
                      Preview
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
            </Box>
      )}

      {/* Provider Management Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon />
              Provider Performance Overview
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Provider</TableCell>
                    <TableCell>Orders</TableCell>
                    <TableCell>Revenue</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Trend</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.provider_id}>
                      <TableCell>
                        <Typography variant="subtitle2">{provider.provider_company}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {provider.provider_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{provider.total_orders}</TableCell>
                      <TableCell>€{provider.total_revenue.toFixed(2)}</TableCell>
                      <TableCell>€{provider.provider_payment.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${getTrendIcon(provider.total_orders > 4 ? 'excellent' : provider.total_orders > 2 ? 'good' : 'stable')} ${provider.total_orders > 4 ? 'excellent' : provider.total_orders > 2 ? 'good' : 'stable'}`}
                          color={getToneColor(provider.total_orders > 4 ? 'celebratory' : provider.total_orders > 2 ? 'positive' : 'encouraging') as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Generate Motivation">
                          <IconButton
                            size="small"
                            onClick={() => generateMotivationMessage(provider)}
                            disabled={generatingMotivation}
                          >
                            <AIIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Motivation History Tab */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon />
              Motivation History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track all generated motivation messages and their impact on provider performance.
            </Typography>
            
            <Box sx={{ mt: 2, p: 3, backgroundColor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Motivation history will be available after generating messages for providers.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AIMotivationAssistant;
