/**
 * Database Query Optimizer Service
 * Provides optimized database queries with caching, indexing, and performance monitoring
 */

const pool = require('../models/database');
const { performance } = require('perf_hooks');

class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    this.maxCacheSize = 1000;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Execute optimized query with caching and performance monitoring
   */
  async executeQuery(queryKey, query, params = [], options = {}) {
    const {
      useCache = true,
      cacheTTL = this.cacheTTL,
      timeout = 30000,
      retries = 2
    } = options;

    // Check cache first
    if (useCache && this.queryCache.has(queryKey)) {
      const cached = this.queryCache.get(queryKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        this.cacheStats.hits++;
        return cached.data;
      } else {
        this.queryCache.delete(queryKey);
        this.cacheStats.evictions++;
      }
    }

    this.cacheStats.misses++;

    // Execute query with retry logic
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = performance.now();
        
        const result = await Promise.race([
          pool.query(query, params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          )
        ]);

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // Log slow queries
        if (executionTime > 1000) {
          console.warn(`🐌 Slow query detected (${executionTime.toFixed(2)}ms):`, queryKey);
        }

        // Cache successful results
        if (useCache && result.rows) {
          this.cacheResult(queryKey, result.rows, cacheTTL);
        }

        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Query attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError;
  }

  /**
   * Cache query result
   */
  cacheResult(key, data, ttl) {
    // Evict oldest entries if cache is full
    if (this.queryCache.size >= this.maxCacheSize) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
      this.cacheStats.evictions++;
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Optimized query builders for common patterns
   */
  buildPaginatedQuery(baseQuery, filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    // Build WHERE conditions
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        paramCount++;
        whereConditions.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Add pagination
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const query = `
      ${baseQuery}
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    return { query, params };
  }

  /**
   * Build count query for pagination
   */
  buildCountQuery(baseTable, filters = {}) {
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        paramCount++;
        whereConditions.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    });

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    return {
      query: `SELECT COUNT(*) as total FROM ${baseTable} ${whereClause}`,
      params
    };
  }

  /**
   * Optimized translation queries
   */
  async getTranslations(entityType, entityId, language = 'en') {
    const queryKey = `translations_${entityType}_${entityId}_${language}`;
    
    const query = `
      SELECT 
        t.*,
        l.language_code
      FROM ${entityType}_translations t
      JOIN languages l ON t.language_id = l.language_id
      WHERE t.${entityType}_id = $1
      ORDER BY 
        CASE WHEN l.language_code = $2 THEN 0 ELSE 1 END,
        l.language_code
    `;

    return this.executeQuery(queryKey, query, [entityId, language]);
  }

  /**
   * Optimized search with full-text search
   */
  async searchEntities(entityType, searchTerm, language = 'en', options = {}) {
    const { limit = 20, offset = 0 } = options;
    const queryKey = `search_${entityType}_${searchTerm}_${language}_${limit}_${offset}`;

    // Use PostgreSQL full-text search for better performance
    const query = `
      SELECT 
        e.*,
        COALESCE(t.name, t.tool_name, t.part_name, 'Unnamed') as display_name,
        COALESCE(t.description, '') as description,
        l.language_code,
        ts_rank(
          to_tsvector('english', COALESCE(t.name, t.tool_name, t.part_name, '') || ' ' || COALESCE(t.description, '')),
          plainto_tsquery('english', $1)
        ) as rank
      FROM ${entityType}s e
      LEFT JOIN ${entityType}_translations t ON e.${entityType}_id = t.${entityType}_id
      LEFT JOIN languages l ON t.language_id = l.language_id
      WHERE 
        l.language_code = $2
        AND to_tsvector('english', COALESCE(t.name, t.tool_name, t.part_name, '') || ' ' || COALESCE(t.description, ''))
        @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, e.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    return this.executeQuery(queryKey, query, [searchTerm, language, limit, offset]);
  }

  /**
   * Batch operations for better performance
   */
  async batchInsert(table, columns, values) {
    if (values.length === 0) return { rowCount: 0 };

    const placeholders = values.map((_, rowIndex) => 
      `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders}
      RETURNING *
    `;

    const flatValues = values.flat();
    return pool.query(query, flatValues);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      size: this.queryCache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.queryCache.clear();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Analyze query performance
   */
  async analyzeQuery(query) {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const result = await pool.query(explainQuery);
    return result.rows[0]['QUERY PLAN'][0];
  }
}

module.exports = new QueryOptimizer();
