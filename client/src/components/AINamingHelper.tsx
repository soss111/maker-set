import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { aiNamingApi } from '../services/api';

interface AINamingHelperProps {
  type: 'part' | 'tool' | 'set';
  context: any;
  currentName: string;
  onSuggestionSelect: (suggestion: string) => void;
  disabled?: boolean;
  translating?: boolean;
}

interface NamingGuidelines {
  title: string;
  rules: string[];
  examples: string[];
}

const AINamingHelper: React.FC<AINamingHelperProps> = ({
  type,
  context,
  currentName,
  onSuggestionSelect,
  disabled = false,
  translating = false
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidelines, setGuidelines] = useState<NamingGuidelines | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Load naming guidelines on component mount
  useEffect(() => {
    loadGuidelines();
  }, [type]);

  const loadGuidelines = async () => {
    try {
      const response = await aiNamingApi.getGuidelines(type);
      setGuidelines(response.guidelines || { title: `${getTypeLabel()} Naming Guidelines`, rules: [], examples: [] });
    } catch (error) {
      console.error('Failed to load naming guidelines:', error);
      setGuidelines({ title: `${getTypeLabel()} Naming Guidelines`, rules: [], examples: [] });
    }
  };

  const generateSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await aiNamingApi.getSuggestions(type, context, currentName);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      setError('Failed to generate naming suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionSelect(suggestion);
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'part':
        return '🔧';
      case 'tool':
        return '🛠️';
      case 'set':
        return '📦';
      default:
        return '💡';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'part':
        return 'Part';
      case 'tool':
        return 'Tool';
      case 'set':
        return 'Set';
      default:
        return 'Item';
    }
  };

  return (
    <Box>
      {/* AI Naming Helper Card */}
      <Card sx={{ mb: 2, border: '2px solid #e3f2fd', borderRadius: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getTypeIcon()} AI {getTypeLabel()} Naming Helper
            </Typography>
            <Tooltip title="View naming guidelines">
              <IconButton 
                size="small" 
                onClick={() => setShowGuidelines(true)}
                sx={{ ml: 1 }}
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box display="flex" gap={2} alignItems="center" mb={2}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              onClick={generateSuggestions}
              disabled={loading || disabled || translating}
              sx={{ 
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                }
              }}
            >
              {loading ? 'Generating...' : translating ? 'Translating...' : 'Get AI Suggestions'}
            </Button>
            
            {suggestions.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={generateSuggestions}
                disabled={loading || disabled}
                size="small"
              >
                Refresh
              </Button>
            )}
          </Box>

          {/* Suggestions Display */}
          {suggestions.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                💡 AI Suggestions:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {suggestions.map((suggestion, index) => (
                  <Chip
                    key={index}
                    label={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    variant="outlined"
                    color="primary"
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'white'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Context Information */}
          {Object.keys(context).length > 0 && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                Context: {JSON.stringify(context, null, 2)}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Guidelines Dialog */}
      <Dialog 
        open={showGuidelines} 
        onClose={() => setShowGuidelines(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {getTypeIcon()} {guidelines?.title || `${getTypeLabel()} Naming Guidelines`}
            </Typography>
            <IconButton onClick={() => setShowGuidelines(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {guidelines && (
            <Box>
              {/* Rules */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                📋 Naming Rules:
              </Typography>
              <List dense>
                {(guidelines.rules || []).map((rule, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={`${index + 1}. ${rule}`}
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.95rem' } }}
                    />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Examples */}
              <Typography variant="h6" sx={{ mb: 2 }}>
                ✨ Good Examples:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {(guidelines.examples || []).map((example, index) => (
                  <Chip
                    key={index}
                    label={example}
                    variant="filled"
                    color="success"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGuidelines(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AINamingHelper;
