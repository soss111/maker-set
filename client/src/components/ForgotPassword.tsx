import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Container,
  Link,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { passwordResetApi } from '../services/api';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await passwordResetApi.requestReset(email);
      
      if (response.data.success) {
        setSuccess(true);
        // In development, show the reset URL
        if (response.data.reset_url) {
          setResetUrl(response.data.reset_url);
        }
      } else {
        setError(response.data.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, mb: 4 }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom align="center">
                Check Your Email
              </Typography>
              
              <Alert severity="success" sx={{ mb: 3 }}>
                If an account with that email exists, a password reset link has been sent.
              </Alert>

              {resetUrl && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Development Mode:</strong> Reset URL: 
                    <br />
                    <Link href={resetUrl} target="_blank" rel="noopener">
                      {resetUrl}
                    </Link>
                  </Typography>
                </Alert>
              )}

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Forgot Password
            </Typography>
            
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                autoComplete="email"
                autoFocus
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  variant="text"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
