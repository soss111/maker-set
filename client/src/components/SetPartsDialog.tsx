import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Dialog as QuantityDialog,
  DialogTitle as QuantityDialogTitle,
  DialogContent as QuantityDialogContent,
  DialogActions as QuantityDialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { Set as SetType, setPartsApi, partsApi } from '../services/api';

interface SetPartsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSet: SetType | null;
  onPartsUpdated: () => void;
  onSetUpdated?: () => void;
}

interface SetPart {
  set_part_id: number;
  part_id: number;
  quantity: number;
  is_optional: boolean;
  notes: string;
  safety_notes: string;
  part_name: string;
  part_number?: string;
  description?: string;
  category?: string;
  set_usage_count?: number;
}

interface Part {
  part_id: number;
  part_name: string;
  part_number?: string;
  description?: string;
  category?: string;
  stock_quantity?: number;
  unit_cost?: number;
}

const SetPartsDialog: React.FC<SetPartsDialogProps> = ({
  open,
  onClose,
  selectedSet,
  onPartsUpdated,
  onSetUpdated,
}) => {
  const [setParts, setSetParts] = useState<SetPart[]>([]);
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [partSearchTerm, setPartSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newIsOptional, setNewIsOptional] = useState<boolean>(false);
  const [newNotes, setNewNotes] = useState<string>('');
  const [newSafetyNotes, setNewSafetyNotes] = useState<string>('');

  const fetchSetParts = async (setId: number) => {
    try {
      setLoading(true);
      const response = await setPartsApi.getBySetId(setId, 'en');
      const parts = Array.isArray(response.data) ? response.data : (response.data.parts || []);
      setSetParts(parts);
    } catch (err: any) {
      console.error('Error fetching set parts:', err);
      setError(`Failed to load parts: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableParts = async () => {
    try {
      const response = await partsApi.getAll();
      setAvailableParts(response.data.parts || []);
    } catch (err: any) {
      console.error('Error fetching available parts:', err);
      setError(`Failed to load available parts: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (open && selectedSet) {
      fetchSetParts(selectedSet.set_id);
      fetchAvailableParts();
    }
  }, [open, selectedSet]);

  const handleAddPartClick = (part: Part) => {
    setSelectedPart(part);
    setNewQuantity(1);
    setNewIsOptional(false);
    setNewNotes('');
    setNewSafetyNotes('');
    setQuantityDialogOpen(true);
  };

  const addPartToSet = async () => {
    if (!selectedSet || !selectedPart) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5001/api/set-parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          set_id: selectedSet.set_id,
          part_id: selectedPart.part_id,
          quantity: newQuantity,
          is_optional: newIsOptional,
          notes: newNotes,
          safety_notes: newSafetyNotes
        })
      });

      if (response.ok) {
        setSuccess('Part added successfully!');
        await fetchSetParts(selectedSet.set_id);
        onPartsUpdated();
        
        // Notify parent component to refresh set data
        if (onSetUpdated) {
          onSetUpdated();
        }
        
        setQuantityDialogOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add part');
      }
    } catch (err: any) {
      console.error('Error adding part to set:', err);
      setError(`Failed to add part: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const removePartFromSet = async (setPartId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5001/api/set-parts/${setPartId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccess('Part removed successfully!');
        if (selectedSet) {
          await fetchSetParts(selectedSet.set_id);
        }
        onPartsUpdated();
        
        // Notify parent component to refresh set data
        if (onSetUpdated) {
          onSetUpdated();
        }
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove part');
      }
    } catch (err: any) {
      console.error('Error removing part from set:', err);
      setError(`Failed to remove part: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePartQuantity = async (setPartId: number, quantity: number, isOptional?: boolean, notes?: string, safetyNotes?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5001/api/set-parts/${setPartId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          quantity,
          is_optional: isOptional,
          notes: notes || '',
          safety_notes: safetyNotes || ''
        })
      });

      if (response.ok) {
        setSuccess('Part updated successfully!');
        if (selectedSet) {
          await fetchSetParts(selectedSet.set_id);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update part');
      }
    } catch (err: any) {
      console.error('Error updating part:', err);
      setError(`Failed to update part: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePartSafetyNotes = async (setPartId: number, safetyNotes: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5001/api/set-parts/${setPartId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          quantity: 1,
          is_optional: true,
          notes: '',
          safety_notes: safetyNotes
        })
      });

      if (response.ok) {
        setSuccess('Safety notes updated successfully!');
        if (selectedSet) {
          await fetchSetParts(selectedSet.set_id);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update safety notes');
      }
    } catch (err: any) {
      console.error('Error updating safety notes:', err);
      setError(`Failed to update safety notes: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter available parts based on search term and exclude parts already in set
  const filteredAvailableParts = availableParts.filter(part => {
    if (!partSearchTerm.trim()) return true;
    
    const searchLower = partSearchTerm.toLowerCase();
    return (
      part.part_name?.toLowerCase().includes(searchLower) ||
      part.part_number?.toLowerCase().includes(searchLower) ||
      part.description?.toLowerCase().includes(searchLower) ||
      part.category?.toLowerCase().includes(searchLower)
    );
  }).filter(part => {
    // Exclude parts that are already in the set
    return !setParts.some(setPart => setPart.part_id === part.part_id);
  });

  const handleClose = () => {
    setSetParts([]);
    setAvailableParts([]);
    setPartSearchTerm('');
    setError(null);
    setSuccess(null);
    setQuantityDialogOpen(false);
    setSelectedPart(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon />
            Manage Parts for {selectedSet?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            {success && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Search Available Parts */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Add New Parts
              </Typography>
              <TextField
                fullWidth
                placeholder="Search parts by name, number, or description..."
                value={partSearchTerm}
                onChange={(e) => setPartSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{ mb: 2 }}
              />

              {/* Available Parts List */}
              {filteredAvailableParts.length > 0 ? (
                <List sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  {filteredAvailableParts.map((part) => (
                    <ListItem key={part.part_id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {part.part_name}
                            </Typography>
                            {part.part_number && (
                              <Chip label={part.part_number} size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            {part.description && (
                              <Typography variant="body2" color="text.secondary">
                                {part.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              {part.category && (
                                <Chip label={part.category} size="small" variant="outlined" />
                              )}
                              {part.stock_quantity !== undefined && (
                                <Chip 
                                  label={`Stock: ${part.stock_quantity}`} 
                                  size="small" 
                                  color={part.stock_quantity > 0 ? 'success' : 'error'}
                                />
                              )}
                              {part.unit_cost && (
                                <Chip 
                                  label={`€${part.unit_cost.toFixed(2)}`} 
                                  size="small" 
                                  color="primary"
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          onClick={() => handleAddPartClick(part)}
                          disabled={loading}
                          color="primary"
                          title="Add to set"
                        >
                          <AddIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {partSearchTerm ? 'No parts found matching your search' : 'No available parts to add'}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Current Parts in Set */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Current Parts in Set ({setParts.length})
              </Typography>
              
              {setParts.length > 0 ? (
                <List sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  {setParts.map((setPart) => (
                    <ListItem key={setPart.set_part_id} divider>
                      <ListItemText
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {setPart.part_name}
                            </Typography>
                            {setPart.part_number && (
                              <Chip label={setPart.part_number} size="small" variant="outlined" />
                            )}
                            {setPart.set_usage_count !== undefined && (
                              <Chip 
                                label={`Used in ${setPart.set_usage_count} sets`} 
                                size="small" 
                                color="info"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TextField
                                label="Quantity"
                                type="number"
                                size="small"
                                value={setPart.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  if (newQuantity !== setPart.quantity) {
                                    updatePartQuantity(setPart.set_part_id, newQuantity, setPart.is_optional, setPart.notes, setPart.safety_notes);
                                  }
                                }}
                                sx={{ width: 100 }}
                                inputProps={{ min: 1 }}
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={!setPart.is_optional}
                                    onChange={(e) => {
                                      updatePartQuantity(setPart.set_part_id, setPart.quantity, !e.target.checked, setPart.notes, setPart.safety_notes);
                                    }}
                                    size="small"
                                  />
                                }
                                label={setPart.is_optional ? 'Optional' : 'Required'}
                                labelPlacement="start"
                              />
                            </Box>
                            
                            <TextField
                              label="Safety Notes"
                              size="small"
                              multiline
                              rows={2}
                              value={setPart.safety_notes || ''}
                              onChange={(e) => {
                                // Update safety notes
                                const updatedParts = setParts.map(part => 
                                  part.set_part_id === setPart.set_part_id 
                                    ? { ...part, safety_notes: e.target.value }
                                    : part
                                );
                                setSetParts(updatedParts);
                              }}
                              placeholder="Enter safety instructions for this part..."
                              sx={{ width: '100%' }}
                            />
                            
                            {setPart.notes && (
                              <Typography variant="caption" color="text.secondary">
                                Notes: {setPart.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          onClick={() => removePartFromSet(setPart.set_part_id)}
                          disabled={loading}
                          color="error"
                          title="Remove from set"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No parts assigned to this set yet.
                  </Typography>
                </Box>
              )}
            </Box>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quantity Dialog */}
      <QuantityDialog open={quantityDialogOpen} onClose={() => setQuantityDialogOpen(false)}>
        <QuantityDialogTitle>Add Part to Set</QuantityDialogTitle>
        <QuantityDialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {selectedPart?.part_name}
            </Typography>
            
            <TextField
              label="Quantity"
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ min: 1 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={!newIsOptional}
                  onChange={(e) => setNewIsOptional(!e.target.checked)}
                />
              }
              label={newIsOptional ? 'Optional' : 'Required'}
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Notes (optional)"
              multiline
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              fullWidth
              placeholder="Add any notes about this part..."
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Safety Notes (optional)"
              multiline
              rows={2}
              value={newSafetyNotes}
              onChange={(e) => setNewSafetyNotes(e.target.value)}
              fullWidth
              placeholder="Enter safety instructions for this part..."
            />
          </Box>
        </QuantityDialogContent>
        <QuantityDialogActions>
          <Button onClick={() => setQuantityDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={addPartToSet} variant="contained" disabled={loading}>
            Add Part
          </Button>
        </QuantityDialogActions>
      </QuantityDialog>
    </>
  );
};

export default SetPartsDialog;
