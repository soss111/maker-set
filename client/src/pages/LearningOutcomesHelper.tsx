import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Science as ScienceIcon,
  Engineering as EngineeringIcon,
  Palette as ArtIcon,
  Language as LanguageIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
// import { useLanguage } from '../contexts/LanguageContext'; // Currently unused, but kept for future i18n implementation

interface LearningOutcome {
  id: string;
  text: string;
  category: string;
  level: string;
}

interface SubjectArea {
  name: string;
  icon: React.ReactNode;
  outcomes: string[];
}

const LearningOutcomesHelper: React.FC = () => {
  // const { t } = useLanguage(); // Currently unused, but kept for future i18n implementation
  const [setName, setSetName] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedAge, setSelectedAge] = useState('');
  const [generatedOutcomes, setGeneratedOutcomes] = useState<LearningOutcome[]>([]);
  const [customOutcomes, setCustomOutcomes] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectAreas: SubjectArea[] = [
    {
      name: 'Science & Physics',
      icon: <ScienceIcon />,
      outcomes: [
        'Understand basic physics principles',
        'Learn about forces and motion',
        'Explore energy and momentum',
        'Develop scientific observation skills',
        'Practice hypothesis formation and testing'
      ]
    },
    {
      name: 'Engineering & Technology',
      icon: <EngineeringIcon />,
      outcomes: [
        'Learn engineering design principles',
        'Understand mechanical systems',
        'Develop problem-solving skills',
        'Practice following technical instructions',
        'Explore cause and effect relationships'
      ]
    },
    {
      name: 'Mathematics',
      icon: <PsychologyIcon />,
      outcomes: [
        'Apply mathematical concepts practically',
        'Develop spatial reasoning skills',
        'Understand geometric principles',
        'Practice measurement and calculation',
        'Learn about patterns and sequences'
      ]
    },
    {
      name: 'Art & Creativity',
      icon: <ArtIcon />,
      outcomes: [
        'Express creativity through design',
        'Learn color theory and composition',
        'Develop fine motor skills',
        'Practice aesthetic decision-making',
        'Explore different artistic techniques'
      ]
    },
    {
      name: 'Language & Communication',
      icon: <LanguageIcon />,
      outcomes: [
        'Improve reading comprehension',
        'Develop technical vocabulary',
        'Practice following written instructions',
        'Enhance communication skills',
        'Learn to document processes'
      ]
    }
  ];

  const difficultyLevels = [
    { value: 'beginner', label: 'Beginner (Ages 6-10)' },
    { value: 'intermediate', label: 'Intermediate (Ages 11-14)' },
    { value: 'advanced', label: 'Advanced (Ages 15+)' }
  ];

  const categories = [
    'woodwork',
    'electronics',
    'robotics',
    'multimaterial',
    'papercraft',
    'textiles',
    'chemistry',
    'physics',
    'biology',
    'mathematics',
    'art',
    'engineering'
  ];

  const generateAILearningOutcomes = async () => {
    if (!setName.trim()) {
      setError('Please enter a set name to generate learning outcomes');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate AI generation (in a real app, this would call an AI service)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const baseOutcomes = [
        'Follow step-by-step instructions accurately',
        'Develop patience and attention to detail',
        'Learn to work with tools safely',
        'Understand the importance of precision in construction',
        'Practice problem-solving when encountering challenges'
      ];

      const categorySpecificOutcomes: { [key: string]: string[] } = {
        woodwork: [
          'Learn basic woodworking techniques',
          'Understand wood grain and material properties',
          'Practice measuring and cutting accurately',
          'Develop hand-eye coordination',
          'Learn about tool safety and maintenance'
        ],
        electronics: [
          'Understand basic electrical circuits',
          'Learn about conductivity and resistance',
          'Practice soldering and component placement',
          'Develop understanding of electronic symbols',
          'Learn about electrical safety'
        ],
        robotics: [
          'Understand mechanical movement principles',
          'Learn about gears, motors, and sensors',
          'Develop programming logic skills',
          'Practice systematic troubleshooting',
          'Explore automation concepts'
        ],
        multimaterial: [
          'Work with different material properties',
          'Understand material compatibility',
          'Learn about structural integrity',
          'Practice multi-step assembly processes',
          'Develop material selection skills'
        ]
      };

      const difficultySpecificOutcomes: { [key: string]: string[] } = {
        beginner: [
          'Develop basic motor skills',
          'Learn to follow simple instructions',
          'Practice color recognition and matching',
          'Understand cause and effect relationships',
          'Build confidence through successful completion'
        ],
        intermediate: [
          'Apply mathematical concepts practically',
          'Develop critical thinking skills',
          'Learn to work independently',
          'Practice time management',
          'Understand design principles'
        ],
        advanced: [
          'Apply advanced problem-solving techniques',
          'Understand complex system interactions',
          'Develop engineering design skills',
          'Practice iterative improvement',
          'Learn about optimization and efficiency'
        ]
      };

      const generated: LearningOutcome[] = [];

      // Add base outcomes
      baseOutcomes.forEach((outcome, index) => {
        generated.push({
          id: `base-${index}`,
          text: outcome,
          category: 'general',
          level: 'all'
        });
      });

      // Add category-specific outcomes
      if (selectedCategory && categorySpecificOutcomes[selectedCategory]) {
        categorySpecificOutcomes[selectedCategory].forEach((outcome, index) => {
          generated.push({
            id: `category-${index}`,
            text: outcome,
            category: selectedCategory,
            level: 'all'
          });
        });
      }

      // Add difficulty-specific outcomes
      if (selectedDifficulty && difficultySpecificOutcomes[selectedDifficulty]) {
        difficultySpecificOutcomes[selectedDifficulty].forEach((outcome, index) => {
          generated.push({
            id: `difficulty-${index}`,
            text: outcome,
            category: 'general',
            level: selectedDifficulty
          });
        });
      }

      setGeneratedOutcomes(generated);
    } catch (err) {
      setError('Failed to generate learning outcomes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addCustomOutcome = () => {
    setCustomOutcomes([...customOutcomes, '']);
  };

  const updateCustomOutcome = (index: number, value: string) => {
    const updated = [...customOutcomes];
    updated[index] = value;
    setCustomOutcomes(updated);
  };

  const removeCustomOutcome = (index: number) => {
    const updated = customOutcomes.filter((_, i) => i !== index);
    setCustomOutcomes(updated);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getSelectedOutcomes = () => {
    const selected = generatedOutcomes.filter(outcome => 
      document.getElementById(`outcome-${outcome.id}`)?.getAttribute('data-selected') === 'true'
    );
    const custom = customOutcomes.filter(outcome => outcome.trim());
    return [...selected.map(o => o.text), ...custom];
  };

  const copySelectedOutcomes = () => {
    const selected = getSelectedOutcomes();
    if (selected.length === 0) {
      setError('Please select at least one learning outcome');
      return;
    }
    const text = selected.map((outcome, index) => `${index + 1}. ${outcome}`).join('\n');
    copyToClipboard(text);
  };

  const copyAsJSON = () => {
    const selected = getSelectedOutcomes();
    if (selected.length === 0) {
      setError('Please select at least one learning outcome');
      return;
    }
    const json = JSON.stringify(selected, null, 2);
    copyToClipboard(json);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Learning Outcomes Helper
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate comprehensive learning outcomes for your MakerLab sets using AI assistance
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Input Section */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Set Information
              </Typography>
              
              <TextField
                fullWidth
                label="Set Name"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                margin="normal"
                required
              />
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Set Description"
                value={setDescription}
                onChange={(e) => setSetDescription(e.target.value)}
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Difficulty Level</InputLabel>
                <Select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                  {difficultyLevels.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Target Age Range"
                value={selectedAge}
                onChange={(e) => setSelectedAge(e.target.value)}
                margin="normal"
                placeholder="e.g., 8-12 years"
              />

              <Button
                fullWidth
                variant="contained"
                onClick={generateAILearningOutcomes}
                disabled={loading || !setName.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <ScienceIcon />}
                sx={{ mt: 2 }}
              >
                {loading ? 'Generating...' : 'Generate Learning Outcomes'}
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Subject Areas Reference */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subject Area Reference
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Common learning outcomes by subject area:
              </Typography>
              
              {subjectAreas.map((area, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {area.icon}
                      <Typography variant="subtitle2">{area.name}</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {area.outcomes.map((outcome, outcomeIndex) => (
                        <ListItem key={outcomeIndex}>
                          <ListItemIcon>
                            <SchoolIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={outcome}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Box>

        {/* Generated Outcomes */}
        {generatedOutcomes.length > 0 && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Generated Learning Outcomes
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={copySelectedOutcomes}
                    >
                      Copy Selected
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={copyAsJSON}
                    >
                      Copy as JSON
                    </Button>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click on outcomes to select them for copying:
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {generatedOutcomes.map((outcome) => (
                    <Chip
                      key={outcome.id}
                      id={`outcome-${outcome.id}`}
                      label={outcome.text}
                      variant="outlined"
                      clickable
                      onClick={() => {
                        const element = document.getElementById(`outcome-${outcome.id}`);
                        const isSelected = element?.getAttribute('data-selected') === 'true';
                        element?.setAttribute('data-selected', isSelected ? 'false' : 'true');
                        element?.setAttribute('style', isSelected 
                          ? 'background-color: transparent;' 
                          : 'background-color: rgba(25, 118, 210, 0.1); border-color: #1976d2;'
                        );
                      }}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Custom Outcomes */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Custom Learning Outcomes
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addCustomOutcome}
                >
                  Add Custom Outcome
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add your own learning outcomes:
              </Typography>

              {customOutcomes.map((outcome, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    value={outcome}
                    onChange={(e) => updateCustomOutcome(index, e.target.value)}
                    placeholder={`Custom learning outcome ${index + 1}`}
                    size="small"
                  />
                  <IconButton
                    onClick={() => removeCustomOutcome(index)}
                    color="error"
                    disabled={customOutcomes.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default LearningOutcomesHelper;
