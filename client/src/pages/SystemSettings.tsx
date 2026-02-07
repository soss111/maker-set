import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AutoIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { Switch, FormControlLabel } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import api, { setApiBaseUrl } from '../services/api';

interface SystemSettings {
  shipping_handling_cost: number;
  minimum_order_amount: number;
  free_shipping_threshold: number;
  currency: string;
  tax_rate: number;
  automatic_report_enabled: boolean;
  social_share_required: number;
  social_share_reward_amount: number;
  social_share_message: string;
  credit_validity_days: number;
  default_provider_set_visible: boolean;
  public_url: string;
}

interface SocialShareSettings {
  twitter_message: string;
  facebook_message: string;
  whatsapp_message: string;
  tiktok_message: string;
  email_message: string;
}

const SystemSettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<SystemSettings>({
    shipping_handling_cost: 15,
    minimum_order_amount: 0,
    free_shipping_threshold: 0,
    currency: 'EUR',
    tax_rate: 0,
    automatic_report_enabled: true,
    social_share_required: 3,
    social_share_reward_amount: 5,
    social_share_message: '📱 Share 3 sets & get €5 off!',
    credit_validity_days: 90,
    default_provider_set_visible: true,
    public_url: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [socialShareSettings, setSocialShareSettings] = useState<SocialShareSettings>({
    twitter_message: '',
    facebook_message: '',
    whatsapp_message: '',
    tiktok_message: '',
    email_message: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const messageKeys = ['social_twitter_message', 'social_facebook_message', 'social_whatsapp_message', 'social_tiktok_message', 'social_email_message'];
      const messages: any = {};
      for (const key of messageKeys) {
        try {
          const res = await api.get(`/settings/${key}`);
          const msgKey = key.replace('social_', '').replace('_message', '') + '_message';
          messages[msgKey] = (res.data as any).value ?? '';
        } catch {
          // no saved value
        }
      }
      if (Object.keys(messages).length > 0) {
        setSocialShareSettings({
          twitter_message: messages.twitter_message || '',
          facebook_message: messages.facebook_message || '',
          whatsapp_message: messages.whatsapp_message || '',
          tiktok_message: messages.tiktok_message || '',
          email_message: messages.email_message || '',
        });
      }

      const res = await api.get('/system-settings');
      const next = (res.data as any).settings || {};
      setSettings(prev => ({ ...prev, ...next, public_url: next.public_url ?? prev.public_url ?? '' }));
      if (next.public_url) {
        setApiBaseUrl(next.public_url);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save individual settings
      const settingsToSave = [
        { key: 'shipping_handling_cost', value: settings.shipping_handling_cost.toString(), type: 'number' },
        { key: 'minimum_order_amount', value: settings.minimum_order_amount.toString(), type: 'number' },
        { key: 'free_shipping_threshold', value: settings.free_shipping_threshold.toString(), type: 'number' },
        { key: 'currency', value: settings.currency, type: 'string' },
        { key: 'tax_rate', value: settings.tax_rate.toString(), type: 'number' },
        { key: 'automatic_report_enabled', value: settings.automatic_report_enabled.toString(), type: 'boolean', description: 'Enable automatic monthly report generation and email delivery to providers' },
        { key: 'social_share_required', value: settings.social_share_required.toString(), type: 'number' },
        { key: 'social_share_reward_amount', value: settings.social_share_reward_amount.toString(), type: 'number' },
        { key: 'social_share_message', value: settings.social_share_message, type: 'string' },
        { key: 'credit_validity_days', value: settings.credit_validity_days.toString(), type: 'number' },
        { key: 'default_provider_set_visible', value: settings.default_provider_set_visible.toString(), type: 'boolean' },
        { key: 'public_url', value: (settings.public_url || '').trim(), type: 'string' },
      ];

      for (const setting of settingsToSave) {
        await api.put(`/settings/${setting.key}`, {
          value: setting.value,
          type: setting.type,
          description: (setting as any).description,
        });
      }
      if (settings.public_url?.trim()) {
        setApiBaseUrl(settings.public_url.trim());
      }

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SystemSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <SettingsIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" component="h1">
              Platform Configuration
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Configure platform settings, financial parameters, and social share rewards
            </Typography>
          </Box>
        </Box>
        
        {/* Tabs */}
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="General" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Financial Settings" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Social Share Messages" icon={<ShareIcon />} iconPosition="start" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
      </Box>

      {activeTab === 0 && (
        <Card sx={{ maxWidth: 640 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>API / Backend URL</Typography>
            <TextField
              fullWidth
              label="Backend base URL"
              placeholder="e.g. https://api.yourdomain.com or http://localhost:5001"
              value={settings.public_url}
              onChange={(e) => handleChange('public_url', e.target.value)}
              helperText="Origin of the API server. Used for media links and client API calls. Leave empty for default (localhost in dev)."
              sx={{ mb: 2 }}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
      <>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Shipping & Handling */}
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Shipping & Handling</Typography>
            </Box>

            <TextField
              fullWidth
              label="Shipping & Handling Cost"
              type="number"
              value={settings.shipping_handling_cost}
              onChange={(e) => handleChange('shipping_handling_cost', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <Chip label={settings.currency} size="small" sx={{ mr: 1 }} />,
              }}
              helperText="Cost applied to each order for handling, packaging, and transport"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Minimum Order Amount"
              type="number"
              value={settings.minimum_order_amount}
              onChange={(e) => handleChange('minimum_order_amount', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <Chip label={settings.currency} size="small" sx={{ mr: 1 }} />,
              }}
              helperText="Minimum order value required to place an order"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Free Shipping Threshold"
              type="number"
              value={settings.free_shipping_threshold}
              onChange={(e) => handleChange('free_shipping_threshold', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <Chip label={settings.currency} size="small" sx={{ mr: 1 }} />,
              }}
              helperText="Order amount above which shipping is free (0 = not applicable)"
            />
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Financial Settings</Typography>
            </Box>

            <TextField
              fullWidth
              label="Currency"
              value={settings.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              helperText="Currency code (EUR, USD, etc.)"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Tax Rate (%)"
              type="number"
              value={settings.tax_rate}
              onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
              helperText="Default tax rate percentage"
              sx={{ mb: 2 }}
              inputProps={{
                min: 0,
                max: 100,
                step: 0.01,
              }}
            />

            <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1, opacity: 0.8 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Note:</strong> Changes to shipping costs will apply to all new orders. 
                Existing carts may show the previous price until refreshed.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Report Automation Settings */}
        {/* Social Share Rewards Settings */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <ShareIcon color="primary" />
              <Typography variant="h6">Social Share Rewards</Typography>
            </Box>

            <TextField
              fullWidth
              label="Shares Required for Reward"
              type="number"
              value={settings.social_share_required}
              onChange={(e) => handleChange('social_share_required', parseInt(e.target.value) || 3)}
              helperText="Number of unique set shares required to earn a reward"
              sx={{ mb: 2 }}
              inputProps={{ min: 1, max: 10 }}
            />

            <TextField
              fullWidth
              label="Reward Amount"
              type="number"
              value={settings.social_share_reward_amount}
              onChange={(e) => handleChange('social_share_reward_amount', parseFloat(e.target.value) || 5)}
              helperText="Credit amount (€) awarded after completing required shares"
              InputProps={{
                startAdornment: <Chip label={settings.currency} size="small" sx={{ mr: 1 }} />,
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Reward Message"
              value={settings.social_share_message}
              onChange={(e) => handleChange('social_share_message', e.target.value)}
              helperText="Message displayed to users (use {amount} and {shares} for dynamic values)"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Credit Validity Period (Days)"
              type="number"
              value={settings.credit_validity_days}
              onChange={(e) => handleChange('credit_validity_days', parseInt(e.target.value) || 90)}
              helperText="Number of days before earned credits expire (0 = never expire)"
              sx={{ mb: 2 }}
              inputProps={{ min: 0, max: 365 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.automatic_report_enabled}
                  onChange={(e) => handleChange('automatic_report_enabled', e.target.checked)}
                />
              }
              label="Enable Report Automation"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
              When enabled, reports will be automatically generated on the 1st of each month at 9:00 AM and emailed to providers.
              You can still generate reports manually at any time.
            </Typography>
          </CardContent>
        </Card>

        {/* Provider Set Default Visibility */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Provider Set Default Visibility</Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.default_provider_set_visible}
                  onChange={(e) => handleChange('default_provider_set_visible', e.target.checked)}
                />
              }
              label="New provider sets visible by default"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 4 }}>
              When enabled, new provider sets will be automatically visible in the shop. 
              You can still manually change visibility for individual sets later if needed.
            </Typography>
          </CardContent>
        </Card>

      <Divider sx={{ my: 4 }} />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchSettings}
          disabled={loading}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Save Settings
        </Button>
      </Box>
      </>
      )}

      {activeTab === 2 && (
        <>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <ShareIcon color="primary" />
                <Typography variant="h6">Social Share Messages</Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                Customize the messages users see when sharing sets on social media. 
                Use variables: {"{title}"}, {"{description}"}, {"{category}"}, {"{difficulty}"}, {"{age}"}, {"{price}"}, {"{url}"}
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Twitter/X Message"
                value={socialShareSettings.twitter_message}
                onChange={(e) => setSocialShareSettings(prev => ({ ...prev, twitter_message: e.target.value }))}
                helperText="Message shown when users share on Twitter/X"
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Facebook Message"
                value={socialShareSettings.facebook_message}
                onChange={(e) => setSocialShareSettings(prev => ({ ...prev, facebook_message: e.target.value }))}
                helperText="Message shown when users share on Facebook"
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="WhatsApp Message"
                value={socialShareSettings.whatsapp_message}
                onChange={(e) => setSocialShareSettings(prev => ({ ...prev, whatsapp_message: e.target.value }))}
                helperText="Message shown when users share on WhatsApp"
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="TikTok Message"
                value={socialShareSettings.tiktok_message}
                onChange={(e) => setSocialShareSettings(prev => ({ ...prev, tiktok_message: e.target.value }))}
                helperText="Message shown when users share on TikTok"
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Email Message"
                value={socialShareSettings.email_message}
                onChange={(e) => setSocialShareSettings(prev => ({ ...prev, email_message: e.target.value }))}
                helperText="Message shown when users share via email"
              />
            </CardContent>
          </Card>

          <Divider sx={{ my: 4 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                setSocialShareSettings({
                  twitter_message: '',
                  facebook_message: '',
                  whatsapp_message: '',
                  tiktok_message: '',
                  email_message: '',
                });
                setSuccess(null);
                setError(null);
              }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={async () => {
                setSaving(true);
                setError(null);
                setSuccess(null);
                
                try {
                  // Save social share messages
                  const messagesToSave = [
                    { key: 'social_twitter_message', value: socialShareSettings.twitter_message },
                    { key: 'social_facebook_message', value: socialShareSettings.facebook_message },
                    { key: 'social_whatsapp_message', value: socialShareSettings.whatsapp_message },
                    { key: 'social_tiktok_message', value: socialShareSettings.tiktok_message },
                    { key: 'social_email_message', value: socialShareSettings.email_message },
                  ];
                  
                  for (const msg of messagesToSave) {
                    const response = await fetch(`http://localhost:5001/api/settings/${msg.key}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                      },
                      body: JSON.stringify({ value: msg.value, type: 'string' }),
                    });
                    
                    if (!response.ok) {
                      throw new Error(`Failed to save ${msg.key}`);
                    }
                  }

                  setSuccess('Social share messages saved successfully!');
                  setTimeout(() => setSuccess(null), 3000);
                } catch (error) {
                  console.error('Error saving messages:', error);
                  setError('Failed to save messages');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              Save Messages
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SystemSettingsPage;

