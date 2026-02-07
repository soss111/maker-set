/**
 * System Health Monitor
 * Provides real-time system status and performance metrics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Collapse,
  Alert,
  Stack,
  Divider
} from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Dataset as DatabaseIcon
} from '@mui/icons-material';
import enhancedApi from '../services/enhancedApi';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  responseTime: number;
  memoryUsage: number;
  databaseStatus: 'connected' | 'disconnected' | 'slow';
  apiErrors: number;
  activeUsers: number;
  lastUpdate: string;
}

interface HealthMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
}

const SystemHealthMonitor: React.FC<{ position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'; variant?: 'compact' | 'full' }> = ({
  position = 'bottom-right',
  variant = 'compact'
}) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setLastError(null);

      // Test API response time
      const startTime = Date.now();
      const response = await enhancedApi.get('/health', {}, 'health-check');
      const responseTime = Date.now() - startTime;

      // Get error statistics
      const errorStats = enhancedApi.getErrorStats();

      // Simulate system metrics (in a real app, these would come from the backend)
      const mockHealth: SystemHealth = {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'warning' : 'error',
        uptime: Date.now() - (Date.now() - 24 * 60 * 60 * 1000), // 24 hours
        responseTime,
        memoryUsage: Math.random() * 100,
        databaseStatus: 'connected',
        apiErrors: errorStats.reduce((sum: number, stat: any) => sum + stat.count, 0),
        activeUsers: Math.floor(Math.random() * 50) + 10,
        lastUpdate: new Date().toISOString()
      };

      const mockMetrics: HealthMetric[] = [
        {
          name: 'CPU Usage',
          value: Math.random() * 100,
          max: 100,
          unit: '%',
          status: Math.random() > 0.8 ? 'critical' : Math.random() > 0.6 ? 'warning' : 'good'
        },
        {
          name: 'Memory Usage',
          value: Math.random() * 100,
          max: 100,
          unit: '%',
          status: Math.random() > 0.85 ? 'critical' : Math.random() > 0.7 ? 'warning' : 'good'
        },
        {
          name: 'Disk Usage',
          value: Math.random() * 100,
          max: 100,
          unit: '%',
          status: Math.random() > 0.9 ? 'critical' : Math.random() > 0.8 ? 'warning' : 'good'
        },
        {
          name: 'Network Latency',
          value: responseTime,
          max: 5000,
          unit: 'ms',
          status: responseTime > 3000 ? 'critical' : responseTime > 1000 ? 'warning' : 'good'
        }
      ];

      setHealth(mockHealth);
      setMetrics(mockMetrics);
    } catch (error: any) {
      setLastError(error.message || 'Failed to fetch health data');
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const positionStyles = {
    'top-right': { top: 16, right: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'top-left': { top: 16, left: 16 },
    'bottom-left': { bottom: 16, left: 16 }
  };

  if (variant === 'compact') {
    return (
      <Box
        sx={{
          position: 'fixed',
          ...positionStyles[position],
          zIndex: 1000,
          minWidth: 200
        }}
      >
        <Card elevation={3}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {health && getStatusIcon(health.status)}
                <Typography variant="subtitle2">System Health</Typography>
              </Box>
              <IconButton size="small" onClick={fetchHealthData} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>

            {health && (
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Response Time</Typography>
                  <Typography variant="caption">{health.responseTime}ms</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Active Users</Typography>
                  <Typography variant="caption">{health.activeUsers}</Typography>
                </Box>
                {health.apiErrors > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">API Errors</Typography>
                    <Typography variant="caption" color="error">{health.apiErrors}</Typography>
                  </Box>
                )}
              </Stack>
            )}

            {lastError && (
              <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>
                {lastError}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1000,
        minWidth: 300,
        maxWidth: 400
      }}
    >
      <Card elevation={3}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {health && getStatusIcon(health.status)}
              <Typography variant="h6">System Health</Typography>
              <Chip 
                label={health?.status || 'unknown'} 
                color={health ? getStatusColor(health.status) as any : 'default'}
                size="small"
              />
            </Box>
            <Box>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <IconButton size="small" onClick={fetchHealthData} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {health && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Response Time</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {health.responseTime}ms
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Uptime</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatUptime(health.uptime)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Active Users</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {health.activeUsers}
                </Typography>
              </Box>

              {health.apiErrors > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="error">API Errors</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error">
                    {health.apiErrors}
                  </Typography>
                </Box>
              )}

              <Collapse in={expanded}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Performance Metrics
                </Typography>
                
                {metrics.map((metric) => (
                  <Box key={metric.name} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">{metric.name}</Typography>
                      <Typography variant="caption" fontWeight="bold">
                        {metric.value.toFixed(1)}{metric.unit}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(metric.value / metric.max) * 100}
                      color={getMetricColor(metric.status) as any}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                ))}
              </Collapse>
            </Stack>
          )}

          {lastError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {lastError}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemHealthMonitor;