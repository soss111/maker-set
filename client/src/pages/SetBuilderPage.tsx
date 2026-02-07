import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField as MuiTextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Avatar,
  Divider,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Build as BuildIcon,
  Save as SaveIcon,
  Sort as SortIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { partsApi, setsApi, Part, SetCreationData } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface SelectedPart {
  part: Part;
  quantity: number;
  isOptional: boolean;
  notes: string;
}

interface SetBuilderData {
  category: string;
  difficulty_level: string;
  recommended_age_min: number;
  recommended_age_max: number;
  estimated_duration_minutes: number;
  translations: Array<{
    language_code: string;
    name: string;
    description: string;
  }>;
  selectedParts: SelectedPart[];
}

const SetBuilderPage: React.FC = () => {
  const { t } = useLanguage();
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    'electronics',
    'woodwork',
    'games',
    'mechanical'
  ]);
  const [openDialog, setOpenDialog] = useState(false);
  const [sortBy, setSortBy] = useState<string>('part_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [createPartDialogOpen, setCreatePartDialogOpen] = useState(false);
  const [newPartData, setNewPartData] = useState({
    part_number: '',
    category: '',
    unit_of_measure: '',
    unit_cost: 0,
    supplier: '',
    supplier_part_number: '',
    stock_quantity: 0,
    minimum_stock_level: 1,
    image_url: '',
    instruction_pdf: '',
    drawing_pdf: '',
    assembly_notes: '',
    safety_notes: '',
    translations: [
      { language_code: 'en', part_name: '', description: '' },
      { language_code: 'et', part_name: '', description: '' },
      { language_code: 'ru', part_name: '', description: '' },
      { language_code: 'fi', part_name: '', description: '' },
    ],
  });
  const [formData, setFormData] = useState<SetBuilderData>({
    category: '',
    difficulty_level: '',
    recommended_age_min: 0,
    recommended_age_max: 0,
    estimated_duration_minutes: 0,
    translations: [
      { language_code: 'en', name: '', description: '' },
      { language_code: 'et', name: '', description: '' },
      { language_code: 'ru', name: '', description: '' },
      { language_code: 'fi', name: '', description: '' },
    ],
    selectedParts: [],
  });

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const response = await partsApi.getAll();
      setParts((response.data as any)?.data || response.data || []);
    } catch (err) {
      setError('Failed to load parts');
      console.error('Error fetching parts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = (part: Part) => {
    const existingPart = selectedParts.find(sp => sp.part.part_id === part.part_id);
    if (existingPart) {
      setSelectedParts(prev => 
        prev.map(sp => 
          sp.part.part_id === part.part_id 
            ? { ...sp, quantity: sp.quantity + 1 }
            : sp
        )
      );
    } else {
      setSelectedParts(prev => [...prev, {
        part,
        quantity: 1,
        isOptional: part.category === 'tool', // Make tools optional by default, parts required
        notes: ''
      }]);
    }
  };

  const handleRemovePart = (partId: number) => {
    setSelectedParts(prev => prev.filter(sp => sp.part.part_id !== partId));
  };

  const handleUpdateQuantity = (partId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemovePart(partId);
      return;
    }
    setSelectedParts(prev => 
      prev.map(sp => 
        sp.part.part_id === partId 
          ? { ...sp, quantity }
          : sp
      )
    );
  };

  const handleUpdateOptional = (partId: number, isOptional: boolean) => {
    setSelectedParts(prev => 
      prev.map(sp => 
        sp.part.part_id === partId 
          ? { ...sp, isOptional }
          : sp
      )
    );
  };

  const handleToggleOptional = (partId: number) => {
    setSelectedParts(prev => 
      prev.map(sp => 
        sp.part.part_id === partId 
          ? { ...sp, isOptional: !sp.isOptional }
          : sp
      )
    );
  };

  const handleUpdateNotes = (partId: number, notes: string) => {
    setSelectedParts(prev => 
      prev.map(sp => 
        sp.part.part_id === partId 
          ? { ...sp, notes }
          : sp
      )
    );
  };

  const handleCreateNewPart = () => {
    setCreatePartDialogOpen(true);
  };

  const handleCloseCreatePartDialog = () => {
    setCreatePartDialogOpen(false);
    setNewPartData({
      part_number: '',
      category: '',
      unit_of_measure: '',
      unit_cost: 0,
      supplier: '',
      supplier_part_number: '',
      stock_quantity: 0,
      minimum_stock_level: 1,
      image_url: '',
      instruction_pdf: '',
      drawing_pdf: '',
      assembly_notes: '',
      safety_notes: '',
      translations: [
        { language_code: 'en', part_name: '', description: '' },
        { language_code: 'et', part_name: '', description: '' },
        { language_code: 'ru', part_name: '', description: '' },
        { language_code: 'fi', part_name: '', description: '' },
      ],
    });
  };

  const handleSaveNewPart = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate required fields
      const englishTranslation = newPartData.translations.find(t => t.language_code === 'en');
      if (!newPartData.part_number.trim() || !newPartData.category.trim() || !englishTranslation?.part_name.trim()) {
        setError('Please fill in all required fields (Part Number, Category, and English Name)');
        return;
      }

      // Create the part
      const response = await partsApi.create(newPartData);
      
      // Add the new part to the parts list
      const newPart = response.data;
      setParts(prev => [newPart, ...prev]);
      
      // Automatically add the new part to the selected parts
      handleAddPart(newPart);
      
      setSuccess('New part created and added to your set!');
      handleCloseCreatePartDialog();
      
    } catch (err: any) {
      console.error('Error creating part:', err);
      setError(err?.response?.data?.error || 'Failed to create new part');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDialog = () => {
    if (selectedParts.length === 0) {
      setError('Please select at least one part before creating a set');
      return;
    }
    setFormData(prev => ({ ...prev, selectedParts }));
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  };

  // Validation function to check required fields
  const isFormValid = () => {
    const englishTranslation = formData.translations.find(t => t.language_code === 'en');
    return (
      formData.category !== '' &&
      formData.difficulty_level !== '' &&
      englishTranslation?.name.trim() !== ''
    );
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      
      // Prepare parts data for API
      const partsData = formData.selectedParts.map(sp => ({
        part_id: sp.part.part_id,
        quantity: sp.quantity,
        is_optional: sp.isOptional,
        notes: sp.notes
      }));

      // Extract name and description from English translation
      const englishTranslation = formData.translations?.find(t => t.language_code === 'en');
      const name = englishTranslation?.name || '';
      const description = englishTranslation?.description || '';

      // Create the set with parts
      const setData: SetCreationData = {
        category: formData.category,
        difficulty_level: formData.difficulty_level,
        recommended_age_min: formData.recommended_age_min,
        recommended_age_max: formData.recommended_age_max,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        name: name,
        description: description,
        translations: formData.translations,
        parts: partsData
      };

      await setsApi.create(setData);
      
      setSuccess(`Set "${formData.translations[0].name}" created successfully!`);
      setSelectedParts([]);
      setFormData({
        category: '',
        difficulty_level: '',
        recommended_age_min: 0,
        recommended_age_max: 0,
        estimated_duration_minutes: 0,
        translations: [
          { language_code: 'en', name: '', description: '' },
          { language_code: 'et', name: '', description: '' },
          { language_code: 'ru', name: '', description: '' },
          { language_code: 'fi', name: '', description: '' },
        ],
        selectedParts: [],
      });
      
      // Auto-close dialog after successful creation
      setTimeout(() => {
        handleCloseDialog();
      }, 1000);
    } catch (err: any) {
      console.error('Error creating set:', err);
      console.error('Error details:', err?.response?.data || err?.message);
      
      // Provide specific error messages based on the error type
      if (err?.response?.data?.error) {
        setError(`Failed to create set: ${err.response.data.error}`);
      } else if (err?.response?.status === 400) {
        setError('Failed to create set: Invalid data provided. Please check all required fields.');
      } else if (err?.response?.status === 409) {
        setError('Failed to create set: A set with this name already exists.');
      } else if (err?.response?.status === 500) {
        setError('Failed to create set: Server error. Please try again later.');
      } else if (err?.message?.includes('Network Error')) {
        setError('Failed to create set: Network error. Please check your connection and try again.');
      } else {
        setError(`Failed to create set: ${err?.message || 'Unknown error occurred'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotalCost = () => {
    return selectedParts.reduce((total, sp) => {
      const partCost = sp.part.unit_cost || 0;
      return total + (partCost * sp.quantity);
    }, 0);
  };

  const getTotalParts = () => {
    return selectedParts.reduce((total, sp) => total + sp.quantity, 0);
  };

  const getStockColor = (stock: number, minimum: number) => {
    if (stock <= minimum) return 'error';
    if (stock <= minimum * 1.5) return 'warning';
    return 'success';
  };

  // Sorting functionality
  const sortedParts = React.useMemo(() => {
    if (!parts || parts.length === 0) return [];
    
    // Filter parts based on search term
    let filteredParts = parts;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredParts = parts.filter(part => 
        part.part_name.toLowerCase().includes(searchLower) ||
        part.part_number.toLowerCase().includes(searchLower) ||
        part.category.toLowerCase().includes(searchLower) ||
        (part.description && part.description.toLowerCase().includes(searchLower)) ||
        (part.supplier && part.supplier.toLowerCase().includes(searchLower))
      );
    }
    
    return [...filteredParts].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'part_name':
          aValue = (a.part_name || '').toLowerCase();
          bValue = (b.part_name || '').toLowerCase();
          break;
        case 'part_number':
          aValue = (a.part_number || '').toLowerCase();
          bValue = (b.part_number || '').toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'unit_cost':
          aValue = a.unit_cost || 0;
          bValue = b.unit_cost || 0;
          break;
        case 'stock_quantity':
          aValue = a.stock_quantity || 0;
          bValue = b.stock_quantity || 0;
          break;
        default:
          aValue = (a.part_name || '').toLowerCase();
          bValue = (b.part_name || '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      } else {
        if (aValue > bValue) return -1;
        if (aValue < bValue) return 1;
        return 0;
      }
    });
  }, [parts, sortBy, sortOrder, searchTerm]);

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'grid' | 'list' | null,
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Set Builder
        </Typography>
        <Button
          variant="contained"
          startIcon={<BuildIcon />}
          onClick={handleOpenDialog}
          disabled={selectedParts.length === 0}
        >
          Create Set ({selectedParts.length} parts)
        </Button>
      </Box>


      {/* Manual Builder Content */}
      <>
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

      <Box display="flex" gap={3}>
        {/* Available Parts */}
        <Box flex="1">
          <Paper sx={{ p: 2 }}>
            {/* Search Field */}
            <TextField
              id="parts-search"
              name="parts-search"
              fullWidth
              placeholder={t('search.setBuilderPartsPlaceholder') || "Search parts by name, number, category, description, or supplier..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Available Parts ({sortedParts.length})
              </Typography>
              
              {/* Controls */}
              <Box display="flex" gap={2} alignItems="center">
                {/* Sorting Controls */}
                <Box display="flex" gap={1} alignItems="center">
                  <SortIcon fontSize="small" />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <MenuItem value="part_name">Name</MenuItem>
                      <MenuItem value="part_number">Part Number</MenuItem>
                      <MenuItem value="category">Category</MenuItem>
                      <MenuItem value="unit_cost">Unit Cost</MenuItem>
                      <MenuItem value="stock_quantity">Stock Quantity</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Order</InputLabel>
                    <Select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    >
                      <MenuItem value="asc">Ascending</MenuItem>
                      <MenuItem value="desc">Descending</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* View Mode Toggle */}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  aria-label="view mode"
                  size="small"
                >
                  <ToggleButton value="grid" aria-label="grid view">
                    <GridViewIcon />
                  </ToggleButton>
                  <ToggleButton value="list" aria-label="list view">
                    <ListViewIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <Box>
                {/* Create New Part Button */}
                <Card 
                  sx={{ 
                    mb: 2, 
                    border: '2px dashed #ccc',
                    backgroundColor: '#f9f9f9',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#f0f0f0',
                      borderColor: '#999'
                    }
                  }}
                  onClick={handleCreateNewPart}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <AddIcon sx={{ fontSize: 48, color: '#666', mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      Create New Part
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click to add a new part to your inventory
                    </Typography>
                  </CardContent>
                </Card>

                {/* Existing Parts Grid */}
                <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={2}>
                {sortedParts.map((part) => (
                  <Card key={part.part_id} variant="outlined">
                    <CardContent>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {part.part_name}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {part.part_number}
                      </Typography>
                      <Box display="flex" gap={1} mb={2}>
                        <Chip label={part.category} size="small" />
                        <Chip label={part.unit_of_measure} size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Stock: {part.stock_quantity}
                      </Typography>
                      {part.unit_cost && (
                        <Typography variant="body2" color="text.secondary">
                          Cost: €{Number(part.unit_cost).toFixed(2)}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddPart(part)}
                      >
                        Add to Set
                      </Button>
                    </CardActions>
                  </Card>
                ))}
                </Box>
              </Box>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <Box>
                {/* Create New Part Button */}
                <Paper 
                  sx={{ 
                    mb: 2, 
                    border: '2px dashed #ccc',
                    backgroundColor: '#f9f9f9',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#f0f0f0',
                      borderColor: '#999'
                    }
                  }}
                  onClick={handleCreateNewPart}
                >
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <AddIcon sx={{ fontSize: 32, color: '#666', mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      Create New Part
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click to add a new part to your inventory
                    </Typography>
                  </Box>
                </Paper>

                {/* Existing Parts List */}
                <List>
                {sortedParts.map((part, index) => (
                  <React.Fragment key={part.part_id}>
                    <ListItem
                      secondaryAction={
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleAddPart(part)}
                        >
                          Add to Set
                        </Button>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          variant="rounded"
                          sx={{ width: 50, height: 50, bgcolor: 'primary.main' }}
                        >
                          <InventoryIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="h6">
                              {part.part_name}
                            </Typography>
                            <Chip label={part.category} size="small" />
                            <Chip label={part.unit_of_measure} size="small" />
                            <Chip 
                              label={`Stock: ${part.stock_quantity}`} 
                              color={getStockColor(part.stock_quantity, part.minimum_stock_level) as any}
                              size="small" 
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Part Number: {part.part_number}
                            </Typography>
                            {part.unit_cost && (
                              <Typography variant="body2" color="text.secondary">
                                Cost: €{Number(part.unit_cost).toFixed(2)}
                              </Typography>
                            )}
                            {part.description && (
                              <Typography variant="body2" color="text.secondary">
                                {part.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < sortedParts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Selected Parts */}
        <Box flex="1">
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Selected Parts ({selectedParts.length})
            </Typography>
            
            {selectedParts.length > 0 && (
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Total Parts: {getTotalParts()} | Total Cost: €{calculateTotalCost().toFixed(2)}
                </Typography>
              </Box>
            )}

            {selectedParts.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No parts selected. Choose parts from the left panel to build your set.
              </Typography>
            ) : (
              <List>
                {selectedParts.map((selectedPart, index) => (
                  <React.Fragment key={selectedPart.part.part_id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="h6">
                              {selectedPart.part.part_name}
                            </Typography>
                            <Chip label={selectedPart.part.category} size="small" />
                            {selectedPart.isOptional && (
                              <Chip label="Optional" color="warning" size="small" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {selectedPart.part.part_number} • 
                              Stock: {selectedPart.part.stock_quantity} • 
                              Cost: €{Number(selectedPart.part.unit_cost || 0).toFixed(2)}
                            </Typography>
                            <Box display="flex" gap={1} alignItems="center">
                              <TextField
                                id={`part-quantity-${selectedPart.part.part_id}`}
                                name={`part-quantity-${selectedPart.part.part_id}`}
                                size="small"
                                type="number"
                                label="Quantity"
                                value={selectedPart.quantity}
                                onChange={(e) => handleUpdateQuantity(selectedPart.part.part_id, parseInt(e.target.value))}
                                sx={{ width: 100 }}
                              />
                              <FormControl size="small" sx={{ minWidth: 100 }}>
                                <InputLabel>Type</InputLabel>
                                <Select
                                  value={selectedPart.isOptional ? 'optional' : 'required'}
                                  onChange={(e) => handleUpdateOptional(selectedPart.part.part_id, e.target.value === 'optional')}
                                >
                                  <MenuItem value="required">Required</MenuItem>
                                  <MenuItem value="optional">Optional</MenuItem>
                                </Select>
                              </FormControl>
                              <TextField
                                id={`part-notes-${selectedPart.part.part_id}`}
                                name={`part-notes-${selectedPart.part.part_id}`}
                                size="small"
                                label="Notes"
                                value={selectedPart.notes}
                                onChange={(e) => handleUpdateNotes(selectedPart.part.part_id, e.target.value)}
                                sx={{ flex: 1 }}
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemovePart(selectedPart.part.part_id)}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < selectedParts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Create Set Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Set</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Fields marked with * are required
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
              <Box flex="1" minWidth="200px">
                <Autocomplete
                  value={formData.category || ''}
                  onChange={(event, newValue) => {
                    const trimmedValue = (newValue || '').trim();
                    setFormData(prev => ({ ...prev, category: trimmedValue }));
                    
                    // Add new category if it doesn't exist
                    if (trimmedValue && !availableCategories.includes(trimmedValue)) {
                      setAvailableCategories(prev => [...prev, trimmedValue]);
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    // Only update formData, let onChange handle category addition
                    setFormData(prev => ({ ...prev, category: newInputValue }));
                  }}
                  freeSolo
                  options={availableCategories}
                  renderInput={(params) => (
                    <MuiTextField
                      {...params}
                      label="Category *"
                      variant="outlined"
                      required
                      error={!formData.category.trim()}
                      helperText={!formData.category.trim() ? "Category is required" : "Type to add a new category or select existing"}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option}>
                      {option}
                    </li>
                  )}
                />
              </Box>
              <Box flex="1" minWidth="200px">
                <FormControl fullWidth required error={!formData.difficulty_level}>
                  <InputLabel>Difficulty Level *</InputLabel>
                  <Select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                  >
                    <MenuItem value="beginner">Beginner</MenuItem>
                    <MenuItem value="intermediate">Intermediate</MenuItem>
                    <MenuItem value="advanced">Advanced</MenuItem>
                    <MenuItem value="expert">Expert</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box flex="1" minWidth="200px">
                <TextField
                  id="min-age"
                  name="min-age"
                  fullWidth
                  label="Min Age"
                  type="number"
                  value={formData.recommended_age_min}
                  onChange={(e) => setFormData({ ...formData, recommended_age_min: parseInt(e.target.value) })}
                />
              </Box>
              <Box flex="1" minWidth="200px">
                <TextField
                  id="max-age"
                  name="max-age"
                  fullWidth
                  label="Max Age"
                  type="number"
                  value={formData.recommended_age_max}
                  onChange={(e) => setFormData({ ...formData, recommended_age_max: parseInt(e.target.value) })}
                />
              </Box>
              <Box flex="1" minWidth="200px">
                <TextField
                  id="duration"
                  name="duration"
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) })}
                />
              </Box>
            </Box>
            
            {formData.translations.map((translation, index) => (
              <Box key={translation.language_code} sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {translation.language_code.toUpperCase()}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  <Box flex="1" minWidth="200px">
                    <TextField
                      fullWidth
                      label={translation.language_code === 'en' ? "Set Name *" : "Set Name"}
                      value={translation.name}
                      onChange={(e) => {
                        const newTranslations = [...formData.translations];
                        newTranslations[index].name = e.target.value;
                        setFormData({ ...formData, translations: newTranslations });
                      }}
                      required={translation.language_code === 'en'}
                      error={translation.language_code === 'en' && !translation.name.trim()}
                      helperText={translation.language_code === 'en' && !translation.name.trim() ? "Set name is required" : ""}
                    />
                  </Box>
                  <Box flex="1" minWidth="200px">
                    <TextField
                      id={`set-description-${translation.language_code}`}
                      name={`set-description-${translation.language_code}`}
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                      value={translation.description}
                      onChange={(e) => {
                        const newTranslations = [...formData.translations];
                        newTranslations[index].description = e.target.value;
                        setFormData({ ...formData, translations: newTranslations });
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!isFormValid()}
          >
            Create Set
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create New Part Dialog */}
      <Dialog open={createPartDialogOpen} onClose={handleCloseCreatePartDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Part</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box flex="1" minWidth="200px">
                <TextField
                  id="part-number"
                  name="part-number"
                  fullWidth
                  label="Part Number *"
                  required
                  value={newPartData.part_number}
                  onChange={(e) => setNewPartData({ ...newPartData, part_number: e.target.value })}
                  error={!newPartData.part_number.trim()}
                  helperText={!newPartData.part_number.trim() ? "Part number is required" : ""}
                />
              </Box>
              <Box flex="1" minWidth="200px">
                <TextField
                  id="category"
                  name="category"
                  fullWidth
                  label="Category *"
                  required
                  value={newPartData.category}
                  onChange={(e) => setNewPartData({ ...newPartData, category: e.target.value })}
                  error={!newPartData.category.trim()}
                  helperText={!newPartData.category.trim() ? "Category is required" : ""}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box flex="1" minWidth="200px">
                <TextField
                  fullWidth
                  label="Unit of Measure"
                  value={newPartData.unit_of_measure}
                  onChange={(e) => setNewPartData({ ...newPartData, unit_of_measure: e.target.value })}
                />
              </Box>
              <Box flex="1" minWidth="200px">
                <TextField
                  fullWidth
                  label="Unit Cost"
                  type="number"
                  value={newPartData.unit_cost}
                  onChange={(e) => setNewPartData({ ...newPartData, unit_cost: parseFloat(e.target.value) })}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box flex="1" minWidth="200px">
                <TextField
                  fullWidth
                  label="Supplier"
                  value={newPartData.supplier}
                  onChange={(e) => setNewPartData({ ...newPartData, supplier: e.target.value })}
                />
              </Box>
              <Box flex="1" minWidth="200px">
                <TextField
                  fullWidth
                  label="Stock Quantity"
                  type="number"
                  value={newPartData.stock_quantity}
                  onChange={(e) => setNewPartData({ ...newPartData, stock_quantity: parseInt(e.target.value) })}
                />
              </Box>
            </Box>

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Translations</Typography>
            {newPartData.translations.map((translation, index) => (
              <Box key={translation.language_code} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {translation.language_code.toUpperCase()} {translation.language_code === 'en' && '*'}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Part Name"
                    required={translation.language_code === 'en'}
                    value={translation.part_name}
                    onChange={(e) => {
                      const newTranslations = [...newPartData.translations];
                      newTranslations[index].part_name = e.target.value;
                      setNewPartData({ ...newPartData, translations: newTranslations });
                    }}
                    error={translation.language_code === 'en' && !translation.part_name.trim()}
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={2}
                    value={translation.description}
                    onChange={(e) => {
                      const newTranslations = [...newPartData.translations];
                      newTranslations[index].description = e.target.value;
                      setNewPartData({ ...newPartData, translations: newTranslations });
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreatePartDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveNewPart} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Part'}
          </Button>
        </DialogActions>
      </Dialog>
      </>

    </Box>
  );
};

export default SetBuilderPage;
