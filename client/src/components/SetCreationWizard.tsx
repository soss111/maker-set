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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Divider,
  IconButton,
  Paper,
  Grid,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Info as InfoIcon,
  School as SchoolIcon,
  Build as BuildIcon,
  AttachMoney as MoneyIcon,
  Language as LanguageIcon,
  VideoLibrary as VideoIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { setsApi, Set as SetType } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import StepManager from './StepManager';
import AILearningOutcomeGenerator from './AILearningOutcomeGenerator';

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

interface SetCreationWizardProps {
  open: boolean;
  onClose: () => void;
  editingSet: SetType | null;
  onSubmit: (formData: SetFormData) => Promise<void>;
  submitting: boolean;
  error: string | null;
  success: string | null;
  availableCategories: string[];
}

const steps = [
  'Basic Information',
  'Target Audience',
  'Content & Instructions',
  'Pricing & Media',
  'Translations',
  'Review & Create'
];

const SetCreationWizard: React.FC<SetCreationWizardProps> = ({
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
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [formData, setFormData] = useState<SetFormData>({
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

  useEffect(() => {
    if (editingSet) {
      setFormData({
        category: editingSet.category,
        difficulty_level: editingSet.difficulty_level,
        recommended_age_min: editingSet.recommended_age_min || 6,
        recommended_age_max: editingSet.recommended_age_max || 100,
        estimated_duration_minutes: editingSet.estimated_duration_minutes || 120,
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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Information
        return !!(formData.category.trim() && formData.difficulty_level.trim());
      case 1: // Target Audience
        return !!(formData.recommended_age_min > 0 && formData.recommended_age_max > 0 && formData.estimated_duration_minutes > 0);
      case 2: // Content & Instructions
        return true; // Optional step
      case 3: // Pricing & Media
        return !!(formData.base_price && formData.base_price > 0);
      case 4: // Translations
        const englishTranslation = formData.translations.find(t => t.language_code === 'en');
        return !!(englishTranslation?.name.trim());
      case 5: // Review
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setCompletedSteps(prev => new Set([...Array.from(prev), activeStep]));
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleStepClick = (step: number) => {
    if (step <= activeStep || completedSteps.has(step - 1)) {
      setActiveStep(step);
    }
  };

  const handleSubmit = () => {
    if (validateStep(activeStep)) {
      onSubmit(formData);
    }
  };

  const isFormValid = () => {
    const step0Valid = validateStep(0); // Basic Information
    const step1Valid = validateStep(1); // Target Audience  
    const step3Valid = validateStep(3); // Pricing & Media
    const step4Valid = validateStep(4); // Translations
    
    console.log('Form validation:', {
      step0Valid, // Basic Information
      step1Valid, // Target Audience
      step3Valid, // Pricing & Media  
      step4Valid, // Translations
      category: formData.category,
      difficulty_level: formData.difficulty_level,
      recommended_age_min: formData.recommended_age_min,
      recommended_age_max: formData.recommended_age_max,
      estimated_duration_minutes: formData.estimated_duration_minutes,
      base_price: formData.base_price,
      englishName: formData.translations.find(t => t.language_code === 'en')?.name
    });
    
    return step0Valid && step1Valid && step3Valid && step4Valid;
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 0: return <InfoIcon />;
      case 1: return <SchoolIcon />;
      case 2: return <DescriptionIcon />;
      case 3: return <MoneyIcon />;
      case 4: return <LanguageIcon />;
      case 5: return <CheckIcon />;
      default: return <InfoIcon />;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="primary" />
              Basic Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Autocomplete
                  value={formData.category || ''}
                  onChange={(event, newValue) => {
                    setFormData(prev => ({ ...prev, category: newValue || '' }));
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
                      helperText={!formData.category.trim() ? 'Choose or create a category for your set' : 'e.g., Electronics, Woodworking, Robotics'}
                      fullWidth
                    />
                  )}
                />
              </Grid>
              
              <Grid size={{ xs: 12, md: 8 }}>
                <FormControl fullWidth required error={!formData.difficulty_level.trim()}>
                  <InputLabel>Difficulty Level *</InputLabel>
                  <Select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: e.target.value }))}
                    label="Difficulty Level *"
                  >
                    <MenuItem value="beginner">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Beginner" color="success" size="small" />
                        <Typography>Easy - No prior experience needed</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="intermediate">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Intermediate" color="warning" size="small" />
                        <Typography>Moderate - Some experience helpful</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="advanced">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Advanced" color="error" size="small" />
                        <Typography>Challenging - Requires experience</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="expert">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="Expert" color="error" size="small" />
                        <Typography>Professional - Expert level required</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon color="primary" />
              Target Audience
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Minimum Age *"
                  type="number"
                  value={formData.recommended_age_min}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommended_age_min: parseInt(e.target.value) || 0 }))}
                  variant="outlined"
                  required
                  error={formData.recommended_age_min <= 0}
                  helperText={formData.recommended_age_min <= 0 ? 'Minimum age is required' : 'Youngest recommended age'}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">👶</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Maximum Age *"
                  type="number"
                  value={formData.recommended_age_max}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommended_age_max: parseInt(e.target.value) || 0 }))}
                  variant="outlined"
                  required
                  error={formData.recommended_age_max <= 0}
                  helperText={formData.recommended_age_max <= 0 ? 'Maximum age is required' : 'Oldest recommended age'}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">👴</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Duration (minutes) *"
                  type="number"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: parseInt(e.target.value) || 0 }))}
                  variant="outlined"
                  required
                  error={formData.estimated_duration_minutes <= 0}
                  helperText={formData.estimated_duration_minutes <= 0 ? 'Duration is required' : 'Estimated completion time'}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">⏱️</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Age Range Tips:</strong> Consider the complexity of assembly, reading requirements, and safety considerations when setting age ranges.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon color="primary" />
              Content & Instructions
            </Typography>
            
            {/* Step-by-Step Instructions */}
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
            
            {/* Additional Manual Content */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon color="primary" />
                Additional Instructions & Notes
              </Typography>
              <TextField
                label="Additional Manual Content"
                multiline
                rows={4}
                value={formData.manual}
                onChange={(e) => setFormData(prev => ({ ...prev, manual: e.target.value }))}
                placeholder="Add any additional instructions, safety notes, troubleshooting tips, or other helpful information..."
                variant="outlined"
                fullWidth
                sx={{ mb: 2 }}
                helperText="This content will be combined with your step-by-step instructions to create the complete manual."
              />
            </Box>
            
            {/* Learning Outcomes Section */}
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
                          <DeleteIcon fontSize="small" />
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
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Writing Tips:</strong> Use clear, simple language. Include safety warnings, required tools, and troubleshooting tips. You can use markdown formatting for better readability.
              </Typography>
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon color="primary" />
              Pricing & Media
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Base Price (€) *"
                  type="number"
                  inputProps={{ step: "0.01" }}
                  value={formData.base_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                  variant="outlined"
                  required
                  error={formData.base_price <= 0}
                  helperText={formData.base_price <= 0 ? 'Price is required' : 'Base price for this set'}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Video URL"
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  variant="outlined"
                  placeholder="https://youtube.com/watch?v=..."
                  fullWidth
                  helperText="Optional: Add a YouTube video demonstrating the set"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><VideoIcon /></InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Pricing Tips:</strong> Consider material costs, complexity, and market value. Videos help customers understand the product better and increase sales.
              </Typography>
            </Alert>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LanguageIcon color="primary" />
              Translations
            </Typography>
            
            {formData.translations.map((translation, index) => (
              <Card key={translation.language_code} sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={translation.language_code.toUpperCase()} 
                      color={translation.language_code === 'en' ? 'primary' : 'default'}
                      size="small" 
                    />
                    {translation.language_code === 'en' && <Chip label="Required" color="error" size="small" />}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label={`Set Name (${translation.language_code})`}
                        value={translation.name}
                        onChange={(e) => {
                          const newTranslations = [...formData.translations];
                          newTranslations[index].name = e.target.value;
                          setFormData(prev => ({ ...prev, translations: newTranslations }));
                        }}
                        variant="outlined"
                        fullWidth
                        required={translation.language_code === 'en'}
                        error={translation.language_code === 'en' && !translation.name.trim()}
                        helperText={translation.language_code === 'en' ? 'English name is required' : 'Optional translation'}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label={`Description (${translation.language_code})`}
                        multiline
                        rows={3}
                        value={translation.description}
                        onChange={(e) => {
                          const newTranslations = [...formData.translations];
                          newTranslations[index].description = e.target.value;
                          setFormData(prev => ({ ...prev, translations: newTranslations }));
                        }}
                        variant="outlined"
                        fullWidth
                        placeholder="Optional description in this language"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        );

      case 5:
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckIcon color="primary" />
              Review & Create
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Basic Information</Typography>
                    <Typography><strong>Category:</strong> {formData.category}</Typography>
                    <Typography><strong>Difficulty:</strong> {formData.difficulty_level}</Typography>
                    <Typography><strong>Age Range:</strong> {formData.recommended_age_min}-{formData.recommended_age_max} years</Typography>
                    <Typography><strong>Duration:</strong> {formData.estimated_duration_minutes} minutes</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Pricing & Media</Typography>
                    <Typography><strong>Price:</strong> €{formData.base_price.toFixed(2)}</Typography>
                    <Typography><strong>Video:</strong> {formData.video_url ? '✅ Added' : '❌ Not provided'}</Typography>
                    <Typography><strong>Instructions:</strong> {formData.manual ? '✅ Added' : '❌ Not provided'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Translations</Typography>
                    {formData.translations.map((translation) => (
                      <Box key={translation.language_code} sx={{ mb: 1 }}>
                        <Typography>
                          <strong>{translation.language_code.toUpperCase()}:</strong> {translation.name || 'Not provided'}
                        </Typography>
                      </Box>
                    ))}
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{ backdrop: { 'aria-hidden': false } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">
            {editingSet ? 'Edit Set' : 'Create New Set'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Step {activeStep + 1} of {steps.length}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {/* Success and Error Messages */}
        {success && (
          <Alert severity="success" sx={{ m: 2 }} onClose={() => {}}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => {}}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex' }}>
          {/* Stepper */}
          <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', p: 2 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((label, index) => (
                <Step key={label} completed={completedSteps.has(index)}>
                  <StepLabel
                    onClick={() => handleStepClick(index)}
                    sx={{ cursor: 'pointer' }}
                    StepIconComponent={({ active, completed }) => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: completed ? 'success.main' : active ? 'primary.main' : 'grey.300',
                          color: 'white',
                          cursor: 'pointer',
                        }}
                      >
                        {completed ? <CheckIcon /> : getStepIcon(index)}
                      </Box>
                    )}
                  >
                    <Typography variant="body2" sx={{ fontWeight: activeStep === index ? 'bold' : 'normal' }}>
                      {label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
          
          {/* Content */}
          <Box sx={{ flex: 1 }}>
            {renderStepContent(activeStep)}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={submitting}>
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button 
            onClick={handleNext} 
            variant="contained"
            disabled={!validateStep(activeStep)}
          >
            Next
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={submitting || !isFormValid()}
            startIcon={submitting ? <CircularProgress size={20} /> : undefined}
            sx={{ backgroundColor: 'success.main', '&:hover': { backgroundColor: 'success.dark' } }}
          >
            {submitting 
              ? (editingSet ? 'Updating...' : 'Creating...') 
              : (editingSet ? 'Update Set' : 'Create Set')
            }
          </Button>
        )}
      </DialogActions>
      
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
    </Dialog>
  );
};

export default SetCreationWizard;
