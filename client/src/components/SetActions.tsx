import React from 'react';
import {
  Box,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';

interface SetActionsProps {
  onCreateSet: () => void;
  onCreateManual: () => void;
  onCreateDrawings: () => void;
  onCreateTools: () => void;
  isAdmin: boolean;
  showVisibilityManager: boolean;
  onToggleVisibilityManager: () => void;
}

const SetActions: React.FC<SetActionsProps> = ({
  onCreateSet,
  onCreateManual,
  onCreateDrawings,
  onCreateTools,
  isAdmin,
  showVisibilityManager,
  onToggleVisibilityManager,
}) => {
  const { t } = useLanguage();

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          MakerSets Management
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateSet}
            sx={{ 
              backgroundColor: 'primary.main',
              '&:hover': { backgroundColor: 'primary.dark' }
            }}
          >
            Add New Set
          </Button>
          
          <Button
            variant="outlined"
            onClick={onCreateManual}
            sx={{ 
              borderColor: 'secondary.main',
              color: 'secondary.main',
              '&:hover': { 
                backgroundColor: 'secondary.light',
                color: 'white'
              }
            }}
          >
            Manage Instructions
          </Button>
          
          <Button
            variant="outlined"
            onClick={onCreateDrawings}
            sx={{ 
              borderColor: 'info.main',
              color: 'info.main',
              '&:hover': { 
                backgroundColor: 'info.light',
                color: 'white'
              }
            }}
          >
            Manage Drawings
          </Button>
          
          <Button
            variant="outlined"
            onClick={onCreateTools}
            sx={{ 
              borderColor: 'warning.main',
              color: 'warning.main',
              '&:hover': { 
                backgroundColor: 'warning.light',
                color: 'white'
              }
            }}
          >
            Manage Tools
          </Button>
        </Box>
      </Box>

      {/* Show Visibility Manager Button - Admin Only */}
      {isAdmin && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <ToggleButton
            value="visibility-manager"
            selected={showVisibilityManager}
            onChange={onToggleVisibilityManager}
            sx={{ 
              border: '1px solid',
              borderColor: showVisibilityManager ? 'primary.main' : 'grey.300',
              color: showVisibilityManager ? 'primary.main' : 'grey.600',
              backgroundColor: showVisibilityManager ? 'primary.light' : 'transparent',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'primary.main',
              }
            }}
          >
            {showVisibilityManager ? <VisibilityIcon /> : <VisibilityOffIcon />}
            {showVisibilityManager ? 'Hide Visibility Manager' : 'Show Visibility Manager'}
          </ToggleButton>
        </Box>
      )}
    </Box>
  );
};

export default SetActions;
