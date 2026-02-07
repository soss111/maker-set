/**
 * Smart Error Handling Service
 * Provides intelligent error handling, retry logic, and error recovery
 */

const { performance } = require('perf_hooks');

class ErrorHandler {
  constructor() {
    this.errorStats = new Map();
    this.circuitBreakers = new Map();
    this.retryPolicies = new Map();
    this.errorThresholds = {
      database: 5, // failures per minute
      api: 10,    // failures per minute
      file: 3     // failures per minute
    };
  }

  /**
   * Execute operation with smart error handling and retry logic
   */
  async executeWithRetry(operation, context = {}, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      retryCondition = this.defaultRetryCondition,
      timeout = 30000,
      circuitBreaker = true
    } = options;

    const operationKey = context.operation || 'unknown';
    const startTime = performance.now();

    // Check circuit breaker
    if (circuitBreaker && this.isCircuitOpen(operationKey)) {
      throw new Error(`Circuit breaker open for operation: ${operationKey}`);
    }

    let lastError;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // Execute with timeout
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          )
        ]);

        // Record success
        this.recordSuccess(operationKey);
        
        const endTime = performance.now();
        console.log(`✅ Operation ${operationKey} succeeded in ${(endTime - startTime).toFixed(2)}ms (attempt ${attempt + 1})`);
        
        return result;

      } catch (error) {
        lastError = error;
        attempt++;
        
        // Record failure
        this.recordFailure(operationKey, error);

        // Check if we should retry
        if (attempt > maxRetries || !retryCondition(error, attempt)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1) + Math.random() * 1000,
          maxDelay
        );

        console.warn(`⚠️ Operation ${operationKey} failed (attempt ${attempt}), retrying in ${delay.toFixed(0)}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    const endTime = performance.now();
    console.error(`❌ Operation ${operationKey} failed after ${attempt} attempts in ${(endTime - startTime).toFixed(2)}ms:`, lastError.message);
    
    throw this.enhanceError(lastError, context, attempt);
  }

  /**
   * Default retry condition
   */
  defaultRetryCondition(error, attempt) {
    // Don't retry on certain error types
    const nonRetryableErrors = [
      'ValidationError',
      'AuthenticationError',
      'AuthorizationError',
      'NotFoundError',
      'CircuitBreakerOpenError'
    ];

    if (nonRetryableErrors.some(type => error.name === type || error.message.includes(type))) {
      return false;
    }

    // Retry on network, timeout, and database errors
    const retryablePatterns = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'timeout',
      'connection',
      'deadlock',
      'lock timeout',
      'temporary failure'
    ];

    return retryablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern) ||
      error.code === pattern
    );
  }

  /**
   * Circuit breaker implementation
   */
  isCircuitOpen(operationKey) {
    const breaker = this.circuitBreakers.get(operationKey);
    if (!breaker) return false;

    const now = Date.now();
    
    // Reset circuit breaker after timeout
    if (now - breaker.lastFailureTime > breaker.timeout) {
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
    }

    return breaker.state === 'OPEN';
  }

  /**
   * Record operation success
   */
  recordSuccess(operationKey) {
    const stats = this.getOrCreateStats(operationKey);
    stats.successCount++;
    stats.lastSuccessTime = Date.now();

    // Reset circuit breaker on success
    const breaker = this.circuitBreakers.get(operationKey);
    if (breaker) {
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
    }
  }

  /**
   * Record operation failure
   */
  recordFailure(operationKey, error) {
    const stats = this.getOrCreateStats(operationKey);
    stats.failureCount++;
    stats.lastFailureTime = Date.now();
    stats.lastError = error.message;

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(operationKey) || {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      timeout: 60000 // 1 minute
    };

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    // Open circuit breaker if threshold exceeded
    const threshold = this.errorThresholds[operationKey] || 5;
    if (breaker.failureCount >= threshold) {
      breaker.state = 'OPEN';
      console.warn(`🔴 Circuit breaker opened for ${operationKey} after ${breaker.failureCount} failures`);
    }

    this.circuitBreakers.set(operationKey, breaker);
  }

  /**
   * Get or create error statistics
   */
  getOrCreateStats(operationKey) {
    if (!this.errorStats.has(operationKey)) {
      this.errorStats.set(operationKey, {
        successCount: 0,
        failureCount: 0,
        lastSuccessTime: 0,
        lastFailureTime: 0,
        lastError: null
      });
    }
    return this.errorStats.get(operationKey);
  }

  /**
   * Enhance error with context and retry information
   */
  enhanceError(error, context, attemptCount) {
    const enhancedError = new Error(error.message);
    enhancedError.name = error.name || 'OperationError';
    enhancedError.originalError = error;
    enhancedError.context = context;
    enhancedError.attemptCount = attemptCount;
    enhancedError.timestamp = new Date().toISOString();
    
    // Add specific error codes for different scenarios
    if (error.message.includes('timeout')) {
      enhancedError.code = 'TIMEOUT_ERROR';
    } else if (error.message.includes('connection')) {
      enhancedError.code = 'CONNECTION_ERROR';
    } else if (error.message.includes('database')) {
      enhancedError.code = 'DATABASE_ERROR';
    } else if (error.message.includes('validation')) {
      enhancedError.code = 'VALIDATION_ERROR';
    } else {
      enhancedError.code = 'UNKNOWN_ERROR';
    }

    return enhancedError;
  }

  /**
   * Handle database errors specifically
   */
  async handleDatabaseError(operation, context = {}) {
    return this.executeWithRetry(operation, context, {
      maxRetries: 3,
      baseDelay: 500,
      timeout: 15000,
      retryCondition: (error) => {
        const dbErrorPatterns = [
          'connection',
          'timeout',
          'deadlock',
          'lock timeout',
          'temporary failure',
          'ECONNRESET',
          'ECONNREFUSED'
        ];
        
        return dbErrorPatterns.some(pattern => 
          error.message.toLowerCase().includes(pattern)
        );
      }
    });
  }

  /**
   * Handle API errors specifically
   */
  async handleApiError(operation, context = {}) {
    return this.executeWithRetry(operation, context, {
      maxRetries: 2,
      baseDelay: 1000,
      timeout: 10000,
      retryCondition: (error) => {
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          return false;
        }
        
        // Retry on server errors (5xx) and network errors
        return error.response?.status >= 500 || 
               error.code === 'ECONNRESET' ||
               error.code === 'ETIMEDOUT' ||
               error.message.includes('timeout');
      }
    });
  }

  /**
   * Handle file operations
   */
  async handleFileError(operation, context = {}) {
    return this.executeWithRetry(operation, context, {
      maxRetries: 2,
      baseDelay: 2000,
      timeout: 30000,
      retryCondition: (error) => {
        const fileErrorPatterns = [
          'EBUSY',
          'EMFILE',
          'ENFILE',
          'EAGAIN',
          'temporary failure'
        ];
        
        return fileErrorPatterns.some(pattern => 
          error.code === pattern || error.message.includes(pattern)
        );
      }
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {};
    for (const [key, value] of this.errorStats.entries()) {
      const total = value.successCount + value.failureCount;
      stats[key] = {
        ...value,
        totalOperations: total,
        successRate: total > 0 ? (value.successCount / total) * 100 : 0,
        circuitBreakerState: this.circuitBreakers.get(key)?.state || 'CLOSED'
      };
    }
    return stats;
  }

  /**
   * Reset circuit breaker for an operation
   */
  resetCircuitBreaker(operationKey) {
    const breaker = this.circuitBreakers.get(operationKey);
    if (breaker) {
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
      console.log(`🟢 Circuit breaker reset for ${operationKey}`);
    }
  }

  /**
   * Clear all error statistics
   */
  clearStats() {
    this.errorStats.clear();
    this.circuitBreakers.clear();
    console.log('🧹 Error statistics cleared');
  }

  /**
   * Health check for error handling system
   */
  getHealthStatus() {
    const stats = this.getErrorStats();
    const unhealthyOperations = Object.entries(stats)
      .filter(([_, stat]) => stat.successRate < 50)
      .map(([key, _]) => key);

    return {
      status: unhealthyOperations.length === 0 ? 'healthy' : 'degraded',
      unhealthyOperations,
      totalOperations: Object.keys(stats).length,
      circuitBreakersOpen: Object.values(stats).filter(s => s.circuitBreakerState === 'OPEN').length
    };
  }
}

module.exports = new ErrorHandler();
