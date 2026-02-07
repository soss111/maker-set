import React, { useState, useEffect, useCallback } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Chip,
  Alert,
  Pagination,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

interface User {
  user_id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  role: 'admin' | 'customer' | 'provider' | 'production';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  provider_markup_percentage?: number;
}

const UserManagement: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authApi.getUsers({
        page: currentPage,
        limit: 10,
        search: searchTerm
      });
      setUsers(response.data.users || []);
      setTotalPages(response.data.pagination.total_pages || 1);
      setTotalUsers(response.data.pagination.total_users || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, currentPage, searchTerm, fetchUsers]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      company_name: user.company_name,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      provider_markup_percentage: user.provider_markup_percentage || 0
    });
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      await authApi.updateUser(selectedUser.user_id, editFormData);
      setSuccess('User updated successfully');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    
    try {
      await authApi.deleteUser(selectedUser.user_id);
      setSuccess('User deleted successfully');
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'provider': return 'primary';
      case 'production': return 'secondary';
      default: return 'default';
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Typography variant="body2" color="text.secondary">
          Total Users: {totalUsers}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {renderError(error)}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          id="user-search"
          name="search"
          fullWidth
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Markup %</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.company_name || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    color={getRoleColor(user.role) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.role === 'provider' ? (
                    <Typography variant="body2" color="primary">
                      {user.provider_markup_percentage || 0}%
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'
                  }
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEditUser(user)}
                    disabled={user.user_id === currentUser?.user_id}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteUser(user)}
                    disabled={user.user_id === currentUser?.user_id}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              id="user-first-name"
              name="first_name"
              label="First Name"
              value={editFormData.first_name || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
              fullWidth
            />
            <TextField
              id="user-last-name"
              name="last_name"
              label="Last Name"
              value={editFormData.last_name || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
              fullWidth
            />
            <TextField
              id="user-username"
              name="username"
              label="Username"
              value={editFormData.username || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
              fullWidth
            />
            <TextField
              id="user-company-name"
              name="company_name"
              label="Company Name"
              value={editFormData.company_name || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, company_name: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel htmlFor="user-role-select">Role</InputLabel>
              <Select
                id="user-role-select"
                name="role"
                value={editFormData.role || 'customer'}
                onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value as any }))}
                label="Role"
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="provider">Provider</MenuItem>
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            {editFormData.role === 'provider' && (
              <TextField
                fullWidth
                label="Provider Markup Percentage"
                type="number"
                value={editFormData.provider_markup_percentage || 0}
                onChange={(e) => setEditFormData(prev => ({ 
                  ...prev, 
                  provider_markup_percentage: parseFloat(e.target.value) || 0 
                }))}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                helperText="Percentage of order value that provider keeps (e.g., 15% means provider keeps 15% of each order)"
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.is_active || false}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.first_name} {selectedUser?.last_name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
