import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  Tooltip,
  Switch,
  FormControlLabel,
  Pagination,
  InputAdornment
} from '@mui/material';
import {
  Pause,
  PlayArrow,
  Block,
  Delete,
  Search,
  Edit
} from '@mui/icons-material';
import { adminProviderSetsApi, ProviderSet, ProviderSetStats } from '../services/api';
import { renderError } from '../utils/errorUtils';

const AdminProviderManagement: React.FC = () => {
  const [providerSets, setProviderSets] = useState<ProviderSet[]>([]);
  const [stats, setStats] = useState<ProviderSetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'on_hold' | 'disabled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialogs
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    providerSet: ProviderSet | null;
    newStatus: 'active' | 'on_hold' | 'disabled';
    notes: string;
  }>({
    open: false,
    providerSet: null,
    newStatus: 'active',
    notes: ''
  });
  
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    providerSet: ProviderSet | null;
  }>({
    open: false,
    providerSet: null
  });

  const fetchProviderSets = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching provider sets...', { page, statusFilter, searchTerm });
      const response = await adminProviderSetsApi.getAll({
        page,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined
      });
      
      console.log('✅ Provider sets response:', response.data);
      setProviderSets(response.data.provider_sets);
      setTotalPages(response.data.pagination.pages);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error('❌ Error fetching provider sets:', err);
      setError(renderError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminProviderSetsApi.getStats();
      setStats(response.data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchProviderSets();
    fetchStats();
  }, [page, statusFilter, searchTerm]);

  const handleStatusChange = async (providerSet: ProviderSet, newStatus: 'active' | 'on_hold' | 'disabled', notes?: string) => {
    try {
      await adminProviderSetsApi.updateStatus(providerSet.provider_set_id, newStatus, notes);
      setSuccessMessage(`Provider set status updated to ${newStatus}`);
      fetchProviderSets();
      fetchStats();
    } catch (err) {
      setError(renderError(err));
    }
  };

  const handleVisibilityToggle = async (providerSet: ProviderSet) => {
    try {
      console.log('🔄 Toggling admin visibility for provider set:', providerSet.provider_set_id, 'current visibility:', providerSet.admin_visible);
      await adminProviderSetsApi.updateVisibility(providerSet.provider_set_id, !providerSet.admin_visible);
      console.log('✅ Admin visibility updated successfully');
      setSuccessMessage(`Provider set ${providerSet.admin_visible ? 'hidden' : 'shown'} to customers`);
      fetchProviderSets();
      fetchStats();
    } catch (err) {
      console.error('❌ Error updating admin visibility:', err);
      setError(renderError(err));
    }
  };

  const handleDelete = async (providerSet: ProviderSet) => {
    try {
      await adminProviderSetsApi.delete(providerSet.provider_set_id);
      setSuccessMessage('Provider set removed from platform');
      fetchProviderSets();
      fetchStats();
    } catch (err) {
      setError(renderError(err));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'on_hold': return 'warning';
      case 'disabled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayArrow />;
      case 'on_hold': return <Pause />;
      case 'disabled': return <Block />;
      default: return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Provider Set Management
      </Typography>
      
      {/* Statistics Cards */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Provider Sets
              </Typography>
              <Typography variant="h4">
                {stats.total_provider_sets}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Sets
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.active_sets}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                On Hold
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.on_hold_sets}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Unique Providers
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.unique_providers}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
              <TextField
                fullWidth
                placeholder="Search provider sets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 150 }}>
              <FormControl fullWidth>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  label="Status Filter"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="on_hold">On Hold</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: 150 }}>
              <Typography variant="body2" color="textSecondary">
                Showing {providerSets.length} of {total} provider sets
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Provider Sets Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Set Name</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Visibility</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providerSets.map((providerSet) => (
                  <TableRow key={providerSet.provider_set_id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {providerSet.set_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {providerSet.category} • {providerSet.difficulty_level}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {providerSet.provider_company || providerSet.provider_username}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Code: {providerSet.provider_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        €{providerSet.price.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Qty: {providerSet.available_quantity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(providerSet.admin_status) || undefined}
                        label={providerSet.admin_status}
                        color={getStatusColor(providerSet.admin_status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={!!providerSet.admin_visible}
                            onChange={() => handleVisibilityToggle(providerSet)}
                            color="primary"
                          />
                        }
                        label={providerSet.admin_visible ? 'Visible' : 'Hidden'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Change Status">
                          <IconButton
                            size="small"
                            onClick={() => setStatusDialog({
                              open: true,
                              providerSet,
                              newStatus: providerSet.admin_status,
                              notes: providerSet.admin_notes || ''
                            })}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({
                              open: true,
                              providerSet
                            })}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={statusDialog.open} onClose={() => setStatusDialog({ ...statusDialog, open: false })}>
        <DialogTitle>Change Provider Set Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={statusDialog.newStatus}
                onChange={(e) => setStatusDialog({
                  ...statusDialog,
                  newStatus: e.target.value as any
                })}
                label="New Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="disabled">Disabled</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Admin Notes"
              value={statusDialog.notes}
              onChange={(e) => setStatusDialog({
                ...statusDialog,
                notes: e.target.value
              })}
              placeholder="Optional notes about this status change..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog({ ...statusDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleStatusChange(statusDialog.providerSet!, statusDialog.newStatus, statusDialog.notes);
              setStatusDialog({ ...statusDialog, open: false });
            }}
            variant="contained"
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}>
        <DialogTitle>Delete Provider Set</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently remove this provider set from the platform?
            This action cannot be undone.
          </Typography>
          {deleteDialog.providerSet && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2">
                {deleteDialog.providerSet.set_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Provider: {deleteDialog.providerSet.provider_company || deleteDialog.providerSet.provider_username}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleDelete(deleteDialog.providerSet!);
              setDeleteDialog({ ...deleteDialog, open: false });
            }}
            color="error"
            variant="contained"
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminProviderManagement;
