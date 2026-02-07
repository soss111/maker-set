import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Badge,
  Stack,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CameraAlt as CameraIcon,
  Build as BuildIcon,
  Inventory as InventoryIcon,
  Description as InstructionIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { Set as SetType } from '../services/api';

interface SetCardProps {
  set: SetType;
  isAdmin: boolean;
  onEdit: (set: SetType) => void;
  onDelete: (setId: number) => void;
  onOpenPhotoDialog: (set: SetType) => void;
  onOpenToolsDialog: (set: SetType) => void;
  onOpenPartsDialog: (set: SetType) => void;
  onToggleVisibility: (set: SetType) => void;
  onToggleTrustCertification: (set: SetType) => void;
  hasPhotos: (set: SetType) => boolean;
  hasTools: (set: SetType) => boolean;
  hasParts: (set: SetType) => boolean;
  hasInstructions: (set: SetType) => boolean;
  getFirstImage: (set: SetType) => any;
  getVisibilityIcon: (set: SetType) => React.ReactNode;
  getVisibilityColor: (set: SetType) => string;
  getVisibilityTitle: (set: SetType) => string;
}

const SetCard: React.FC<SetCardProps> = ({
  set,
  isAdmin,
  onEdit,
  onDelete,
  onOpenPhotoDialog,
  onOpenToolsDialog,
  onOpenPartsDialog,
  onToggleVisibility,
  onToggleTrustCertification,
  hasPhotos,
  hasTools,
  hasParts,
  hasInstructions,
  getFirstImage,
  getVisibilityIcon,
  getVisibilityColor,
  getVisibilityTitle,
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ opacity: set.active === false ? 0.7 : 1 }}>
      {!set.active && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <Chip 
            label="Inactive" 
            size="small" 
            color="warning" 
            sx={{ backgroundColor: 'rgba(255, 152, 0, 0.9)', color: 'white' }}
          />
        </Box>
      )}
      
      {getFirstImage(set) ? (
        <CardMedia
          component="img"
          height="200"
          image={getFirstImage(set)!.file_url}
          alt={set.name}
          sx={{ objectFit: 'cover' }}
          onError={(e) => {
            console.error('Failed to load image:', getFirstImage(set)?.file_url);
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Box
          height="200"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgcolor="grey.100"
        >
          <Typography variant="body2" color="text.secondary">
            No Image
          </Typography>
        </Box>
      )}

      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {set.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {set.description}
          </Typography>
          
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Chip 
              label={set.category} 
              size="small" 
              variant="outlined" 
            />
            <Chip 
              label={set.difficulty_level} 
              size="small" 
              color={getDifficultyColor(set.difficulty_level) as any}
            />
            <Chip 
              label={`${set.recommended_age_min}-${set.recommended_age_max} years`} 
              size="small" 
              variant="outlined" 
            />
          </Stack>

          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
            €{set.base_price?.toFixed(2) || '0.00'}
          </Typography>
          
          {/* Instructions & Manual Content */}
          {set.manual && set.manual.trim().length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                📖 Instructions & Manual:
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  maxHeight: '100px', 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.4
                }}
              >
                {set.manual}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Stack direction="row" spacing={1}>
            <Badge 
              color="success" 
              variant="dot" 
              invisible={!hasInstructions(set)}
            >
              <IconButton 
                onClick={() => onOpenPartsDialog(set)} 
                title="Manage Instructions"
                size="small"
                sx={{ 
                  color: hasInstructions(set) ? 'primary.main' : 'text.secondary',
                  backgroundColor: hasInstructions(set) ? 'primary.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: hasInstructions(set) ? 'primary.main' : 'action.hover',
                    color: hasInstructions(set) ? 'white' : 'text.primary'
                  }
                }}
              >
                <InstructionIcon />
              </IconButton>
            </Badge>
            
            <Badge 
              color="success" 
              variant="dot" 
              invisible={!hasPhotos(set)}
            >
              <IconButton 
                onClick={() => onOpenPhotoDialog(set)} 
                title="Manage Photos"
                size="small"
                sx={{ 
                  color: hasPhotos(set) ? 'primary.main' : 'text.secondary',
                  backgroundColor: hasPhotos(set) ? 'primary.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: hasPhotos(set) ? 'primary.main' : 'action.hover',
                    color: hasPhotos(set) ? 'white' : 'text.primary'
                  }
                }}
              >
                <CameraIcon />
              </IconButton>
            </Badge>
            
            <Badge 
              color="success" 
              variant="dot" 
              invisible={!hasTools(set)}
            >
              <IconButton 
                onClick={() => onOpenToolsDialog(set)} 
                title="Manage Tools"
                size="small"
                sx={{ 
                  color: hasTools(set) ? 'primary.main' : 'text.secondary',
                  backgroundColor: hasTools(set) ? 'primary.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: hasTools(set) ? 'primary.main' : 'action.hover',
                    color: hasTools(set) ? 'white' : 'text.primary'
                  }
                }}
              >
                <BuildIcon />
              </IconButton>
            </Badge>
            
            <Badge 
              color="info" 
              variant="dot" 
              invisible={!hasParts(set)}
            >
              <IconButton 
                onClick={() => onOpenPartsDialog(set)} 
                title="Manage Parts"
                size="small"
                sx={{ 
                  color: hasParts(set) ? 'primary.main' : 'text.secondary',
                  backgroundColor: hasParts(set) ? 'primary.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: hasParts(set) ? 'primary.main' : 'action.hover',
                    color: hasParts(set) ? 'white' : 'text.primary'
                  }
                }}
              >
                <InventoryIcon />
              </IconButton>
            </Badge>
          </Stack>
        </Box>

        {/* Admin Controls */}
        {isAdmin && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1}>
              <IconButton 
                onClick={() => onToggleVisibility(set)} 
                title={getVisibilityTitle(set)}
                size="small"
                sx={{ color: getVisibilityColor(set) }}
              >
                {getVisibilityIcon(set)}
              </IconButton>
              
              {set.tested_by_makerset && (
                <IconButton 
                  title="Tested by MakerSet" 
                  size="small"
                  sx={{ color: 'success.main' }}
                >
                  <VerifiedIcon />
                </IconButton>
              )}
              
              <IconButton onClick={() => onEdit(set)} title="Edit Set" size="small">
                <EditIcon />
              </IconButton>
              
              <IconButton onClick={() => onDelete(set.set_id)} title="Delete Set" size="small">
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SetCard;
