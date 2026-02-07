/**
 * Shared API Response Service
 * 
 * Standardized API responses with consistent error handling,
 * pagination, and performance monitoring
 */

class ApiResponseService {
  constructor() {
    this.responseTimes = new Map();
  }

  /**
   * Standard success response
   */
  success(data, message = 'Success', meta = {}) {
    return {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Standard error response
   */
  error(message, details = null, statusCode = 400) {
    return {
      success: false,
      error: {
        message,
        details,
        statusCode,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Paginated response
   */
  paginated(data, pagination, message = 'Data retrieved successfully') {
    return this.success(data, message, {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1
      }
    });
  }

  /**
   * Validation error response
   */
  validationError(errors, message = 'Validation failed') {
    return this.error(message, { validation: errors }, 422);
  }

  /**
   * Not found response
   */
  notFound(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    return this.error(message, null, 404);
  }

  /**
   * Unauthorized response
   */
  unauthorized(message = 'Unauthorized access') {
    return this.error(message, null, 401);
  }

  /**
   * Forbidden response
   */
  forbidden(message = 'Access forbidden') {
    return this.error(message, null, 403);
  }

  /**
   * Server error response
   */
  serverError(message = 'Internal server error', details = null) {
    return this.error(message, details, 500);
  }

  /**
   * Rate limit response
   */
  rateLimit(message = 'Too many requests') {
    return this.error(message, null, 429);
  }

  /**
   * Async wrapper with error handling
   */
  async handleAsync(handler, req, res, next) {
    const startTime = Date.now();
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    
    try {
      const result = await handler(req, res, next);
      const duration = Date.now() - startTime;
      
      // Track response time
      this.trackResponseTime(endpoint, duration);
      
      // If result is not already a response object, wrap it
      if (!result || typeof result !== 'object' || !result.hasOwnProperty('success')) {
        return res.json(this.success(result));
      }
      
      return res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackResponseTime(endpoint, duration);
      
      console.error(`❌ API Error [${endpoint}]:`, error);
      
      // Handle different error types
      if (error.name === 'ValidationError') {
        return res.status(422).json(this.validationError(error.errors));
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json(this.error('Invalid ID format'));
      }
      
      if (error.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json(this.error('Resource already exists'));
      }
      
      if (error.code === '23503') { // PostgreSQL foreign key violation
        return res.status(400).json(this.error('Referenced resource does not exist'));
      }
      
      // Default server error
      return res.status(500).json(this.serverError(
        process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        process.env.NODE_ENV === 'development' ? error.stack : null
      ));
    }
  }

  /**
   * Track response times for performance monitoring
   */
  trackResponseTime(endpoint, duration) {
    if (!this.responseTimes.has(endpoint)) {
      this.responseTimes.set(endpoint, []);
    }
    
    const times = this.responseTimes.get(endpoint);
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {};
    
    for (const [endpoint, times] of this.responseTimes.entries()) {
      if (times.length === 0) continue;
      
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      
      stats[endpoint] = {
        count: times.length,
        avg: Math.round(avg),
        min,
        max,
        p95,
        slow: avg > 1000 // Flag slow endpoints
      };
    }
    
    return stats;
  }

  /**
   * Middleware for consistent error handling
   */
  errorHandler() {
    return (error, req, res, next) => {
      console.error('❌ Unhandled error:', error);
      
      if (res.headersSent) {
        return next(error);
      }
      
      res.status(500).json(this.serverError(
        process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        process.env.NODE_ENV === 'development' ? error.stack : null
      ));
    };
  }

  /**
   * Middleware for 404 handling
   */
  notFoundHandler() {
    return (req, res) => {
      res.status(404).json(this.notFound('Endpoint', req.path));
    };
  }

  /**
   * Middleware for request logging
   */
  requestLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const method = req.method;
        const url = req.url;
        
        const logLevel = status >= 400 ? '❌' : '✅';
        console.log(`${logLevel} ${method} ${url} ${status} ${duration}ms`);
      });
      
      next();
    };
  }
}

// Export singleton instance
module.exports = new ApiResponseService();
