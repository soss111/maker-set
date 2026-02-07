/**
 * STEM/MakerLab Components
 * 
 * Engineering-themed UI components with:
 * - Circuit board patterns
 * - Geometric elements
 * - Technical icons
 * - Modern animations
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  Button,
  Divider,
  Stack,
} from '@mui/material';
import {
  Engineering as EngineeringIcon,
  Science as ScienceIcon,
  Build as BuildIcon,
  Memory as MemoryIcon,
  Settings as SettingsIcon,
  Speed as SpeedIcon,
  Calculate as CalculateIcon,
  AutoFixHigh as AutoFixHighIcon,
  Psychology as PsychologyIcon,
  Biotech as BiotechIcon,
  Computer as ComputerIcon,
  SmartToy as SmartToyIcon,
} from '@mui/icons-material';
import { stemColors } from '../theme/stemTheme';

// STEM Category Icons
export const STEMIcons = {
  engineering: EngineeringIcon,
  science: ScienceIcon,
  technology: ComputerIcon,
  mathematics: CalculateIcon,
  robotics: SmartToyIcon,
  biotechnology: BiotechIcon,
  ai: PsychologyIcon,
  manufacturing: BuildIcon,
  electronics: MemoryIcon,
  automation: SettingsIcon,
  performance: SpeedIcon,
  innovation: AutoFixHighIcon,
};

// Circuit Board Pattern Background
export const CircuitBoardPattern: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      position: 'relative',
      background: `
        linear-gradient(45deg, transparent 25%, rgba(33, 150, 243, 0.05) 25%),
        linear-gradient(-45deg, transparent 25%, rgba(33, 150, 243, 0.05) 25%),
        linear-gradient(45deg, rgba(33, 150, 243, 0.05) 75%, transparent 75%),
        linear-gradient(-45deg, rgba(33, 150, 243, 0.05) 75%, transparent 75%)
      `,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(33, 150, 243, 0.1) 2px, transparent 2px),
          radial-gradient(circle at 80% 80%, rgba(33, 150, 243, 0.1) 2px, transparent 2px),
          radial-gradient(circle at 40% 60%, rgba(33, 150, 243, 0.1) 1px, transparent 1px),
          radial-gradient(circle at 60% 40%, rgba(33, 150, 243, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px, 50px 50px, 30px 30px, 30px 30px',
        pointerEvents: 'none',
      },
    }}
  >
    {children}
  </Box>
);

// Engineering Status Card
interface EngineeringStatusCardProps {
  title: string;
  status: 'active' | 'idle' | 'maintenance' | 'error';
  progress?: number;
  icon: keyof typeof STEMIcons;
  description?: string;
  metrics?: Array<{ label: string; value: string; unit?: string }>;
}

export const EngineeringStatusCard: React.FC<EngineeringStatusCardProps> = ({
  title,
  status,
  progress,
  icon,
  description,
  metrics = [],
}) => {
  const IconComponent = STEMIcons[icon];
  
  const statusColors = {
    active: stemColors.accent.green,
    idle: stemColors.accent.yellow,
    maintenance: stemColors.primary[500],
    error: stemColors.accent.red,
  };

  const statusLabels = {
    active: 'Operational',
    idle: 'Standby',
    maintenance: 'Maintenance',
    error: 'Error',
  };

  return (
    <Card
      sx={{
        background: `linear-gradient(135deg, ${stemColors.background.card} 0%, ${stemColors.background.surface} 100%)`,
        border: `2px solid ${statusColors[status]}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${statusColors[status]} 0%, ${statusColors[status]}80 100%)`,
        },
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                background: `linear-gradient(135deg, ${statusColors[status]} 0%, ${statusColors[status]}80 100%)`,
                color: '#ffffff',
              }}
            >
              <IconComponent />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {title}
              </Typography>
              <Chip
                label={statusLabels[status]}
                size="small"
                sx={{
                  background: statusColors[status],
                  color: '#ffffff',
                  fontWeight: 500,
                }}
              />
            </Box>
          </Box>
        </Box>

        {description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {description}
          </Typography>
        )}

        {progress !== undefined && (
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary">
                Efficiency
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: stemColors.secondary[200],
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${statusColors[status]} 0%, ${statusColors[status]}80 100%)`,
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )}

        {metrics.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1}>
              {metrics.map((metric, index) => (
                <Box key={index} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {metric.label}
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {metric.value} {metric.unit}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Technical Metric Display
interface TechnicalMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'success' | 'warning' | 'error';
  icon?: keyof typeof STEMIcons;
}

export const TechnicalMetric: React.FC<TechnicalMetricProps> = ({
  label,
  value,
  unit,
  trend,
  color = 'primary',
  icon,
}) => {
  const IconComponent = icon ? STEMIcons[icon] : null;
  
  const colorMap = {
    primary: stemColors.primary[500],
    success: stemColors.accent.green,
    warning: stemColors.accent.yellow,
    error: stemColors.accent.red,
  };

  const trendColors = {
    up: stemColors.accent.green,
    down: stemColors.accent.red,
    stable: stemColors.secondary[500],
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${stemColors.background.card} 0%, ${stemColors.background.surface} 100%)`,
        border: `1px solid ${colorMap[color]}20`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${colorMap[color]}15`,
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        {IconComponent && (
          <IconComponent
            sx={{
              color: colorMap[color],
              fontSize: 20,
            }}
          />
        )}
        {trend && (
          <Box
            sx={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderBottom: trend === 'up' ? `8px solid ${trendColors[trend]}` : 'none',
              borderTop: trend === 'down' ? `8px solid ${trendColors[trend]}` : 'none',
              transform: trend === 'stable' ? 'none' : 'none',
            }}
          />
        )}
      </Box>
      
      <Typography variant="h4" fontWeight={700} color={colorMap[color]} mb={0.5}>
        {value}
        {unit && (
          <Typography component="span" variant="body2" color="text.secondary" ml={0.5}>
            {unit}
          </Typography>
        )}
      </Typography>
      
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
};

// STEM Action Button
interface STEMActionButtonProps {
  icon: keyof typeof STEMIcons;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
  loading?: boolean;
}

export const STEMActionButton: React.FC<STEMActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  const IconComponent = STEMIcons[icon];
  
  const variantStyles = {
    primary: {
      background: `linear-gradient(135deg, ${stemColors.primary[500]} 0%, ${stemColors.primary[600]} 100%)`,
      color: '#ffffff',
      '&:hover': {
        background: `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[700]} 100%)`,
      },
    },
    secondary: {
      background: `linear-gradient(135deg, ${stemColors.secondary[100]} 0%, ${stemColors.secondary[200]} 100%)`,
      color: stemColors.text.primary,
      '&:hover': {
        background: `linear-gradient(135deg, ${stemColors.secondary[200]} 0%, ${stemColors.secondary[300]} 100%)`,
      },
    },
    accent: {
      background: `linear-gradient(135deg, ${stemColors.accent.orange} 0%, ${stemColors.accent.orange}dd 100%)`,
      color: '#ffffff',
      '&:hover': {
        background: `linear-gradient(135deg, ${stemColors.accent.orange}dd 0%, ${stemColors.accent.orange}bb 100%)`,
      },
    },
  };

  return (
    <Button
      variant="contained"
      startIcon={<IconComponent />}
      onClick={onClick}
      disabled={disabled || loading}
      sx={{
        ...variantStyles[variant],
        borderRadius: 2,
        px: 3,
        py: 1.5,
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          ...variantStyles[variant]['&:hover'],
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        },
        '&:disabled': {
          background: stemColors.secondary[300],
          color: stemColors.text.disabled,
        },
      }}
    >
      {loading ? 'Processing...' : label}
    </Button>
  );
};

// Engineering Dashboard Header
interface EngineeringHeaderProps {
  title: string;
  subtitle?: string;
  status?: 'online' | 'offline' | 'maintenance';
  lastUpdate?: string;
}

export const EngineeringHeader: React.FC<EngineeringHeaderProps> = ({
  title,
  subtitle,
  status = 'online',
  lastUpdate,
}) => {
  const statusColors = {
    online: stemColors.accent.green,
    offline: stemColors.accent.red,
    maintenance: stemColors.accent.yellow,
  };

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[700]} 100%)`,
        color: '#ffffff',
        p: 3,
        borderRadius: 3,
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 2px, transparent 2px),
            radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 2px, transparent 2px)
          `,
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={700} mb={1}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: statusColors[status],
                animation: status === 'online' ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                },
              }}
            />
            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
              {status}
            </Typography>
          </Box>
          
          {lastUpdate && (
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Last update: {lastUpdate}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default {
  CircuitBoardPattern,
  EngineeringStatusCard,
  TechnicalMetric,
  STEMActionButton,
  EngineeringHeader,
  STEMIcons,
};
