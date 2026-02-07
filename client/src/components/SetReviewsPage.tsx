import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Rating,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Grid,
} from '@mui/material';
import {
  Star as StarIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  RateReview as RateReviewIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { setsApi } from '../services/api';
import RatingDialog from './RatingDialog';

interface Review {
  rating_id: number;
  rating: number;
  review_text: string;
  customer_name: string;
  created_at: string;
}

interface ReviewsData {
  set_id: number;
  average_rating: number;
  review_count: number;
  reviews: Review[];
}

const SetReviewsPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const [reviewsData, setReviewsData] = useState<ReviewsData | null>(null);
  const [setInfo, setSetInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);

  useEffect(() => {
    if (setId) {
      fetchReviewsData();
      fetchSetInfo();
    }
  }, [setId]);

  const fetchReviewsData = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/ratings/set/${setId}`);
      const data = await response.json();
      
      if (data.success) {
        setReviewsData(data.data);
      } else {
        setError('Failed to load reviews');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    }
  };

  const fetchSetInfo = async () => {
    try {
      const response = await setsApi.getById(parseInt(setId!));
      setSetInfo(response.data);
    } catch (err) {
      console.error('Error fetching set info:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleOpenRatingDialog = () => {
    setRatingDialogOpen(true);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
  };

  const handleRatingSubmitted = () => {
    // Refresh the reviews data after a new rating is submitted
    if (setId) {
      fetchReviewsData();
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'success.main';
    if (rating >= 3.5) return 'warning.main';
    return 'error.main';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Customer Reviews
        </Typography>
      </Box>

      {setInfo && (
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 3fr' }, gap: 3, alignItems: 'center' }}>
            <Box>
              {setInfo.media && setInfo.media.length > 0 && (
                setInfo.media[0].file_type === 'image' || setInfo.media[0].mime_type?.startsWith('image/') ? (
                  <Box
                    component="img"
                    src={setInfo.media[0].file_url}
                    alt={setInfo.name}
                    sx={{
                      width: '100%',
                      maxWidth: 200,
                      height: 150,
                      objectFit: 'contain',
                      borderRadius: 2,
                      bgcolor: 'white',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: 200,
                      height: 150,
                      borderRadius: 2,
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
                    onClick={() => window.open(setInfo.media[0].file_url, '_blank')}
                  >
                    <Box sx={{ fontSize: '32px', marginBottom: '8px', opacity: 0.7 }}>
                      {setInfo.media[0].mime_type === 'application/pdf' ? '📄' : '📁'}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'center', fontSize: '10px' }}>
                      {setInfo.media[0].file_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'primary.main', marginTop: '4px', textAlign: 'center', fontSize: '8px' }}>
                      Click to open
                    </Typography>
                  </Box>
                )
              )}
            </Box>
            <Box>
              <Typography variant="h5" gutterBottom>
                {setInfo.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip label={setInfo.category} size="small" variant="outlined" />
                <Chip label={setInfo.difficulty_level} size="small" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {setInfo.description}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Reviews Summary */}
      {reviewsData && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Reviews Summary</Typography>
              <Button
                variant="outlined"
                startIcon={<RateReviewIcon />}
                onClick={handleOpenRatingDialog}
              >
                Write a Review
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" color={getRatingColor(reviewsData.average_rating || 0)}>
                  {(reviewsData.average_rating || 0).toFixed(1)}
                </Typography>
                <Rating
                  value={reviewsData.average_rating || 0}
                  readOnly
                  precision={0.1}
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: 'warning.main',
                    },
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  Based on {reviewsData.review_count} reviews
                </Typography>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                {/* Rating Distribution */}
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviewsData.reviews.filter(r => r.rating === star).length;
                  const percentage = reviewsData.review_count > 0 ? (count / reviewsData.review_count) * 100 : 0;
                  
                  return (
                    <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ minWidth: 20 }}>
                        {star}
                      </Typography>
                      <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                      <Box
                        sx={{
                          flex: 1,
                          height: 8,
                          bgcolor: 'grey.200',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${percentage}%`,
                            height: '100%',
                            bgcolor: 'warning.main',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
                        {count}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviewsData && reviewsData.reviews.length > 0 ? (
        <Box>
          <Typography variant="h6" gutterBottom>
            All Reviews ({reviewsData.reviews.length})
          </Typography>
          
          {reviewsData.reviews.map((review, index) => (
            <Card key={review.rating_id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {review.customer_name}
                      </Typography>
                      <Rating
                        value={review.rating}
                        readOnly
                        size="small"
                        sx={{
                          '& .MuiRating-iconFilled': {
                            color: 'warning.main',
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(review.created_at)}
                      </Typography>
                    </Box>
                    
                    {review.review_text && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {review.review_text}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
              
              {index < reviewsData.reviews.length - 1 && <Divider />}
            </Card>
          ))}
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <StarIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No reviews yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Be the first to share your experience with this set!
            </Typography>
            <Button
              variant="contained"
              startIcon={<RateReviewIcon />}
              onClick={handleOpenRatingDialog}
            >
              Write the First Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rating Dialog */}
      <RatingDialog
        open={ratingDialogOpen}
        onClose={handleCloseRatingDialog}
        set={setInfo}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </Box>
  );
};

export default SetReviewsPage;
