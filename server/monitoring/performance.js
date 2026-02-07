/**
 * Performance Monitoring Configuration
 * 
 * Production performance monitoring setup:
 * - Response time tracking
 * - Memory usage monitoring
 * - Database query performance
 * - Error rate tracking
 * - Custom metrics
 */

const express = require('express');
const prometheus = require('prom-client');
const responseTime = require('response-time');

// Initialize Prometheus metrics
const register = new prometheus.Registry();

// Add default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});

const aiOperationDuration = new prometheus.Histogram({
  name: 'ai_operation_duration_seconds',
  help: 'Duration of AI operations in seconds',
  labelNames: ['operation_type'],
  buckets: [1, 2, 5, 10, 20, 30, 60]
});

const orderOperations = new prometheus.Counter({
  name: 'order_operations_total',
  help: 'Total number of order operations',
  labelNames: ['operation_type', 'status']
});

const inventoryLevels = new prometheus.Gauge({
  name: 'inventory_levels',
  help: 'Current inventory levels',
  labelNames: ['part_id', 'part_name', 'category']
});

const errorRate = new prometheus.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'endpoint']
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(aiOperationDuration);
register.registerMetric(orderOperations);
register.registerMetric(inventoryLevels);
register.registerMetric(errorRate);

// Performance monitoring middleware
const performanceMonitoring = (app) => {
  // Response time tracking
  app.use(responseTime((req, res, time) => {
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    httpRequestDuration
      .labels(method, route, statusCode)
      .observe(time / 1000);
    
    httpRequestTotal
      .labels(method, route, statusCode)
      .inc();
  }));

  // Active connections tracking
  let connectionCount = 0;
  
  app.use((req, res, next) => {
    connectionCount++;
    activeConnections.set(connectionCount);
    
    res.on('finish', () => {
      connectionCount--;
      activeConnections.set(connectionCount);
    });
    
    next();
  });

  // Error tracking
  app.use((err, req, res, next) => {
    const route = req.route ? req.route.path : req.path;
    errorRate
      .labels(err.name || 'UnknownError', route)
      .inc();
    
    next(err);
  });
};

// Database query monitoring wrapper
const monitorDatabaseQuery = (queryFunction, queryType, table) => {
  return async (...args) => {
    const startTime = Date.now();
    
    try {
      const result = await queryFunction(...args);
      const duration = (Date.now() - startTime) / 1000;
      
      databaseQueryDuration
        .labels(queryType, table)
        .observe(duration);
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      databaseQueryDuration
        .labels(queryType, table)
        .observe(duration);
      
      errorRate
        .labels('DatabaseError', `${queryType}_${table}`)
        .inc();
      
      throw error;
    }
  };
};

// AI operation monitoring wrapper
const monitorAIOperation = (operationFunction, operationType) => {
  return async (...args) => {
    const startTime = Date.now();
    
    try {
      const result = await operationFunction(...args);
      const duration = (Date.now() - startTime) / 1000;
      
      aiOperationDuration
        .labels(operationType)
        .observe(duration);
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      aiOperationDuration
        .labels(operationType)
        .observe(duration);
      
      errorRate
        .labels('AIError', operationType)
        .inc();
      
      throw error;
    }
  };
};

// Order operation tracking
const trackOrderOperation = (operationType, status) => {
  orderOperations
    .labels(operationType, status)
    .inc();
};

// Inventory level tracking
const updateInventoryMetrics = async (pool) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.part_id,
        pt.part_name,
        p.category,
        p.stock_quantity
      FROM parts p
      LEFT JOIN part_translations pt ON p.part_id = pt.part_id
      LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
    `);
    
    // Clear existing metrics
    inventoryLevels.reset();
    
    // Set new metrics
    result.rows.forEach(row => {
      inventoryLevels
        .labels(
          row.part_id.toString(),
          row.part_name || 'Unnamed Part',
          row.category
        )
        .set(row.stock_quantity);
    });
  } catch (error) {
    console.error('Error updating inventory metrics:', error);
    errorRate
      .labels('MetricsError', 'inventory_update')
      .inc();
  }
};

// Health check endpoint
const healthCheck = (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    metrics: {
      activeConnections: activeConnections.get(),
      totalRequests: httpRequestTotal.get()
    }
  };
  
  res.json(health);
};

// Metrics endpoint
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

// Performance dashboard data
const performanceDashboard = async (req, res) => {
  try {
    const metrics = await register.getMetricsAsJSON();
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      http: {
        totalRequests: httpRequestTotal.get(),
        activeConnections: activeConnections.get()
      },
      database: {
        queryMetrics: metrics.find(m => m.name === 'database_query_duration_seconds'),
        errorRate: metrics.find(m => m.name === 'errors_total')
      },
      ai: {
        operationMetrics: metrics.find(m => m.name === 'ai_operation_duration_seconds')
      },
      orders: {
        operationCounts: metrics.find(m => m.name === 'order_operations_total')
      },
      inventory: {
        levels: metrics.find(m => m.name === 'inventory_levels')
      }
    };
    
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate performance dashboard' });
  }
};

// Performance alerts
const checkPerformanceAlerts = () => {
  const alerts = [];
  
  // Check response time
  const avgResponseTime = httpRequestDuration.get().values.reduce((sum, val) => sum + val.value, 0) / httpRequestDuration.get().values.length;
  if (avgResponseTime > 2) {
    alerts.push({
      type: 'high_response_time',
      message: `Average response time is ${avgResponseTime.toFixed(2)}s, exceeding threshold`,
      severity: 'warning'
    });
  }
  
  // Check error rate
  const totalErrors = errorRate.get().values.reduce((sum, val) => sum + val.value, 0);
  const totalRequests = httpRequestTotal.get().values.reduce((sum, val) => sum + val.value, 0);
  const errorRatePercent = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  
  if (errorRatePercent > 5) {
    alerts.push({
      type: 'high_error_rate',
      message: `Error rate is ${errorRatePercent.toFixed(2)}%, exceeding 5% threshold`,
      severity: 'critical'
    });
  }
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (memoryUsagePercent > 80) {
    alerts.push({
      type: 'high_memory_usage',
      message: `Memory usage is ${memoryUsagePercent.toFixed(2)}%, exceeding 80% threshold`,
      severity: 'warning'
    });
  }
  
  return alerts;
};

// Performance monitoring routes
const performanceRoutes = (app) => {
  app.get('/health', healthCheck);
  app.get('/metrics', metricsEndpoint);
  app.get('/api/performance/dashboard', performanceDashboard);
  
  app.get('/api/performance/alerts', (req, res) => {
    const alerts = checkPerformanceAlerts();
    res.json({ alerts, timestamp: new Date().toISOString() });
  });
};

// Initialize performance monitoring
const initializePerformanceMonitoring = (app, pool) => {
  // Apply monitoring middleware
  performanceMonitoring(app);
  
  // Add performance routes
  performanceRoutes(app);
  
  // Start periodic inventory metrics update
  setInterval(() => {
    updateInventoryMetrics(pool);
  }, 60000); // Update every minute
  
  // Start performance alerts check
  setInterval(() => {
    const alerts = checkPerformanceAlerts();
    if (alerts.length > 0) {
      console.warn('Performance alerts:', alerts);
      // Here you could send alerts to monitoring systems, Slack, email, etc.
    }
  }, 300000); // Check every 5 minutes
  
  console.log('✅ Performance monitoring initialized');
};

module.exports = {
  performanceMonitoring,
  monitorDatabaseQuery,
  monitorAIOperation,
  trackOrderOperation,
  updateInventoryMetrics,
  initializePerformanceMonitoring,
  register
};
