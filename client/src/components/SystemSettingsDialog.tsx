import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Slider,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Api as ApiIcon,
  Notifications as NotificationsIcon,
  CloudUpload as BackupIcon,
  Build as BuildIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  Translate as TranslateIcon,
  Accessibility as AccessibilityIcon,
} from '@mui/icons-material';
import { stemColors } from '../theme/stemTheme';
import { SystemSettingsService } from '../services/systemSettingsService';
import { systemSettingsApi } from '../services/systemSettingsApi';
import LibreTranslateStatusMonitor from './LibreTranslateStatusMonitor';
import { AccessibilityProvider, useAccessibility } from './AccessibilityComponents';

interface SystemSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Settings {
  systemName: string;
  systemVersion: string;
  environment: string;
  debugMode: boolean;
  maintenanceMode: boolean;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbSSL: boolean;
  dbPoolSize: number;
  dbTimeout: number;
  apiPort: number;
  apiTimeout: number;
  corsEnabled: boolean;
  rateLimitEnabled: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
  emailNotifications: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  pushNotifications: boolean;
  slackWebhook: string;
  cacheEnabled: boolean;
  cacheTTL: number;
  compressionEnabled: boolean;
  maxFileSize: number;
  concurrentRequests: number;
  sessionTimeout: number;
  passwordMinLength: number;
  twoFactorEnabled: boolean;
  auditLogging: boolean;
  // Invoice Settings
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyTaxId: string;
  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankSwift: string;
  invoicePrefix: string;
  defaultTaxRate: number;
  paymentTerms: string;
  defaultInvoiceTemplate: string;
  
  // Cart Settings
  handlingFee: number;
  handlingFeeDescription: string;
}

