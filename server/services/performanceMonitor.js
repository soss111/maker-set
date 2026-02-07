/**
 * Performance Monitoring Service
 * 
 * Tracks performance metrics, identifies bottlenecks,
 * and provides optimization recommendations
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      slowQuery: 1000, // 1 second
      slowApi: 2000,   // 2 seconds
      highMemory: 100 * 1024 * 1024, // 100MB
      highCpu: 80 // 80%
    };
    
    this.startTime = Date.now();
    this.uptime = 0;
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Track API endpoint performance
   */
  trackApiCall(endpoint, method, duration, statusCode, memoryUsage = 0) {
    const key = `${method}:${endpoint}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errorCount: 0,
        memoryUsage: 0,
        slowCalls: 0,
        lastCalled: null
      });
    }
    
    const metric = this.metrics.get(key);
    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.memoryUsage += memoryUsage;
    metric.lastCalled = new Date();
    
    if (duration > this.thresholds.slowApi) {
      metric.slowCalls++;
    }
    
    if (statusCode >= 400) {
      metric.errorCount++;
    }
    
    // Log slow API calls
    if (duration > this.thresholds.slowApi) {
      console.warn(`🐌 Slow API call: ${key} took ${duration}ms`);
    }
  }

  /**
   * Track database query performance
   */
  trackQuery(query, duration, rowCount = 0) {
    const key = `query:${query.substring(0, 50)}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        totalRows: 0,
        avgRows: 0,
        slowQueries: 0,
        lastExecuted: null
      });
    }
    
    const metric = this.metrics.get(key);
    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.totalRows += rowCount;
    metric.avgRows = metric.totalRows / metric.count;
    metric.lastExecuted = new Date();
    
    if (duration > this.thresholds.slowQuery) {
      metric.slowQueries++;
      console.warn(`🐌 Slow query detected: ${query.substring(0, 100)} (${duration}ms)`);
    }
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage() {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const externalMemory = usage.external;
    
    if (usedMemory > this.thresholds.highMemory) {
      console.warn(`⚠️ High memory usage: ${Math.round(usedMemory / 1024 / 1024)}MB`);
    }
    
    return {
      heapTotal: totalMemory,
      heapUsed: usedMemory,
      external: externalMemory,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const apiMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.includes(':'))
      .map(([key, metric]) => ({
        endpoint: key,
        ...metric,
        errorRate: metric.errorCount / metric.count * 100,
        slowCallRate: metric.slowCalls / metric.count * 100
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);

    const queryMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('query:'))
      .map(([key, metric]) => ({
        query: key.replace('query:', ''),
        ...metric,
        slowQueryRate: metric.slowQueries / metric.count * 100
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);

    const memoryUsage = this.trackMemoryUsage();
    
    return {
      uptime: Date.now() - this.startTime,
      memory: memoryUsage,
      api: {
        totalEndpoints: apiMetrics.length,
        slowEndpoints: apiMetrics.filter(m => m.avgDuration > this.thresholds.slowApi),
        errorEndpoints: apiMetrics.filter(m => m.errorRate > 5),
        topSlowest: apiMetrics.slice(0, 10)
      },
      database: {
        totalQueries: queryMetrics.length,
        slowQueries: queryMetrics.filter(m => m.avgDuration > this.thresholds.slowQuery),
        topSlowest: queryMetrics.slice(0, 10)
      },
      recommendations: this.generateRecommendations(apiMetrics, queryMetrics)
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(apiMetrics, queryMetrics) {
    const recommendations = [];
    
    // API recommendations
    const slowApis = apiMetrics.filter(m => m.avgDuration > this.thresholds.slowApi);
    if (slowApis.length > 0) {
      recommendations.push({
        type: 'api',
        priority: 'high',
        message: `${slowApis.length} API endpoints are slow (>${this.thresholds.slowApi}ms)`,
        suggestions: [
          'Add caching to frequently accessed endpoints',
          'Optimize database queries',
          'Consider pagination for large datasets',
          'Implement request batching'
        ]
      });
    }
    
    // Query recommendations
    const slowQueries = queryMetrics.filter(m => m.avgDuration > this.thresholds.slowQuery);
    if (slowQueries.length > 0) {
      recommendations.push({
        type: 'database',
        priority: 'high',
        message: `${slowQueries.length} database queries are slow (>${this.thresholds.slowQuery}ms)`,
        suggestions: [
          'Add database indexes',
          'Optimize query structure',
          'Consider query result caching',
          'Review JOIN operations'
        ]
      });
    }
    
    // Memory recommendations
    const memoryUsage = this.trackMemoryUsage();
    if (memoryUsage.heapUsed > this.thresholds.highMemory) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'High memory usage detected',
        suggestions: [
          'Review memory leaks',
          'Implement garbage collection optimization',
          'Consider memory pooling',
          'Monitor object creation patterns'
        ]
      });
    }
    
    // Error rate recommendations
    const highErrorApis = apiMetrics.filter(m => m.errorRate > 5);
    if (highErrorApis.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `${highErrorApis.length} API endpoints have high error rates`,
        suggestions: [
          'Improve error handling',
          'Add input validation',
          'Implement retry mechanisms',
          'Review error logging'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    // Monitor memory every 30 seconds
    setInterval(() => {
      this.trackMemoryUsage();
    }, 30000);
    
    // Log performance summary every 5 minutes
    setInterval(() => {
      const summary = this.getPerformanceSummary();
      if (summary.recommendations.length > 0) {
        console.log('📊 Performance Summary:', {
          uptime: Math.round(summary.uptime / 1000 / 60) + ' minutes',
          memory: Math.round(summary.memory.heapUsed / 1024 / 1024) + 'MB',
          slowApis: summary.api.slowEndpoints.length,
          slowQueries: summary.database.slowQueries.length,
          recommendations: summary.recommendations.length
        });
      }
    }, 300000); // 5 minutes
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.clear();
    this.startTime = Date.now();
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      metrics: Object.fromEntries(this.metrics),
      summary: this.getPerformanceSummary()
    };
  }
}

// Export singleton instance
module.exports = new PerformanceMonitor();
