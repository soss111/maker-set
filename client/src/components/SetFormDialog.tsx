import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Autocomplete,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  IconButton,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import StepManager from './StepManager';
import { useLanguage } from '../contexts/LanguageContext';
import { Set as SetType } from '../services/api';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';

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

interface SetFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingSet: SetType | null;
  onSubmit: (formData: SetFormData) => Promise<void>;
  submitting: boolean;
  error: string | null;
  success: string | null;
  availableCategories: string[];
}

const SetFormDialog: React.FC<SetFormDialogProps> = ({
  open,
  onClose,
  editingSet,
  onSubmit,
  submitting,
  error,
  success,
  availableCategories,
}) => {
  const { t, currentLanguage } = useLanguage();
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

  useEffect(() => {
    if (editingSet) {
      setFormData({
        category: editingSet.category,
        difficulty_level: editingSet.difficulty_level,
        recommended_age_min: editingSet.recommended_age_min || 0,
        recommended_age_max: editingSet.recommended_age_max || 0,
        estimated_duration_minutes: editingSet.estimated_duration_minutes || 0,
        manual: editingSet.manual || '',
        build_steps: (editingSet as any).build_steps || [],
        base_price: editingSet.base_price || 0,
        video_url: editingSet.video_url || '',
        learning_outcomes: editingSet.learning_outcomes || [],
        translations: [
          { language_code: 'en', name: editingSet.name, description: editingSet.description || '' },
          { language_code: 'et', name: '', description: '' },
          { language_code: 'ru', name: '', description: '' },
          { language_code: 'fi', name: '', description: '' },
        ],
        parts: [],
      });
    } else {
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

  const isFormValid = () => {
    const englishTranslation = formData.translations.find(t => t.language_code === 'en');
    return !!(
      formData.category.trim() &&
      formData.difficulty_level.trim() &&
      formData.recommended_age_min > 0 &&
      formData.recommended_age_max > 0 &&
      formData.estimated_duration_minutes > 0 &&
      formData.base_price > 0 &&
      englishTranslation?.name.trim()
    );
  };

  const handleSubmit = () => {
    if (isFormValid()) {
      onSubmit(formData);
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, category: value });
    
    const trimmedValue = value.trim();
    if (trimmedValue && !availableCategories.includes(trimmedValue)) {
      // Add new category to available categories
      // This would need to be handled by the parent component
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingSet ? 'Edit Set' : 'Add New Set'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* Success and Error Messages */}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => {}}>
              {success}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
              {error}
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fields marked with * are required
          </Typography>
          
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Box flex="1" minWidth="200px">
              <Autocomplete
                value={formData.category || ''}
                onChange={(event, newValue) => {
                  handleCategoryChange(newValue || '');
                }}
                onInputChange={(event, newInputValue) => {
                  setFormData(prev => ({ ...prev, category: newInputValue }));
                }}
                freeSolo
                options={availableCategories}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category *"
                    variant="outlined"
                    required
                    error={!formData.category.trim()}
                    helperText={!formData.category.trim() ? 'Category is required' : ''}
                  />
                )}
              />
            </Box>

            <Box flex="1" minWidth="200px">
              <FormControl fullWidth required error={!formData.difficulty_level.trim()}>
                <InputLabel>Difficulty Level *</InputLabel>
                <Select
                  value={formData.difficulty_level}
                  onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                  label="Difficulty Level *"
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
                label="Min Age *"
                type="number"
                value={formData.recommended_age_min}
                onChange={(e) => setFormData({ ...formData, recommended_age_min: parseInt(e.target.value) || 0 })}
                variant="outlined"
                required
                error={formData.recommended_age_min <= 0}
                helperText={formData.recommended_age_min <= 0 ? 'Minimum age is required' : ''}
              />
            </Box>

            <Box flex="1" minWidth="200px">
              <TextField
                label="Max Age *"
                type="number"
                value={formData.recommended_age_max}
                onChange={(e) => setFormData({ ...formData, recommended_age_max: parseInt(e.target.value) || 0 })}
                variant="outlined"
                required
                error={formData.recommended_age_max <= 0}
                helperText={formData.recommended_age_max <= 0 ? 'Maximum age is required' : ''}
              />
            </Box>

            <Box flex="1" minWidth="200px">
              <TextField
                label="Duration (minutes) *"
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                variant="outlined"
                required
                error={formData.estimated_duration_minutes <= 0}
                helperText={formData.estimated_duration_minutes <= 0 ? 'Duration is required' : ''}
              />
            </Box>

            <Box flex="1" minWidth="200px">
                <TextField
                  label="Base Price (€) *"
                  type="number"
                  inputProps={{ step: "0.01" }}
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                  variant="outlined"
                  required
                  error={formData.base_price <= 0}
                  helperText={formData.base_price <= 0 ? 'Price is required' : ''}
                />
            </Box>

            <Box flex="1" minWidth="200px">
              <TextField
                label="Video URL"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                variant="outlined"
                placeholder="https://youtube.com/watch?v=..."
              />
            </Box>
          </Box>

          {/* Step-by-Step Instructions */}
          <Box sx={{ mt: 3 }}>
            <StepManager
              steps={formData.build_steps}
              onStepsChange={(steps) => {
                setFormData(prev => ({ ...prev, build_steps: steps }));
                // Auto-generate manual text from steps
                const manualText = steps.map(step => 
                  `step ${step.step_number}. ${step.title}\n\n${step.description}`
                ).join('\n\n');
                setFormData(prev => ({ ...prev, manual: manualText }));
              }}
              maxSteps={15}
              setCategory={formData.category}
              setDifficulty={formData.difficulty_level}
              setAgeRange={{ min: formData.recommended_age_min, max: formData.recommended_age_max }}
              setDuration={formData.estimated_duration_minutes}
            />
          </Box>

          {/* Additional Manual Content */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Additional Instructions & Notes
            </Typography>
            <TextField
              label="Additional Manual Content"
              multiline
              rows={4}
              value={formData.manual}
              onChange={(e) => setFormData({ ...formData, manual: e.target.value })}
              placeholder="Add any additional instructions, safety notes, troubleshooting tips, or other helpful information..."
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
              helperText="This content will be combined with your step-by-step instructions to create the complete manual."
            />
          </Box>

          {/* Translations Section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Translations
            </Typography>
            {formData.translations.map((translation, index) => (
              <Box key={translation.language_code} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {translation.language_code.toUpperCase()}
                </Typography>
                <Box display="flex" gap={2}>
                  <TextField
                    label={`Name (${translation.language_code})`}
                    value={translation.name}
                    onChange={(e) => {
                      const newTranslations = [...formData.translations];
                      newTranslations[index].name = e.target.value;
                      setFormData({ ...formData, translations: newTranslations });
                    }}
                    variant="outlined"
                    fullWidth
                    required={translation.language_code === 'en'}
                    error={translation.language_code === 'en' && !translation.name.trim()}
                  />
                  <TextField
                    label={`Description (${translation.language_code})`}
                    multiline
                    rows={3}
                    value={translation.description}
                    onChange={(e) => {
                      const newTranslations = [...formData.translations];
                      newTranslations[index].description = e.target.value;
                      setFormData({ ...formData, translations: newTranslations });
                    }}
                    variant="outlined"
                    fullWidth
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={submitting || !isFormValid()}
          startIcon={submitting ? <CircularProgress size={20} /> : undefined}
        >
          {submitting 
            ? (editingSet ? 'Updating...' : 'Creating...') 
            : (editingSet ? 'Update' : 'Create')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetFormDialog;
