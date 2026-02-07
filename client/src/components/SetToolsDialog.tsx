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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { Set as SetType, setToolsApi, toolsApi } from '../services/api';

interface SetToolsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSet: SetType | null;
  onToolsUpdated: () => void;
  onSetUpdated?: () => void;
}

interface SetTool {
  set_tool_id: number;
  tool_id: number;
  quantity: number;
  is_optional: boolean;
  notes: string;
  safety_notes: string;
  tool_name: string;
  tool_description?: string;
  tool_category?: string;
}

interface Tool {
  tool_id: number;
  tool_name: string;
  description?: string;
  category?: string;
}

const SetToolsDialog: React.FC<SetToolsDialogProps> = ({
  open,
  onClose,
  selectedSet,
  onToolsUpdated,
  onSetUpdated,
}) => {
  const [setTools, setSetTools] = useState<SetTool[]>([]);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [toolSearchTerm, setToolSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Tool quantity dialog state
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [newQuantity, setNewQuantity] = useState(1);
  const [newIsOptional, setNewIsOptional] = useState(true);
  const [newNotes, setNewNotes] = useState('');
  const [newSafetyNotes, setNewSafetyNotes] = useState('');

  const fetchSetTools = async (setId: number) => {
    try {
      setLoading(true);
      const response = await setToolsApi.getBySetId(setId, 'en');
      const data = response.data as { tools?: SetTool[] } | SetTool[];
      const tools = Array.isArray(data) ? data : (data?.tools ?? []);
      setSetTools(tools);
      return tools;
    } catch (err: any) {
      console.error('Error fetching set tools:', err);
      setError(`Failed to load tools: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTools = async (currentSetTools: SetTool[] = setTools) => {
    try {
      const response = await toolsApi.getAll('en');
      const allTools = response.data.tools || [];
      
      // Filter out tools that are already in the set (guard against non-array from API)
      const list = Array.isArray(currentSetTools) ? currentSetTools : [];
      const toolsInSet = list.map(st => st.tool_id);
      const availableTools = allTools.filter(tool => !toolsInSet.includes(tool.tool_id));
      
      setAvailableTools(availableTools);
    } catch (err: any) {
      console.error('Error fetching available tools:', err);
      setError(`Failed to load available tools: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (open && selectedSet) {
      const loadData = async () => {
        const fetchedSetTools = await fetchSetTools(selectedSet.set_id);
        await fetchAvailableTools(fetchedSetTools);
      };
      loadData();
    }
  }, [open, selectedSet]);

  const handleAddToolClick = (tool: Tool) => {
    setSelectedTool(tool);
    setNewQuantity(1);
    setNewIsOptional(true);
    setNewNotes('');
    setNewSafetyNotes('');
    setQuantityDialogOpen(true);
  };

  const addToolToSet = async () => {
    if (!selectedSet || !selectedTool) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5001/api/set-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          set_id: selectedSet.set_id,
          tool_id: selectedTool.tool_id,
          quantity: newQuantity,
          is_optional: newIsOptional,
          notes: newNotes,
          safety_notes: newSafetyNotes
        })
      });

      if (response.ok) {
        setSuccess('Tool added successfully!');
        const updatedSetTools = await fetchSetTools(selectedSet.set_id);
        await fetchAvailableTools(updatedSetTools);
        onToolsUpdated();
        
        // Notify parent component to refresh set data
        if (onSetUpdated) {
          onSetUpdated();
        }
        
        setQuantityDialogOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add tool');
      }
    } catch (err: any) {
      console.error('Error adding tool to set:', err);
      setError(`Failed to add tool: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const removeToolFromSet = async (setToolId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await setToolsApi.remove(setToolId);
      
      if (response.data.message) {
        setSuccess('Tool removed successfully!');
        if (selectedSet) {
          await fetchSetTools(selectedSet.set_id);
        }
        onToolsUpdated();
        
        // Notify parent component to refresh set data
        if (onSetUpdated) {
          onSetUpdated();
        }
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to remove tool');
      }
    } catch (err: any) {
      console.error('Error removing tool from set:', err);
      setError(`Failed to remove tool: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateToolQuantity = async (setToolId: number, quantity: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await setToolsApi.update(setToolId, {
        quantity,
        is_optional: true,
        notes: ''
      });

      if (response.data.message) {
        setSuccess('Tool quantity updated successfully!');
        if (selectedSet) {
          await fetchSetTools(selectedSet.set_id);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to update tool quantity');
      }
    } catch (err: any) {
      console.error('Error updating tool quantity:', err);
      setError(`Failed to update tool quantity: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateToolSafetyNotes = async (setToolId: number, safetyNotes: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await setToolsApi.update(setToolId, {
        quantity: 1,
        is_optional: true,
        notes: '',
        safety_notes: safetyNotes
      });

      if (response.data.success) {
        setSuccess('Safety notes updated successfully!');
        if (selectedSet) {
          await fetchSetTools(selectedSet.set_id);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to update safety notes');
      }
    } catch (err: any) {
      console.error('Error updating safety notes:', err);
      setError(`Failed to update safety notes: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateToolRequirement = async (setToolId: number, isOptional: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await setToolsApi.update(setToolId, {
        quantity: 1,
        is_optional: isOptional,
        notes: ''
      });

      if (response.data.message) {
        setSuccess('Tool requirement updated successfully!');
        if (selectedSet) {
          await fetchSetTools(selectedSet.set_id);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to update tool requirement');
      }
    } catch (err: any) {
      console.error('Error updating tool requirement:', err);
      setError(`Failed to update tool requirement: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter available tools based on search term and exclude tools already in set
  const filteredAvailableTools = availableTools.filter(tool => {
    if (!toolSearchTerm.trim()) return true;
    
    const searchLower = toolSearchTerm.toLowerCase();
    return (
      tool.tool_name?.toLowerCase().includes(searchLower) ||
      tool.description?.toLowerCase().includes(searchLower) ||
      tool.category?.toLowerCase().includes(searchLower)
    );
  }).filter(tool => {
    // Exclude tools that are already in the set
    return !setTools.some(setTool => setTool.tool_id === tool.tool_id);
  });

  const handleClose = () => {
    setSetTools([]);
    setAvailableTools([]);
    setToolSearchTerm('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon />
          Manage Tools for {selectedSet?.name}
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

          {/* Search Available Tools */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Add New Tools
            </Typography>
            <TextField
              fullWidth
              placeholder="Search tools by name, description, or category..."
              value={toolSearchTerm}
              onChange={(e) => setToolSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ mb: 2 }}
            />

            {/* Available Tools List */}
            {filteredAvailableTools.length > 0 ? (
              <List sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                {filteredAvailableTools.map((tool) => (
                  <ListItem key={tool.tool_id} divider>
                    <ListItemText
                      primary={tool.tool_name}
                      secondary={
                        <Box component="span">
                          {tool.description && (
                            <Typography component="span" variant="body2" color="text.secondary" display="block">
                              {tool.description}
                            </Typography>
                          )}
                          {tool.category && (
                            <Chip label={tool.category} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        onClick={() => handleAddToolClick(tool)}
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
                  {toolSearchTerm ? 'No tools found matching your search' : 'No available tools to add'}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Current Tools in Set */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Current Tools in Set ({setTools.length})
            </Typography>
            
            {setTools.length > 0 ? (
              <List sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
                {setTools.map((setTool) => (
                  <ListItem key={setTool.set_tool_id} divider sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {setTool.tool_name}
                      </Typography>
                      <IconButton
                        onClick={() => removeToolFromSet(setTool.set_tool_id)}
                        disabled={loading}
                        color="error"
                        title="Remove from set"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          label="Quantity"
                          type="number"
                          size="small"
                          value={setTool.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            if (newQuantity !== setTool.quantity) {
                              updateToolQuantity(setTool.set_tool_id, newQuantity);
                            }
                          }}
                          sx={{ width: 100 }}
                          inputProps={{ min: 1 }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={!setTool.is_optional}
                              onChange={(e) => {
                                updateToolRequirement(setTool.set_tool_id, !e.target.checked);
                              }}
                              size="small"
                            />
                          }
                          label={setTool.is_optional ? 'Optional' : 'Required'}
                          labelPlacement="start"
                        />
                      </Box>
                      
                      <TextField
                        label="Safety Notes"
                        size="small"
                        multiline
                        rows={2}
                        value={setTool.safety_notes || ''}
                        onChange={(e) => {
                          // Update safety notes
                          const updatedTools = setTools.map(tool => 
                            tool.set_tool_id === setTool.set_tool_id 
                              ? { ...tool, safety_notes: e.target.value }
                              : tool
                          );
                          setSetTools(updatedTools);
                        }}
                        placeholder="Enter safety instructions for this tool..."
                        sx={{ width: '100%' }}
                      />
                      
                      {setTool.notes && (
                        <Typography variant="caption" color="text.secondary">
                          Notes: {setTool.notes}
                        </Typography>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No tools assigned to this set yet.
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

      {/* Tool Quantity Dialog */}
      <Dialog open={quantityDialogOpen} onClose={() => setQuantityDialogOpen(false)}>
        <DialogTitle>Add Tool to Set</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              {selectedTool?.tool_name}
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
              placeholder="Add any notes about this tool..."
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Safety Notes (optional)"
              multiline
              rows={2}
              value={newSafetyNotes}
              onChange={(e) => setNewSafetyNotes(e.target.value)}
              fullWidth
              placeholder="Enter safety instructions for this tool..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuantityDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={addToolToSet} variant="contained" disabled={loading}>
            Add Tool
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SetToolsDialog;
