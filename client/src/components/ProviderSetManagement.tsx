import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Grid,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TextField,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  CreditCard as CreditCardIcon,
  Inventory as InventoryIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Verified as VerifiedIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { setsApi, mediaApi, setPartsApi, providerApi, authApi } from '../services/api';
import ProviderSetCreationWizard from './ProviderSetCreationWizard';
import ProviderPaymentStats from './ProviderPaymentStats';

interface Set {
  set_id: number;
  name: string;
  description?: string;
  category: string;
  difficulty_level: string;
  recommended_age_min?: number;
  recommended_age_max?: number;
  estimated_duration_minutes?: number;
  base_price?: number;
  active: boolean;
  learning_outcomes?: string[];
  media?: any[];
  parts?: any[];
  instructions?: any[];
  provider_set_id?: number;
  price?: number;
  available_quantity?: number;
  is_active?: boolean;
}

const ProviderSetManagement: React.FC = () => {
  const { user } = useAuth();
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<Set | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingField, setEditingField] = useState<{setId: number, field: 'price' | 'quantity'} | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  useEffect(() => {
    fetchData();
    fetchUserProfile();
  }, []);

  // Calculate commission after userProfile is loaded
  const providerMarkupPercentage = userProfile?.provider_markup_percentage ?? user?.provider_markup_percentage ?? 50;
  const systemCommissionPercentage = 100 - providerMarkupPercentage;
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 Provider Set Management - Commission Calculation:', {
      userProfileMarkup: userProfile?.provider_markup_percentage,
      userMarkup: user?.provider_markup_percentage,
      calculatedMarkup: providerMarkupPercentage,
      systemCommission: systemCommissionPercentage
    });
  }, [userProfile, user, providerMarkupPercentage, systemCommissionPercentage]);

  const fetchUserProfile = async () => {
    try {
      // Try /api/users/profile first (the actual endpoint that includes provider_markup_percentage)
      const response = await fetch('http://localhost:5001/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Fetched user profile:', data);
        if (data.user) {
          setUserProfile(data.user);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.user_id) {
        setError('User not authenticated');
        return;
      }
      
      const response = await providerApi.getProviderSets(user.user_id, true);
      const providerSets = response.data?.provider_sets || [];
      setSets(providerSets);
    } catch (err: any) {
      console.error('Error fetching sets:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch sets');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (setId: number, currentVisibility: boolean) => {
    try {
      // Find the provider_set_id for this set
      const set = sets.find(s => s.set_id === setId);
      if (!set || !set.provider_set_id) {
        setError('Provider set ID not found');
        return;
      }
      
      await providerApi.updateProviderSet(set.provider_set_id, {
        is_active: !currentVisibility,
        price: set.price,
        available_quantity: set.available_quantity || 1
      });
      setSuccess(`Set ${!currentVisibility ? 'activated' : 'deactivated'} successfully!`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating provider set visibility:', err);
      setError('Failed to update set visibility');
    }
  };

  const handleToggleTrustCertificate = async (setId: number, currentTrust: boolean) => {
    try {
      await setsApi.updateTrustCertification(setId, !currentTrust);
      setSuccess(`Trust certificate ${!currentTrust ? 'enabled' : 'disabled'} successfully!`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to update trust certificate');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  const getFirstImage = (set: Set) => {
    if (set.media && set.media.length > 0) {
      return set.media.find(media => media.file_type?.startsWith('image/'));
    }
    return null;
  };

  const getLearningOutcomes = (set: Set) => {
    if (Array.isArray(set.learning_outcomes)) {
      return set.learning_outcomes;
    }
    return [];
  };

  const handleCreateSet = () => {
    setEditingSet(null);
    setWizardOpen(true);
  };

  const handleEditSet = (set: Set) => {
    setEditingSet(set);
    setWizardOpen(true);
  };

  const handleDeleteSet = async (setId: number) => {
    if (!window.confirm('Are you sure you want to delete this set?')) return;

    try {
      await providerApi.deleteProviderSet(setId);
      setSuccess('Set deleted successfully!');
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to delete set');
    }
  };

  const handleInlineEdit = (setId: number, field: 'price' | 'quantity', currentValue: number) => {
    setEditingField({ setId, field });
    setEditingValue(currentValue.toString());
  };

  const handleInlineSave = async () => {
    if (!editingField || !user?.user_id) return;

    try {
      const set = sets.find(s => s.set_id === editingField.setId);
      if (!set || !set.provider_set_id) {
        setError('Provider set ID not found');
        return;
      }

      const updateData: any = {};
      if (editingField.field === 'price') {
        updateData.price = parseFloat(editingValue);
      } else if (editingField.field === 'quantity') {
        updateData.available_quantity = parseInt(editingValue);
      }

      await providerApi.updateProviderSet(set.provider_set_id, {
        ...updateData,
        is_active: set.is_active ?? false
      });

      setSuccess(`${editingField.field === 'price' ? 'Price' : 'Quantity'} updated successfully!`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating provider set:', err);
      setError(`Failed to update ${editingField.field}`);
    } finally {
      setEditingField(null);
      setEditingValue('');
    }
  };

  const handleInlineCancel = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const getAvailableQuantity = (set: Set) => {
    if (set.parts && set.parts.length > 0) {
      const minStock = Math.min(...set.parts.map(part => part.stock_quantity || 0));
      return minStock;
    }
    return 0;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Provider Sets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your sets and view payment statistics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSet}
            sx={{ mr: 2 }}
          >
            Create New Set
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('grid')}
            size="small"
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('list')}
            size="small"
          >
            List
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="My Sets" icon={<InventoryIcon />} />
          <Tab label="Payment Statistics" icon={<CreditCardIcon />} />
        </Tabs>
      </Box>

      {/* My Sets Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Commission Banner */}
          <Alert 
            severity={systemCommissionPercentage > 30 ? "warning" : "info"} 
            sx={{ mb: 3 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CreditCardIcon />
                  Commission Structure
                </Typography>
                <Typography variant="body2">
                  Your markup: <strong>{providerMarkupPercentage}%</strong> • System commission: <strong>{systemCommissionPercentage}%</strong>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  icon={<TrendingUpIcon />}
                  label={`You keep ${providerMarkupPercentage}%`}
                  color="success"
                  size="small"
                />
                <Chip 
                  icon={<TrendingDownIcon />}
                  label={`System takes ${systemCommissionPercentage}%`}
                  color={systemCommissionPercentage > 30 ? "error" : "warning"}
                  size="small"
                />
              </Box>
            </Box>
          </Alert>

          {/* Messages */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => setError(null)}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
            >
              {renderError(error)}
            </Alert>
          )}
          {success && (
            <Alert 
              severity="success" 
              sx={{ mb: 2 }}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => setSuccess(null)}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
            >
              {success}
            </Alert>
          )}

          {/* Sets Display */}
          {sets.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Sets Found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You haven't created any sets yet.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={3}>
                  {sets.map((set) => (
                    <Card key={set.set_id} sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      opacity: set.is_active === false ? 0.7 : 1,
                      borderRadius: 3,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        transform: 'translateY(-2px)'
                      }
                    }}>
                      {!set.is_active && (
                        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                          <Chip 
                            label="Inactive" 
                            size="small" 
                            color="warning" 
                            sx={{ backgroundColor: 'rgba(255, 152, 0, 0.9)', color: 'white' }}
                          />
        </Box>
      )}

                      {getFirstImage(set) ? (
                        <CardMedia
                          component="img"
                          height="200"
                          image={getFirstImage(set)!.file_url}
                          alt={set.name}
                          sx={{ objectFit: 'cover' }}
                          onError={(e) => {
                            console.error('Failed to load image:', getFirstImage(set)?.file_url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          height="200"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          bgcolor="grey.100"
                        >
                          <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
              </Box>
                      )}
                      
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" component="h2" gutterBottom>
                          {set.name}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                          {set.description || 'No description available'}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          <Chip 
                            label={set.category} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                          <Chip 
                            label={set.difficulty_level} 
                            size="small" 
                            color={getDifficultyColor(set.difficulty_level) as any}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" color="primary.main">
                            €{Number(set.price || set.base_price || 0).toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Qty: {set.available_quantity || 0}
                          </Typography>
                        </Box>
                        
                        {getLearningOutcomes(set).length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              Learning Outcomes:
                        </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {getLearningOutcomes(set).slice(0, 3).map((outcome, index) => (
                                <Chip 
                                  key={index}
                                  label={outcome} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                              {getLearningOutcomes(set).length > 3 && (
                                <Chip 
                                  label={`+${getLearningOutcomes(set).length - 3} more`} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={!!set.is_active}
                                  onChange={() => handleToggleVisibility(set.set_id, set.is_active ?? false)}
                                  size="small"
                                />
                              }
                              label="Active"
                              sx={{ m: 0 }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" color="primary" onClick={() => handleEditSet(set)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteSet(set.set_id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <Card>
                  <CardContent>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Set Name</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Difficulty</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sets.map((set) => (
                            <TableRow key={set.set_id}>
                              <TableCell>
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600}>
                                    {set.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {set.description || 'No description'}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip label={set.category} size="small" />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={set.difficulty_level} 
                                  size="small" 
                                  color={getDifficultyColor(set.difficulty_level) as any}
                                />
                              </TableCell>
                              <TableCell>
                                {editingField?.setId === set.set_id && editingField?.field === 'price' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      inputProps={{ step: "0.01", min: "0" }}
                                      sx={{ width: 80 }}
                                    />
                                    <IconButton size="small" color="primary" onClick={handleInlineSave}>
                                      <CheckIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={handleInlineCancel}>
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ) : (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight={600}>
                                      €{Number(set.price || set.base_price || 0).toFixed(2)}
                                    </Typography>
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleInlineEdit(set.set_id, 'price', Number(set.price || set.base_price || 0))}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingField?.setId === set.set_id && editingField?.field === 'quantity' ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      inputProps={{ min: "0" }}
                                      sx={{ width: 80 }}
                                    />
                                    <IconButton size="small" color="primary" onClick={handleInlineSave}>
                                      <CheckIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" onClick={handleInlineCancel}>
                                      <CloseIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                ) : (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2">
                                      {set.available_quantity || 0}
                                    </Typography>
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleInlineEdit(set.set_id, 'quantity', set.available_quantity || 0)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={set.is_active ? 'Active' : 'Inactive'}
                                  size="small"
                                  color={set.is_active ? 'success' : 'warning'}
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <IconButton size="small" color="primary" onClick={() => handleEditSet(set)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteSet(set.set_id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
            </CardContent>
          </Card>
              )}
            </>
          )}
        </Box>
      )}

      {/* Payment Statistics Tab */}
      {activeTab === 1 && (
        <ProviderPaymentStats />
      )}

      {/* Provider Set Creation Wizard */}
      <ProviderSetCreationWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditingSet(null);
        }}
        onSetCreated={() => {
          fetchData();
          setWizardOpen(false);
          setEditingSet(null);
        }}
        editingSet={editingSet}
      />
    </Box>
  );
};

export default ProviderSetManagement;