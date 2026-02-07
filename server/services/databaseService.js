/**
 * Shared Database Service
 * 
 * Centralized database operations with caching, connection pooling,
 * and optimized query patterns
 */

const { Pool } = require('pg');
const NodeCache = require('node-cache');

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'makerset_db',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Cache for frequently accessed data
    this.cache = new NodeCache({ 
      stdTTL: 300, // 5 minutes default
      checkperiod: 60, // Check for expired keys every minute
      useClones: false // Better performance
    });

    // Query performance monitoring
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second

    this.pool.on('connect', () => {
      console.log('✅ Database connected');
    });

    this.pool.on('error', (err) => {
      console.error('❌ Database error:', err);
    });
  }

  /**
   * Execute query with caching and performance monitoring
   */
  async query(text, params = [], options = {}) {
    const startTime = Date.now();
    const cacheKey = options.cacheKey || this.generateCacheKey(text, params);
    const useCache = options.useCache !== false;
    const ttl = options.ttl || 300; // 5 minutes default

    // Check cache first
    if (useCache && !options.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`📦 Cache hit for query: ${text.substring(0, 50)}...`);
        return cached;
      }
    }

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`🐌 Slow query detected (${duration}ms):`, text.substring(0, 100));
      }

      // Update query stats
      this.updateQueryStats(text, duration);

      // Cache successful results
      if (useCache && result.rows.length > 0) {
        this.cache.set(cacheKey, result, ttl);
        console.log(`💾 Cached query result: ${text.substring(0, 50)}...`);
      }

      return result;
    } catch (error) {
      console.error('❌ Query error:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch insert with optimized performance
   */
  async batchInsert(table, columns, values, batchSize = 1000) {
    if (values.length === 0) return { rowCount: 0 };

    const results = [];
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const placeholders = batch.map((_, batchIndex) => {
        const startIndex = i + batchIndex;
        return `(${columns.map((_, colIndex) => 
          `$${startIndex * columns.length + colIndex + 1}`
        ).join(', ')})`;
      }).join(', ');

      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
      const params = batch.flat();
      
      const result = await this.query(query, params, { useCache: false });
      results.push(result);
    }

    return {
      rowCount: results.reduce((sum, r) => sum + r.rowCount, 0)
    };
  }

  /**
   * Get paginated results with optimized counting
   */
  async getPaginatedResults(baseQuery, countQuery, params = [], options = {}) {
    const {
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    
    // Execute count and data queries in parallel
    const [countResult, dataResult] = await Promise.all([
      this.query(countQuery, params, { useCache: true, ttl: 60 }),
      this.query(
        `${baseQuery} ORDER BY ${orderBy} ${orderDirection} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
        { useCache: true, ttl: 300 }
      )
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    };
  }

  /**
   * Build dynamic WHERE clause with parameterized queries
   */
  buildWhereClause(filters, allowedFields = []) {
    const conditions = [];
    const params = [];
    let paramCount = 0;

    for (const [field, value] of Object.entries(filters)) {
      if (allowedFields.length > 0 && !allowedFields.includes(field)) continue;
      if (value === null || value === undefined || value === '') continue;

      paramCount++;
      if (Array.isArray(value)) {
        conditions.push(`${field} = ANY($${paramCount})`);
        params.push(value);
      } else if (typeof value === 'string' && value.includes('%')) {
        conditions.push(`${field} ILIKE $${paramCount}`);
        params.push(value);
      } else {
        conditions.push(`${field} = $${paramCount}`);
        params.push(value);
      }
    }

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  /**
   * Generate cache key for query
   */
  generateCacheKey(text, params) {
    return `query:${Buffer.from(text + JSON.stringify(params)).toString('base64')}`;
  }

  /**
   * Update query performance statistics
   */
  updateQueryStats(query, duration) {
    const key = query.substring(0, 50);
    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, { count: 0, totalDuration: 0, avgDuration: 0 });
    }
    
    const stats = this.queryStats.get(key);
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
  }

  /**
   * Get query performance statistics
   */
  getQueryStats() {
    return Array.from(this.queryStats.entries()).map(([query, stats]) => ({
      query,
      ...stats
    })).sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Clear cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      const keys = this.cache.keys().filter(key => key.includes(pattern));
      keys.forEach(key => this.cache.del(key));
    } else {
      this.cache.flushAll();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      hitRate: this.cache.getStats().hits / (this.cache.getStats().hits + this.cache.getStats().misses) * 100
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health', [], { useCache: false });
      return {
        status: 'healthy',
        responseTime: result.rows[0].health,
        connections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async close() {
    await this.pool.end();
    this.cache.close();
  }
}

// Export singleton instance
module.exports = new DatabaseService();
