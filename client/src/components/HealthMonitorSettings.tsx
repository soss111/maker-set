/**
 * Health Monitor Settings Component
 * 
 * Allows users to configure the position and variant of the health monitor
 * Provides a quick way to test different positions
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { stemColors } from '../theme/stemTheme';

interface HealthMonitorSettingsProps {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'floating' | 'inline';
  variant: 'compact' | 'detailed' | 'minimal';
  onPositionChange: (position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'floating' | 'inline') => void;
  onVariantChange: (variant: 'compact' | 'detailed' | 'minimal') => void;
  onToggleVisibility: () => void;
  isVisible: boolean;
}

const HealthMonitorSettings: React.FC<HealthMonitorSettingsProps> = ({
  position,
  variant,
  onPositionChange,
  onVariantChange,
  onToggleVisibility,
  isVisible,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionOptions = [
    { value: 'top-right', label: 'Top Right', description: 'Fixed top-right corner' },
    { value: 'top-left', label: 'Top Left', description: 'Fixed top-left corner' },
    { value: 'bottom-right', label: 'Bottom Right', description: 'Fixed bottom-right corner' },
    { value: 'bottom-left', label: 'Bottom Left', description: 'Fixed bottom-left corner' },
    { value: 'floating', label: 'Floating', description: 'Centered on right side' },
    { value: 'inline', label: 'Inline', description: 'Part of page content' },
  ];

  const variantOptions = [
    { value: 'minimal', label: 'Minimal', description: 'Small status indicator' },
    { value: 'compact', label: 'Compact', description: 'Medium size with summary' },
    { value: 'detailed', label: 'Detailed', description: 'Full details and expandable' },
  ];

  return (
    <Card
      sx={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 1001,
        minWidth: 300,
        maxWidth: 400,
        background: `linear-gradient(135deg, ${stemColors.background.card} 0%, ${stemColors.background.surface} 100%)`,
        border: `1px solid ${stemColors.secondary[300]}`,
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            Health Monitor Settings
          </Typography>
          <Button
            size="small"
            startIcon={isVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
            onClick={onToggleVisibility}
            variant={isVisible ? 'contained' : 'outlined'}
          >
            {isVisible ? 'Hide' : 'Show'}
          </Button>
        </Box>

        <Stack spacing={2}>
          {/* Position Selection */}
          <FormControl fullWidth size="small">
            <InputLabel>Position</InputLabel>
            <Select
              value={position}
              onChange={(e) => onPositionChange(e.target.value)}
              label="Position"
            >
              {positionOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Variant Selection */}
          <FormControl fullWidth size="small">
            <InputLabel>Variant</InputLabel>
            <Select
              value={variant}
              onChange={(e) => onVariantChange(e.target.value)}
              label="Variant"
            >
              {variantOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Quick Position Buttons */}
          <Box>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">
              Quick Positions:
            </Typography>
            <ButtonGroup size="small" fullWidth>
              <Button
                onClick={() => onPositionChange('top-right')}
                variant={position === 'top-right' ? 'contained' : 'outlined'}
              >
                TR
              </Button>
              <Button
                onClick={() => onPositionChange('top-left')}
                variant={position === 'top-left' ? 'contained' : 'outlined'}
              >
                TL
              </Button>
              <Button
                onClick={() => onPositionChange('bottom-right')}
                variant={position === 'bottom-right' ? 'contained' : 'outlined'}
              >
                BR
              </Button>
              <Button
                onClick={() => onPositionChange('bottom-left')}
                variant={position === 'bottom-left' ? 'contained' : 'outlined'}
              >
                BL
              </Button>
            </ButtonGroup>
          </Box>

          {/* Current Settings Display */}
          <Box>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">
              Current Settings:
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={`Position: ${positionOptions.find(p => p.value === position)?.label}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Variant: ${variantOptions.find(v => v.value === variant)?.label}`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default HealthMonitorSettings;
