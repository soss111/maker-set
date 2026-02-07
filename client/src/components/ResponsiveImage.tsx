import React, { useState } from 'react';
import { Box, Skeleton, IconButton, Tooltip } from '@mui/material';
import { ZoomIn as ZoomInIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  fallbackText?: string;
  aspectRatio?: string;
  borderRadius?: string;
  backgroundColor?: string;
  onRetry?: () => void;
  showZoomButton?: boolean;
  onZoom?: () => void;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  fallbackText = 'Image not available',
  aspectRatio = '3/2',
  borderRadius = '8px 8px 0 0',
  backgroundColor = '#f5f5f5',
  onRetry,
  showZoomButton = false,
  onZoom
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const handleRetry = () => {
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      setError(false);
      setLoading(true);
      // Force reload by adding timestamp
      const img = document.querySelector(`img[src*="${src}"]`) as HTMLImageElement;
      if (img) {
        img.src = `${src}?retry=${retryCount + 1}&t=${Date.now()}`;
      }
    }
  };

  if (error && retryCount >= 2) {
    return (
      <Box
        sx={{
          position: 'relative',
          aspectRatio,
          backgroundColor,
          border: '2px dashed #ccc',
          borderRadius,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <Box sx={{ fontSize: '48px', marginBottom: '16px', opacity: 0.7 }}>
          📷
        </Box>
        <Box sx={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
          {fallbackText}
        </Box>
        {onRetry && (
          <Tooltip title="Retry loading image">
            <IconButton
              onClick={onRetry}
              size="small"
              sx={{ marginTop: '8px' }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', aspectRatio }}>
      {loading && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{ borderRadius }}
        />
      )}
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius,
          backgroundColor,
          display: loading ? 'none' : 'block',
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
      {showZoomButton && !loading && !error && (
        <Tooltip title="View full size">
          <IconButton
            onClick={onZoom}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
          >
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default ResponsiveImage;
