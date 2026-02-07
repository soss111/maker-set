import React, { useState, useEffect } from 'react';
import { renderError } from '../utils/errorUtils';
import SetCreationWizard from '../components/SetCreationWizard';
import SetFilters from '../components/SetFilters';
import SetStats from '../components/SetStats';
import SetActions from '../components/SetActions';
import SetGrid from '../components/SetGrid';
import SetList from '../components/SetList';
import SetPhotoDialog from '../components/SetPhotoDialog';
import SetToolsDialog from '../components/SetToolsDialog';
import SetPartsDialog from '../components/SetPartsDialog';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { setsApi, Set as SetType, Media } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useRole } from '../contexts/RoleContext';

interface SetFormData {
  category: string;
  difficulty_level: string;
  recommended_age_min: number;
  recommended_age_max: number;
  estimated_duration_minutes: number;
  manual: string;
  build_steps: Array<{
    step_number: number;
    title: string;
    description: string;
    image_url?: string;
  }>;
  base_price: number;
  video_url: string;
  learning_outcomes: string[];
  translations: Array<{
    language_code: string;
    name: string;
    description: string;
  }>;
  parts: any[];
}

const SetsPage: React.FC = () => {
  const { t, currentLanguage } = useLanguage();
  const { isAdmin } = useRole();
  
  // Main state
  const [sets, setSets] = useState<SetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openPhotoDialog, setOpenPhotoDialog] = useState(false);
  const [toolsDialogOpen, setToolsDialogOpen] = useState(false);
  const [partsDialogOpen, setPartsDialogOpen] = useState(false);
  
  // Selected items
  const [editingSet, setEditingSet] = useState<SetType | null>(null);
  const [selectedSet, setSelectedSet] = useState<SetType | null>(null);
  const [selectedSetForTools, setSelectedSetForTools] = useState<SetType | null>(null);
  const [selectedSetForParts, setSelectedSetForParts] = useState<SetType | null>(null);
  
  // Form and UI state
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInactiveSets, setShowInactiveSets] = useState(false);
  const [showVisibilityManager, setShowVisibilityManager] = useState(false);
  const [dialogFocus, setDialogFocus] = useState<'all' | 'manual' | 'drawings' | 'tools'>('all');
  
  // Data collections
  const [availableCategories, setAvailableCategories] = useState<string[]>(['electronics', 'woodwork', 'games', 'mechanical']);
  const [setsWithTools, setSetsWithTools] = useState<Set<number>>(new Set());
  const [setsWithParts, setSetsWithParts] = useState<Set<number>>(new Set());
  
  // Form data
  const [formData, setFormData] = useState<SetFormData>({
    category: '',
    difficulty_level: '',
    recommended_age_min: 0,
    recommended_age_max: 0,
    estimated_duration_minutes: 0,
    manual: '',
    build_steps: [],
    base_price: 0,
    video_url: '',
    learning_outcomes: [],
    translations: [
      { language_code: 'en', name: '', description: '' },
      { language_code: 'et', name: '', description: '' },
      { language_code: 'ru', name: '', description: '' },
      { language_code: 'fi', name: '', description: '' },
    ],
    parts: [],
  });

  // Fetch sets data
  const fetchSets = async () => {
    try {
      setLoading(true);
      const response = await setsApi.getAll();
      if (response.data && response.data.sets) {
        setSets(response.data.sets || []);
        
        // Extract categories
        const categories = [...Array.from(new Set(response.data.sets?.map((set: SetType) => set.category) || []))];
        setAvailableCategories(categories);
        
        // Update sets with tools/parts indicators
        const toolsSets = new Set<number>();
        const partsSets = new Set<number>();
        
        response.data.sets?.forEach((set: SetType) => {
          if ((set as any).tools && (set as any).tools.length > 0) {
            toolsSets.add(set.set_id);
          }
          if ((set as any).parts && (set as any).parts.length > 0) {
            partsSets.add(set.set_id);
          }
        });
        
        setSetsWithTools(toolsSets);
        setSetsWithParts(partsSets);
      }
    } catch (err) {
      setError('Failed to load sets');
      console.error('Error fetching sets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  // Populate form data when editing a set
  useEffect(() => {
    if (editingSet) {
      setFormData({
        category: editingSet.category || '',
        difficulty_level: editingSet.difficulty_level || '',
        recommended_age_min: editingSet.recommended_age_min || 6,
        recommended_age_max: editingSet.recommended_age_max || 100,
        estimated_duration_minutes: editingSet.estimated_duration_minutes || 120,
        manual: editingSet.manual || '',
        build_steps: [],
        base_price: editingSet.base_price || 0,
        video_url: editingSet.video_url || '',
        learning_outcomes: editingSet.learning_outcomes || [],
        translations: editingSet.translations ? Object.entries(editingSet.translations).map(([language_code, data]) => ({
          language_code,
          name: data.name || '',
          description: data.description || ''
        })) : [
          { language_code: 'en', name: '', description: '' },
          { language_code: 'et', name: '', description: '' },
          { language_code: 'ru', name: '', description: '' },
          { language_code: 'fi', name: '', description: '' },
        ],
        parts: editingSet.parts || [],
      });
    } else {
      // Reset form data when not editing
      setFormData({
        category: '',
        difficulty_level: '',
        recommended_age_min: 6,
        recommended_age_max: 100,
        estimated_duration_minutes: 120,
        manual: '',
        build_steps: [],
        base_price: 0,
        video_url: '',
        learning_outcomes: [],
        translations: [
          { language_code: 'en', name: '', description: '' },
          { language_code: 'et', name: '', description: '' },
          { language_code: 'ru', name: '', description: '' },
          { language_code: 'fi', name: '', description: '' },
        ],
        parts: [],
      });
    }
  }, [editingSet]);

  // Helper functions
  const getTranslatedSetName = (set: SetType): string => {
    if (set.translations && set.translations[currentLanguage]) {
      return set.translations[currentLanguage].name || set.name || '';
    }
    return set.name || '';
  };

  const getTranslatedSetDescription = (set: SetType): string => {
    if (set.translations && set.translations[currentLanguage]) {
      return set.translations[currentLanguage].description || set.description || '';
    }
    return set.description || '';
  };

  const getLearningOutcomes = (set: SetType): string[] => {
    if (Array.isArray(set.learning_outcomes)) {
      return set.learning_outcomes;
    }
    return [];
  };

  const getAvailableQuantity = (set: SetType): number => {
    if (set.available_quantity !== undefined) {
      return set.available_quantity;
    }
    return -1; // Parts not configured
  };

  const hasPhotos = (set: SetType): boolean => {
    return !!(set.media && set.media.length > 0);
  };

  const hasTools = (set: SetType): boolean => {
    return setsWithTools.has(set.set_id);
  };

  const hasParts = (set: SetType): boolean => {
    return setsWithParts.has(set.set_id);
  };

  const hasInstructions = (set: SetType): boolean => {
    const hasManual = !!(set.manual && set.manual.trim().length > 0);
    console.log(`🔍 hasInstructions for set ${set.set_id}:`, {
      manual: set.manual,
      manualLength: set.manual?.length,
      hasManual
    });
    return hasManual;
  };

  // Filter and sort sets
  const filteredAndSortedSets = sets
    .filter(set => {
      if (!showInactiveSets && !set.active) return false;
      
      const searchLower = searchTerm.toLowerCase();
      const name = (getTranslatedSetName(set) || '').toLowerCase();
      const description = (getTranslatedSetDescription(set) || '').toLowerCase();
      const category = (set.category || '').toLowerCase();
      
      return name.includes(searchLower) || 
             description.includes(searchLower) || 
             category.includes(searchLower);
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = getTranslatedSetName(a);
          bValue = getTranslatedSetName(b);
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'difficulty_level':
          aValue = a.difficulty_level;
          bValue = b.difficulty_level;
          break;
        case 'base_price':
          aValue = a.base_price || 0;
          bValue = b.base_price || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at || '');
          bValue = new Date(b.created_at || '');
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at || '');
          bValue = new Date(b.updated_at || '');
          break;
        default:
          aValue = getTranslatedSetName(a);
          bValue = getTranslatedSetName(b);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Calculate statistics
  const stats = {
    totalSets: sets.length,
    activeSets: sets.filter(set => set.active).length,
    inactiveSets: sets.filter(set => !set.active).length,
    categories: availableCategories,
    averagePrice: sets.length > 0 ? sets.reduce((sum, set) => sum + (set.base_price || 0), 0) / sets.length : 0,
    totalValue: sets.reduce((sum, set) => sum + (set.base_price || 0), 0),
  };

  // Event handlers
  const handleCreateSet = () => {
    setEditingSet(null);
    setDialogFocus('all');
    setOpenDialog(true);
  };

  const handleCreateManual = () => {
    setEditingSet(null);
    setDialogFocus('manual');
    setOpenDialog(true);
  };

  const handleCreateDrawings = () => {
    setEditingSet(null);
    setDialogFocus('drawings');
    setOpenDialog(true);
  };

  const handleCreateTools = () => {
    setEditingSet(null);
    setDialogFocus('tools');
    setOpenDialog(true);
  };

  const handleEditSet = (set: SetType) => {
    setEditingSet(set);
    setDialogFocus('all');
    setOpenDialog(true);
  };

  const handleDeleteSet = async (setId: number) => {
    if (window.confirm('Are you sure you want to delete this set?')) {
      try {
        await setsApi.delete(setId);
        setSuccess('Set deleted successfully');
        fetchSets();
      } catch (err) {
        setError('Failed to delete set');
      }
    }
  };

  const handleManagePhotos = (set: SetType) => {
    setSelectedSet(set);
    setOpenPhotoDialog(true);
  };

  const handleManageTools = (set: SetType) => {
    setSelectedSetForTools(set);
    setToolsDialogOpen(true);
  };

  const handleManageParts = (set: SetType) => {
    setSelectedSetForParts(set);
    setPartsDialogOpen(true);
  };

  const handleManageInstructions = (set: SetType) => {
    setEditingSet(set);
    setDialogFocus('manual');
    setOpenDialog(true);
  };

  const handleToggleVisibility = async (setId: number, isVisible: boolean) => {
    try {
      console.log(`🔄 Updating set ${setId} visibility to ${isVisible}`);
      const response = await setsApi.updateVisibility(setId, isVisible);
      console.log('✅ Visibility update response:', response);
      setSuccess(`Set ${isVisible ? 'made visible' : 'hidden'} successfully`);
      
      // Refresh the sets list
      try {
        console.log('🔄 Refreshing sets list...');
        await fetchSets();
        console.log('✅ Sets list refreshed successfully');
      } catch (fetchError) {
        console.error('❌ Error refreshing sets after visibility update:', fetchError);
        // Don't show error to user since the visibility update was successful
        // Just log it for debugging
      }
    } catch (err: any) {
      console.error('❌ Error updating set visibility:', err);
      setError(`Failed to update set visibility: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    }
  };

  const handleToggleTrustCertificate = async (setId: number, isTrusted: boolean) => {
    try {
      console.log(`🔄 Updating set ${setId} trust certificate to ${isTrusted}`);
      const response = await setsApi.updateTrustCertification(setId, isTrusted);
      console.log('✅ Trust certificate update response:', response);
      setSuccess(`Set ${isTrusted ? 'marked as trusted' : 'unmarked as trusted'} successfully`);
      
      // Refresh the sets list
      try {
        console.log('🔄 Refreshing sets list...');
        await fetchSets();
        console.log('✅ Sets list refreshed successfully');
      } catch (fetchError) {
        console.error('❌ Error refreshing sets after trust certificate update:', fetchError);
        // Don't show error to user since the trust certificate update was successful
        // Just log it for debugging
      }
    } catch (err: any) {
      console.error('❌ Error updating trust certificate:', err);
      setError(`Failed to update trust certificate: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSet(null);
    setDialogFocus('all');
  };

  const handleSubmit = async (formData: SetFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      if (editingSet) {
        // Exclude parts from the update - these are managed separately
        const { parts, ...setData } = formData;
        
        await setsApi.update(editingSet.set_id, {
          ...setData,
          translations: formData.translations.reduce((acc, translation) => {
            acc[translation.language_code] = {
              name: translation.name,
              description: translation.description
            };
            return acc;
          }, {} as Record<string, { name: string; description: string }>)
        });
        setSuccess('Set updated successfully');
      } else {
        await setsApi.create(formData);
        setSuccess('Set created successfully');
      }
      
      fetchSets();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save set');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePhotoDialog = () => {
    setOpenPhotoDialog(false);
    setSelectedSet(null);
  };

  const updateSetInState = async (setId: number) => {
    try {
      const response = await setsApi.getById(setId);
      if (response.data) {
        setSets(prevSets => 
          prevSets.map(set => 
            set.set_id === setId ? response.data : set
          )
        );
        
        // Update tools and parts indicators for this specific set
        const updatedSet = response.data;
        setSetsWithTools(prev => {
          const newSet = new Set(prev);
          if ((updatedSet as any).tools && (updatedSet as any).tools.length > 0) {
            newSet.add(setId);
          } else {
            newSet.delete(setId);
          }
          return newSet;
        });
        
        setSetsWithParts(prev => {
          const newSet = new Set(prev);
          if ((updatedSet as any).parts && (updatedSet as any).parts.length > 0) {
            newSet.add(setId);
          } else {
            newSet.delete(setId);
          }
          return newSet;
        });
      }
    } catch (err) {
      console.error('Error updating set in state:', err);
    }
  };

  const handleCloseToolsDialog = () => {
    setToolsDialogOpen(false);
    setSelectedSetForTools(null);
  };

  const handleClosePartsDialog = () => {
    setPartsDialogOpen(false);
    setSelectedSetForParts(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Success and Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {renderError(error)}
        </Alert>
      )}

      {/* Header and Actions */}
      <SetActions
        onCreateSet={handleCreateSet}
        onCreateManual={handleCreateManual}
        onCreateDrawings={handleCreateDrawings}
        onCreateTools={handleCreateTools}
        isAdmin={isAdmin}
        showVisibilityManager={showVisibilityManager}
        onToggleVisibilityManager={() => setShowVisibilityManager(!showVisibilityManager)}
      />

      {/* Statistics */}
      <SetStats
        totalSets={stats.totalSets}
        activeSets={stats.activeSets}
        inactiveSets={stats.inactiveSets}
        categories={stats.categories}
        averagePrice={stats.averagePrice}
        totalValue={stats.totalValue}
        loading={loading}
      />

      {/* Filters */}
      <SetFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showInactiveSets={showInactiveSets}
        onShowInactiveSetsChange={setShowInactiveSets}
        isAdmin={isAdmin}
        onToggleVisibilityManager={() => setShowVisibilityManager(!showVisibilityManager)}
      />

      {/* Visibility Manager */}
      {isAdmin && showVisibilityManager && (
        <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Bulk Visibility Management
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {sets.map((set) => (
              <FormControlLabel
                key={set.set_id}
                control={
                  <Switch
                    checked={!!set.admin_visible}
                    onChange={(e) => handleToggleVisibility(set.set_id, e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {set.admin_visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    <Typography variant="caption">
                      {getTranslatedSetName(set)}
                    </Typography>
                  </Box>
                }
                sx={{ m: 0 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Content */}
      {viewMode === 'grid' ? (
        <SetGrid
          sets={filteredAndSortedSets}
          onEditSet={handleEditSet}
          onDeleteSet={handleDeleteSet}
          onManagePhotos={handleManagePhotos}
          onManageTools={handleManageTools}
          onManageParts={handleManageParts}
          onManageInstructions={handleManageInstructions}
          onToggleVisibility={handleToggleVisibility}
          onToggleTrustCertificate={handleToggleTrustCertificate}
          isAdmin={isAdmin}
          hasPhotos={hasPhotos}
          hasTools={hasTools}
          hasParts={hasParts}
          hasInstructions={hasInstructions}
          getTranslatedSetName={getTranslatedSetName}
          getTranslatedSetDescription={getTranslatedSetDescription}
          getLearningOutcomes={getLearningOutcomes}
          getAvailableQuantity={getAvailableQuantity}
        />
      ) : (
        <SetList
          sets={filteredAndSortedSets}
          onEditSet={handleEditSet}
          onDeleteSet={handleDeleteSet}
          onManagePhotos={handleManagePhotos}
          onManageTools={handleManageTools}
          onManageParts={handleManageParts}
          onManageInstructions={handleManageInstructions}
          onToggleVisibility={handleToggleVisibility}
          onToggleTrustCertificate={handleToggleTrustCertificate}
          isAdmin={isAdmin}
          hasPhotos={hasPhotos}
          hasTools={hasTools}
          hasParts={hasParts}
          hasInstructions={hasInstructions}
          getTranslatedSetName={getTranslatedSetName}
          getTranslatedSetDescription={getTranslatedSetDescription}
          getLearningOutcomes={getLearningOutcomes}
          getAvailableQuantity={getAvailableQuantity}
        />
      )}

      {/* Dialogs */}
      <SetCreationWizard
        open={openDialog && dialogFocus !== 'manual' && dialogFocus !== 'drawings'}
        onClose={handleCloseDialog}
        editingSet={editingSet}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        success={success}
        availableCategories={availableCategories}
      />

      {/* Manual Management Dialog */}
      {dialogFocus === 'manual' && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>Manage Instructions</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Instructions & Manual"
                multiline
                rows={8}
                value={formData.manual}
                onChange={(e) => setFormData({ ...formData, manual: e.target.value })}
                placeholder="Enter detailed instructions, manual, or any additional information for this set..."
                variant="outlined"
                fullWidth
                sx={{ mb: 2 }}
              />
              <Typography variant="caption" color="text.secondary">
                You can write step-by-step instructions, safety notes, assembly guide, or any other helpful information for users.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={() => handleSubmit(formData)} variant="contained">
              Save Instructions
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <SetPhotoDialog
        open={openPhotoDialog}
        onClose={handleClosePhotoDialog}
        selectedSet={selectedSet}
        onSetUpdated={() => selectedSet && updateSetInState(selectedSet.set_id)}
      />

      <SetToolsDialog
        open={toolsDialogOpen}
        onClose={handleCloseToolsDialog}
        selectedSet={selectedSetForTools}
        onToolsUpdated={fetchSets}
        onSetUpdated={() => selectedSetForTools && updateSetInState(selectedSetForTools.set_id)}
      />

      <SetPartsDialog
        open={partsDialogOpen}
        onClose={handleClosePartsDialog}
        selectedSet={selectedSetForParts}
        onPartsUpdated={fetchSets}
        onSetUpdated={() => selectedSetForParts && updateSetInState(selectedSetForParts.set_id)}
      />
    </Box>
  );
};

export default SetsPage;