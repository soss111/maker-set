/**
 * Global Error Handling Middleware
 * Provides comprehensive error handling for all routes
 */

const errorHandler = require('../services/errorHandler');
const apiResponseService = require('../services/apiResponseService');
const performanceMonitor = require('../services/performanceMonitor');

/**
 * Global error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  const startTime = Date.now();
  
  // Log error details
  console.error('🚨 Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Determine error type and status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let userMessage = 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    userMessage = 'Invalid input data';
  } else if (err.name === 'AuthenticationError') {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_ERROR';
    userMessage = 'Authentication required';
  } else if (err.name === 'AuthorizationError') {
    statusCode = 403;
    errorCode = 'AUTHORIZATION_ERROR';
    userMessage = 'Insufficient permissions';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    userMessage = 'Resource not found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    errorCode = 'CONFLICT_ERROR';
    userMessage = 'Resource conflict';
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    userMessage = 'Too many requests';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    userMessage = 'Service temporarily unavailable';
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    errorCode = 'TIMEOUT_ERROR';
    userMessage = 'Request timeout';
  }

  // Handle database errors
  if (err.message && err.message.includes('database')) {
    statusCode = 503;
    errorCode = 'DATABASE_ERROR';
    userMessage = 'Database service unavailable';
  }

  // Handle file system errors
  if (err.code && ['ENOENT', 'EACCES', 'EMFILE', 'ENFILE'].includes(err.code)) {
    statusCode = 500;
    errorCode = 'FILE_SYSTEM_ERROR';
    userMessage = 'File system error';
  }

  // Record error in performance monitor
  performanceMonitor.recordError(req.url, err.message, statusCode);

  // Prepare error response
  const errorResponse = {
    error: {
      code: errorCode,
      message: userMessage,
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  };

  // Add detailed error information in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      originalMessage: err.message,
      stack: err.stack,
      context: err.context || null
    };
  }

  // Add retry information if available
  if (err.attemptCount) {
    errorResponse.error.retryInfo = {
      attempts: err.attemptCount,
      lastAttempt: true
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  const errorResponse = apiResponseService.error(
    'Route not found',
    `The requested route ${req.method} ${req.url} does not exist`
  );
  
  res.status(404).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request validation middleware
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        validationError.details = error.details;
        throw validationError;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Rate limiting error handler
 */
const rateLimitHandler = (req, res) => {
  const errorResponse = apiResponseService.error(
    'Rate limit exceeded',
    'Too many requests from this IP, please try again later'
  );
  
  res.status(429).json(errorResponse);
};

/**
 * Database connection error handler
 */
const databaseErrorHandler = (err, req, res, next) => {
  if (err.code && ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(err.code)) {
    const errorResponse = apiResponseService.error(
      'Database connection error',
      'Unable to connect to database, please try again later'
    );
    
    return res.status(503).json(errorResponse);
  }
  
  next(err);
};

/**
 * CORS error handler
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    const errorResponse = apiResponseService.error(
      'CORS error',
      'Cross-origin request blocked'
    );
    
    return res.status(403).json(errorResponse);
  }
  
  next(err);
};

/**
 * File upload error handler
 */
const fileUploadErrorHandler = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    const errorResponse = apiResponseService.error(
      'File too large',
      'The uploaded file exceeds the maximum allowed size'
    );
    
    return res.status(413).json(errorResponse);
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    const errorResponse = apiResponseService.error(
      'Too many files',
      'The number of uploaded files exceeds the maximum allowed count'
    );
    
    return res.status(413).json(errorResponse);
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const errorResponse = apiResponseService.error(
      'Unexpected file field',
      'The uploaded file field name is not expected'
    );
    
    return res.status(400).json(errorResponse);
  }
  
  next(err);
};

/**
 * JWT error handler
 */
const jwtErrorHandler = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    const errorResponse = apiResponseService.error(
      'Invalid token',
      'The provided authentication token is invalid'
    );
    
    return res.status(401).json(errorResponse);
  }
  
  if (err.name === 'TokenExpiredError') {
    const errorResponse = apiResponseService.error(
      'Token expired',
      'The authentication token has expired'
    );
    
    return res.status(401).json(errorResponse);
  }
  
  next(err);
};

module.exports = {
  errorMiddleware,
  notFoundHandler,
  asyncHandler,
  validateRequest,
  rateLimitHandler,
  databaseErrorHandler,
  corsErrorHandler,
  fileUploadErrorHandler,
  jwtErrorHandler
};
