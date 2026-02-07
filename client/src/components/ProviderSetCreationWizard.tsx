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
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Add as AddIcon,
  AutoAwesome as AIIcon,
  School as SchoolIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { setsApi, partsApi, providerApi, mediaApi } from '../services/api';
import AILearningOutcomeGenerator from './AILearningOutcomeGenerator';

interface ProviderSetFormData {
  name: string;
  description: string;
  category: string;
  difficulty_level: string;
  recommended_age_min: number;
  recommended_age_max: number;
  estimated_duration_minutes: number;
  base_price: number;
  available_quantity: number;
  video_url: string;
  learning_outcomes: string[];
  manual: string;
  active: boolean;
  photos: File[];
}

interface ProviderSetCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSetCreated: () => void;
  editingSet?: any;
}

const ProviderSetCreationWizard: React.FC<ProviderSetCreationWizardProps> = ({
  open,
  onClose,
  onSetCreated,
  editingSet
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  // Initialize form data when editing
  useEffect(() => {
    if (editingSet) {
      setFormData({
        name: editingSet.name || '',
        description: editingSet.description || '',
        category: editingSet.category || '',
        difficulty_level: editingSet.difficulty_level || '',
        recommended_age_min: editingSet.recommended_age_min || 6,
        recommended_age_max: editingSet.recommended_age_max || 100,
        estimated_duration_minutes: editingSet.estimated_duration_minutes || 120,
        base_price: editingSet.price || editingSet.base_price || 0,
        available_quantity: editingSet.available_quantity || 1,
        video_url: editingSet.video_url || '',
        learning_outcomes: editingSet.learning_outcomes || [],
        manual: editingSet.manual || '',
        active: editingSet.is_active !== undefined ? editingSet.is_active : true,
        photos: [],
      });
    }
  }, [editingSet]);

  const [formData, setFormData] = useState<ProviderSetFormData>({
    name: '',
    description: '',
    category: '',
    difficulty_level: '',
    recommended_age_min: 6,
    recommended_age_max: 100,
    estimated_duration_minutes: 120,
    base_price: 0,
    available_quantity: 1,
    video_url: '',
    learning_outcomes: [],
    manual: '',
    active: true,
    photos: [],
  });

  const [availableCategories] = useState([
    'electronics',
    'woodworking',
    'mechanical',
    'programming',
    'robotics',
    'chemistry',
    'physics',
    'biology',
    'art',
    'crafts'
  ]);

  const [availableDifficulties] = useState([
    'beginner',
    'intermediate',
    'advanced',
    'expert'
  ]);

  const steps = [
    'Basic Information',
    'Content & Instructions',
    'Pricing & Media',
    'Review & Create'
  ];

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Information
        if (!formData.name.trim()) {
          setError('Set name is required');
          return false;
        }
        if (!formData.category) {
          setError('Category is required');
          return false;
        }
        if (!formData.difficulty_level) {
          setError('Difficulty level is required');
          return false;
        }
        break;
      case 1: // Content & Instructions
        if (!formData.description.trim()) {
          setError('Description is required');
          return false;
        }
        break;
      case 2: // Pricing & Media
        if (formData.base_price <= 0) {
          setError('Base price must be greater than 0');
          return false;
        }
        if (formData.available_quantity < 0) {
          setError('Available quantity must be 0 or greater');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    try {
      setLoading(true);
      setError(null);

      if (editingSet) {
        // Editing existing provider set
        if (editingSet.provider_set_id) {
          // Update provider set specific fields
          await providerApi.updateProviderSet(editingSet.provider_set_id, {
            price: formData.base_price,
            available_quantity: formData.available_quantity,
            is_active: formData.active
          });
        }
        
        // Upload photos if any
        if (formData.photos.length > 0 && editingSet.set_id) {
          console.log('📸 Uploading photos for set:', editingSet.set_id);
          for (const photo of formData.photos) {
            try {
              await mediaApi.upload(
                photo, 
                editingSet.set_id, 
                undefined, 
                'set_photo', 
                `Photo for ${formData.name}`, 
                `Photo showing ${formData.name}`
              );
            } catch (photoError) {
              console.warn('Failed to upload photo:', photoError);
              // Continue with other photos even if one fails
            }
          }
        }
        
        setSuccess('Set updated successfully!');
        setTimeout(() => {
          onSetCreated();
          handleClose();
        }, 2000);
      } else {
        // Creating new set
        // Calculate system commission percentage
        const systemCommissionPercentage = user?.provider_markup_percentage ? 
          100 - user.provider_markup_percentage : 50;

        // Create the set
        const setData = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          difficulty_level: formData.difficulty_level,
          recommended_age_min: formData.recommended_age_min,
          recommended_age_max: formData.recommended_age_max,
          estimated_duration_minutes: formData.estimated_duration_minutes,
          base_price: formData.base_price,
          video_url: formData.video_url,
          learning_outcomes: formData.learning_outcomes,
          manual: formData.manual,
          active: formData.active,
          translations: [
            {
              language_code: 'en',
              name: formData.name,
              description: formData.description
            }
          ],
          // Add system commission part automatically
          parts: [
            {
              part_id: 60, // System commission part (SYS-COMM)
              quantity: 1,
              is_optional: false,
              notes: `System commission (${systemCommissionPercentage}%)`,
              safety_notes: 'Platform service fee'
            }
          ]
        };

        // First create the set
        const setResponse = await setsApi.create(setData);
        const createdSetId = setResponse.data.set_id;
        
        // Then create a provider set entry
        if (user?.user_id) {
          await providerApi.createProviderSet({
            provider_id: user.user_id,
            set_id: createdSetId,
            price: formData.base_price,
            available_quantity: formData.available_quantity,
            is_active: true
          });
        }
        
        // Upload photos if any
        if (formData.photos.length > 0) {
          console.log('📸 Uploading photos for new set:', createdSetId);
          for (const photo of formData.photos) {
            try {
              await mediaApi.upload(
                photo, 
                createdSetId, 
                undefined, 
                'set_photo', 
                `Photo for ${formData.name}`, 
                `Photo showing ${formData.name}`
              );
            } catch (photoError) {
              console.warn('Failed to upload photo:', photoError);
              // Continue with other photos even if one fails
            }
          }
        }
        
        setSuccess('Set created successfully!');
        setTimeout(() => {
          onSetCreated();
          handleClose();
        }, 2000);
      }

    } catch (err: any) {
      console.error('Error saving set:', err);
      setError(err.response?.data?.error || 'Failed to save set');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      difficulty_level: '',
      recommended_age_min: 6,
      recommended_age_max: 100,
      estimated_duration_minutes: 120,
      base_price: 0,
      available_quantity: 1,
      video_url: '',
      learning_outcomes: [],
      manual: '',
      active: true,
      photos: [],
    });
    setActiveStep(0);
    setError(null);
    setSuccess(null);
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Basic Information
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Set Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter set name"
                  required
                />
              </Grid>
              
              <Grid size={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    label="Category"
                  >
                    {availableCategories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={6}>
                <FormControl fullWidth required>
                  <InputLabel>Difficulty Level</InputLabel>
                  <Select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: e.target.value }))}
                    label="Difficulty Level"
                  >
                    {availableDifficulties.map((difficulty) => (
                      <MenuItem key={difficulty} value={difficulty}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Min Age"
                  type="number"
                  value={formData.recommended_age_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommended_age_min: parseInt(e.target.value) || 6 }))}
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>
              
              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Max Age"
                  type="number"
                  value={formData.recommended_age_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommended_age_max: parseInt(e.target.value) || 100 }))}
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>
              
              <Grid size={4}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: parseInt(e.target.value) || 120 }))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Content & Instructions
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what students will learn and build"
                  required
                />
              </Grid>
              
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Instructions & Manual"
                  multiline
                  rows={6}
                  value={formData.manual}
                  onChange={(e) => setFormData(prev => ({ ...prev, manual: e.target.value }))}
                  placeholder="Provide step-by-step instructions for building the set"
                />
              </Grid>
              
              {/* Learning Outcomes Section */}
              <Grid size={12}>
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon color="primary" />
                      Learning Outcomes
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AIIcon />}
                      onClick={() => setAiGeneratorOpen(true)}
                      disabled={!formData.category || !formData.difficulty_level}
                    >
                      AI Generator
                    </Button>
                  </Box>
                  
                  {formData.learning_outcomes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      No learning outcomes defined yet. Use the AI Generator to create them automatically based on your set's category and difficulty.
                    </Typography>
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {formData.learning_outcomes.length} learning outcome{formData.learning_outcomes.length !== 1 ? 's' : ''} defined:
                      </Typography>
                      <Stack spacing={1}>
                        {formData.learning_outcomes.map((outcome, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Typography variant="body2" sx={{ flex: 1, py: 0.5 }}>
                              {index + 1}. {outcome}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => {
                                const updatedOutcomes = formData.learning_outcomes.filter((_, i) => i !== index);
                                setFormData(prev => ({ ...prev, learning_outcomes: updatedOutcomes }));
                              }}
                              color="error"
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Learning Outcomes:</strong> Define what students will learn and achieve by completing this makerset. This helps educators understand the educational value and learning objectives.
                    </Typography>
                  </Alert>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );

      case 2: // Pricing & Media
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Base Price (€)"
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                  inputProps={{ step: "0.01", min: "0" }}
                  required
                />
              </Grid>
              
              <Grid size={6}>
                <TextField
                  fullWidth
                  label="Available Quantity"
                  type="number"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, available_quantity: parseInt(e.target.value) || 0 }))}
                  inputProps={{ min: "0" }}
                  required
                />
              </Grid>
              
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Video URL (optional)"
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </Grid>
              
              {/* Photo Upload Section */}
              <Grid size={12}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PhotoCameraIcon color="primary" />
                  Set Photos
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="photo-upload"
                    multiple
                    type="file"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...files] }));
                    }}
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<PhotoCameraIcon />}
                      sx={{ mb: 2 }}
                    >
                      Add Photos
                    </Button>
                  </label>
                </Box>
                
                {/* Display uploaded photos */}
                {formData.photos.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {formData.photos.map((photo, index) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: 100,
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #ddd'
                          }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' }
                          }}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== index)
                            }));
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                
                <Typography variant="caption" color="text.secondary">
                  Upload photos to showcase your set. Supported formats: JPG, PNG, GIF, WebP
                </Typography>
              </Grid>
              
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    />
                  }
                  label="Active (visible in shop)"
                />
              </Grid>
              
              {/* System Commission Info */}
              <Grid size={12}>
                <Card sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <SecurityIcon color="primary" />
                      System Commission
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      A system commission part will be automatically added to your set to represent the platform's service fee.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={`Your markup: ${user?.provider_markup_percentage || 50}%`}
                        color="success"
                        size="small"
                      />
                      <Chip 
                        label={`System commission: ${user?.provider_markup_percentage ? 100 - user.provider_markup_percentage : 50}%`}
                        color="warning"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 3: // Review & Create
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Review Your Set
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{formData.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {formData.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip label={formData.category} size="small" />
                      <Chip label={formData.difficulty_level} size="small" />
                      <Chip label={`${formData.recommended_age_min}-${formData.recommended_age_max} years`} size="small" />
                      <Chip label={`${formData.estimated_duration_minutes} min`} size="small" />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        €{formData.base_price.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Available: {formData.available_quantity} units
                      </Typography>
                    </Box>
                    
                    {formData.learning_outcomes.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Learning Outcomes:</Typography>
                        <Stack spacing={0.5}>
                          {formData.learning_outcomes.map((outcome, index) => (
                            <Typography key={index} variant="body2" sx={{ pl: 1 }}>
                              • {outcome}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{editingSet ? 'Edit Set' : 'Create New Set'}</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {renderStepContent(activeStep)}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>
            Cancel
          </Button>
          
          {activeStep > 0 && (
            <Button onClick={handleBack}>
              Back
            </Button>
          )}
          
          {activeStep < steps.length - 1 ? (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {loading ? 'Creating...' : 'Create Set'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* AI Learning Outcome Generator Dialog */}
      <AILearningOutcomeGenerator
        open={aiGeneratorOpen}
        onClose={() => setAiGeneratorOpen(false)}
        onApply={(outcomes: string[]) => {
          setFormData(prev => ({ ...prev, learning_outcomes: outcomes }));
          setAiGeneratorOpen(false);
        }}
        currentOutcomes={formData.learning_outcomes}
        setCategory={formData.category}
        setDifficulty={formData.difficulty_level}
        setAgeRange={{ min: formData.recommended_age_min, max: formData.recommended_age_max }}
        setDuration={formData.estimated_duration_minutes}
      />
    </>
  );
};

export default ProviderSetCreationWizard;
