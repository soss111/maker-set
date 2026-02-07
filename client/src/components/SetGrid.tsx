import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Button,
  Avatar,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CameraAlt as CameraIcon,
  Build as BuildIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Verified as VerifiedIcon,
  Star as StarIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { Set as SetType } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface SetGridProps {
  sets: SetType[];
  onEditSet: (set: SetType) => void;
  onDeleteSet: (setId: number) => void;
  onManagePhotos: (set: SetType) => void;
  onManageTools: (set: SetType) => void;
  onManageParts: (set: SetType) => void;
  onManageInstructions: (set: SetType) => void;
  onToggleVisibility: (setId: number, isVisible: boolean) => void;
  onToggleTrustCertificate: (setId: number, isTrusted: boolean) => void;
  isAdmin: boolean;
  hasPhotos: (set: SetType) => boolean;
  hasTools: (set: SetType) => boolean;
  hasParts: (set: SetType) => boolean;
  hasInstructions: (set: SetType) => boolean;
  getTranslatedSetName: (set: SetType) => string;
  getTranslatedSetDescription: (set: SetType) => string;
  getLearningOutcomes: (set: SetType) => string[];
  getAvailableQuantity: (set: SetType) => number;
}

const SetGrid: React.FC<SetGridProps> = ({
  sets,
  onEditSet,
  onDeleteSet,
  onManagePhotos,
  onManageTools,
  onManageParts,
  onManageInstructions,
  onToggleVisibility,
  onToggleTrustCertificate,
  isAdmin,
  hasPhotos,
  hasTools,
  hasParts,
  hasInstructions,
  getTranslatedSetName,
  getTranslatedSetDescription,
  getLearningOutcomes,
  getAvailableQuantity,
}) => {
  const { t } = useLanguage();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
      {sets.map((set, index) => (
        <Card key={`${set.set_id}-${index}`} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                {getTranslatedSetName(set)}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Edit Set">
                  <IconButton size="small" onClick={() => onEditSet(set)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Set">
                  <IconButton size="small" onClick={() => onDeleteSet(set.set_id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Owner/Provider Information */}
            <Box sx={{ mb: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: set.set_type === 'admin' ? 'primary.main' : 'secondary.main',
                  fontWeight: 600,
                  display: 'block',
                  fontSize: '11px'
                }}
              >
                {set.set_type === 'admin' ? '🏢 MakerSet Platform' : 
                 `🏢 ${set.provider_company || set.provider_username || 'Provider'}`}
              </Typography>
            </Box>
            
            {/* Provider Type Badge */}
            <Chip 
              label={set.set_type === 'admin' ? 'Platform' : 'Provider'} 
              size="small" 
              color={set.set_type === 'admin' ? 'primary' : 'secondary'}
              variant="filled"
              sx={{ fontSize: '9px', height: '18px', mb: 1 }}
            />
            
            {/* Trust Certificate Badge */}
            {set.tested_by_makerset && (
              <Chip 
                icon={<VerifiedIcon sx={{ fontSize: '12px' }} />}
                label="Trust Certificate"
                size="small" 
                color="success"
                variant="filled"
                sx={{ 
                  fontSize: '9px', 
                  height: '18px',
                  ml: 1,
                  animation: 'pulse 2s infinite'
                }}
              />
            )}

            {/* Description */}
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2, 
                flexGrow: 1,
                minHeight: '60px',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {getTranslatedSetDescription(set) || 
                `Explore the fascinating world of ${set.category} through hands-on learning. This ${set.difficulty_level} project is perfect for ages ${set.recommended_age_min || 8}-${set.recommended_age_max || 12} and takes approximately ${set.estimated_duration_minutes || 60} minutes to complete.`}
            </Typography>

            {/* Category and Difficulty */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={set.category} size="small" />
              <Chip 
                label={set.difficulty_level} 
                color={set.difficulty_level === 'beginner' ? 'success' : 
                       set.difficulty_level === 'intermediate' ? 'warning' : 'error'}
                size="small" 
              />
            </Box>

            {/* Learning Outcomes */}
            {getLearningOutcomes(set).length > 0 && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Learning Outcomes:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {getLearningOutcomes(set).slice(0, 2).map((outcome, index) => (
                    <Chip
                      key={index}
                      label={outcome}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontSize: '0.7rem', 
                        height: '20px',
                      }}
                    />
                  ))}
                  {getLearningOutcomes(set).length > 2 && (
                    <Chip
                      label={`+${getLearningOutcomes(set).length - 2} more`}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontSize: '0.7rem', 
                        height: '20px',
                      }}
                    />
                  )}
                </Box>
              </Box>
            )}

            {/* Price and Availability */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                  €{Number(set.price || set.display_price || set.base_price || 0).toFixed(2)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getAvailableQuantity(set) > 10 ? 'success.main' : 
                                      getAvailableQuantity(set) > 0 ? 'warning.main' : 'error.main'
                    }}
                  />
                  <Typography 
                    variant="body2" 
                    color={getAvailableQuantity(set) === -1 ? 'text.secondary' :
                           getAvailableQuantity(set) > 10 ? 'success.main' : 
                           getAvailableQuantity(set) > 0 ? 'warning.main' : 'error.main'}
                    sx={{ fontWeight: 500 }}
                  >
                    {getAvailableQuantity(set) === -1 ? 'Parts not configured' :
                     getAvailableQuantity(set) > 99 ? '99+' : getAvailableQuantity(set) + ' available'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>

          <CardActions sx={{ p: 2, pt: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              {/* Content Management Icons */}
                <Tooltip title={hasPhotos(set) ? "Manage Photos" : "Add Photos"}>
                  <IconButton
                    size="small"
                    onClick={() => onManagePhotos(set)}
                    sx={{
                      backgroundColor: hasPhotos(set) ? 'success.light' : 'grey.100',
                      color: hasPhotos(set) ? 'success.contrastText' : 'grey.600',
                      '&:hover': {
                        backgroundColor: hasPhotos(set) ? 'success.main' : 'grey.200',
                        color: hasPhotos(set) ? 'white' : 'grey.800',
                      }
                    }}
                  >
                    <Badge badgeContent={set.media_count || 0} color="primary">
                      <CameraIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title={hasTools(set) ? "Manage Tools" : "Add Tools"}>
                  <IconButton
                    size="small"
                    onClick={() => onManageTools(set)}
                    sx={{
                      backgroundColor: hasTools(set) ? 'warning.light' : 'grey.100',
                      color: hasTools(set) ? 'warning.contrastText' : 'grey.600',
                      '&:hover': {
                        backgroundColor: hasTools(set) ? 'warning.main' : 'grey.200',
                        color: hasTools(set) ? 'white' : 'grey.800',
                      }
                    }}
                  >
                    <BuildIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title={hasParts(set) ? "Manage Parts" : "Add Parts"}>
                  <IconButton
                    size="small"
                    onClick={() => onManageParts(set)}
                    sx={{
                      backgroundColor: hasParts(set) ? 'info.light' : 'grey.100',
                      color: hasParts(set) ? 'info.contrastText' : 'grey.600',
                      '&:hover': {
                        backgroundColor: hasParts(set) ? 'info.main' : 'grey.200',
                        color: hasParts(set) ? 'white' : 'grey.800',
                      }
                    }}
                  >
                    <InventoryIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title={hasInstructions(set) ? "Manage Instructions" : "Add Instructions"}>
                  <IconButton
                    size="small"
                    onClick={() => onManageInstructions(set)}
                    sx={{
                      backgroundColor: hasInstructions(set) ? 'secondary.light' : 'grey.100',
                      color: hasInstructions(set) ? 'secondary.contrastText' : 'grey.600',
                      '&:hover': {
                        backgroundColor: hasInstructions(set) ? 'secondary.main' : 'grey.200',
                        color: hasInstructions(set) ? 'white' : 'grey.800',
                      }
                    }}
                  >
                    <DescriptionIcon />
                  </IconButton>
                </Tooltip>

              {/* Admin Controls */}
              {isAdmin && (
                <>
                  <Box sx={{ width: 1, height: 20, backgroundColor: 'divider', mx: 1 }} />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!set.admin_visible}
                        onChange={(e) => onToggleVisibility(set.set_id, e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {set.admin_visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        <Typography variant="caption">
                          {set.admin_visible ? 'Visible' : 'Hidden'}
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!set.tested_by_makerset}
                        onChange={(e) => onToggleTrustCertificate(set.set_id, e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <VerifiedIcon />
                        <Typography variant="caption">
                          Trusted
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0 }}
                  />
                </>
              )}
            </Box>
          </CardActions>
        </Card>
      ))}
    </Box>
  );
};

export default SetGrid;
