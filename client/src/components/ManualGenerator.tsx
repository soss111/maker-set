import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Grid,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Security as SafetyIcon,
  Build as BuildIcon,
  Inventory as InventoryIcon,
  Photo as PhotoIcon,
  List as ListIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Set as SetType, mediaApi, setToolsApi, setPartsApi } from '../services/api';

interface ManualGeneratorProps {
  open: boolean;
  onClose: () => void;
  selectedSet: SetType | null;
}

interface BuildStep {
  step_number: number;
  title: string;
  description: string;
  image_url?: string;
}

interface SetTool {
  tool_id: number;
  tool_name: string;
  quantity: number;
  is_optional: boolean;
  notes: string;
  safety_notes: string;
}

interface SetPart {
  part_id: number;
  part_name: string;
  part_number?: string;
  quantity: number;
  is_optional: boolean;
  notes: string;
  safety_notes: string;
  description?: string;
}

const ManualGenerator: React.FC<ManualGeneratorProps> = ({
  open,
  onClose,
  selectedSet,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setMedia, setSetMedia] = useState<any[]>([]);
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [setTools, setSetTools] = useState<SetTool[]>([]);
  const [setParts, setSetParts] = useState<SetPart[]>([]);
  const [favoritePhoto, setFavoritePhoto] = useState<any>(null);

  useEffect(() => {
    if (open && selectedSet) {
      fetchManualData();
    }
  }, [open, selectedSet]);

  const fetchManualData = async () => {
    console.log('📡 fetchManualData called for set:', selectedSet?.set_id);
    if (!selectedSet) {
      console.log('❌ No selectedSet, returning early');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [mediaResponse, toolsResponse, partsResponse] = await Promise.all([
        mediaApi.getBySetId(selectedSet.set_id),
        setToolsApi.getBySetId(selectedSet.set_id, 'en'),
        setPartsApi.getBySetId(selectedSet.set_id, 'en')
      ]);

      // Process media to find favorite photo
      const imageMedia = mediaResponse.data.filter((media: any) => 
        media.file_type === 'image' || 
        media.mime_type?.startsWith('image/') ||
        (media.file_name && media.file_name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/))
      );
      
      setSetMedia(imageMedia);
      
      // Find favorite photo (master photo or first image)
      const masterPhoto = imageMedia.find((media: any) => media.is_featured);
      setFavoritePhoto(masterPhoto || imageMedia[0] || null);

      // Process build steps from manual field
      console.log('🔍 RAW MANUAL CONTENT:', selectedSet.manual);
      const steps = parseBuildSteps(selectedSet.manual || '');
      console.log(`🔍 Manual parsing result: ${steps.length} steps found`);
      console.log('🔍 PARSED STEPS:', steps);
      
      // Always use parsed steps if found, otherwise generate default steps
      if (steps.length > 0) {
        console.log('✅ Using parsed steps from manual field');
        console.log('✅ Steps found:', steps);
        setBuildSteps(steps);
      } else {
        console.log('⚠️ No structured steps found, generating default steps');
        console.log('⚠️ Manual content was:', selectedSet.manual);
        console.log('⚠️ Manual type:', typeof selectedSet.manual);
        console.log('⚠️ Manual length:', selectedSet.manual?.length);
        const defaultSteps = generateDefaultBuildSteps();
        setBuildSteps(defaultSteps);
      }

      // Process tools
      const tools = toolsResponse.data || [];
      setSetTools(tools);

      // Process parts
      const parts = Array.isArray(partsResponse.data) ? partsResponse.data : (partsResponse.data?.parts || []);
      setSetParts(parts);

    } catch (err: any) {
      console.error('Error fetching manual data:', err);
      setError(`Failed to load manual data: ${err?.response?.data?.error || err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const parseBuildSteps = (manual: string): BuildStep[] => {
    if (!manual) {
      console.log('❌ No manual content provided');
      return [];
    }

    const steps: BuildStep[] = [];
    const lines = manual.split('\n');
    let currentStep: BuildStep | null = null;

    console.log('🔍 Parsing manual for steps:', manual);
    console.log('🔍 Manual length:', manual.length);
    console.log('🔍 Manual lines:', lines.length);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      console.log(`🔍 Line ${i}: "${line}" -> trimmed: "${trimmedLine}"`);
      
      // Skip empty lines
      if (!trimmedLine) {
        console.log(`⏭️ Skipping empty line ${i}`);
        continue;
      }
      
      // Check for step patterns like "Step 1:", "1.", "step 1.", "Step 1 -", etc.
      // Made the regex more flexible to handle lowercase "step" and various formats
      const stepMatch = trimmedLine.match(/^(?:step\s+)?(\d+)\.?\s*(.+)$/i);
      
      console.log(`🔍 Testing regex on "${trimmedLine}":`, stepMatch);
      
      if (stepMatch) {
        // Save previous step if exists
        if (currentStep) {
          steps.push(currentStep);
          console.log(`💾 Saved step ${currentStep.step_number}: ${currentStep.title}`);
        }
        
        // Start new step
        currentStep = {
          step_number: parseInt(stepMatch[1]),
          title: stepMatch[2],
          description: '',
          image_url: undefined
        };
        
        console.log(`✅ Found step ${currentStep.step_number}: ${currentStep.title}`);
      } else if (currentStep && trimmedLine) {
        // Add description to current step
        currentStep.description += (currentStep.description ? '\n' : '') + trimmedLine;
        console.log(`📝 Added description to step ${currentStep.step_number}: ${trimmedLine}`);
      } else {
        console.log(`❌ No match for line: "${trimmedLine}"`);
      }
    }

    // Add the last step
    if (currentStep) {
      steps.push(currentStep);
      console.log(`💾 Saved final step ${currentStep.step_number}: ${currentStep.title}`);
    }

    console.log(`📋 Parsed ${steps.length} steps from manual`);
    console.log('📋 Final steps:', steps);
    
    // Limit to 15 steps
    return steps.slice(0, 15);
  };

  const generateDefaultBuildSteps = (): BuildStep[] => {
    const steps: BuildStep[] = [];
    
    // Step 1: Preparation
    steps.push({
      step_number: 1,
      title: "Preparation",
      description: "Gather all required tools and materials. Ensure your workspace is clean and well-lit. Review all safety instructions before beginning.",
      image_url: undefined
    });
    
    // Step 2: Tool Setup
    if (setTools.length > 0) {
      steps.push({
        step_number: 2,
        title: "Tool Setup",
        description: `Prepare your tools: ${setTools.map(tool => tool.tool_name).join(', ')}. Check that all tools are in good working condition.`,
        image_url: undefined
      });
    }
    
    // Step 3: Material Organization
    if (setParts.length > 0) {
      steps.push({
        step_number: 3,
        title: "Material Organization",
        description: `Organize your materials: ${setParts.map(part => `${part.part_name} (${part.quantity}x)`).join(', ')}. Verify you have all required components.`,
        image_url: undefined
      });
    }
    
    // Step 4: Assembly
    steps.push({
      step_number: steps.length + 1,
      title: "Assembly",
      description: "Follow the assembly process carefully. Take your time and double-check each connection or component placement.",
      image_url: undefined
    });
    
    // Step 5: Testing
    steps.push({
      step_number: steps.length + 1,
      title: "Testing & Verification",
      description: "Test your completed project to ensure everything works correctly. Make any necessary adjustments.",
      image_url: undefined
    });
    
    return steps;
  };

  const generateSafetyInstructions = (set: SetType): string[] => {
    const safetyInstructions: string[] = [];

    // Add tool-specific safety instructions first (most important)
    setTools.forEach(tool => {
      if (tool.safety_notes && tool.safety_notes.trim()) {
        safetyInstructions.push(`Tool Safety - ${tool.tool_name}: ${tool.safety_notes}`);
      }
    });

    // Add part-specific safety instructions
    setParts.forEach(part => {
      if (part.safety_notes && part.safety_notes.trim()) {
        safetyInstructions.push(`Part Safety - ${part.part_name}: ${part.safety_notes}`);
      }
    });

    // Add minimal generic safety instructions only if no specific safety notes exist
    if (safetyInstructions.length === 0) {
      safetyInstructions.push(
        "Always work in a well-ventilated area",
        "Wear appropriate safety equipment (safety glasses, gloves if needed)",
        "Keep your workspace clean and organized",
        "Read all instructions before starting",
        "Ask an adult for help if you're unsure about any step"
      );
    }

    return safetyInstructions;
  };

  const handleDownloadManual = () => {
    // Create a comprehensive manual document
    const manualContent = generateManualContent();
    
    // Create and download as text file
    const blob = new Blob([manualContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedSet?.name || 'makerset'}_manual.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateManualContent = (): string => {
    if (!selectedSet) return '';

    const safetyInstructions = generateSafetyInstructions(selectedSet);
    
    let content = `MAKERSET MANUAL: ${(selectedSet.name || 'Unnamed Set').toUpperCase()}\n`;
    content += `==========================================\n\n`;
    
    content += `DESCRIPTION:\n${selectedSet.description || 'No description available'}\n\n`;
    
    content += `DIFFICULTY: ${selectedSet.difficulty_level || 'Not specified'}\n`;
    content += `AGE RANGE: ${selectedSet.recommended_age_min || 'N/A'}-${selectedSet.recommended_age_max || 'N/A'} years\n`;
    content += `ESTIMATED TIME: ${selectedSet.estimated_duration_minutes || 'Not specified'} minutes\n\n`;

    // Safety Instructions
    content += `SAFETY INSTRUCTIONS:\n`;
    content += `===================\n`;
    safetyInstructions.forEach((instruction, index) => {
      content += `${index + 1}. ${instruction}\n`;
    });
    content += `\n`;

    // Tools and Instruments
    if (setTools.length > 0) {
      content += `TOOLS AND INSTRUMENTS NEEDED:\n`;
      content += `============================\n`;
      setTools.forEach((tool, index) => {
        const status = tool.is_optional ? '(Optional)' : '(Required)';
        content += `${index + 1}. ${tool.tool_name} - Quantity: ${tool.quantity} ${status}\n`;
        if (tool.notes) {
          content += `   Notes: ${tool.notes}\n`;
        }
      });
      content += `\n`;
    }

    // Materials and Components
    if (setParts.length > 0) {
      content += `MATERIALS AND COMPONENTS:\n`;
      content += `========================\n`;
      setParts.forEach((part, index) => {
        const status = part.is_optional ? '(Optional)' : '(Required)';
        content += `${index + 1}. ${part.part_name}`;
        if (part.part_number) {
          content += ` (${part.part_number})`;
        }
        content += ` - Quantity: ${part.quantity} ${status}\n`;
        if (part.description) {
          content += `   Description: ${part.description}\n`;
        }
        if (part.notes) {
          content += `   Notes: ${part.notes}\n`;
        }
      });
      content += `\n`;
    }

    // Build Steps
    if (buildSteps.length > 0) {
      content += `BUILD INSTRUCTIONS:\n`;
      content += `==================\n`;
      buildSteps.forEach((step) => {
        content += `STEP ${step.step_number}: ${step.title}\n`;
        content += `${step.description}\n\n`;
      });
    } else if (selectedSet.manual) {
      content += `INSTRUCTIONS:\n`;
      content += `=============\n`;
      content += `${selectedSet.manual}\n\n`;
    }

    content += `\nGenerated by MakerSet Platform\n`;
    content += `For more information, visit our website\n`;

    return content;
  };

  const handlePrintManual = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const manualContent = generateManualContent();
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${selectedSet?.name || 'Makerset'} Manual</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          h1 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          .step { margin: 20px 0; padding: 15px; border-left: 4px solid #1976d2; background: #f5f5f5; }
          .safety { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; }
          .tools, .parts { background: #e8f5e8; padding: 15px; margin: 10px 0; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${manualContent}</pre>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  if (!selectedSet) return null;

  const safetyInstructions = generateSafetyInstructions(selectedSet);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">
            📖 Manual & Instructions: {selectedSet.name}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Box sx={{ py: 2 }}>
            {/* Header with Favorite Photo */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    {favoritePhoto ? (
                      <CardMedia
                        component="img"
                        height="200"
                        image={favoritePhoto.file_url}
                        alt={selectedSet.name || 'Set image'}
                        sx={{ borderRadius: 2 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 200,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'grey.100',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No Photo Available
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Typography variant="h4" gutterBottom>
                      {selectedSet.name || 'Unnamed Set'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      {selectedSet.description || 'No description available'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={selectedSet.category || 'Uncategorized'} color="primary" />
                      <Chip label={selectedSet.difficulty_level || 'Not specified'} color="secondary" />
                      <Chip label={`${selectedSet.recommended_age_min || 'N/A'}-${selectedSet.recommended_age_max || 'N/A'} years`} />
                      <Chip label={`${selectedSet.estimated_duration_minutes || 'N/A'} min`} />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Safety Instructions */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SafetyIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Safety Instructions</Typography>
                </Box>
                <List>
                  {safetyInstructions.map((instruction, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <WarningIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={instruction} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Tools and Instruments */}
            {setTools.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BuildIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Tools & Instruments</Typography>
                    <Badge badgeContent={setTools.length} color="primary" sx={{ ml: 2 }} />
                  </Box>
                  <Grid container spacing={2}>
                    {setTools.map((tool, index) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.tool_id}>
                        <Paper sx={{ p: 2, backgroundColor: tool.is_optional ? '#fff3e0' : '#e8f5e8' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {tool.tool_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Quantity: {tool.quantity}
                          </Typography>
                          <Chip 
                            label={tool.is_optional ? 'Optional' : 'Required'} 
                            size="small" 
                            color={tool.is_optional ? 'warning' : 'success'}
                            sx={{ mt: 1 }}
                          />
                          {tool.notes && (
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              {tool.notes}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Materials and Components */}
            {setParts.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <InventoryIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Materials & Components</Typography>
                    <Badge badgeContent={setParts.length} color="info" sx={{ ml: 2 }} />
                  </Box>
                  <Grid container spacing={2}>
                    {setParts.map((part, index) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={part.part_id}>
                        <Paper sx={{ p: 2, backgroundColor: part.is_optional ? '#fff3e0' : '#e3f2fd' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {part.part_name}
                          </Typography>
                          {part.part_number && (
                            <Typography variant="body2" color="text.secondary">
                              Part #: {part.part_number}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            Quantity: {part.quantity}
                          </Typography>
                          <Chip 
                            label={part.is_optional ? 'Optional' : 'Required'} 
                            size="small" 
                            color={part.is_optional ? 'warning' : 'info'}
                            sx={{ mt: 1 }}
                          />
                          {part.description && (
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              {part.description}
                            </Typography>
                          )}
                          {part.notes && (
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              Notes: {part.notes}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Build Steps */}
            {buildSteps.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ListIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Build Instructions</Typography>
                    <Badge badgeContent={buildSteps.length} color="success" sx={{ ml: 2 }} />
                  </Box>
                  {buildSteps.map((step, index) => (
                    <Box key={step.step_number} sx={{ mb: 3 }}>
                      <Paper sx={{ p: 3, borderLeft: 4, borderLeftColor: 'primary.main', backgroundColor: '#f8f9fa' }}>
                        <Typography variant="h6" color="primary" gutterBottom>
                          Step {step.step_number}: {step.title}
                        </Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {step.description}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Manual Text (if no structured steps) */}
            {buildSteps.length === 0 && selectedSet.manual && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Instructions
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedSet.manual}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button 
          onClick={handleDownloadManual} 
          variant="outlined" 
          startIcon={<DownloadIcon />}
          disabled={loading}
        >
          Download Manual
        </Button>
        <Button 
          onClick={handlePrintManual} 
          variant="contained" 
          startIcon={<PrintIcon />}
          disabled={loading}
        >
          Print Manual
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualGenerator;
