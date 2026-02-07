import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Rating,
  Alert,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import {
  Star as StarIcon,
  Close as CloseIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { Set } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface RatingDialogProps {
  open: boolean;
  onClose: () => void;
  set: Set | null;
  onRatingSubmitted?: () => void;
}

interface RatingFormData {
  rating: number;
  reviewText: string;
}

const RatingDialog: React.FC<RatingDialogProps> = ({
  open,
  onClose,
  set,
  onRatingSubmitted,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<RatingFormData>({
    rating: 0,
    reviewText: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRatingChange = (event: React.SyntheticEvent, newValue: number | null) => {
    setFormData(prev => ({ ...prev, rating: newValue || 0 }));
  };

  const handleReviewTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, reviewText: event.target.value }));
  };

  const handleSubmit = async () => {
    if (!set) {
      setError('Set information not available');
      return;
    }
    
    if (!user) {
      setError('Please log in to submit a rating');
      return;
    }
    
    if (formData.rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Please log in to submit a rating');
      }
      
      const response = await fetch('http://localhost:5001/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          set_id: set.set_id,
          user_id: user.user_id,
          rating: formData.rating,
          review_text: formData.reviewText.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit rating');
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onRatingSubmitted?.();
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      setError(err.message || 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ rating: 0, reviewText: '' });
    setError(null);
    setSuccess(false);
    onClose();
  };

  const ratingLabels: { [index: string]: string } = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
  };

  if (!set) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Rate & Review
          </Typography>
          <Button
            onClick={handleClose}
            size="small"
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <CloseIcon />
          </Button>
        </Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
          {set.name}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <StarIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" gutterBottom>
              Thank you for your review!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your rating and review have been submitted successfully.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ py: 2 }}>
            {/* Set Information */}
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {set.media && set.media.length > 0 && (
                  <Box
                    component="img"
                    src={set.media[0].file_url}
                    alt={set.name}
                    sx={{
                      width: 60,
                      height: 60,
                      objectFit: 'contain',
                      borderRadius: 1,
                      bgcolor: 'white',
                    }}
                  />
                )}
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {set.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip label={set.category} size="small" variant="outlined" />
                    <Chip label={set.difficulty_level} size="small" variant="outlined" />
                  </Box>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Rating Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                How would you rate this set? *
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Rating
                  name="set-rating"
                  value={formData.rating}
                  onChange={handleRatingChange}
                  size="large"
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: 'warning.main',
                    },
                  }}
                />
                {formData.rating > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {ratingLabels[formData.rating.toString()]}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Review Text Section */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Share your experience (optional)
              </Typography>
              <TextField
                id="review-text"
                name="review_text"
                fullWidth
                multiline
                rows={4}
                placeholder="Tell others about your experience with this set. What did you like? What could be improved? How did it help with learning?"
                value={formData.reviewText}
                onChange={handleReviewTextChange}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Your review will help other customers make informed decisions.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
            disabled={loading || formData.rating === 0}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default RatingDialog;
