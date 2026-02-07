import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  School as SchoolIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
} from '@mui/icons-material';

interface AILearningOutcomeGeneratorProps {
  open: boolean;
  onClose: () => void;
  onApply: (outcomes: string[]) => void;
  currentOutcomes?: string[];
  setCategory?: string;
  setDifficulty?: string;
  setAgeRange?: { min: number; max: number };
  setDuration?: number;
}

const AILearningOutcomeGenerator: React.FC<AILearningOutcomeGeneratorProps> = ({
  open,
  onClose,
  onApply,
  currentOutcomes = [],
  setCategory = '',
  setDifficulty = '',
  setAgeRange = { min: 6, max: 100 },
  setDuration = 120,
}) => {
  const [outcomes, setOutcomes] = useState<string[]>(currentOutcomes);
  const [newOutcome, setNewOutcome] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<'basic' | 'detailed' | 'custom'>('basic');

  const generateLearningOutcomes = async () => {
    setGenerating(true);
    setError(null);

    try {
      // Create a prompt based on the set information
      const prompt = createPrompt(setCategory, setDifficulty, setAgeRange, setDuration, generationType);
      
      // For now, we'll use a mock AI response since we don't have an actual AI service
      // In a real implementation, you would call your AI service here
      const mockOutcomes = await mockAIGeneration(prompt);
      
      setOutcomes(mockOutcomes);
    } catch (err) {
      setError('Failed to generate learning outcomes. Please try again.');
      console.error('Error generating learning outcomes:', err);
    } finally {
      setGenerating(false);
    }
  };

  const createPrompt = (
    category: string,
    difficulty: string,
    ageRange: { min: number; max: number },
    duration: number,
    type: string
  ): string => {
    const basePrompt = `Generate learning outcomes for a ${difficulty.toLowerCase()} ${category.toLowerCase()} makerset for ages ${ageRange.min}-${ageRange.max} with ${duration} minutes duration.`;
    
    switch (type) {
      case 'basic':
        return `${basePrompt} Focus on 3-5 basic learning outcomes that cover fundamental skills and knowledge.`;
      case 'detailed':
        return `${basePrompt} Generate 5-8 detailed learning outcomes covering technical skills, problem-solving, creativity, and collaboration.`;
      case 'custom':
        return `${basePrompt} Generate comprehensive learning outcomes that include STEM concepts, practical skills, and real-world applications.`;
      default:
        return basePrompt;
    }
  };

  const mockAIGeneration = async (prompt: string): Promise<string[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock responses based on category and difficulty
    const mockOutcomes: Record<string, Record<string, string[]>> = {
      'electronics': {
        'beginner': [
          'Understand basic electrical circuits and components',
          'Learn to identify and use electronic components safely',
          'Develop soldering and assembly skills',
          'Understand the relationship between voltage, current, and resistance',
          'Practice following technical diagrams and instructions'
        ],
        'intermediate': [
          'Design and build functional electronic circuits',
          'Troubleshoot common circuit problems',
          'Understand digital logic and microcontrollers',
          'Learn programming basics for embedded systems',
          'Develop skills in circuit testing and measurement'
        ],
        'advanced': [
          'Create complex electronic systems with multiple components',
          'Program microcontrollers for interactive projects',
          'Design and implement sensor-based automation',
          'Understand wireless communication protocols',
          'Develop skills in PCB design and fabrication'
        ]
      },
      'woodwork': {
        'beginner': [
          'Learn basic woodworking tools and their safe usage',
          'Understand different types of wood and their properties',
          'Practice measuring, marking, and cutting techniques',
          'Develop skills in sanding and finishing',
          'Learn to follow woodworking plans and instructions'
        ],
        'intermediate': [
          'Master advanced cutting and joining techniques',
          'Learn to use power tools safely and effectively',
          'Understand wood grain and how it affects construction',
          'Develop skills in creating strong, durable joints',
          'Practice precision measuring and layout techniques'
        ],
        'advanced': [
          'Design and build complex wooden structures',
          'Master advanced finishing techniques and wood treatment',
          'Learn to work with exotic woods and materials',
          'Develop skills in furniture making and restoration',
          'Understand woodworking business and project management'
        ]
      },
      'mechanical': {
        'beginner': [
          'Understand basic mechanical principles and forces',
          'Learn to identify and use mechanical tools',
          'Practice assembling and disassembling mechanisms',
          'Develop skills in measuring and precision work',
          'Learn about different types of mechanical joints'
        ],
        'intermediate': [
          'Design and build functional mechanical systems',
          'Understand gear ratios and mechanical advantage',
          'Learn to troubleshoot mechanical problems',
          'Develop skills in precision assembly techniques',
          'Practice creating moving mechanical parts'
        ],
        'advanced': [
          'Create complex mechanical systems with multiple moving parts',
          'Understand advanced mechanical engineering principles',
          'Learn to design for manufacturing and assembly',
          'Develop skills in mechanical testing and optimization',
          'Master precision machining and fabrication techniques'
        ]
      }
    };

    const categoryOutcomes = mockOutcomes[setCategory.toLowerCase()] || mockOutcomes['electronics'];
    const difficultyOutcomes = categoryOutcomes[setDifficulty.toLowerCase()] || categoryOutcomes['beginner'];
    
    return difficultyOutcomes.slice(0, generationType === 'basic' ? 4 : generationType === 'detailed' ? 6 : 8);
  };

  const addOutcome = () => {
    if (newOutcome.trim()) {
      setOutcomes([...outcomes, newOutcome.trim()]);
      setNewOutcome('');
    }
  };

  const editOutcome = (index: number) => {
    setEditingIndex(index);
    setEditingText(outcomes[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingText.trim()) {
      const updatedOutcomes = [...outcomes];
      updatedOutcomes[editingIndex] = editingText.trim();
      setOutcomes(updatedOutcomes);
      setEditingIndex(null);
      setEditingText('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const deleteOutcome = (index: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    onApply(outcomes);
    onClose();
  };

  const handleClose = () => {
    setOutcomes(currentOutcomes);
    setNewOutcome('');
    setEditingIndex(null);
    setEditingText('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          <Typography variant="h6">AI Learning Outcome Generator</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generate learning outcomes based on your set's category, difficulty, age range, and duration.
          </Typography>
          
          {/* Generation Type Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Generation Type</InputLabel>
            <Select
              value={generationType}
              onChange={(e) => setGenerationType(e.target.value as 'basic' | 'detailed' | 'custom')}
              label="Generation Type"
            >
              <MenuItem value="basic">Basic (3-5 outcomes)</MenuItem>
              <MenuItem value="detailed">Detailed (5-8 outcomes)</MenuItem>
              <MenuItem value="custom">Comprehensive (6-10 outcomes)</MenuItem>
            </Select>
          </FormControl>

          {/* AI Generation Button */}
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={20} /> : <AIIcon />}
            onClick={generateLearningOutcomes}
            disabled={generating || !setCategory || !setDifficulty}
            fullWidth
            sx={{ mb: 2 }}
          >
            {generating ? 'Generating...' : 'Generate Learning Outcomes'}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Current Learning Outcomes */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon />
            Learning Outcomes ({outcomes.length})
          </Typography>
          
          {outcomes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No learning outcomes yet. Generate some or add them manually.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {outcomes.map((outcome, index) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {editingIndex === index ? (
                          <TextField
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            fullWidth
                            size="small"
                            multiline
                            maxRows={3}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                saveEdit();
                              } else if (e.key === 'Escape') {
                                cancelEdit();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          outcome
                        )}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {editingIndex === index ? (
                          <>
                            <IconButton size="small" onClick={saveEdit} color="primary">
                              <CheckIcon />
                            </IconButton>
                            <IconButton size="small" onClick={cancelEdit}>
                              <DeleteIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton size="small" onClick={() => editOutcome(index)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => deleteOutcome(index)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {/* Manual Addition */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            Add Manual Outcome
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              value={newOutcome}
              onChange={(e) => setNewOutcome(e.target.value)}
              placeholder="Enter a learning outcome..."
              fullWidth
              multiline
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  addOutcome();
                }
              }}
            />
            <Button
              variant="outlined"
              onClick={addOutcome}
              disabled={!newOutcome.trim()}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              Add
            </Button>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Press Ctrl+Enter to quickly add an outcome
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply Learning Outcomes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AILearningOutcomeGenerator;
