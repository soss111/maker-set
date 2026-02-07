/**
 * Optimized Tools Route
 * 
 * Using shared services for better performance, caching,
 * and maintainability
 */

const express = require('express');
const router = express.Router();
const crudService = require('../services/crudService');
const apiResponseService = require('../services/apiResponseService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Tools CRUD configuration
const toolsConfig = {
  table: 'tools',
  basePath: '/tools',
  middleware: [authenticateToken, requireAdmin],
  requiredFields: ['tool_number', 'category', 'tool_type', 'condition_status'],
  optionalFields: ['location', 'purchase_date', 'last_maintenance_date', 'next_maintenance_date', 'notes', 'image_url'],
  allowedFields: ['tool_number', 'category', 'tool_type', 'condition_status', 'location', 'purchase_date', 'last_maintenance_date', 'next_maintenance_date', 'notes', 'image_url'],
  sortableFields: ['tool_number', 'category', 'tool_type', 'condition_status', 'created_at', 'updated_at'],
  translations: {
    table: 'tool_translations',
    fields: ['tool_name', 'description', 'safety_instructions']
  },
  joins: [],
  cacheTime: 300000, // 5 minutes
  validation: async (data, id = null) => {
    const errors = [];
    
    // Check for duplicate tool number
    const existingTool = await crudService.databaseService.query(
      'SELECT tool_id FROM tools WHERE tool_number = $1' + (id ? ' AND tool_id != $2' : ''),
      id ? [data.tool_number, id] : [data.tool_number]
    );
    
    if (existingTool.rows.length > 0) {
      errors.push('Tool number already exists');
    }
    
    return errors;
  },
  beforeCreate: async (data) => {
    // Auto-generate tool number if not provided
    if (!data.tool_number) {
      const result = await crudService.databaseService.query(
        'SELECT COALESCE(MAX(CAST(SUBSTRING(tool_number FROM \'[0-9]+$\') AS INTEGER)), 0) + 1 as next_number FROM tools WHERE tool_number ~ \'^[A-Z]+[0-9]+$\''
      );
      data.tool_number = `${data.category.toUpperCase().substring(0, 3)}${result.rows[0].next_number.toString().padStart(3, '0')}`;
    }
  },
  afterCreate: async (tool, data) => {
    console.log(`✅ Tool created: ${tool.tool_number}`);
  },
  afterUpdate: async (tool, data) => {
    console.log(`✅ Tool updated: ${tool.tool_number}`);
  },
  beforeDelete: async (id) => {
    // Check if tool is used in any sets
    const usage = await crudService.databaseService.query(
      'SELECT COUNT(*) as count FROM set_tools WHERE tool_id = $1',
      [id]
    );
    
    if (parseInt(usage.rows[0].count) > 0) {
      throw new Error('Cannot delete tool that is used in sets');
    }
  }
};

// Create CRUD routes
crudService.createRoutes(router, toolsConfig);

// Additional custom routes
router.get('/tools/next-number', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, tool_type } = req.query;
    
    let query = `
      SELECT COALESCE(MAX(CAST(SUBSTRING(tool_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_number 
      FROM tools 
      WHERE tool_number ~ '^[A-Z]+[0-9]+$'
    `;
    
    const params = [];
    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }
    
    const result = await crudService.databaseService.query(query, params, {
      cacheKey: `tools:next-number:${category}:${tool_type}`,
      ttl: 60000 // 1 minute cache
    });
    
    const nextNumber = result.rows[0].next_number;
    const prefix = category ? category.toUpperCase().substring(0, 3) : 'TOL';
    const formattedNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    
    res.json(apiResponseService.success({ next_number: formattedNumber }));
  } catch (error) {
    console.error('Error getting next tool number:', error);
    res.status(500).json(apiResponseService.serverError('Failed to get next tool number'));
  }
});

router.get('/tools/set/:setId', authenticateToken, async (req, res) => {
  try {
    const { setId } = req.params;
    const { language = 'en' } = req.query;
    
    const query = `
      SELECT 
        t.*,
        tt.tool_name,
        tt.description,
        tt.safety_instructions,
        l.language_code,
        st.quantity,
        st.notes as set_tool_notes
      FROM tools t
      JOIN set_tools st ON t.tool_id = st.tool_id
      LEFT JOIN tool_translations tt ON t.tool_id = tt.tool_id
      LEFT JOIN languages l ON tt.language_id = l.language_id
      WHERE st.set_id = $1 AND (l.language_code = $2 OR l.language_code IS NULL)
      ORDER BY t.tool_number
    `;
    
    const result = await crudService.databaseService.query(query, [setId, language], {
      cacheKey: `tools:set:${setId}:${language}`,
      ttl: 300000 // 5 minutes
    });
    
    // Process translations
    const processedTools = crudService.processTranslations(result.rows, ['tool_name', 'description', 'safety_instructions']);
    
    res.json(apiResponseService.success(processedTools));
  } catch (error) {
    console.error('Error getting tools for set:', error);
    res.status(500).json(apiResponseService.serverError('Failed to get tools for set'));
  }
});

// Health check endpoint
router.get('/tools/health', async (req, res) => {
  try {
    const health = await crudService.databaseService.healthCheck();
    res.json(apiResponseService.success(health));
  } catch (error) {
    res.status(500).json(apiResponseService.serverError('Health check failed'));
  }
});

// Performance stats endpoint
router.get('/tools/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [queryStats, cacheStats] = await Promise.all([
      crudService.databaseService.getQueryStats(),
      crudService.databaseService.getCacheStats()
    ]);
    
    res.json(apiResponseService.success({
      queries: queryStats,
      cache: cacheStats
    }));
  } catch (error) {
    res.status(500).json(apiResponseService.serverError('Failed to get stats'));
  }
});

module.exports = router;
