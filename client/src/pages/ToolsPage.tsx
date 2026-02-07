import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { toolsApi, Tool, ToolCreationData } from '../services/api';

const ToolsPageSimple: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Simplified form data
  const [formData, setFormData] = useState<ToolCreationData>({
    tool_number: '',
    category: '',
    tool_type: '',
    condition_status: 'good',
    location: '',
    purchase_date: '',
    last_maintenance_date: '',
    next_maintenance_date: '',
    notes: '',
    image_url: '',
    translations: [
      { language_code: 'en', tool_name: '', description: '', safety_instructions: '' },
    ],
  });

  // Fetch tools
  const fetchTools = async () => {
    try {
      setLoading(true);
      const response = await toolsApi.getAll();
      setTools(response.data.tools || []);
      
      // Extract unique categories
      const categories = Array.from(new Set(response.data.tools?.map((tool: Tool) => tool.category).filter(Boolean) || []));
      setAvailableCategories(categories);
    } catch (err: any) {
      console.error('Error fetching tools:', err);
      setError(renderError(err.response?.data?.error || 'Failed to fetch tools'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  // Handle category change and auto-generate tool number
  const handleCategoryChange = async (category: string) => {
    setFormData({ ...formData, category });
    
    if (category && !editingTool) {
      try {
        const response = await toolsApi.getNextNumber(category);
        setFormData(prev => ({ ...prev, tool_number: response.data.next_number }));
      } catch (err) {
        console.error('Error generating tool number:', err);
      }
    }
  };

  // Form validation
  const isFormValid = () => {
    const englishTranslation = formData.translations?.find(t => t.language_code === 'en');
    return (
      formData.tool_number && formData.tool_number.trim() !== '' &&
      formData.category !== '' &&
      englishTranslation?.tool_name && englishTranslation.tool_name.trim() !== ''
    );
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);
      
      if (!isFormValid()) {
        setError('Please fill in all required fields');
        return;
      }

      if (editingTool) {
        await toolsApi.update(editingTool.tool_id, formData);
        setSuccessMessage('Tool updated successfully!');
      } else {
        await toolsApi.create(formData);
        setSuccessMessage('Tool created successfully!');
      }
      
      setOpenDialog(false);
      fetchTools();
    } catch (err: any) {
      console.error('Error saving tool:', err);
      setError(renderError(err.response?.data?.error || 'Failed to save tool'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle dialog open/close
  const handleOpenDialog = (tool?: Tool) => {
    if (tool) {
      setEditingTool(tool);
      setFormData({
        tool_number: tool.tool_number,
        category: tool.category,
        tool_type: tool.tool_type || '',
        condition_status: tool.condition_status || 'good',
        location: tool.location || '',
        purchase_date: tool.purchase_date || '',
        last_maintenance_date: tool.last_maintenance_date || '',
        next_maintenance_date: tool.next_maintenance_date || '',
        notes: tool.notes || '',
        image_url: tool.image_url || '',
        translations: [
          { language_code: 'en', tool_name: tool.tool_name, description: tool.description || '', safety_instructions: tool.safety_instructions || '' },
        ],
      });
    } else {
      setEditingTool(null);
      setFormData({
        tool_number: '',
        category: '',
        tool_type: '',
        condition_status: 'good',
        location: '',
        purchase_date: '',
        last_maintenance_date: '',
        next_maintenance_date: '',
        notes: '',
        image_url: '',
        translations: [
          { language_code: 'en', tool_name: '', description: '', safety_instructions: '' },
        ],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTool(null);
    setError(null);
    setSuccessMessage(null);
  };

  // Handle delete
  const handleDelete = async (tool: Tool) => {
    if (window.confirm(`Are you sure you want to delete "${tool.tool_name}"?`)) {
      try {
        await toolsApi.delete(tool.tool_id);
        setSuccessMessage('Tool deleted successfully!');
        fetchTools();
      } catch (err: any) {
        console.error('Error deleting tool:', err);
        setError(renderError(err.response?.data?.error || 'Failed to delete tool'));
      }
    }
  };

  // Filter tools based on search term
  const filteredTools = tools.filter(tool =>
    (tool.tool_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tool.tool_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tool.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Tools Inventory
          </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
          Add New Tool
            </Button>
        </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
      <TextField
        fullWidth
          placeholder="Search tools by name, number, or category..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
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

      {/* Tools Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
        {filteredTools.map((tool) => (
          <Card key={tool.tool_id} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                {tool.tool_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {tool.tool_number} • {tool.category}
                </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type: {tool.tool_type || 'N/A'} • Condition: {tool.condition_status}
              </Typography>
              {tool.location && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Location: {tool.location}
                  </Typography>
              )}
              {tool.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {tool.description}
                </Typography>
              )}
            </CardContent>
            <CardActions>
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleOpenDialog(tool)}
              >
                Edit
              </Button>
              <Button
                    size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDelete(tool)}
              >
                Delete
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* Add/Edit Tool Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTool ? 'Edit Tool' : 'Add New Tool'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Category */}
            <Autocomplete
              freeSolo
              options={availableCategories}
              value={formData.category}
              onChange={(event, newValue) => {
                const category = typeof newValue === 'string' ? newValue : newValue || '';
                handleCategoryChange(category);
              }}
              onInputChange={(event, newInputValue) => {
                if (event?.type === 'change') {
                  handleCategoryChange(newInputValue);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Category *"
                  required
                  error={!formData.category}
                  helperText="Type to add a new category or select existing"
                />
              )}
            />

            {/* Tool Number */}
                <TextField
                  fullWidth
              label="Tool Number *"
                  value={formData.tool_number}
                  onChange={(e) => setFormData({ ...formData, tool_number: e.target.value })}
                  required
              error={!formData.tool_number || !formData.tool_number.trim()}
              helperText="Auto-generated based on category"
              disabled={!editingTool && formData.category && formData.tool_number && formData.tool_number.startsWith(formData.category.toUpperCase().substring(0, 3)) ? true : undefined}
            />

            {/* Tool Name */}
            <TextField
              fullWidth
              label="Tool Name *"
              value={formData.translations.find(t => t.language_code === 'en')?.tool_name || ''}
              onChange={(e) => {
                const updatedTranslations = formData.translations.map(t => 
                  t.language_code === 'en' ? { ...t, tool_name: e.target.value } : t
                );
                setFormData({ ...formData, translations: updatedTranslations });
              }}
              required
              error={!formData.translations.find(t => t.language_code === 'en')?.tool_name?.trim()}
            />

            {/* Tool Type */}
            <Autocomplete
              freeSolo
              options={['hand', 'power', 'measuring', 'safety', 'other']}
              value={formData.tool_type}
              onChange={(event, newValue) => {
                const toolType = typeof newValue === 'string' ? newValue : newValue || '';
                setFormData({ ...formData, tool_type: toolType });
              }}
              onInputChange={(event, newInputValue) => {
                if (event?.type === 'change') {
                  setFormData({ ...formData, tool_type: newInputValue });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tool Type"
                  helperText="Type to add a new type or select existing"
                />
              )}
            />

            {/* Condition Status */}
            <Autocomplete
              freeSolo
              options={['excellent', 'good', 'fair', 'poor', 'needs_repair']}
              value={formData.condition_status}
              onChange={(event, newValue) => {
                const condition = typeof newValue === 'string' ? newValue : newValue || '';
                setFormData({ ...formData, condition_status: condition });
              }}
              onInputChange={(event, newInputValue) => {
                if (event?.type === 'change') {
                  setFormData({ ...formData, condition_status: newInputValue });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Condition Status"
                  helperText="Type to add a new condition or select existing"
                />
              )}
            />

            {/* Location */}
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />

            {/* Description */}
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.translations.find(t => t.language_code === 'en')?.description || ''}
              onChange={(e) => {
                const updatedTranslations = formData.translations.map(t => 
                  t.language_code === 'en' ? { ...t, description: e.target.value } : t
                );
                setFormData({ ...formData, translations: updatedTranslations });
              }}
            />

            {/* Notes */}
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
              rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />

            {/* Safety Instructions */}
            <TextField
              fullWidth
              label="Safety Instructions"
              multiline
              rows={3}
              value={formData.translations.find(t => t.language_code === 'en')?.safety_instructions || ''}
              onChange={(e) => {
                const updatedTranslations = formData.translations.map(t => 
                  t.language_code === 'en' ? { ...t, safety_instructions: e.target.value } : t
                );
                setFormData({ ...formData, translations: updatedTranslations });
              }}
              placeholder="Enter safety instructions and warnings for this tool..."
              helperText="Important safety information that will be included in instruction manuals"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={submitting || !isFormValid()}
            startIcon={submitting ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {submitting ? 'Saving...' : (editingTool ? 'Update Tool' : 'Add Tool')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar 
        open={!!successMessage}
        autoHideDuration={6000} 
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  );
};

export default ToolsPageSimple;
