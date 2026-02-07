import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  SxProps,
  Theme,
} from '@mui/material';
import {
  Language as LanguageIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface LibreTranslateEndpoint {
  url: string;
  status: 'checking' | 'online' | 'offline' | 'error';
  responseTime?: number;
  error?: string;
}

interface LibreTranslateStatusProps {
  onStatusChange?: (isOnline: boolean) => void;
  sx?: SxProps<Theme>;
}

const LibreTranslateStatus: React.FC<LibreTranslateStatusProps> = ({ onStatusChange, sx }) => {
  const [endpoints, setEndpoints] = useState<LibreTranslateEndpoint[]>([
    { url: 'https://libretranslate.de/translate', status: 'checking' },
    { url: 'https://translate.argosopentech.com/translate', status: 'checking' },
    { url: 'https://translate.fortytwo-it.com/translate', status: 'checking' },
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkEndpoint = async (endpoint: LibreTranslateEndpoint): Promise<LibreTranslateEndpoint> => {
    const startTime = Date.now();
    
    try {
      // Try to make a simple health check request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: 'test',
          source: 'en',
          target: 'et',
          format: 'text'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          return {
            ...endpoint,
            status: 'error',
            responseTime,
            error: data.error.includes('API key') ? 'API key required' : data.error,
          };
        }
        return {
          ...endpoint,
          status: 'online',
          responseTime,
        };
      } else {
        return {
          ...endpoint,
          status: 'error',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        return {
          ...endpoint,
          status: 'offline',
          responseTime,
          error: 'Request timeout (5s)',
        };
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          ...endpoint,
          status: 'offline',
          responseTime,
          error: 'Network error - service unreachable',
        };
      } else if (error.message.includes('CORS')) {
        return {
          ...endpoint,
          status: 'error',
          responseTime,
          error: 'CORS policy blocks request',
        };
      } else {
        return {
          ...endpoint,
          status: 'error',
          responseTime,
          error: error.message || 'Unknown error',
        };
      }
    }
  };

  const checkAllEndpoints = async () => {
    setIsChecking(true);
    setLastChecked(new Date());

    const updatedEndpoints = await Promise.all(
      endpoints.map(endpoint => checkEndpoint(endpoint))
    );

    setEndpoints(updatedEndpoints);
    setIsChecking(false);

    // Notify parent component about overall status
    const hasOnlineEndpoint = updatedEndpoints.some(ep => ep.status === 'online');
    onStatusChange?.(hasOnlineEndpoint);
  };

  useEffect(() => {
    checkAllEndpoints();
  }, []);

  const getStatusColor = (status: LibreTranslateEndpoint['status']) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      case 'error': return 'warning';
      case 'checking': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: LibreTranslateEndpoint['status']) => {
    switch (status) {
      case 'online': return <CheckCircleIcon />;
      case 'offline': return <ErrorIcon />;
      case 'error': return <WarningIcon />;
      case 'checking': return <CircularProgress size={16} />;
      default: return null;
    }
  };

  const getStatusText = (status: LibreTranslateEndpoint['status']) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'error': return 'Error';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  const onlineCount = endpoints.filter(ep => ep.status === 'online').length;
  const totalCount = endpoints.length;

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <LanguageIcon color="primary" />
            <Typography variant="h6">LibreTranslate Services</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={`${onlineCount}/${totalCount} Online`}
              color={onlineCount > 0 ? 'success' : 'error'}
              size="small"
            />
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={checkAllEndpoints}
              disabled={isChecking}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {onlineCount === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            All LibreTranslate services are currently offline. AI translations will use fallback dictionaries.
          </Alert>
        )}

        {onlineCount > 0 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            LibreTranslate services are available. AI translations will work normally.
          </Alert>
        )}

        <List dense>
          {endpoints.map((endpoint, index) => (
            <React.Fragment key={endpoint.url}>
              <ListItem>
                <ListItemIcon>
                  {getStatusIcon(endpoint.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {endpoint.url.replace('https://', '').replace('/translate', '')}
                      </Typography>
                      <Chip
                        label={getStatusText(endpoint.status)}
                        color={getStatusColor(endpoint.status)}
                        size="small"
                      />
                      {endpoint.responseTime && (
                        <Typography variant="caption" color="text.secondary">
                          {endpoint.responseTime}ms
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    endpoint.error && (
                      <Typography variant="caption" color="error">
                        {endpoint.error}
                      </Typography>
                    )
                  }
                />
              </ListItem>
              {index < endpoints.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {lastChecked && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last checked: {lastChecked.toLocaleTimeString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default LibreTranslateStatus;
