/**
 * Smart Caching System for API Performance
 * Provides intelligent caching with automatic invalidation
 */

class CacheManager {
  static instance = null;
  cache = new Map();
  defaultTTL = 5 * 60 * 1000; // 5 minutes

  static getInstance() {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Set cache entry
   */
  set(key, data, ttl) {
    const expirationTime = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: expirationTime
    });
  }

  /**
   * Get cache entry
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl - Date.now()
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${prefix}:${sortedParams}`;
  }
}

/**
 * Database Query Optimizer
 * Provides optimized database queries with caching
 */
class QueryOptimizer {
  static instance = null;
  cache = null;

  constructor() {
    this.cache = CacheManager.getInstance();
  }

  static getInstance() {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * Execute query with caching
   */
  async executeQuery(db, queryKey, query, params = [], options = {}) {
    const { ttl = 5 * 60 * 1000, useCache = true } = options;
    
    // Generate cache key
    const cacheKey = this.cache.generateKey(queryKey, { query, params: params.join(',') });
    
    // Try to get from cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit for ${queryKey}`);
        return cached;
      }
    }

    // Execute query
    console.log(`🔍 Executing query: ${queryKey}`);
    const startTime = Date.now();
    
    try {
      const result = await new Promise((resolve, reject) => {
        db.all(query, params, (err: any, rows: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Query ${queryKey} completed in ${duration}ms`);

      // Cache the result
      if (useCache) {
        this.cache.set(cacheKey, result, ttl);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Query ${queryKey} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern) {
    const stats = this.cache.getStats();
    for (const entry of stats.entries) {
      if (entry.key.includes(pattern)) {
        this.cache.delete(entry.key);
      }
    }
  }

  /**
   * Get query performance stats
   */
  getPerformanceStats() {
    return this.cache.getStats();
  }
}

module.exports = {
  CacheManager: CacheManager.getInstance(),
  QueryOptimizer: QueryOptimizer.getInstance()
};

