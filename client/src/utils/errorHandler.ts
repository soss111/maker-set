/**
 * Enhanced Error Handling System
 * Provides consistent, user-friendly error handling across the application
 */

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorStats = new Map<string, { count: number; lastOccurred: Date }>();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  handleApiError(error: any, context: string = 'Unknown'): { message: string; code: string; details?: any } {
    console.error(`🚨 API Error [${context}]:`, error);

    // Track error statistics
    this.trackError(context, error);

    // Network errors
    if (!error.response) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          message: 'Unable to connect to server. Please check your internet connection.',
          code: 'NETWORK_ERROR',
          details: { context, timestamp: new Date().toISOString() }
        };
      }
      if (error.code === 'ETIMEDOUT') {
        return {
          message: 'Request timed out. Please try again.',
          code: 'TIMEOUT_ERROR',
          details: { context, timestamp: new Date().toISOString() }
        };
      }
      return {
        message: 'Network error occurred. Please try again.',
        code: 'NETWORK_ERROR',
        details: { context, timestamp: new Date().toISOString() }
      };
    }

    const status = error.response.status;
    const data = error.response.data;

    // HTTP status code handling
    switch (status) {
      case 400:
        return {
          message: data?.error || 'Invalid request. Please check your input.',
          code: 'BAD_REQUEST',
          details: data
        };
      case 401:
        return {
          message: 'You need to log in to access this feature.',
          code: 'UNAUTHORIZED',
          details: { context, timestamp: new Date().toISOString() }
        };
      case 403:
        return {
          message: 'You don\'t have permission to perform this action.',
          code: 'FORBIDDEN',
          details: { context, timestamp: new Date().toISOString() }
        };
      case 404:
        return {
          message: 'The requested resource was not found.',
          code: 'NOT_FOUND',
          details: { context, timestamp: new Date().toISOString() }
        };
      case 409:
        return {
          message: 'This resource already exists or conflicts with existing data.',
          code: 'CONFLICT',
          details: data
        };
      case 422:
        return {
          message: 'Please check your input and try again.',
          code: 'VALIDATION_ERROR',
          details: data?.errors || data
        };
      case 429:
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMIT',
          details: { context, timestamp: new Date().toISOString() }
        };
      case 500:
        return {
          message: 'Server error occurred. Please try again later.',
          code: 'SERVER_ERROR',
          details: { context, timestamp: new Date().toISOString() }
        };
      case 503:
        return {
          message: 'Service temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE',
          details: { context, timestamp: new Date().toISOString() }
        };
      default:
        return {
          message: data?.error || 'An unexpected error occurred.',
          code: 'UNKNOWN_ERROR',
          details: { status, context, timestamp: new Date().toISOString() }
        };
    }
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors: any): { message: string; code: string; details: any } {
    const errorMessages = Array.isArray(errors) 
      ? errors.map(err => err.message || err).join(', ')
      : typeof errors === 'object' 
        ? Object.values(errors).join(', ')
        : errors;

    return {
      message: `Please fix the following issues: ${errorMessages}`,
      code: 'VALIDATION_ERROR',
      details: errors
    };
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(error: any, operation: string): { message: string; code: string; details?: any } {
    console.error(`🗄️ Database Error [${operation}]:`, error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return {
        message: 'This item already exists. Please use a different name or identifier.',
        code: 'DUPLICATE_ENTRY',
        details: { operation, timestamp: new Date().toISOString() }
      };
    }

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return {
        message: 'Cannot perform this action because related data exists.',
        code: 'FOREIGN_KEY_CONSTRAINT',
        details: { operation, timestamp: new Date().toISOString() }
      };
    }

    if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
      return {
        message: 'Required fields are missing. Please fill in all required information.',
        code: 'MISSING_REQUIRED_FIELD',
        details: { operation, timestamp: new Date().toISOString() }
      };
    }

    return {
      message: 'Database operation failed. Please try again.',
      code: 'DATABASE_ERROR',
      details: { operation, timestamp: new Date().toISOString() }
    };
  }

  /**
   * Track error statistics for monitoring
   */
  private trackError(context: string, error: any): void {
    const key = `${context}:${error.code || error.status || 'unknown'}`;
    const existing = this.errorStats.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastOccurred = new Date();
    } else {
      this.errorStats.set(key, {
        count: 1,
        lastOccurred: new Date()
      });
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): Array<{ context: string; count: number; lastOccurred: Date }> {
    return Array.from(this.errorStats.entries()).map(([key, stats]) => ({
      context: key,
      count: stats.count,
      lastOccurred: stats.lastOccurred
    }));
  }

  /**
   * Clear error statistics
   */
  clearErrorStats(): void {
    this.errorStats.clear();
  }
}

export default ErrorHandler.getInstance();

