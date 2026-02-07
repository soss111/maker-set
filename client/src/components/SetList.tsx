import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Avatar,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
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

interface SetListProps {
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

const SetList: React.FC<SetListProps> = ({
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
    <Card>
      <List>
        {sets.map((set, index) => (
          <React.Fragment key={`${set.set_id}-${index}`}>
            <ListItem sx={{ py: 2 }}>
              <ListItemAvatar>
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    backgroundColor: set.set_type === 'admin' ? 'primary.main' : 'secondary.main',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                  }}
                >
                  {getTranslatedSetName(set).charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {getTranslatedSetName(set)}
                    </Typography>
                    
                    {/* Owner/Provider Information */}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: set.set_type === 'admin' ? 'primary.main' : 'secondary.main',
                        fontWeight: 600,
                        fontSize: '10px',
                        mr: 1
                      }}
                    >
                      {set.set_type === 'admin' ? '🏢 MakerSet Platform' : 
                       `🏢 ${set.provider_company || set.provider_username || 'Provider'}`}
                    </Typography>
                    
                    <Chip 
                      label={set.set_type === 'admin' ? 'Platform' : 'Provider'} 
                      size="small" 
                      color={set.set_type === 'admin' ? 'primary' : 'secondary'}
                      variant="filled"
                    />
                    
                    {set.tested_by_makerset && (
                      <Chip 
                        icon={<VerifiedIcon sx={{ fontSize: '12px' }} />}
                        label="Trusted"
                        size="small" 
                        color="success"
                        variant="filled"
                      />
                    )}
                    
                    <Chip label={set.category} size="small" variant="outlined" />
                    <Chip label={set.difficulty_level} size="small" variant="outlined" />
                    
                    {getAvailableQuantity(set) === -1 && (
                      <Chip 
                        label="Parts Not Configured" 
                        size="small" 
                        color="warning" 
                        variant="filled"
                      />
                    )}
                    {getAvailableQuantity(set) === 0 && (
                      <Chip 
                        label="Out of Stock" 
                        size="small" 
                        color="error" 
                        variant="filled"
                      />
                    )}
                    {getAvailableQuantity(set) > 0 && (
                      <Chip 
                        label={set.set_type === 'admin' ? 'Platform Set' : `${getAvailableQuantity(set)} Available`} 
                        size="small" 
                        color="success" 
                        variant="filled"
                      />
                    )}
                    {getLearningOutcomes(set).length > 0 && (
                      <Chip 
                        label={`${getLearningOutcomes(set).length} Learning Outcomes`} 
                        size="small" 
                        variant="outlined" 
                        color="secondary"
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 1, 
                        flexGrow: 1,
                        minHeight: '40px',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {getTranslatedSetDescription(set) || 
                        `Explore the fascinating world of ${set.category} through hands-on learning. This ${set.difficulty_level} project is perfect for ages ${set.recommended_age_min || 8}-${set.recommended_age_max || 12} and takes approximately ${set.estimated_duration_minutes || 60} minutes to complete.`}
                    </Typography>

                    {/* Instructions & Manual Content */}
                    {set.manual && set.manual.trim().length > 0 && (
                      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', mb: 0.5, display: 'block' }}>
                          📖 Instructions & Manual:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            maxHeight: '60px', 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.3
                          }}
                        >
                          {set.manual}
                        </Typography>
                      </Box>
                    )}

                    {/* Learning Outcomes */}
                    {getLearningOutcomes(set).length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Learning Outcomes:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {getLearningOutcomes(set).slice(0, 3).map((outcome, index) => (
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
                          {getLearningOutcomes(set).length > 3 && (
                            <Chip
                              label={`+${getLearningOutcomes(set).length - 3} more`}
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

                    {/* Bottom Section with Price and Action Buttons */}
                    <Box sx={{ mt: 'auto', pt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                          €{Number(set.display_price || set.price || set.base_price || 0).toFixed(2)}
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
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<EditIcon />}
                          onClick={() => onEditSet(set)}
                          size="large"
                          sx={{ 
                            fontWeight: 600,
                            px: 3,
                            py: 1.5,
                            borderRadius: 2,
                            flex: 1,
                            backgroundColor: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'primary.dark',
                            }
                          }}
                        >
                          Edit Set
                        </Button>
                        
                        <Button
                          variant="outlined"
                          startIcon={<DeleteIcon />}
                          onClick={() => onDeleteSet(set.set_id)}
                          size="large"
                          sx={{ 
                            fontWeight: 500,
                            px: 3,
                            py: 1.5,
                            borderRadius: 2,
                            borderColor: 'error.main',
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'error.light',
                              color: 'white'
                            },
                            flex: 1
                          }}
                        >
                          Delete
                        </Button>
                      </Box>

                      {/* Action Icons */}
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
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
                      </Box>

                      {/* Admin Controls */}
                      {isAdmin && (
                        <>
                          <Box sx={{ width: 1, height: 20, backgroundColor: 'divider', mx: 1 }} />
                          
                          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
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
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            {index < sets.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Card>
  );
};

export default SetList;