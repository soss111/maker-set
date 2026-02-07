import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material';
import {
  Add as AddIcon,
  ShoppingCart as CartIcon,
  Visibility as ViewIcon,
  Build as BuildIcon,
  Description as DescriptionIcon,
  Engineering as EngineeringIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Set as SetType, Part, Media } from '../services/api';

interface ProviderSet {
  provider_set_id: number;
  provider_id: number;
  set_id: number;
  price: number;
  available_quantity: number;
  is_active: boolean;
  category: string;
  difficulty_level: string;
  recommended_age_min: number;
  recommended_age_max: number;
  estimated_duration_minutes: number;
  set_name: string;
  set_description: string;
  provider_username: string;
  provider_company: string;
  provider_code?: string;
}

interface SetPart {
  part_id: number;
  part_name: string;
  part_number: string;
  category: string;
  unit_of_measure: string;
  quantity: number;
  is_optional: boolean;
  notes?: string;
}


interface SetInstruction {
  instruction_id: number;
  step_order: number;
  title: string;
  content: string;
  estimated_time_minutes?: number;
}

const SetDetailsPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [providerSet, setProviderSet] = useState<ProviderSet | null>(null);
  const [setParts, setSetParts] = useState<SetPart[]>([]);
  const [setMedia, setSetMedia] = useState<Media[]>([]);
  const [setInstructions, setSetInstructions] = useState<SetInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [openAddToCart, setOpenAddToCart] = useState(false);

  useEffect(() => {
    if (setId) {
      fetchSetDetails();
    }
  }, [setId]);

  const fetchSetDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch provider set details
      const providerSetResponse = await fetch(`http://localhost:5001/api/provider-sets/${setId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!providerSetResponse.ok) {
        throw new Error('Set not found');
      }

      const providerSetData = await providerSetResponse.json();
      setProviderSet(providerSetData.provider_set);

      // Fetch set parts
      const partsResponse = await fetch(`http://localhost:5001/api/set-parts/${providerSetData.provider_set.set_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (partsResponse.ok) {
        const partsData = await partsResponse.json();
        setSetParts(partsData);
      }

      // Fetch set media/photos
      const mediaResponse = await fetch(`http://localhost:5001/api/media/set/${providerSetData.provider_set.set_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        setSetMedia(mediaData);
      }

      // Fetch set instructions
      const instructionsResponse = await fetch(`http://localhost:5001/api/instructions/set/${providerSetData.provider_set.set_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (instructionsResponse.ok) {
        const instructionsData = await instructionsResponse.json();
        setSetInstructions(instructionsData);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (providerSet) {
      try {
        // Convert SetPart[] to Part[] for cart validation
        const partsForCart: Part[] = setParts.map(setPart => ({
          part_id: setPart.part_id,
          part_number: setPart.part_number,
          part_name: setPart.part_name,
          category: setPart.category,
          unit_of_measure: setPart.unit_of_measure,
          quantity: setPart.quantity,
          is_optional: setPart.is_optional,
          notes: setPart.notes,
          // Add required fields with default values
          stock_quantity: 0, // Will be validated by cart context
          minimum_stock_level: 0,
          description: '',
          unit_cost: 0,
          supplier: '',
          supplier_part_number: '',
          image_url: '',
          instruction_pdf: '',
          drawing_pdf: '',
          assembly_notes: '',
          safety_notes: '',
          is_low_stock: false,
          set_usage_count: 0,
          translations: {}
        }));

        // Convert ProviderSet to SetType format for cart
        const setForCart: SetType = {
          set_id: providerSet.set_id,
          name: providerSet.set_name,
          description: providerSet.set_description || '',
          category: providerSet.category || '',
          difficulty_level: providerSet.difficulty_level || '',
          recommended_age_min: providerSet.recommended_age_min || 0,
          recommended_age_max: providerSet.recommended_age_max || 0,
          estimated_duration_minutes: providerSet.estimated_duration_minutes || 0,
          base_price: providerSet.price,
          active: true,
          created_at: '',
          updated_at: '',
          translations: {},
          parts: partsForCart // Include converted parts data for validation
        };
        
        addToCart(setForCart, quantity);
        setOpenAddToCart(true);
      } catch (error: any) {
        console.error('Error adding to cart:', error);
        if (error.message === 'LOGIN_REQUIRED') {
          navigate('/login', { state: { message: 'Please login to add items to your cart' } });
        } else {
          setError(error.message || 'Failed to add item to cart');
          setTimeout(() => setError(null), 3000);
        }
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  const getAgeRange = (min: number, max: number) => {
    if (min === 0 && max === 0) return 'All ages';
    if (min === max) return `${min}+ years`;
    return `${min}-${max} years`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hours`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !providerSet) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Set not found'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/shop')}>
          Back to Shop
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Box mb={2}>
        <Button onClick={() => navigate('/shop')} sx={{ textTransform: 'none' }}>
          ← Back to Shop
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Set Header */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h4" component="h1" gutterBottom>
                {providerSet.set_name}
              </Typography>
              
              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                <Chip label={providerSet.category} size="small" />
                <Chip 
                  label={providerSet.difficulty_level} 
                  color={getDifficultyColor(providerSet.difficulty_level) as any}
                  size="small" 
                />
                <Chip 
                  label={getAgeRange(providerSet.recommended_age_min, providerSet.recommended_age_max)} 
                  size="small" 
                />
                <Chip 
                  label={formatDuration(providerSet.estimated_duration_minutes)} 
                  size="small" 
                />
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {providerSet.set_description}
              </Typography>

              <Box display="flex" alignItems="center" gap={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <BusinessIcon fontSize="small" />
                  <Typography variant="body2">
                    Provider: {providerSet.provider_code || 'Unknown'}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" color="text.secondary">
                    Available: {providerSet.available_quantity} units
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Photos */}
          {setMedia.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Photos
                </Typography>
                <ImageList cols={3} rowHeight={200} gap={8}>
                  {setMedia.map((media) => (
                    <ImageListItem key={media.media_id}>
                      {media.file_type === 'image' || media.mime_type?.startsWith('image/') ? (
                        <img
                          src={media.file_url}
                          alt={media.alt_text || media.file_name}
                          loading="lazy"
                          style={{ borderRadius: '8px' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: '100%',
                            height: '200px',
                            borderRadius: '8px',
                            backgroundColor: '#f5f5f5',
                            border: '2px solid #e0e0e0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: '#e8f4fd',
                              borderColor: '#1976d2'
                            }
                          }}
                          onClick={() => window.open(media.file_url, '_blank')}
                        >
                          <Box sx={{ fontSize: '48px', marginBottom: '16px', opacity: 0.7 }}>
                            {media.mime_type === 'application/pdf' ? '📄' : '📁'}
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
                            {media.file_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                            {media.media_category || 'Document'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'primary.main', marginTop: '8px', textAlign: 'center' }}>
                            Click to open
                          </Typography>
                        </Box>
                      )}
                      <ImageListItemBar
                        title={media.file_name}
                        subtitle={media.description}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              </CardContent>
            </Card>
          )}

          {/* Required Parts */}
          {setParts.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Required Parts & Tools
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This set includes the following parts and tools:
                </Typography>
                
                <List>
                  {setParts.map((part, index) => (
                    <React.Fragment key={part.part_id}>
                      <ListItem>
                        <ListItemIcon>
                          <BuildIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={part.part_name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Part Number: {part.part_number}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Quantity: {part.quantity} {part.unit_of_measure}
                                {part.is_optional && (
                                  <Chip label="Optional" size="small" color="warning" sx={{ ml: 1 }} />
                                )}
                              </Typography>
                              {part.notes && (
                                <Typography variant="body2" color="text.secondary">
                                  Notes: {part.notes}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < setParts.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {setInstructions.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Student Instructions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Step-by-step instructions to build this maker set:
                </Typography>
                
                {setInstructions.map((instruction, index) => (
                  <Accordion key={instruction.instruction_id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="h6" color="primary">
                          Step {instruction.step_order}
                        </Typography>
                        <Typography variant="subtitle1">
                          {instruction.title}
                        </Typography>
                        {instruction.estimated_time_minutes && (
                          <Chip 
                            label={formatDuration(instruction.estimated_time_minutes)} 
                            size="small" 
                            color="info"
                          />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        {instruction.content}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h5" color="primary" gutterBottom>
                €{providerSet.price.toFixed(2)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Available: {providerSet.available_quantity} units
              </Typography>

              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="body2">Quantity:</Typography>
                <Button
                  size="small"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Typography variant="body1" sx={{ minWidth: 30, textAlign: 'center' }}>
                  {quantity}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setQuantity(Math.min(providerSet.available_quantity, quantity + 1))}
                  disabled={quantity >= providerSet.available_quantity}
                >
                  +
                </Button>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<CartIcon />}
                onClick={handleAddToCart}
                disabled={providerSet.available_quantity === 0}
                sx={{ mb: 2 }}
              >
                Add to Cart
              </Button>

              <Typography variant="h6" color="primary" align="center">
                Total: €{(providerSet.price * quantity).toFixed(2)}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Set Information
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <GroupIcon fontSize="small" />
                  <Typography variant="body2">
                    Age: {getAgeRange(providerSet.recommended_age_min, providerSet.recommended_age_max)}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <ScheduleIcon fontSize="small" />
                  <Typography variant="body2">
                    Duration: {formatDuration(providerSet.estimated_duration_minutes)}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <BuildIcon fontSize="small" />
                  <Typography variant="body2">
                    Parts: {setParts.length} items
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <DescriptionIcon fontSize="small" />
                  <Typography variant="body2">
                    Instructions: {setInstructions.length} steps
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add to Cart Confirmation Dialog */}
      <Dialog open={openAddToCart} onClose={() => setOpenAddToCart(false)}>
        <DialogTitle>Added to Cart</DialogTitle>
        <DialogContent>
          <Typography>
            {quantity} x {providerSet.set_name} has been added to your cart.
          </Typography>
          <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
            Total: €{(providerSet.price * quantity).toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddToCart(false)}>Continue Shopping</Button>
          <Button variant="contained" onClick={() => {
            setOpenAddToCart(false);
            navigate('/shop');
          }}>
            View Cart
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SetDetailsPage;
