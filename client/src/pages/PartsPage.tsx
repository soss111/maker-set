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
  Chip,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { partsApi, Part, PartCreationData, inventoryApi, InventoryPart } from '../services/api';
import InventoryManagement from '../components/InventoryManagement';

const PartsPageSimple: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [inventoryParts, setInventoryParts] = useState<InventoryPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());

  // Simplified form data
  const [formData, setFormData] = useState<PartCreationData>({
    part_number: '',
    category: '',
    unit_of_measure: 'pc',
    unit_cost: 0,
    supplier: '',
    supplier_part_number: '',
    stock_quantity: 1,
    minimum_stock_level: 1,
    image_url: '',
    instruction_pdf: '',
    drawing_pdf: '',
    assembly_notes: '',
    safety_notes: '',
    translations: [
      { language_code: 'en', part_name: '', description: '' },
    ],
  });

  // Fetch parts and inventory data
  const fetchParts = async () => {
    try {
      setLoading(true);
      const [partsResponse, inventoryResponse] = await Promise.all([
        partsApi.getAll(),
        inventoryApi.getParts()
      ]);
      
      setParts(partsResponse.data.parts || []);
      setInventoryParts(inventoryResponse.data.parts || []);
      
      // Extract unique categories
      const categories = Array.from(new Set(partsResponse.data.parts?.map((part: Part) => part.category).filter(Boolean) || []));
      setAvailableCategories(categories);
    } catch (err: any) {
      console.error('Error fetching parts:', err);
      setError(renderError(err.response?.data?.error || 'Failed to fetch parts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  // Handle category change and auto-generate part number
  const handleCategoryChange = async (category: string) => {
    setFormData({ ...formData, category });
    
    if (category && !editingPart) {
      try {
        const response = await partsApi.getNextNumber(category);
        setFormData(prev => ({ ...prev, part_number: response.data.next_number }));
      } catch (err) {
        console.error('Error generating part number:', err);
      }
    }
  };

  // Form validation
  const isFormValid = () => {
    const englishTranslation = formData.translations?.find(t => t.language_code === 'en');
    return (
      formData.part_number && formData.part_number.trim() !== '' &&
      formData.category !== '' &&
      formData.unit_of_measure !== '' &&
      englishTranslation?.part_name && englishTranslation.part_name.trim() !== ''
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

      if (editingPart) {
        await partsApi.update(editingPart.part_id, formData);
        setSuccessMessage('Part updated successfully!');
      } else {
        await partsApi.create(formData);
        setSuccessMessage('Part created successfully!');
      }
      
      setOpenDialog(false);
      fetchParts();
    } catch (err: any) {
      console.error('Error saving part:', err);
      setError(renderError(err.response?.data?.error || 'Failed to save part'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle dialog open/close
  const handleOpenDialog = (part?: Part) => {
    if (part) {
      setEditingPart(part);
      setFormData({
        part_number: part.part_number,
        category: part.category,
        unit_of_measure: part.unit_of_measure,
        unit_cost: part.unit_cost,
        supplier: part.supplier || '',
        supplier_part_number: part.supplier_part_number || '',
        stock_quantity: part.stock_quantity,
        minimum_stock_level: part.minimum_stock_level,
        image_url: part.image_url || '',
        instruction_pdf: part.instruction_pdf || '',
        drawing_pdf: part.drawing_pdf || '',
        assembly_notes: part.assembly_notes || '',
        safety_notes: part.safety_notes || '',
        translations: [
          { language_code: 'en', part_name: part.part_name, description: part.description || '' },
        ],
      });
    } else {
      setEditingPart(null);
      setFormData({
        part_number: '',
        category: '',
        unit_of_measure: 'pc',
        unit_cost: 0,
        supplier: '',
        supplier_part_number: '',
        stock_quantity: 1,
        minimum_stock_level: 1,
        image_url: '',
        instruction_pdf: '',
        drawing_pdf: '',
        assembly_notes: '',
        safety_notes: '',
        translations: [
          { language_code: 'en', part_name: '', description: '' },
        ],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPart(null);
    setError(null);
    setSuccessMessage(null);
  };

  // Handle delete
  const handleDelete = async (part: Part) => {
    if (window.confirm(`Are you sure you want to delete "${part.part_name}"?`)) {
      try {
        await partsApi.delete(part.part_id);
        setSuccessMessage('Part deleted successfully!');
        fetchParts();
      } catch (err: any) {
        console.error('Error deleting part:', err);
        setError(renderError(err.response?.data?.error || 'Failed to delete part'));
      }
    }
  };

  // Handle inventory updates
  const handleInventoryUpdate = (updatedPart: InventoryPart) => {
    setInventoryParts(prev => 
      prev.map(part => part.part_id === updatedPart.part_id ? updatedPart : part)
    );
    setParts(prev => 
      prev.map(part => part.part_id === updatedPart.part_id ? 
        { ...part, stock_quantity: updatedPart.stock_quantity } : part)
    );
  };

  // Handle card expansion
  const togglePartExpansion = (partId: number) => {
    setExpandedParts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partId)) {
        newSet.delete(partId);
      } else {
        newSet.add(partId);
      }
      return newSet;
    });
  };

  // Get inventory part data
  const getInventoryPart = (partId: number): InventoryPart | undefined => {
    return inventoryParts.find(ip => ip.part_id === partId);
  };

  // Filter parts based on search term
  const filteredParts = parts.filter(part =>
    (part.part_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part.part_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (part.category || '').toLowerCase().includes(searchTerm.toLowerCase())
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
          Parts Inventory
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Part
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search parts by name, number, or category..."
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

      {/* Parts Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 2 }}>
        {filteredParts.map((part) => {
          const inventoryPart = getInventoryPart(part.part_id);
          const isExpanded = expandedParts.has(part.part_id);
          
          return (
            <Card key={part.part_id} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {part.part_name}
                  </Typography>
                  {inventoryPart && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {inventoryPart.is_out_of_stock && (
                        <Chip label="Out of Stock" color="error" size="small" />
                      )}
                      {inventoryPart.is_low_stock && !inventoryPart.is_out_of_stock && (
                        <Chip label="Low Stock" color="warning" size="small" />
                      )}
                    </Box>
                  )}
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {part.part_number} • {part.category}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Cost: €{Number(part.unit_cost).toFixed(2)} • Stock: {part.stock_quantity} {part.unit_of_measure}
                </Typography>
                {inventoryPart && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Value: €{inventoryPart.inventory_value.toFixed(2)}
                  </Typography>
                )}
                {part.supplier && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Supplier: {part.supplier}
                  </Typography>
                )}
                {part.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {part.description}
                  </Typography>
                )}
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between' }}>
                <Box>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(part)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(part)}
                  >
                    Delete
                  </Button>
                </Box>
                <Button
                  size="small"
                  startIcon={<InventoryIcon />}
                  endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => togglePartExpansion(part.part_id)}
                >
                  Inventory
                </Button>
              </CardActions>
              
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <CardContent sx={{ pt: 0 }}>
                  {inventoryPart && (
                    <InventoryManagement 
                      part={inventoryPart} 
                      onStockUpdated={handleInventoryUpdate}
                    />
                  )}
                </CardContent>
              </Collapse>
            </Card>
          );
        })}
      </Box>

      {/* Add/Edit Part Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPart ? 'Edit Part' : 'Add New Part'}
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

            {/* Part Number */}
            <TextField
              fullWidth
              label="Part Number *"
              value={formData.part_number}
              onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
              required
              error={!formData.part_number || !formData.part_number.trim()}
              helperText="Auto-generated based on category"
              disabled={!editingPart && formData.category && formData.part_number && formData.part_number.startsWith(formData.category.toUpperCase().substring(0, 3)) ? true : undefined}
            />

            {/* Part Name */}
            <TextField
              fullWidth
              label="Part Name (English) *"
              value={formData.translations.find(t => t.language_code === 'en')?.part_name || ''}
              onChange={(e) => {
                const updatedTranslations = formData.translations.map(t => 
                  t.language_code === 'en' ? { ...t, part_name: e.target.value } : t
                );
                setFormData({ ...formData, translations: updatedTranslations });
              }}
              required
              error={!formData.translations.find(t => t.language_code === 'en')?.part_name?.trim()}
            />

            {/* Unit of Measure */}
            <Autocomplete
              freeSolo
              options={['pc', 'kg', 'm', 'cm', 'mm', 'set', 'pack']}
              value={formData.unit_of_measure}
              onChange={(event, newValue) => {
                const unit = typeof newValue === 'string' ? newValue : newValue || '';
                setFormData({ ...formData, unit_of_measure: unit });
              }}
              onInputChange={(event, newInputValue) => {
                if (event?.type === 'change') {
                  setFormData({ ...formData, unit_of_measure: newInputValue });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Unit of Measure"
                  helperText="Type to add a new unit or select existing"
                />
              )}
            />

            {/* Unit Cost */}
            <TextField
              fullWidth
              label="Unit Cost (€)"
              type="number"
              value={formData.unit_cost}
              onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
              inputProps={{ min: 0, step: 0.01 }}
            />

            {/* Stock Quantity */}
            <TextField
              fullWidth
              label="Stock Quantity"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              inputProps={{ min: 0 }}
            />

            {/* Supplier */}
            <TextField
              fullWidth
              label="Supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            />

            {/* Description */}
            <TextField
              fullWidth
              label="Description (English)"
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

            {/* Safety Notes */}
            <TextField
              fullWidth
              label="Safety Notes"
              multiline
              rows={3}
              value={formData.safety_notes}
              onChange={(e) => setFormData({ ...formData, safety_notes: e.target.value })}
              placeholder="Enter safety instructions and warnings for this part..."
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
            {submitting ? 'Saving...' : (editingPart ? 'Update Part' : 'Add Part')}
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

export default PartsPageSimple;
