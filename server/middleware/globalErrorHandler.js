/**
 * Global Error Handler Middleware
 * 
 * Handles all unhandled errors gracefully
 * Provides consistent error responses
 * Logs errors for monitoring
 */

const globalErrorHandler = (err, req, res, next) => {
  console.error('🚨 Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Default error response
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource Not Found';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service Unavailable';
    details = 'Database connection failed';
  } else if (err.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Service Unavailable';
    details = 'External service unavailable';
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Gateway Timeout';
    details = 'Request timeout';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
    details = null;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      details,
      timestamp: new Date().toISOString(),
      requestId: req.id || Math.random().toString(36).substr(2, 9),
    },
  });
};

module.exports = globalErrorHandler;