// Accessibility Settings Content Component
const AccessibilitySettingsContent: React.FC = () => {
  const {
    highContrast,
    fontSize,
    reducedMotion,
    screenReader,
    keyboardNavigation,
    setHighContrast,
    setFontSize,
    setReducedMotion,
    setScreenReader,
    setKeyboardNavigation
  } = useAccessibility();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Accessibility Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customize the interface to improve accessibility and user experience for all users.
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Visual Settings
          </Typography>
          
          {/* High Contrast */}
          <FormControlLabel
            control={
              <Switch
                id="high-contrast"
                name="high_contrast"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                aria-describedby="high-contrast-description"
              />
            }
            label={
              <Box>
                <Typography variant="body1">High Contrast Mode</Typography>
                <Typography
                  id="high-contrast-description"
                  variant="caption"
                  color="text.secondary"
                >
                  Increases color contrast for better visibility
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />

          {/* Font Size */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Font Size
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {(['small', 'medium', 'large'] as const).map((size) => (
                <Button
                  key={size}
                  variant={fontSize === size ? 'contained' : 'outlined'}
                  onClick={() => setFontSize(size)}
                  aria-pressed={fontSize === size}
                  size="small"
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Reduced Motion */}
          <FormControlLabel
            control={
              <Switch
                id="reduced-motion"
                name="reduced_motion"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                aria-describedby="reduced-motion-description"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Reduce Motion</Typography>
                <Typography
                  id="reduced-motion-description"
                  variant="caption"
                  color="text.secondary"
                >
                  Minimizes animations and transitions
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Interaction Settings
          </Typography>
          
          {/* Screen Reader Mode */}
          <FormControlLabel
            control={
              <Switch
                id="screen-reader"
                name="screen_reader"
                checked={screenReader}
                onChange={(e) => setScreenReader(e.target.checked)}
                aria-describedby="screen-reader-description"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Screen Reader Mode</Typography>
                <Typography
                  id="screen-reader-description"
                  variant="caption"
                  color="text.secondary"
                >
                  Optimizes interface for screen readers
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />

          {/* Keyboard Navigation */}
          <FormControlLabel
            control={
              <Switch
                id="keyboard-navigation"
                name="keyboard_navigation"
                checked={keyboardNavigation}
                onChange={(e) => setKeyboardNavigation(e.target.checked)}
                aria-describedby="keyboard-navigation-description"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Keyboard Navigation</Typography>
                <Typography
                  id="keyboard-navigation-description"
                  variant="caption"
                  color="text.secondary"
                >
                  Enhances keyboard navigation support
                </Typography>
              </Box>
            }
            sx={{ mb: 2 }}
          />
        </Box>
      </Box>
    </Box>
  );
};

const SystemSettingsDialog: React.FC<SystemSettingsDialogProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Backup & Restore state
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  
  // Maintenance state
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  
  // Load settings from service using useMemo to prevent re-creation
  const initialSettings = useMemo(() => {
    const savedSettings = SystemSettingsService.getSettings();
    return {
      systemName: 'MakerSet Solutions',
      systemVersion: '1.0.0',
      environment: 'production',
      debugMode: false,
      maintenanceMode: false,
      dbHost: 'localhost',
      dbPort: 5432,
      dbName: 'makerset_db',
      dbSSL: false,
      dbPoolSize: 10,
      dbTimeout: 5000,
      apiPort: 5001,
      apiTimeout: 30000,
      corsEnabled: true,
      rateLimitEnabled: true,
      rateLimitWindow: 15,
      rateLimitMax: 100,
      emailNotifications: true,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: true,
      pushNotifications: false,
      slackWebhook: '',
      cacheEnabled: true,
      cacheTTL: 300,
      compressionEnabled: true,
      maxFileSize: 10,
      concurrentRequests: 50,
      sessionTimeout: 24,
      passwordMinLength: 8,
      twoFactorEnabled: false,
      auditLogging: true,
      // Invoice Settings from service
      companyName: savedSettings.companyName,
      companyAddress: savedSettings.companyAddress,
      companyPhone: savedSettings.companyPhone,
      companyEmail: savedSettings.companyEmail,
      companyWebsite: savedSettings.companyWebsite,
      companyTaxId: savedSettings.companyTaxId,
      bankName: savedSettings.bankName,
      bankAccountNumber: savedSettings.bankAccountNumber,
      bankIban: savedSettings.bankIban,
      bankSwift: savedSettings.bankSwift,
      invoicePrefix: savedSettings.invoicePrefix,
      defaultTaxRate: savedSettings.defaultTaxRate,
      paymentTerms: savedSettings.paymentTerms,
      defaultInvoiceTemplate: savedSettings.defaultInvoiceTemplate,
      // Cart Settings
      handlingFee: savedSettings.handlingFee,
      handlingFeeDescription: savedSettings.handlingFeeDescription,
    };
  }, []); // Empty dependency array means this only runs once

  const [settings, setSettings] = useState<Settings>(initialSettings);

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadSystemSettings();
      loadBackupHistory();
      loadMaintenanceLogs();
      loadSystemHealth();
    }
  }, [open]);

  const loadSystemSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await systemSettingsApi.getSettings();
      if (response.success && response.data) {
        // Only update if we're on the invoice tab and settings are empty
        setSettings(prev => {
          // Check if invoice fields are empty and update only those
          if (!prev.companyName && response.data.company_name) {
            return { ...prev, ...response.data };
          }
          // Otherwise, don't update to prevent losing focus
          return prev;
        });
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      // Don't show error on initial load failures
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBackupHistory = async () => {
    try {
      setBackupLoading(true);
      const response = await systemSettingsApi.getBackupHistory();
      if (response.success) {
        setBackupHistory(response.data);
      }
    } catch (error) {
      console.error('Error loading backup history:', error);
    } finally {
      setBackupLoading(false);
    }
  };

  const loadMaintenanceLogs = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await systemSettingsApi.getMaintenanceLogs();
      if (response.success) {
        setMaintenanceLogs(response.data);
      }
    } catch (error) {
      console.error('Error loading maintenance logs:', error);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const response = await systemSettingsApi.getSystemHealth();
      if (response.success) {
        setSystemHealth(response.data);
      }
    } catch (error) {
      console.error('Error loading system health:', error);
    }
  };

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleSettingChange = useCallback((key: keyof Settings, value: any) => {
    setSettings(prev => {
      // Only update if value actually changed to prevent unnecessary re-renders
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save each setting individually to /api/settings/:key endpoint
      const authToken = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };
      
      // Define settings to save (only the ones that should be saved to backend)
      const settingsToSave = [
        { key: 'company_name', value: settings.companyName, type: 'string' },
        { key: 'company_address', value: settings.companyAddress, type: 'string' },
        { key: 'company_phone', value: settings.companyPhone, type: 'string' },
        { key: 'company_email', value: settings.companyEmail, type: 'string' },
        { key: 'company_website', value: settings.companyWebsite, type: 'string' },
        { key: 'company_tax_id', value: settings.companyTaxId, type: 'string' },
        { key: 'bank_name', value: settings.bankName, type: 'string' },
        { key: 'bank_account_number', value: settings.bankAccountNumber, type: 'string' },
        { key: 'bank_iban', value: settings.bankIban, type: 'string' },
        { key: 'bank_swift', value: settings.bankSwift, type: 'string' },
        { key: 'invoice_prefix', value: settings.invoicePrefix, type: 'string' },
        { key: 'default_tax_rate', value: settings.defaultTaxRate, type: 'number' },
        { key: 'payment_terms', value: settings.paymentTerms, type: 'string' },
        { key: 'default_invoice_template', value: settings.defaultInvoiceTemplate, type: 'string' },
      ];
      
      // Save each setting
      for (const setting of settingsToSave) {
        const response = await fetch(`http://localhost:5001/api/settings/${setting.key}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ 
            value: String(setting.value), 
            type: setting.type 
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save ${setting.key}`);
        }
      }
      
      // Also save to local storage for backward compatibility
      const invoiceSettings = {
        companyName: settings.companyName,
        companyAddress: settings.companyAddress,
        companyPhone: settings.companyPhone,
        companyEmail: settings.companyEmail,
        companyWebsite: settings.companyWebsite,
        companyTaxId: settings.companyTaxId,
        bankName: settings.bankName,
        bankAccountNumber: settings.bankAccountNumber,
        bankIban: settings.bankIban,
        bankSwift: settings.bankSwift,
        invoicePrefix: settings.invoicePrefix,
        defaultTaxRate: settings.defaultTaxRate,
        paymentTerms: settings.paymentTerms,
        defaultInvoiceTemplate: settings.defaultInvoiceTemplate,
      };
      
      SystemSettingsService.saveSettings(invoiceSettings);
      
      setSuccess('Settings saved successfully');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setError(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to default values
    setSettings({
      systemName: 'MakerSet Solutions',
      systemVersion: '1.0.0',
      environment: 'production',
      debugMode: false,
      maintenanceMode: false,
      dbHost: 'localhost',
      dbPort: 5432,
      dbName: 'makerset_db',
      dbSSL: false,
      dbPoolSize: 10,
      dbTimeout: 5000,
      apiPort: 5001,
      apiTimeout: 30000,
      corsEnabled: true,
      rateLimitEnabled: true,
      rateLimitWindow: 15,
      rateLimitMax: 100,
      emailNotifications: true,
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: true,
      pushNotifications: false,
      slackWebhook: '',
      cacheEnabled: true,
      cacheTTL: 300,
      compressionEnabled: true,
      maxFileSize: 10,
      concurrentRequests: 50,
      sessionTimeout: 24,
      passwordMinLength: 8,
      twoFactorEnabled: false,
      auditLogging: true,
      // Invoice Settings
      companyName: 'MakerSet Solutions',
      companyAddress: '123 Innovation Street, Tech City, TC 12345, Estonia',
      companyPhone: '+372 123 4567',
      companyEmail: 'info@makerset.com',
      companyWebsite: 'www.makerset.com',
      companyTaxId: 'EE123456789',
      bankName: 'Estonian Bank',
      bankAccountNumber: '1234567890',
      bankIban: 'EE123456789012345678',
      bankSwift: 'ESTBEE2X',
      invoicePrefix: 'INV',
      defaultTaxRate: 20,
      paymentTerms: 'prepayment',
      defaultInvoiceTemplate: 'modern',
      // Cart Settings
      handlingFee: 15,
      handlingFeeDescription: 'Handling, Packaging & Transport',
    });
  };

  // Backup & Restore functions
  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      setError(null);
      const response = await systemSettingsApi.createBackup('Manual Backup', 'manual');
      if (response.success) {
        setSuccess('Backup created successfully');
        loadBackupHistory(); // Refresh backup history
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (backupId: number) => {
    if (!window.confirm('Are you sure you want to restore this backup? This will overwrite the current database.')) {
      return;
    }
    
    try {
      setBackupLoading(true);
      setError(null);
      const response = await systemSettingsApi.restoreBackup(backupId);
      if (response.success) {
        setSuccess('Database restored successfully');
        loadBackupHistory(); // Refresh backup history
      }
    } catch (error: any) {
      setError(error.message || 'Failed to restore backup');
    } finally {
      setBackupLoading(false);
    }
  };

  // Maintenance functions
  const handleClearCache = async () => {
    try {
      setMaintenanceLoading(true);
      setError(null);
      const response = await systemSettingsApi.clearCache();
      if (response.success) {
        setSuccess('Cache cleared successfully');
        loadMaintenanceLogs(); // Refresh maintenance logs
      }
    } catch (error: any) {
      setError(error.message || 'Failed to clear cache');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      setMaintenanceLoading(true);
      setError(null);
      const response = await systemSettingsApi.optimizeDatabase();
      if (response.success) {
        setSuccess('Database optimized successfully');
        loadMaintenanceLogs(); // Refresh maintenance logs
      }
    } catch (error: any) {
      setError(error.message || 'Failed to optimize database');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleSystemCheck = async () => {
    try {
      setMaintenanceLoading(true);
      setError(null);
      const response = await systemSettingsApi.systemCheck();
      if (response.success) {
        setSuccess('System check completed successfully');
        loadMaintenanceLogs(); // Refresh maintenance logs
        loadSystemHealth(); // Refresh system health
      }
    } catch (error: any) {
      setError(error.message || 'Failed to run system check');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const hasChanges = true; // For demo purposes

  const TabPanel = (props: { children?: React.ReactNode; index: number; value: number }) => {
    const { children, value, index, ...other } = props;
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`settings-tabpanel-${index}`}
        aria-labelledby={`settings-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      container={typeof document !== 'undefined' ? document.getElementById('root') : undefined}
      PaperProps={{
        sx: {
          minHeight: '80vh',
          background: stemColors.background.primary,
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: `linear-gradient(135deg, ${stemColors.primary[500]} 0%, ${stemColors.primary[700]} 100%)`,
        color: 'white',
        pb: 2
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <SettingsIcon />
          <Typography variant="h5" fontWeight={600}>
            System Settings
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Error and Success Messages */}
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {renderError(error)}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ m: 2 }}>
            {success}
          </Alert>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontWeight: 500,
              }
            }}
          >
            <Tab
              icon={<SettingsIcon />}
              label="System Config"
              iconPosition="start"
            />
            <Tab
              icon={<StorageIcon />}
              label="Database"
              iconPosition="start"
            />
            <Tab
              icon={<ApiIcon />}
              label="API Config"
              iconPosition="start"
            />
            <Tab
              icon={<NotificationsIcon />}
              label="Notifications"
              iconPosition="start"
            />
            <Tab
              icon={<BackupIcon />}
              label="Backup & Restore"
              iconPosition="start"
            />
            <Tab
              icon={<BuildIcon />}
              label="Maintenance"
              iconPosition="start"
            />
            <Tab
              icon={<SpeedIcon />}
              label="Performance"
              iconPosition="start"
            />
            <Tab
              icon={<SecurityIcon />}
              label="Security"
              iconPosition="start"
            />
            <Tab
              icon={<ReceiptIcon />}
              label="Invoice Setup"
              iconPosition="start"
            />
            <Tab
              icon={<TranslateIcon />}
              label="Translation Services"
              iconPosition="start"
            />
            <Tab
              icon={<AccessibilityIcon />}
              label="Accessibility"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* System Configuration Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Basic Configuration
              </Typography>
              <TextField
                fullWidth
                id="system-name"
                name="systemName"
                label="System Name"
                value={settings.systemName}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('systemName', value);
                }}
                margin="normal"
                inputProps={{
                  maxLength: 100
                }}
              />
              <TextField
                fullWidth
                id="system-version"
                name="systemVersion"
                label="System Version"
                value={settings.systemVersion}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('systemVersion', value);
                }}
                margin="normal"
                inputProps={{
                  maxLength: 20
                }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="environment-label">Environment</InputLabel>
                <Select
                  id="environment"
                  name="environment"
                  labelId="environment-label"
                  value={settings.environment}
                  onChange={(e) => handleSettingChange('environment', e.target.value)}
                >
                  <MenuItem value="development">Development</MenuItem>
                  <MenuItem value="staging">Staging</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    id="debug-mode"
                    name="debug_mode"
                    checked={settings.debugMode}
                    onChange={(e) => handleSettingChange('debugMode', e.target.checked)}
                    color="primary"
                  />
                }
                label="Debug Mode"
              />
              <FormControlLabel
                control={
                  <Switch
                    id="maintenance-mode"
                    name="maintenance_mode"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                    color="warning"
                  />
                }
                label="Maintenance Mode"
              />
              {settings.maintenanceMode && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  System is in maintenance mode. Users will see a maintenance page.
                </Alert>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* Database Settings Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Connection Settings
              </Typography>
              <TextField
                fullWidth
                id="db-host"
                name="dbHost"
                label="Database Host"
                value={settings.dbHost}
                onChange={(e) => handleSettingChange('dbHost', e.target.value)}
                margin="normal"
              />
              <TextField
                fullWidth
                id="db-port"
                name="dbPort"
                type="number"
                label="Database Port"
                value={settings.dbPort}
                onChange={(e) => handleSettingChange('dbPort', parseInt(e.target.value))}
                margin="normal"
              />
              <TextField
                fullWidth
                id="db-name"
                name="dbName"
                label="Database Name"
                value={settings.dbName}
                onChange={(e) => handleSettingChange('dbName', e.target.value)}
                margin="normal"
              />
              <FormControlLabel
                control={
                  <Switch
                    id="db-ssl"
                    name="db_ssl"
                    checked={settings.dbSSL}
                    onChange={(e) => handleSettingChange('dbSSL', e.target.checked)}
                  />
                }
                label="Enable SSL"
              />
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Performance Settings
              </Typography>
              <Typography gutterBottom>Connection Pool Size</Typography>
              <Slider
                value={settings.dbPoolSize}
                onChange={(e, value) => handleSettingChange('dbPoolSize', value)}
                min={1}
                max={50}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
              <TextField
                fullWidth
                id="db-timeout"
                name="dbTimeout"
                type="number"
                label="Connection Timeout (ms)"
                value={settings.dbTimeout}
                onChange={(e) => handleSettingChange('dbTimeout', parseInt(e.target.value))}
                margin="normal"
              />
            </Box>
          </Box>
        </TabPanel>

        {/* API Configuration Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Server Configuration
              </Typography>
              <TextField
                fullWidth
                id="api-port"
                name="apiPort"
                type="number"
                label="API Port"
                value={settings.apiPort}
                onChange={(e) => handleSettingChange('apiPort', parseInt(e.target.value))}
                margin="normal"
              />
              <TextField
                fullWidth
                id="api-timeout"
                name="apiTimeout"
                type="number"
                label="Request Timeout (ms)"
                value={settings.apiTimeout}
                onChange={(e) => handleSettingChange('apiTimeout', parseInt(e.target.value))}
                margin="normal"
              />
              <FormControlLabel
                control={
                  <Switch
                    id="cors-enabled"
                    name="cors_enabled"
                    checked={settings.corsEnabled}
                    onChange={(e) => handleSettingChange('corsEnabled', e.target.checked)}
                  />
                }
                label="Enable CORS"
              />
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Rate Limiting
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.rateLimitEnabled}
                    onChange={(e) => handleSettingChange('rateLimitEnabled', e.target.checked)}
                  />
                }
                label="Enable Rate Limiting"
              />
              <TextField
                fullWidth
                id="rate-limit-window"
                name="rateLimitWindow"
                type="number"
                label="Window (minutes)"
                value={settings.rateLimitWindow}
                onChange={(e) => handleSettingChange('rateLimitWindow', parseInt(e.target.value))}
                margin="normal"
                disabled={!settings.rateLimitEnabled}
              />
              <TextField
                fullWidth
                id="rate-limit-max"
                name="rateLimitMax"
                type="number"
                label="Max Requests"
                value={settings.rateLimitMax}
                onChange={(e) => handleSettingChange('rateLimitMax', parseInt(e.target.value))}
                margin="normal"
                disabled={!settings.rateLimitEnabled}
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Email Notifications
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                }
                label="Enable Email Notifications"
              />
              <TextField
                fullWidth
                id="smtp-host"
                name="smtpHost"
                label="SMTP Host"
                value={settings.smtpHost}
                onChange={(e) => handleSettingChange('smtpHost', e.target.value)}
                margin="normal"
                disabled={!settings.emailNotifications}
              />
              <TextField
                fullWidth
                id="smtp-port"
                name="smtpPort"
                type="number"
                label="SMTP Port"
                value={settings.smtpPort}
                onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value))}
                margin="normal"
                disabled={!settings.emailNotifications}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smtpSecure}
                    onChange={(e) => handleSettingChange('smtpSecure', e.target.checked)}
                  />
                }
                label="Use SSL/TLS"
                disabled={!settings.emailNotifications}
              />
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Other Notifications
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  />
                }
                label="Push Notifications"
              />
              <TextField
                fullWidth
                id="slack-webhook"
                name="slackWebhook"
                label="Slack Webhook URL"
                value={settings.slackWebhook}
                onChange={(e) => handleSettingChange('slackWebhook', e.target.value)}
                margin="normal"
                placeholder="https://hooks.slack.com/services/..."
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Backup & Restore Tab */}
        <TabPanel value={activeTab} index={4}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Backup Configuration
            </Typography>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Automated Backups</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Daily Backups"
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Weekly Backups"
                  />
                  <FormControlLabel
                    control={<Switch />}
                    label="Monthly Backups"
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<BackupIcon />}
                color="primary"
                onClick={handleCreateBackup}
                disabled={backupLoading}
              >
                {backupLoading ? 'Creating...' : 'Create Backup Now'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadBackupHistory}
                disabled={backupLoading}
              >
                Refresh History
              </Button>
            </Box>

            {/* Backup History */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Backup History
              </Typography>
              {backupLoading ? (
                <Typography>Loading backup history...</Typography>
              ) : backupHistory.length === 0 ? (
                <Typography color="text.secondary">No backups found</Typography>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backupHistory.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell>{backup.backup_name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={backup.backup_type} 
                              size="small" 
                              color={backup.backup_type === 'manual' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={backup.status} 
                              size="small" 
                              color={backup.status === 'completed' ? 'success' : backup.status === 'failed' ? 'error' : 'warning'}
                            />
                          </TableCell>
                          <TableCell>
                            {backup.file_size ? `${(backup.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(backup.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {backup.status === 'completed' && (
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleRestoreBackup(backup.id)}
                                disabled={backupLoading}
                              >
                                Restore
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* Maintenance Tab */}
        <TabPanel value={activeTab} index={5}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                System Maintenance
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<BuildIcon />}
                  onClick={handleClearCache}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? 'Clearing...' : 'Clear Cache'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<StorageIcon />}
                  onClick={handleOptimizeDatabase}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? 'Optimizing...' : 'Optimize Database'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<WarningIcon />}
                  onClick={handleSystemCheck}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? 'Checking...' : 'System Check'}
                </Button>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Maintenance Schedule
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>Maintenance Window</InputLabel>
                <Select defaultValue="02:00">
                  <MenuItem value="02:00">2:00 AM (Recommended)</MenuItem>
                  <MenuItem value="04:00">4:00 AM</MenuItem>
                  <MenuItem value="06:00">6:00 AM</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              {systemHealth ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>Database Status</Typography>
                      <Chip 
                        label={systemHealth?.database === 'connected' ? 'Healthy' : 'Unhealthy'} 
                        color={systemHealth?.database === 'connected' ? 'success' : 'error'}
                      size="small" 
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>API Status</Typography>
                    <Chip 
                      label={systemHealth?.status === 'healthy' ? 'Online' : 'Offline'} 
                      color={systemHealth?.status === 'healthy' ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>Storage Usage</Typography>
                    <Chip 
                      label="Available" 
                      color="success" 
                      size="small" 
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>Memory Usage</Typography>
                    <Chip 
                      label={`${Math.round((systemHealth?.memory?.heapUsed || 0) / 1024 / 1024)}MB`} 
                      color="success" 
                      size="small" 
                    />
                  </Box>
                </Box>
              ) : (
                <Typography color="text.secondary">Loading system health...</Typography>
              )}
              
              {/* Maintenance Logs */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Maintenance Logs
                </Typography>
                {maintenanceLoading ? (
                  <Typography>Loading maintenance logs...</Typography>
                ) : maintenanceLogs.length === 0 ? (
                  <Typography color="text.secondary">No maintenance logs found</Typography>
                ) : (
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {maintenanceLogs.slice(0, 5).map((log) => (
                      <Box key={log.id} sx={{ mb: 1, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight="bold">
                            {log.operation?.replace(/_/g, ' ').toUpperCase() || 'Unknown Operation'}
                          </Typography>
                          <Chip 
                            label={log.status} 
                            size="small" 
                            color={log.status === 'completed' ? 'success' : log.status === 'failed' ? 'error' : 'warning'}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.started_at).toLocaleString()}
                          {log.duration_ms && ` • ${log.duration_ms}ms`}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={activeTab} index={6}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Caching
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.cacheEnabled}
                    onChange={(e) => handleSettingChange('cacheEnabled', e.target.checked)}
                  />
                }
                label="Enable Caching"
              />
              <TextField
                fullWidth
                id="cache-ttl"
                name="cacheTTL"
                type="number"
                label="Cache TTL (seconds)"
                value={settings.cacheTTL}
                onChange={(e) => handleSettingChange('cacheTTL', parseInt(e.target.value))}
                margin="normal"
                disabled={!settings.cacheEnabled}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.compressionEnabled}
                    onChange={(e) => handleSettingChange('compressionEnabled', e.target.checked)}
                  />
                }
                label="Enable Compression"
              />
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Resource Limits
              </Typography>
              <TextField
                fullWidth
                id="max-file-size"
                name="maxFileSize"
                type="number"
                label="Max File Size (MB)"
                value={settings.maxFileSize}
                onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
                margin="normal"
              />
              <TextField
                fullWidth
                id="concurrent-requests"
                name="concurrentRequests"
                type="number"
                label="Concurrent Requests"
                value={settings.concurrentRequests}
                onChange={(e) => handleSettingChange('concurrentRequests', parseInt(e.target.value))}
                margin="normal"
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={activeTab} index={7}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Authentication
              </Typography>
              <TextField
                fullWidth
                id="session-timeout"
                name="sessionTimeout"
                type="number"
                label="Session Timeout (hours)"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                margin="normal"
              />
              <TextField
                fullWidth
                id="password-min-length"
                name="passwordMinLength"
                type="number"
                label="Min Password Length"
                value={settings.passwordMinLength}
                onChange={(e) => handleSettingChange('passwordMinLength', parseInt(e.target.value))}
                margin="normal"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onChange={(e) => handleSettingChange('twoFactorEnabled', e.target.checked)}
                  />
                }
                label="Enable 2FA"
              />
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Security Features
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auditLogging}
                    onChange={(e) => handleSettingChange('auditLogging', e.target.checked)}
                  />
                }
                label="Audit Logging"
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  View Security Logs
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                >
                  Reset All Sessions
                </Button>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Invoice Setup Tab */}
        <TabPanel value={activeTab} index={8}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Company Information
              </Typography>
              <TextField
                fullWidth
                id="company-name"
                name="companyName"
                label="Company Name"
                value={settings.companyName}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('companyName', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 100
                }}
              />
              <TextField
                fullWidth
                id="company-address"
                name="companyAddress"
                multiline
                rows={3}
                label="Company Address"
                value={settings.companyAddress}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('companyAddress', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 500
                }}
              />
              <TextField
                fullWidth
                id="company-phone"
                name="companyPhone"
                label="Phone Number"
                value={settings.companyPhone}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('companyPhone', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 20
                }}
              />
              <TextField
                fullWidth
                id="company-email"
                name="companyEmail"
                label="Email Address"
                type="email"
                value={settings.companyEmail}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('companyEmail', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 100
                }}
              />
              <TextField
                fullWidth
                id="company-website"
                name="companyWebsite"
                label="Website"
                value={settings.companyWebsite}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('companyWebsite', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 100
                }}
              />
              <TextField
                fullWidth
                id="company-tax-id"
                name="companyTaxId"
                label="Tax ID / VAT Number"
                value={settings.companyTaxId}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('companyTaxId', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 50
                }}
              />
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Banking Information
              </Typography>
              <TextField
                fullWidth
                id="bank-name"
                name="bankName"
                label="Bank Name"
                value={settings.bankName}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('bankName', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 100
                }}
              />
              <TextField
                fullWidth
                id="bank-account-number"
                name="bankAccountNumber"
                label="Account Number"
                value={settings.bankAccountNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('bankAccountNumber', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 50
                }}
              />
              <TextField
                fullWidth
                id="bank-iban"
                name="bankIban"
                label="IBAN"
                value={settings.bankIban}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('bankIban', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 50,
                  style: { textTransform: 'uppercase' }
                }}
              />
              <TextField
                fullWidth
                id="bank-swift"
                name="bankSwift"
                label="SWIFT/BIC Code"
                value={settings.bankSwift}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('bankSwift', value);
                }}
                margin="normal"
                autoComplete="off"
                inputProps={{
                  maxLength: 20,
                  style: { textTransform: 'uppercase' }
                }}
              />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Invoice Settings
              </Typography>
              <TextField
                fullWidth
                id="invoice-prefix"
                name="invoicePrefix"
                label="Invoice Prefix"
                value={settings.invoicePrefix}
                onChange={(e) => {
                  const value = e.target.value;
                  handleSettingChange('invoicePrefix', value);
                }}
                margin="normal"
                autoComplete="off"
                helperText="e.g., INV, BILL, INVOICE"
                inputProps={{
                  maxLength: 10,
                  style: { textTransform: 'uppercase' }
                }}
              />
              <TextField
                fullWidth
                id="default-tax-rate"
                name="defaultTaxRate"
                type="number"
                label="Default Tax Rate (%)"
                value={settings.defaultTaxRate}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  handleSettingChange('defaultTaxRate', value);
                }}
                margin="normal"
                inputProps={{ 
                  min: 0, 
                  max: 100, 
                  step: 0.1,
                  inputMode: 'decimal'
                }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="payment-terms-label">Payment Terms</InputLabel>
                <Select
                  id="payment-terms"
                  name="paymentTerms"
                  labelId="payment-terms-label"
                  value={settings.paymentTerms}
                  onChange={(e) => handleSettingChange('paymentTerms', e.target.value)}
                >
                  <MenuItem value="prepayment">Prepayment</MenuItem>
                  <MenuItem value="net7">Net 7 days</MenuItem>
                  <MenuItem value="net14">Net 14 days</MenuItem>
                  <MenuItem value="net30">Net 30 days</MenuItem>
                  <MenuItem value="net60">Net 60 days</MenuItem>
                  <MenuItem value="due_on_receipt">Due on Receipt</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="invoice-template-label">Default Invoice Template</InputLabel>
                <Select
                  id="invoice-template"
                  name="defaultInvoiceTemplate"
                  labelId="invoice-template-label"
                  value={settings.defaultInvoiceTemplate}
                  onChange={(e) => handleSettingChange('defaultInvoiceTemplate', e.target.value)}
                >
                  <MenuItem value="modern">Modern - Clean, modern design with subtle colors</MenuItem>
                  <MenuItem value="classic">Classic - Traditional business invoice design</MenuItem>
                  <MenuItem value="minimal">Minimal - Simple, clean design with minimal styling</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </TabPanel>

        {/* Translation Services Tab */}
        <TabPanel value={activeTab} index={9}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Translation Services Status
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Monitor the status of LibreTranslate services used for AI translations. 
              When services are offline, the system automatically uses fallback dictionaries.
            </Typography>
            
            {/* LibreTranslateStatusMonitor - Disabled to prevent CORS errors */}
            {/* <LibreTranslateStatusMonitor /> */}
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Translation Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure translation settings and fallback behavior.
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Supported Languages
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {['English', 'Estonian', 'Russian', 'Finnish'].map((lang) => (
                      <Chip key={lang} label={lang} size="small" color="primary" />
                    ))}
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Fallback Strategy
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    When LibreTranslate services are unavailable, the system uses:
                  </Typography>
                  <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                    <li>Static dictionary translations</li>
                    <li>Word-by-word fallback</li>
                    <li>Original text preservation</li>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Accessibility Tab */}
        <TabPanel value={activeTab} index={10}>
          <AccessibilitySettingsContent />
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Box>
            {hasChanges && (
              <Chip
                label="Unsaved Changes"
                color="warning"
                size="small"
                icon={<WarningIcon />}
              />
            )}
          </Box>
          <Box display="flex" gap={2}>
            <Button
              onClick={handleReset}
              disabled={!hasChanges}
            >
              Reset
            </Button>
            <Button
              onClick={onClose}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!hasChanges || saving}
              sx={{
                background: `linear-gradient(135deg, ${stemColors.primary[500]} 0%, ${stemColors.primary[700]} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[800]} 100%)`,
                }
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default function SystemSettingsDialogWrapper(props: SystemSettingsDialogProps) {
  return (
    <AccessibilityProvider>
      <SystemSettingsDialog {...props} />
    </AccessibilityProvider>
  );
}