/**
 * Optimized Tools Route with Advanced Query Optimization
 * Uses query optimizer, caching, and performance monitoring
 */

const express = require('express');
const router = express.Router();
const queryOptimizer = require('../services/queryOptimizer');
const apiResponseService = require('../services/apiResponseService');
const performanceMonitor = require('../services/performanceMonitor');

// Get all tools with advanced optimization
router.get('/', async (req, res) => {
  const startTime = performance.now();
  
  try {
    const {
      language = 'en',
      category,
      tool_type,
      condition_status,
      page = 1,
      limit = 20,
      search,
      sort_by = 'tool_number',
      sort_order = 'ASC'
    } = req.query;

    // Build optimized query with proper indexing
    const baseQuery = `
      SELECT 
        t.tool_id,
        t.tool_number,
        t.category,
        t.tool_type,
        t.condition_status,
        t.location,
        t.purchase_date,
        t.last_maintenance_date,
        t.next_maintenance_date,
        t.notes,
        t.image_url,
        t.created_at,
        t.updated_at,
        COALESCE(tt.tool_name, 'Unnamed Tool') as tool_name,
        COALESCE(tt.description, '') as description,
        COALESCE(tt.safety_instructions, '') as safety_instructions,
        l.language_code,
        -- Maintenance status calculation
        CASE 
          WHEN t.next_maintenance_date IS NULL THEN 'unknown'
          WHEN t.next_maintenance_date < CURRENT_DATE THEN 'overdue'
          WHEN t.next_maintenance_date IS NOT NULL THEN 'due_soon'
          ELSE 'current'
        END as maintenance_status,
        -- Age calculation
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.purchase_date)) as age_years
      FROM tools t
      LEFT JOIN tool_translations tt ON t.tool_id = tt.tool_id
      LEFT JOIN languages l ON tt.language_id = l.language_id
    `;

    // Build filters
    const filters = {};
    if (category) filters['t.category'] = category;
    if (tool_type) filters['t.tool_type'] = tool_type;
    if (condition_status) filters['t.condition_status'] = condition_status;

    // Handle search with full-text search
    let searchClause = '';
    let searchParams = [];
    if (search) {
      searchClause = `
        AND (
          t.tool_number ILIKE $${Object.keys(filters).length + 1}
          OR tt.tool_name ILIKE $${Object.keys(filters).length + 1}
          OR tt.description ILIKE $${Object.keys(filters).length + 1}
        )
      `;
      searchParams = [`%${search}%`];
    }

    // Build paginated query
    const { query, params } = queryOptimizer.buildPaginatedQuery(
      baseQuery + ` WHERE l.language_code = $${Object.keys(filters).length + searchParams.length + 1}` + searchClause,
      filters,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: `t.${sort_by}`,
        sortOrder: sort_order.toUpperCase()
      }
    );

    // Add language and search parameters
    const allParams = [...params.slice(0, -2), language, ...searchParams, ...params.slice(-2)];

    // Execute optimized query
    const queryKey = `tools_${language}_${JSON.stringify(filters)}_${search}_${page}_${limit}_${sort_by}_${sort_order}`;
    const result = await queryOptimizer.executeQuery(queryKey, query, allParams, {
      useCache: true,
      cacheTTL: 2 * 60 * 1000 // 2 minutes cache for tools
    });

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT t.tool_id) as total
      FROM tools t
      LEFT JOIN tool_translations tt ON t.tool_id = tt.tool_id
      LEFT JOIN languages l ON tt.language_id = l.language_id
      WHERE l.language_code = $1
      ${searchClause}
    `;
    
    const countParams = [language, ...searchParams];
    const countResult = await queryOptimizer.executeQuery(
      `tools_count_${language}_${search}`,
      countQuery,
      countParams,
      { useCache: true, cacheTTL: 5 * 60 * 1000 }
    );

    // Group tools by tool_id and consolidate translations
    const groupedTools = {};
    result.rows.forEach(row => {
      if (!groupedTools[row.tool_id]) {
        groupedTools[row.tool_id] = {
          tool_id: row.tool_id,
          tool_number: row.tool_number,
          category: row.category,
          tool_type: row.tool_type,
          condition_status: row.condition_status,
          location: row.location,
          purchase_date: row.purchase_date,
          last_maintenance_date: row.last_maintenance_date,
          next_maintenance_date: row.next_maintenance_date,
          notes: row.notes,
          image_url: row.image_url,
          created_at: row.created_at,
          updated_at: row.updated_at,
          maintenance_status: row.maintenance_status,
          age_years: row.age_years,
          translations: {}
        };
      }
      
      if (row.language_code) {
        groupedTools[row.tool_id].translations[row.language_code] = {
          tool_name: row.tool_name,
          description: row.description,
          safety_instructions: row.safety_instructions
        };
      }
    });

    const tools = Object.values(groupedTools);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Performance monitoring
    const endTime = performance.now();
    performanceMonitor.recordOperation('tools_list', endTime - startTime, {
      resultCount: tools.length,
      totalCount: total,
      cacheHit: result.fromCache || false
    });

    // Return optimized response
    res.json(apiResponseService.success({
      tools,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      performance: {
        executionTime: `${(endTime - startTime).toFixed(2)}ms`,
        cacheStats: queryOptimizer.getCacheStats()
      }
    }, 'Tools retrieved successfully'));

  } catch (error) {
    console.error('Error in optimized tools route:', error);
    res.status(500).json(apiResponseService.error('Failed to retrieve tools', error.message));
  }
});

// Get single tool with optimized query
router.get('/:id', async (req, res) => {
  const startTime = performance.now();
  
  try {
    const { id } = req.params;
    const { language = 'en' } = req.query;

    const queryKey = `tool_${id}_${language}`;
    const query = `
      SELECT 
        t.*,
        COALESCE(tt.tool_name, 'Unnamed Tool') as tool_name,
        COALESCE(tt.description, '') as description,
        COALESCE(tt.safety_instructions, '') as safety_instructions,
        l.language_code,
        -- Maintenance status
        CASE 
          WHEN t.next_maintenance_date IS NULL THEN 'unknown'
          WHEN t.next_maintenance_date < CURRENT_DATE THEN 'overdue'
          WHEN t.next_maintenance_date IS NOT NULL THEN 'due_soon'
          ELSE 'current'
        END as maintenance_status,
        -- Age calculation
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.purchase_date)) as age_years
      FROM tools t
      LEFT JOIN tool_translations tt ON t.tool_id = tt.tool_id
      LEFT JOIN languages l ON tt.language_id = l.language_id
      WHERE t.tool_id = $1 AND l.language_code = $2
    `;

    const result = await queryOptimizer.executeQuery(queryKey, query, [id, language], {
      useCache: true,
      cacheTTL: 10 * 60 * 1000 // 10 minutes cache for single tool
    });

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponseService.error('Tool not found'));
    }

    const tool = result.rows[0];
    
    // Get all translations for this tool
    const translations = await queryOptimizer.getTranslations('tool', id);
    tool.translations = {};
    translations.rows.forEach(translation => {
      tool.translations[translation.language_code] = {
        tool_name: translation.tool_name,
        description: translation.description,
        safety_instructions: translation.safety_instructions
      };
    });

    const endTime = performance.now();
    performanceMonitor.recordOperation('tool_get', endTime - startTime, {
      toolId: id,
      cacheHit: result.fromCache || false
    });

    res.json(apiResponseService.success(tool, 'Tool retrieved successfully'));

  } catch (error) {
    console.error('Error in optimized tool get route:', error);
    res.status(500).json(apiResponseService.error('Failed to retrieve tool', error.message));
  }
});

// Search tools with full-text search
router.get('/search/:term', async (req, res) => {
  const startTime = performance.now();
  
  try {
    const { term } = req.params;
    const { language = 'en', limit = 20, offset = 0 } = req.query;

    const results = await queryOptimizer.searchEntities('tool', term, language, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const endTime = performance.now();
    performanceMonitor.recordOperation('tools_search', endTime - startTime, {
      searchTerm: term,
      resultCount: results.rows.length
    });

    res.json(apiResponseService.success(results.rows, 'Search completed successfully'));

  } catch (error) {
    console.error('Error in tools search:', error);
    res.status(500).json(apiResponseService.error('Search failed', error.message));
  }
});

// Get cache statistics
router.get('/stats/cache', async (req, res) => {
  try {
    const stats = queryOptimizer.getCacheStats();
    res.json(apiResponseService.success(stats, 'Cache statistics retrieved'));
  } catch (error) {
    res.status(500).json(apiResponseService.error('Failed to get cache stats', error.message));
  }
});

// Clear cache
router.post('/stats/cache/clear', async (req, res) => {
  try {
    queryOptimizer.clearCache();
    res.json(apiResponseService.success(null, 'Cache cleared successfully'));
  } catch (error) {
    res.status(500).json(apiResponseService.error('Failed to clear cache', error.message));
  }
});

module.exports = router;
