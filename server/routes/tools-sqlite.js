const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all tools with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, sort_by = 'tool_name', sort_order = 'ASC', include_inactive } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    // Filter by active status unless include_inactive is true
    if (!include_inactive || include_inactive === 'false') {
      whereConditions.push('active = 1');
    }

    if (search) {
      whereConditions.push('(tool_name LIKE ? OR description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT *
      FROM tools
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Parse translations and extract English name/description
    const processedTools = result.rows.map(tool => {
      let tool_name = tool.tool_name;
      let description = tool.description;
      
      // If translations exist, extract English name and description
      if (tool.translations) {
        try {
          const translations = JSON.parse(tool.translations);
          const englishTranslation = translations.find(t => t.language_code === 'en');
          if (englishTranslation) {
            tool_name = englishTranslation.tool_name || tool_name;
            description = englishTranslation.description || description;
          }
        } catch (error) {
          console.error('Error parsing translations for tool', tool.tool_id, ':', error);
        }
      }
      
      return {
        ...tool,
        tool_name,
        description
      };
    });

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tools
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      tools: processedTools,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

// Get next tool number
router.get('/next-number', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT COALESCE(MAX(CAST(SUBSTR(tool_number, -3) AS INTEGER)), 0) + 1 as next_number 
      FROM tools 
      WHERE tool_number GLOB '[A-Z][A-Z][A-Z][0-9][0-9][0-9]'
    `;
    
    const params = [];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    const result = await db.query(query, params);
    const nextNumber = result.rows[0].next_number;
    
    // Generate tool number with category prefix
    const prefix = category ? category.toUpperCase().substring(0, 3) : 'TL';
    const formattedNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    
    res.json({ next_number: formattedNumber });
  } catch (error) {
    console.error('Error getting next tool number:', error);
    res.status(500).json({ error: 'Failed to get next tool number' });
  }
});

// Get tool by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM tools WHERE tool_id = ?';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    const tool = result.rows[0];
    
    // Parse translations and extract English name/description
    let tool_name = tool.tool_name;
    let description = tool.description;
    
    if (tool.translations) {
      try {
        const translations = JSON.parse(tool.translations);
        const englishTranslation = translations.find(t => t.language_code === 'en');
        if (englishTranslation) {
          tool_name = englishTranslation.tool_name || tool_name;
          description = englishTranslation.description || description;
        }
      } catch (error) {
        console.error('Error parsing translations for tool', tool.tool_id, ':', error);
      }
    }
    
    const processedTool = {
      ...tool,
      tool_name,
      description
    };

    res.json({ tool: processedTool });

  } catch (error) {
    console.error('Error fetching tool:', error);
    res.status(500).json({ error: 'Failed to fetch tool' });
  }
});

// Create new tool
router.post('/', async (req, res) => {
  try {
    const {
      tool_number,
      category,
      tool_type,
      condition_status,
      location,
      purchase_date,
      last_maintenance_date,
      next_maintenance_date,
      notes,
      image_url,
      safety_instructions,
      translations
    } = req.body;

    // Validate required fields
    if (!category) {
      return res.status(400).json({ 
        error: 'category is required field' 
      });
    }

    // Insert the main tool record with translations
    const translationsJson = translations && translations.length > 0 ? JSON.stringify(translations) : null;
    
    // Extract tool_name from translations
    let tool_name = '';
    if (translations && translations.length > 0) {
      const englishTranslation = translations.find(t => t.language_code === 'en');
      if (englishTranslation) {
        tool_name = englishTranslation.tool_name || '';
      }
    }
    
    const query = `
      INSERT INTO tools (
        tool_name, tool_number, category, tool_type, condition_status, location,
        purchase_date, last_maintenance_date, next_maintenance_date,
        notes, image_url, safety_instructions, translations, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    const result = await db.run(query, [
      tool_name, tool_number || '', category, tool_type || '', condition_status || 'good',
      location || '', purchase_date || '', last_maintenance_date || '',
      next_maintenance_date || '', notes || '', image_url || '',
      safety_instructions || '', translationsJson
    ]);

    const toolId = result.lastID;

    res.status(201).json({
      message: 'Tool created successfully',
      tool_id: toolId
    });

  } catch (error) {
    console.error('Error creating tool:', error);
    res.status(500).json({ error: 'Failed to create tool' });
  }
});

// Update tool
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tool_name,
      description,
      category,
      image_url
    } = req.body;

    const query = `
      UPDATE tools 
      SET tool_name = ?, description = ?, category = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE tool_id = ?
    `;

    await db.query(query, [tool_name, description, category, image_url, id]);

    res.json({ message: 'Tool updated successfully' });

  } catch (error) {
    console.error('Error updating tool:', error);
    res.status(500).json({ error: 'Failed to update tool' });
  }
});

// Delete tool
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tool is used in any sets
    const setsResult = await db.query('SELECT COUNT(*) as count FROM set_tools WHERE tool_id = ?', [id]);

    if (setsResult.rows[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete tool that is used in sets' 
      });
    }

    await db.query('DELETE FROM tools WHERE tool_id = ?', [id]);

    res.json({ message: 'Tool deleted successfully' });

  } catch (error) {
    console.error('Error deleting tool:', error);
    res.status(500).json({ error: 'Failed to delete tool' });
  }
});

module.exports = router;
