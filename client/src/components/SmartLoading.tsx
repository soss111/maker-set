/**
 * Smart Loading and Error Display Component
 * Provides consistent loading states and error handling across the application
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  CircularProgress,
  LinearProgress,
  Typography,
  Button,
  Collapse,
  IconButton,
  Snackbar,
  Chip,
  Stack
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

export interface LoadingState {
  loading: boolean;
  error: string | null;
  success: string | null;
  retry?: () => void;
}

export interface ErrorDetails {
  message: string;
  code: string;
  details?: any;
  timestamp?: string;
}

interface SmartLoadingProps {
  loading: boolean;
  error: string | ErrorDetails | null;
  success?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  loadingText?: string;
  variant?: 'circular' | 'linear' | 'skeleton';
  size?: 'small' | 'medium' | 'large';
  showErrorDetails?: boolean;
  autoHideSuccess?: boolean;
  successDuration?: number;
}

const SmartLoading: React.FC<SmartLoadingProps> = ({
  loading,
  error,
  success,
  onRetry,
  onDismiss,
  loadingText = 'Loading...',
  variant = 'circular',
  size = 'medium',
  showErrorDetails = false,
  autoHideSuccess = true,
  successDuration = 3000
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (success && autoHideSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        onDismiss?.();
      }, successDuration);
      return () => clearTimeout(timer);
    }
  }, [success, autoHideSuccess, successDuration, onDismiss]);

  const getErrorIcon = (code: string) => {
    switch (code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
        return <ErrorIcon color="error" />;
      case 'VALIDATION_ERROR':
      case 'BAD_REQUEST':
        return <WarningIcon color="warning" />;
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return <InfoIcon color="info" />;
      default:
        return <ErrorIcon color="error" />;
    }
  };

  const getErrorSeverity = (code: string): 'error' | 'warning' | 'info' => {
    switch (code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
      case 'SERVER_ERROR':
        return 'error';
      case 'VALIDATION_ERROR':
      case 'BAD_REQUEST':
        return 'warning';
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return 'info';
      default:
        return 'error';
    }
  };

  const renderLoading = () => {
    if (variant === 'linear') {
      return (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            {loadingText}
          </Typography>
        </Box>
      );
    }

    const sizeMap = {
      small: 24,
      medium: 40,
      large: 56
    };

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
        <CircularProgress size={sizeMap[size]} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {loadingText}
        </Typography>
      </Box>
    );
  };

  const renderError = () => {
    if (!error) return null;

    const errorData: ErrorDetails = typeof error === 'string' 
      ? { message: error, code: 'UNKNOWN_ERROR' }
      : error;

    return (
      <Alert 
        severity={getErrorSeverity(errorData.code)}
        sx={{ mb: 2 }}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {onRetry && (
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={onRetry}
                variant="outlined"
              >
                Retry
              </Button>
            )}
            {onDismiss && (
              <IconButton size="small" onClick={onDismiss}>
                <CloseIcon />
              </IconButton>
            )}
          </Stack>
        }
      >
        <AlertTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getErrorIcon(errorData.code)}
            <Chip 
              label={errorData.code} 
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        </AlertTitle>
        
        <Typography variant="body2">
          {errorData.message}
        </Typography>

        {showErrorDetails && errorData.details && (
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            
            <Collapse in={showDetails}>
              <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(errorData.details, null, 2)}
                </Typography>
              </Box>
            </Collapse>
          </Box>
        )}
      </Alert>
    );
  };

  const renderSuccess = () => {
    if (!success) return null;

    return (
      <Snackbar
        open={showSuccess}
        autoHideDuration={successDuration}
        onClose={() => {
          setShowSuccess(false);
          onDismiss?.();
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          icon={<SuccessIcon />}
          action={
            <IconButton size="small" onClick={() => setShowSuccess(false)}>
              <CloseIcon />
            </IconButton>
          }
        >
          {success}
        </Alert>
      </Snackbar>
    );
  };

  return (
    <Box>
      {loading && renderLoading()}
      {renderError()}
      {renderSuccess()}
    </Box>
  );
};

export default SmartLoading;

