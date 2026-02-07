/**
 * Error Boundary Component
 * 
 * Catches and handles React errors gracefully
 * Provides user-friendly error messages and recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Stack,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { stemColors } from '../theme/stemTheme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service (if available)
    if ((window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${stemColors.background.primary} 0%, ${stemColors.background.secondary} 100%)`,
            p: 3,
          }}
        >
          <Card
            sx={{
              maxWidth: 600,
              width: '100%',
              background: `linear-gradient(135deg, ${stemColors.background.card} 0%, ${stemColors.background.surface} 100%)`,
              border: `2px solid ${stemColors.accent.red}`,
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <ErrorIcon
                  sx={{
                    fontSize: 48,
                    color: stemColors.accent.red,
                    mr: 2,
                  }}
                />
                <Box>
                  <Typography variant="h4" fontWeight={700} color={stemColors.accent.red}>
                    System Error
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Something went wrong in the application
                  </Typography>
                </Box>
              </Box>

              <Alert
                severity="error"
                icon={<BugReportIcon />}
                sx={{
                  mb: 3,
                  background: `${stemColors.accent.red}15`,
                  border: `1px solid ${stemColors.accent.red}40`,
                }}
              >
                <Typography variant="body2" fontWeight={500}>
                  Error Details
                </Typography>
                <Typography variant="caption" component="pre" sx={{ mt: 1, fontSize: '0.75rem' }}>
                  {this.state.error?.message || 'Unknown error occurred'}
                </Typography>
              </Alert>

              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                  sx={{
                    background: `linear-gradient(135deg, ${stemColors.primary[500]} 0%, ${stemColors.primary[600]} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[700]} 100%)`,
                    },
                  }}
                >
                  Try Again
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                  sx={{
                    borderColor: stemColors.primary[500],
                    color: stemColors.primary[500],
                    '&:hover': {
                      borderColor: stemColors.primary[600],
                      background: `${stemColors.primary[50]}`,
                    },
                  }}
                >
                  Go to Home
                </Button>

                <Button
                  variant="text"
                  onClick={this.handleReload}
                  sx={{
                    color: stemColors.text.secondary,
                    '&:hover': {
                      background: `${stemColors.secondary[100]}`,
                    },
                  }}
                >
                  Reload Page
                </Button>
              </Stack>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <Box mt={3}>
                  <Typography variant="h6" mb={2}>
                    Development Error Details
                  </Typography>
                  <Box
                    sx={{
                      background: stemColors.secondary[100],
                      p: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 200,
                    }}
                  >
                    <Typography variant="caption" component="pre" sx={{ fontSize: '0.7rem' }}>
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
