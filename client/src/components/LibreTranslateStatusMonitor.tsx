import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as OnlineIcon,
  Error as OfflineIcon,
  Refresh as RefreshIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  responseTime?: number;
  error?: string;
}

const LibreTranslateStatusMonitor: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'libretranslate.de', url: 'https://libretranslate.de', status: 'checking' },
    { name: 'translate.argosopentech.com', url: 'https://translate.argosopentech.com', status: 'checking' },
    { name: 'translate.fortytwo-it.com', url: 'https://translate.fortytwo-it.com', status: 'checking' },
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkServiceStatus = async (service: ServiceStatus): Promise<ServiceStatus> => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${service.url}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: 'test',
          source: 'en',
          target: 'et',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          ...service,
          status: 'online',
          responseTime,
        };
      } else {
        return {
          ...service,
          status: 'offline',
          responseTime,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        ...service,
        status: 'offline',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const checkAllServices = async () => {
    setIsChecking(true);
    setServices(prev => prev.map(service => ({ ...service, status: 'checking' as const })));
    
    const results = await Promise.all(
      services.map(service => checkServiceStatus(service))
    );
    
    setServices(results);
    setLastChecked(new Date());
    setIsChecking(false);
  };

  useEffect(() => {
    checkAllServices();
  }, []);

  const onlineCount = services.filter(s => s.status === 'online').length;
  const totalCount = services.length;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <TranslateIcon color="primary" />
            <Typography variant="h6">
              LibreTranslate Services
            </Typography>
            <Chip
              label={`${onlineCount}/${totalCount} Online`}
              color={onlineCount > 0 ? 'success' : 'error'}
              size="small"
            />
          </Box>
          <Button
            startIcon={isChecking ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={checkAllServices}
            disabled={isChecking}
            size="small"
          >
            {isChecking ? 'Checking...' : 'Refresh'}
          </Button>
        </Box>

        {onlineCount === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            All LibreTranslate services are currently offline. AI translations will use fallback dictionaries.
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {services.map((service, index) => (
            <Box key={index}>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: service.status === 'online' ? 'success.light' : 
                          service.status === 'offline' ? 'error.light' : 'grey.100',
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {service.status === 'online' && <OnlineIcon color="success" />}
                  {service.status === 'offline' && <OfflineIcon color="error" />}
                  {service.status === 'checking' && <CircularProgress size={16} />}
                  <Typography variant="subtitle2" fontWeight="bold">
                    {service.name}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {service.url}
                </Typography>
                
                {service.responseTime && (
                  <Typography variant="caption" color="text.secondary">
                    Response: {service.responseTime}ms
                  </Typography>
                )}
                
                {service.error && (
                  <Typography variant="caption" color="error" display="block">
                    Error: {service.error}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {lastChecked && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Last checked: {lastChecked.toLocaleTimeString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default LibreTranslateStatusMonitor;
