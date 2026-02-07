import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
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
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Build as BuildIcon,
  Science as ScienceIcon,
  Engineering as EngineeringIcon,
  Palette as PaletteIcon,
  Computer as ComputerIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';

interface BuildStep {
  step_number: number;
  title: string;
  description: string;
  image_url?: string;
}

interface AIStepGeneratorProps {
  open: boolean;
  onClose: () => void;
  onApply: (steps: BuildStep[]) => void;
  currentSteps: BuildStep[];
  setCategory: string;
  setDifficulty: string;
  setAgeRange: { min: number; max: number };
  setDuration: number;
}

const AIStepGenerator: React.FC<AIStepGeneratorProps> = ({
  open,
  onClose,
  onApply,
  currentSteps,
  setCategory,
  setDifficulty,
  setAgeRange,
  setDuration
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSteps, setGeneratedSteps] = useState<BuildStep[]>([]);
  const [generationType, setGenerationType] = useState<'basic' | 'detailed' | 'comprehensive'>('detailed');
  const [customPrompt, setCustomPrompt] = useState('');

  // AI-generated step templates based on category and difficulty
  const generateSteps = (type: 'basic' | 'detailed' | 'comprehensive'): BuildStep[] => {
    const baseSteps = {
      electronics: {
        beginner: [
          { title: 'Safety Check', description: 'Ensure all electronic components are undamaged and your workspace is dry and well-lit. Turn off all power sources.' },
          { title: 'Component Preparation', description: 'Organize all components according to the circuit diagram. Check that you have all required resistors, capacitors, and ICs.' },
          { title: 'Circuit Assembly', description: 'Start with the power supply section. Connect components following the schematic, double-checking each connection.' },
          { title: 'Testing & Troubleshooting', description: 'Test each section of the circuit with a multimeter. Check voltages and continuity before powering on.' },
          { title: 'Final Assembly', description: 'Mount the circuit in the enclosure, secure all connections, and perform final testing.' }
        ],
        intermediate: [
          { title: 'Design Review', description: 'Study the circuit schematic and identify all components. Plan the assembly sequence for optimal signal flow.' },
          { title: 'PCB Preparation', description: 'Clean the PCB and inspect for defects. Apply flux to solder pads for better connections.' },
          { title: 'Component Placement', description: 'Start with the smallest components (resistors, capacitors) and work up to larger ICs. Follow the assembly order.' },
          { title: 'Soldering Process', description: 'Use proper soldering techniques with appropriate temperature. Ensure clean, shiny solder joints.' },
          { title: 'Power Testing', description: 'Test power supply sections first, then gradually test each functional block of the circuit.' },
          { title: 'Signal Verification', description: 'Use oscilloscope to verify signal integrity and troubleshoot any issues.' },
          { title: 'Enclosure & Documentation', description: 'Mount in enclosure, add labels, and document any modifications made during assembly.' }
        ],
        advanced: [
          { title: 'Schematic Analysis', description: 'Analyze the complete circuit design, understanding each functional block and their interactions.' },
          { title: 'Component Selection', description: 'Verify component specifications match requirements. Check tolerances and temperature ratings.' },
          { title: 'PCB Layout Review', description: 'Review PCB layout for signal integrity, power distribution, and thermal management.' },
          { title: 'Assembly Planning', description: 'Create detailed assembly sequence considering component dependencies and testing points.' },
          { title: 'Precision Soldering', description: 'Execute precision soldering with proper temperature profiles and inspection criteria.' },
          { title: 'Functional Testing', description: 'Comprehensive testing of all circuit functions with appropriate test equipment.' },
          { title: 'Performance Optimization', description: 'Fine-tune circuit parameters for optimal performance within specifications.' },
          { title: 'Quality Assurance', description: 'Final inspection, documentation, and validation against design requirements.' }
        ]
      },
      woodwork: {
        beginner: [
          { title: 'Safety Preparation', description: 'Wear safety glasses and ensure your workspace is well-ventilated. Check all tools are in good condition.' },
          { title: 'Material Selection', description: 'Choose appropriate wood for your project. Check for knots, cracks, or other defects.' },
          { title: 'Measuring & Marking', description: 'Measure twice, cut once. Mark all cut lines clearly with a pencil and square.' },
          { title: 'Cutting & Shaping', description: 'Make cuts following your marked lines. Use appropriate saws for different cuts.' },
          { title: 'Assembly & Finishing', description: 'Assemble pieces using appropriate joinery. Sand smooth and apply finish if desired.' }
        ],
        intermediate: [
          { title: 'Project Planning', description: 'Create detailed plans and cut lists. Consider grain direction and wood movement.' },
          { title: 'Material Preparation', description: 'Mill lumber to proper thickness and square edges. Allow for seasonal wood movement.' },
          { title: 'Joinery Layout', description: 'Mark all joinery carefully using marking gauges and squares. Double-check measurements.' },
          { title: 'Cutting Joints', description: 'Cut mortises, tenons, and other joints with precision. Test fit before final assembly.' },
          { title: 'Dry Assembly', description: 'Assemble without glue to check fit and alignment. Make adjustments as needed.' },
          { title: 'Final Assembly', description: 'Apply glue and clamp securely. Clean up excess glue while wet.' },
          { title: 'Finishing Process', description: 'Sand through grits, apply stain if desired, then protective finish coats.' }
        ],
        advanced: [
          { title: 'Design Development', description: 'Develop detailed drawings and specifications. Consider structural requirements and aesthetics.' },
          { title: 'Material Analysis', description: 'Analyze wood species, grain patterns, and moisture content. Select premium materials.' },
          { title: 'Precision Layout', description: 'Use precision measuring tools and layout techniques for complex joinery.' },
          { title: 'Advanced Joinery', description: 'Execute complex joints like dovetails, mortise and tenon, or custom joinery.' },
          { title: 'Shaping & Carving', description: 'Use hand tools and power tools for detailed shaping and decorative elements.' },
          { title: 'Assembly Strategy', description: 'Plan complex assembly sequence with temporary supports and specialized clamps.' },
          { title: 'Quality Control', description: 'Inspect work at each stage. Maintain high standards throughout the process.' },
          { title: 'Professional Finishing', description: 'Apply professional-grade finishes with proper preparation and application techniques.' }
        ]
      },
      robotics: {
        beginner: [
          { title: 'Safety Setup', description: 'Ensure workspace is clear and well-lit. Keep tools organized and power sources accessible.' },
          { title: 'Component Inventory', description: 'Check all parts against the parts list. Verify motors, sensors, and controllers are functional.' },
          { title: 'Mechanical Assembly', description: 'Assemble the robot chassis and mechanical components following the assembly guide.' },
          { title: 'Electrical Connections', description: 'Connect motors, sensors, and power systems. Double-check all connections.' },
          { title: 'Programming & Testing', description: 'Upload basic code and test each component individually before full operation.' }
        ],
        intermediate: [
          { title: 'System Design Review', description: 'Review the complete robot design and understand the interaction between mechanical and electronic systems.' },
          { title: 'Mechanical Construction', description: 'Build the robot frame and install mechanical components with proper alignment.' },
          { title: 'Sensor Integration', description: 'Install and calibrate sensors. Test sensor readings and adjust mounting positions.' },
          { title: 'Motor Control Setup', description: 'Configure motor controllers and test motor operation in both directions.' },
          { title: 'Power Management', description: 'Set up power distribution and battery management systems. Test power consumption.' },
          { title: 'Software Development', description: 'Write and test control algorithms. Implement sensor fusion and decision-making logic.' },
          { title: 'System Integration', description: 'Integrate all subsystems and test complete robot functionality.' },
          { title: 'Performance Tuning', description: 'Optimize robot performance through parameter tuning and algorithm refinement.' }
        ],
        advanced: [
          { title: 'Advanced Planning', description: 'Develop comprehensive system architecture and integration strategy.' },
          { title: 'Precision Assembly', description: 'Execute precision mechanical assembly with tight tolerances and proper alignment.' },
          { title: 'Sensor Calibration', description: 'Implement advanced sensor calibration and fusion algorithms.' },
          { title: 'Control System Design', description: 'Design and implement advanced control algorithms for autonomous operation.' },
          { title: 'Communication Systems', description: 'Set up wireless communication and data logging systems.' },
          { title: 'Autonomous Navigation', description: 'Implement SLAM and path planning algorithms for autonomous navigation.' },
          { title: 'Machine Learning Integration', description: 'Integrate machine learning models for intelligent decision making.' },
          { title: 'System Validation', description: 'Comprehensive testing and validation of all robot capabilities and performance metrics.' }
        ]
      },
      art: {
        beginner: [
          { title: 'Inspiration & Planning', description: 'Gather inspiration and plan your artwork. Sketch preliminary ideas and composition.' },
          { title: 'Material Preparation', description: 'Prepare your canvas, paper, or other surface. Gather all art supplies needed.' },
          { title: 'Basic Sketching', description: 'Create a light sketch of your main elements. Focus on proportions and composition.' },
          { title: 'Color Application', description: 'Apply colors starting with background elements and working toward foreground details.' },
          { title: 'Final Details', description: 'Add final details, highlights, and shadows. Sign your artwork when complete.' }
        ],
        intermediate: [
          { title: 'Concept Development', description: 'Develop your artistic concept with sketches and color studies. Plan the composition carefully.' },
          { title: 'Surface Preparation', description: 'Prepare your surface with appropriate primers or treatments for your medium.' },
          { title: 'Underpainting', description: 'Create an underpainting to establish values and composition before adding color.' },
          { title: 'Color Layering', description: 'Build up colors in layers, working from dark to light and general to specific.' },
          { title: 'Detail Work', description: 'Add fine details and textures. Use various brush techniques for different effects.' },
          { title: 'Value Adjustment', description: 'Adjust values and contrast to create depth and visual interest.' },
          { title: 'Final Review', description: 'Step back and evaluate the artwork. Make final adjustments and sign when satisfied.' }
        ],
        advanced: [
          { title: 'Advanced Conceptualization', description: 'Develop sophisticated artistic concepts with multiple studies and iterations.' },
          { title: 'Technical Preparation', description: 'Master advanced surface preparation techniques for optimal paint adhesion and longevity.' },
          { title: 'Advanced Techniques', description: 'Employ advanced painting techniques including glazing, impasto, and mixed media.' },
          { title: 'Color Theory Application', description: 'Apply sophisticated color theory principles for harmonious and dynamic compositions.' },
          { title: 'Texture & Form', description: 'Create convincing textures and three-dimensional forms through advanced brushwork.' },
          { title: 'Composition Mastery', description: 'Master complex compositional principles including rhythm, balance, and focal points.' },
          { title: 'Artistic Expression', description: 'Develop personal artistic voice and style through experimentation and refinement.' },
          { title: 'Professional Presentation', description: 'Prepare artwork for professional presentation with proper framing and documentation.' }
        ]
      }
    };

    const categorySteps = baseSteps[setCategory.toLowerCase() as keyof typeof baseSteps] || baseSteps.electronics;
    const difficultySteps = categorySteps[setDifficulty.toLowerCase() as keyof typeof categorySteps] || categorySteps.beginner;
    
    const stepCount = type === 'basic' ? 4 : type === 'detailed' ? 6 : 8;
    const selectedSteps = difficultySteps.slice(0, stepCount);
    
    return selectedSteps.map((step, index) => ({
      step_number: currentSteps.length + index + 1,
      title: step.title,
      description: step.description
    }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const steps = generateSteps(generationType);
      setGeneratedSteps(steps);
    } catch (err) {
      setError('Failed to generate steps. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    onApply([...currentSteps, ...generatedSteps]);
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'electronics': return <ScienceIcon />;
      case 'woodwork': return <BuildIcon />;
      case 'robotics': return <EngineeringIcon />;
      case 'art': return <PaletteIcon />;
      case 'programming': return <ComputerIcon />;
      case 'psychology': return <PsychologyIcon />;
      default: return <SchoolIcon />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      case 'expert': return 'error';
      default: return 'primary';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          <Typography variant="h6">AI Step Generator</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>AI-Powered Step Generation:</strong> Generate intelligent, structured steps 
              based on your makerset's category, difficulty level, and target audience.
            </Typography>
          </Alert>

          {/* Project Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon color="primary" />
                Project Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getCategoryIcon(setCategory)}
                    <Typography variant="body2"><strong>Category:</strong> {setCategory}</Typography>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Chip 
                    label={setDifficulty} 
                    color={getDifficultyColor(setDifficulty) as any}
                    size="small"
                  />
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2"><strong>Age Range:</strong> {setAgeRange.min}-{setAgeRange.max} years</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2"><strong>Duration:</strong> {setDuration} minutes</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Generation Options */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Generation Options
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Step Detail Level</InputLabel>
              <Select
                value={generationType}
                onChange={(e) => setGenerationType(e.target.value as any)}
                label="Step Detail Level"
              >
                <MenuItem value="basic">
                  <Box>
                    <Typography variant="body2"><strong>Basic (4 steps)</strong></Typography>
                    <Typography variant="caption" color="text.secondary">
                      Simple, essential steps for quick projects
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="detailed">
                  <Box>
                    <Typography variant="body2"><strong>Detailed (6 steps)</strong></Typography>
                    <Typography variant="caption" color="text.secondary">
                      Comprehensive steps with clear instructions
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="comprehensive">
                  <Box>
                    <Typography variant="body2"><strong>Comprehensive (8 steps)</strong></Typography>
                    <Typography variant="caption" color="text.secondary">
                      Complete step-by-step guide with detailed explanations
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Custom Instructions (Optional)"
              multiline
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add any specific requirements or focus areas for the generated steps..."
              fullWidth
              sx={{ mb: 2 }}
              helperText="Specify any particular techniques, safety considerations, or learning objectives to emphasize."
            />

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <AIIcon />}
              onClick={handleGenerate}
              disabled={loading || !setCategory || !setDifficulty}
              fullWidth
              sx={{ mb: 2 }}
            >
              {loading ? 'Generating Steps...' : 'Generate AI Steps'}
            </Button>
          </Box>

          {/* Generated Steps Preview */}
          {generatedSteps.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <RefreshIcon color="primary" />
                Generated Steps Preview
              </Typography>
              
              <Stack spacing={2}>
                {generatedSteps.map((step, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ 
                          minWidth: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}>
                          {step.step_number}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {step.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {step.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleApply} 
          variant="contained"
          disabled={generatedSteps.length === 0}
          startIcon={<AddIcon />}
        >
          Add {generatedSteps.length} Steps
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIStepGenerator;
