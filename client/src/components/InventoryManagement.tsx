import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { inventoryApi, InventoryPart, InventoryTransaction } from '../services/api';
import { renderError } from '../utils/errorUtils';

interface InventoryManagementProps {
  part: InventoryPart;
  onStockUpdated: (updatedPart: InventoryPart) => void;
}

const InventoryManagement: React.FC<InventoryManagementProps> = ({ part, onStockUpdated }) => {
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Adjust stock form
  const [adjustForm, setAdjustForm] = useState({
    adjustment_type: 'add' as 'add' | 'remove' | 'set',
    quantity: 0,
    reason: '',
    notes: ''
  });

  // Income form
  const [incomeForm, setIncomeForm] = useState({
    quantity: 0,
    supplier: '',
    cost_per_unit: 0,
    purchase_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    notes: ''
  });

  const handleAdjustStock = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await inventoryApi.adjustStock(part.part_id, adjustForm);
      
      // Update the part with new stock
      const updatedPart = {
        ...part,
        stock_quantity: response.data.new_stock
      };
      onStockUpdated(updatedPart);
      
      setSuccessMessage(`Stock ${adjustForm.adjustment_type === 'add' ? 'added' : 
        adjustForm.adjustment_type === 'remove' ? 'removed' : 'set'} successfully`);
      setAdjustDialogOpen(false);
      setAdjustForm({ adjustment_type: 'add', quantity: 0, reason: '', notes: '' });
    } catch (err: any) {
      setError(renderError(err.response?.data?.error || 'Failed to adjust stock'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncome = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await inventoryApi.addIncome(part.part_id, incomeForm);
      
      // Update the part with new stock
      const updatedPart = {
        ...part,
        stock_quantity: response.data.new_stock,
        supplier: incomeForm.supplier || part.supplier,
        unit_cost: incomeForm.cost_per_unit || part.unit_cost
      };
      onStockUpdated(updatedPart);
      
      setSuccessMessage(`Stock income recorded successfully`);
      setIncomeDialogOpen(false);
      setIncomeForm({ quantity: 0, supplier: '', cost_per_unit: 0, purchase_date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (err: any) {
      setError(renderError(err.response?.data?.error || 'Failed to record stock income'));
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionHistory = async () => {
    try {
      const response = await inventoryApi.getHistory(part.part_id);
      setTransactions(response.data.transactions);
    } catch (err: any) {
      setError(renderError(err.response?.data?.error || 'Failed to load transaction history'));
    }
  };

  const getStockStatusChip = () => {
    if (part.is_out_of_stock) {
      return <Chip icon={<WarningIcon />} label="Out of Stock" color="error" size="small" />;
    } else if (part.is_low_stock) {
      return <Chip icon={<WarningIcon />} label="Low Stock" color="warning" size="small" />;
    } else {
      return <Chip icon={<InventoryIcon />} label="In Stock" color="success" size="small" />;
    }
  };

  return (
    <Box>
      {/* Stock Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6">Current Stock: {part.stock_quantity} {part.unit_of_measure}</Typography>
        {getStockStatusChip()}
        <Typography variant="body2" color="text.secondary">
          Value: €{part.inventory_value.toFixed(2)}
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIncomeDialogOpen(true)}
          color="success"
        >
          Add Income
        </Button>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => setAdjustDialogOpen(true)}
        >
          Adjust Stock
        </Button>
        <Tooltip title="View Transaction History">
          <IconButton onClick={() => {
            setHistoryDialogOpen(true);
            loadTransactionHistory();
          }}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onClose={() => setAdjustDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Stock</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Adjustment Type</InputLabel>
              <Select
                value={adjustForm.adjustment_type}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value as any })}
                label="Adjustment Type"
              >
                <MenuItem value="add">Add Stock</MenuItem>
                <MenuItem value="remove">Remove Stock</MenuItem>
                <MenuItem value="set">Set Stock</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value) || 0 })}
              required
            />

            <TextField
              fullWidth
              label="Reason"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              placeholder="e.g., Found in storage, Damaged items, etc."
            />

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAdjustStock} variant="contained" disabled={loading}>
            {loading ? 'Processing...' : 'Adjust Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Income Dialog */}
      <Dialog open={incomeDialogOpen} onClose={() => setIncomeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Stock Income</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Quantity Received"
              type="number"
              value={incomeForm.quantity}
              onChange={(e) => setIncomeForm({ ...incomeForm, quantity: parseInt(e.target.value) || 0 })}
              required
            />

            <TextField
              fullWidth
              label="Supplier"
              value={incomeForm.supplier}
              onChange={(e) => setIncomeForm({ ...incomeForm, supplier: e.target.value })}
              placeholder={part.supplier || "Enter supplier name"}
            />

            <TextField
              fullWidth
              label="Cost per Unit (€)"
              type="number"
              value={incomeForm.cost_per_unit}
              onChange={(e) => setIncomeForm({ ...incomeForm, cost_per_unit: parseFloat(e.target.value) || 0 })}
              placeholder={part.unit_cost.toString()}
              inputProps={{ step: "0.01" }}
            />

            <TextField
              fullWidth
              label="Purchase Date"
              type="date"
              value={incomeForm.purchase_date}
              onChange={(e) => setIncomeForm({ ...incomeForm, purchase_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={incomeForm.notes}
              onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncomeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddIncome} variant="contained" disabled={loading}>
            {loading ? 'Processing...' : 'Record Income'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Transaction History - {part.part_name}</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Previous</TableCell>
                  <TableCell>New</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Cost/Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.transaction_id}>
                    <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.transaction_type} 
                        color={transaction.transaction_type === 'income' ? 'success' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{transaction.quantity}</TableCell>
                    <TableCell>{transaction.previous_stock}</TableCell>
                    <TableCell>{transaction.new_stock}</TableCell>
                    <TableCell>{transaction.reason || '-'}</TableCell>
                    <TableCell>{transaction.supplier || '-'}</TableCell>
                    <TableCell>{transaction.cost_per_unit ? `€${transaction.cost_per_unit}` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryManagement;
