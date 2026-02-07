import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Store as StoreIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { setsApi } from '../services/api';
import type { Set } from '../services/api';

const AdminSetVisibilityManager: React.FC = () => {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await setsApi.getAll('en', true); // Include inactive sets
      // Get all sets (both admin and provider)
      setSets(response.data.sets || []);
    } catch (err: any) {
      console.error('Error fetching sets:', err);
      setError('Failed to load sets');
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityToggle = async (setId: number, currentVisibility: boolean) => {
    try {
      setUpdating(setId);
      setError(null);
      setSuccess(null);

      const newVisibility = !currentVisibility;
      await setsApi.updateVisibility(setId, newVisibility);

      // Update local state
      setSets(prevSets =>
        prevSets.map(set =>
          set.set_id === setId
            ? { ...set, admin_visible: newVisibility }
            : set
        )
      );

      setSuccess(`Set "${sets.find(s => s.set_id === setId)?.name}" is now ${newVisibility ? 'visible' : 'hidden'} in the store`);
    } catch (err: any) {
      console.error('Error updating set visibility:', err);
      setError('Failed to update set visibility');
    } finally {
      setUpdating(null);
    }
  };

  // Calculate statistics based on selected provider
  const getFilteredSets = () => {
    if (selectedProvider === 'all') {
      return sets;
    } else if (selectedProvider === 'admin') {
      return sets.filter(set => set.set_type === 'admin');
    } else {
      return sets.filter(set => set.provider_username === selectedProvider);
    }
  };

  const filteredSets = getFilteredSets();
  const visibleCount = filteredSets.filter(set => {
    if (set.set_type === 'admin') {
      return set.admin_visible !== false;
    } else {
      return set.provider_visible !== false;
    }
  }).length;
  
  const hiddenCount = filteredSets.filter(set => {
    if (set.set_type === 'admin') {
      return set.admin_visible === false;
    } else {
      return set.provider_visible === false;
    }
  }).length;

  // Get unique providers for dropdown
  const providers = Array.from(new Set(sets.map(set => set.provider_username).filter(Boolean)));
  
  // Calculate provider sets for breakdown
  const providerSets = sets.filter(set => set.set_type === 'provider');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AdminPanelSettingsIcon color="primary" />
            Admin Set Visibility Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control which admin-created sets are visible to customers in the MakerLab store
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchSets}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Provider Selector */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Provider</InputLabel>
          <Select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            label="Filter by Provider"
          >
            <MenuItem value="all">All Providers</MenuItem>
            <MenuItem value="admin">Admin Sets</MenuItem>
            {providers.map((provider) => (
              <MenuItem key={provider} value={provider}>
                {provider}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, mb: 3 }}>
        {/* Total Sets */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <StoreIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Sets</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {filteredSets.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedProvider === 'all' ? 'All providers' : 
               selectedProvider === 'admin' ? 'Admin sets only' : 
               `Provider: ${selectedProvider}`}
            </Typography>
          </CardContent>
        </Card>

        {/* Visible Sets */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <VisibilityIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">Visible</Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {visibleCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              In shop
            </Typography>
          </CardContent>
        </Card>

        {/* Hidden Sets */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <VisibilityOffIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="h6">Hidden</Typography>
            </Box>
            <Typography variant="h4" color="error.main">
              {hiddenCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Not in shop
            </Typography>
          </CardContent>
        </Card>

        {/* Visibility Rate */}
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <InfoIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">Visibility Rate</Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {filteredSets.length > 0 ? Math.round((visibleCount / filteredSets.length) * 100) : 0}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Success rate
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Provider Breakdown */}
      {providerSets.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon />
              Provider Breakdown
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
              {Array.from(new Set(providerSets.map(set => set.provider_username))).map(providerUsername => {
                const providerSetsForUser = providerSets.filter(set => set.provider_username === providerUsername);
                const visibleForProvider = providerSetsForUser.filter(set => set.provider_visible !== false).length;
                const hiddenForProvider = providerSetsForUser.filter(set => set.provider_visible === false).length;
                
                return (
                  <Box key={providerUsername} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {providerUsername}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {providerSetsForUser[0]?.provider_company || 'Provider'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="success.main">
                          ✓ {visibleForProvider} visible
                        </Typography>
                        <Typography variant="caption" color="error.main" sx={{ ml: 1 }}>
                          ✗ {hiddenForProvider} hidden
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {providerSetsForUser.length} total
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {renderError(error)}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default AdminSetVisibilityManager;
