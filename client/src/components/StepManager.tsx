import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  Divider,
  Alert,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper
} from '@mui/material';
import AIStepGenerator from './AIStepGenerator';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  List as ListIcon,
  TextFields as TextIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material';

interface BuildStep {
  step_number: number;
  title: string;
  description: string;
  image_url?: string;
}

interface StepManagerProps {
  steps: BuildStep[];
  onStepsChange: (steps: BuildStep[]) => void;
  maxSteps?: number;
  setCategory?: string;
  setDifficulty?: string;
  setAgeRange?: { min: number; max: number };
  setDuration?: number;
}

const StepManager: React.FC<StepManagerProps> = ({
  steps,
  onStepsChange,
  maxSteps = 15,
  setCategory,
  setDifficulty,
  setAgeRange,
  setDuration
}) => {
  const [editingStep, setEditingStep] = useState<BuildStep | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [tempStep, setTempStep] = useState<BuildStep>({
    step_number: 1,
    title: '',
    description: ''
  });
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  // Auto-generate step numbers when steps change
  useEffect(() => {
    const updatedSteps = steps.map((step, index) => ({
      ...step,
      step_number: index + 1
    }));
    if (JSON.stringify(updatedSteps) !== JSON.stringify(steps)) {
      onStepsChange(updatedSteps);
    }
  }, [steps, onStepsChange]);

  const handleAddStep = () => {
    if (steps.length >= maxSteps) {
      return;
    }
    setTempStep({
      step_number: steps.length + 1,
      title: '',
      description: ''
    });
    setIsAddingNew(true);
    setEditingIndex(-1);
  };

  const handleEditStep = (index: number) => {
    setEditingStep(steps[index]);
    setEditingIndex(index);
    setIsAddingNew(false);
  };

  const handleSaveStep = () => {
    if (!tempStep.title.trim()) {
      return;
    }

    const newStep = {
      ...tempStep,
      step_number: editingIndex >= 0 ? steps[editingIndex].step_number : steps.length + 1
    };

    if (isAddingNew) {
      onStepsChange([...steps, newStep]);
    } else {
      const updatedSteps = [...steps];
      updatedSteps[editingIndex] = newStep;
      onStepsChange(updatedSteps);
    }

    handleCancelEdit();
  };

  const handleCancelEdit = () => {
    setEditingStep(null);
    setEditingIndex(-1);
    setIsAddingNew(false);
    setTempStep({
      step_number: 1,
      title: '',
      description: ''
    });
  };

  const handleDeleteStep = (index: number) => {
    if (window.confirm('Are you sure you want to delete this step?')) {
      const updatedSteps = steps.filter((_, i) => i !== index);
      onStepsChange(updatedSteps);
    }
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) {
      return;
    }

    const updatedSteps = [...steps];
    [updatedSteps[index], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[index]];
    onStepsChange(updatedSteps);
  };

  const handleQuickAdd = () => {
    const quickSteps = [
      { title: 'Preparation', description: 'Gather all required materials and tools. Ensure your workspace is clean and well-lit.' },
      { title: 'Assembly', description: 'Follow the assembly process carefully. Take your time and double-check each connection.' },
      { title: 'Testing', description: 'Test your completed project to ensure everything works correctly.' },
      { title: 'Cleanup', description: 'Clean up your workspace and store materials properly.' }
    ];

    const newSteps = quickSteps.map((step, index) => ({
      step_number: steps.length + index + 1,
      title: step.title,
      description: step.description
    }));

    onStepsChange([...steps, ...newSteps]);
  };

  const generateManualText = (): string => {
    return steps.map(step => 
      `step ${step.step_number}. ${step.title}\n\n${step.description}`
    ).join('\n\n');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ListIcon color="primary" />
          Step-by-Step Instructions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddStep}
            disabled={steps.length >= maxSteps}
            size="small"
          >
            Add Step
          </Button>
          <Button
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={handleQuickAdd}
            disabled={steps.length >= maxSteps - 3}
            size="small"
          >
            Quick Add
          </Button>
          {setCategory && setDifficulty && (
            <Button
              variant="contained"
              startIcon={<AIIcon />}
              onClick={() => setAiGeneratorOpen(true)}
              disabled={steps.length >= maxSteps - 3}
              size="small"
              color="primary"
            >
              AI Generator
            </Button>
          )}
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Step Management:</strong> Create clear, numbered instructions for your makerset. 
          Each step should have a descriptive title and detailed instructions. 
          You can reorder steps by using the up/down arrows.
        </Typography>
      </Alert>

      {/* Steps List */}
      <Stack spacing={2} sx={{ mb: 2 }}>
        {steps.map((step, index) => (
          <Card key={index} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                {/* Step Number */}
                <Box sx={{ 
                  minWidth: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  {step.step_number}
                </Box>

                {/* Step Content */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {step.description}
                  </Typography>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleMoveStep(index, 'up')}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ArrowUpIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleMoveStep(index, 'down')}
                    disabled={index === steps.length - 1}
                    title="Move down"
                  >
                    <ArrowDownIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleEditStep(index)}
                    title="Edit step"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteStep(index)}
                    color="error"
                    title="Delete step"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Empty State */}
      {steps.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No steps added yet. Create step-by-step instructions for your makerset.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddStep}
          >
            Add First Step
          </Button>
        </Paper>
      )}

      {/* Step Limit Warning */}
      {steps.length >= maxSteps && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Maximum number of steps reached ({maxSteps}). Remove a step to add a new one.
          </Typography>
        </Alert>
      )}

      {/* Edit/Add Dialog */}
      <Dialog 
        open={editingStep !== null || isAddingNew} 
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isAddingNew ? 'Add New Step' : 'Edit Step'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Step Title"
              value={tempStep.title}
              onChange={(e) => setTempStep(prev => ({ ...prev, title: e.target.value }))}
              fullWidth
              sx={{ mb: 2 }}
              placeholder="e.g., Preparation, Assembly, Testing..."
              helperText="Give your step a clear, descriptive title"
            />
            <TextField
              label="Step Description"
              value={tempStep.description}
              onChange={(e) => setTempStep(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={4}
              fullWidth
              placeholder="Provide detailed instructions for this step..."
              helperText="Include specific actions, materials needed, and any important notes"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveStep} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!tempStep.title.trim()}
          >
            {isAddingNew ? 'Add Step' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Text Preview */}
      {steps.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextIcon fontSize="small" />
            Generated Manual Text Preview:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
              {generateManualText()}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* AI Step Generator Dialog */}
      {setCategory && setDifficulty && setAgeRange && setDuration && (
        <AIStepGenerator
          open={aiGeneratorOpen}
          onClose={() => setAiGeneratorOpen(false)}
          onApply={(newSteps) => {
            onStepsChange([...steps, ...newSteps]);
            setAiGeneratorOpen(false);
          }}
          currentSteps={steps}
          setCategory={setCategory}
          setDifficulty={setDifficulty}
          setAgeRange={setAgeRange}
          setDuration={setDuration}
        />
      )}
    </Box>
  );
};

export default StepManager;
