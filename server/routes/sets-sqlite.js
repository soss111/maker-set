const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get real rating data for a set (SQLite compatible)
async function getRealRatingData(setId) {
  try {
    const query = `
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as review_count,
        GROUP_CONCAT(review_text, '|') as customer_feedback_concat,
        GROUP_CONCAT(
          CASE 
            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
            THEN u.first_name || ' ' || substr(u.last_name, 1, 1) || '.'
            ELSE 'Anonymous'
          END, '|'
        ) as customer_names_concat
      FROM ratings r
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.set_id = ? AND r.review_text IS NOT NULL AND r.review_text != ''
      ORDER BY r.created_at DESC
    `;
    
    const result = await db.query(query, [setId]);
    const ratingData = result.rows[0];
    
    if (ratingData && ratingData.review_count > 0) {
      const customer_feedback = ratingData.customer_feedback_concat ? 
        ratingData.customer_feedback_concat.split('|').slice(0, 3) : [];
      const customer_names = ratingData.customer_names_concat ? 
        ratingData.customer_names_concat.split('|') : [];
      
      return {
        average_rating: Math.round(Number(ratingData.average_rating) * 10) / 10,
        review_count: parseInt(ratingData.review_count),
        customer_feedback: customer_feedback,
        customer_name: customer_names[0] || 'Anonymous'
      };
    }
    
    // Return default values if no ratings exist
    return {
      average_rating: 0,
      review_count: 0,
      customer_feedback: [],
      customer_name: null
    };
  } catch (error) {
    console.error('Error fetching real rating data:', error);
    return {
      average_rating: 0,
      review_count: 0,
      customer_feedback: [],
      customer_name: null
    };
  }
}

// Get all sets with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, sort_by = 'created_at', sort_order = 'DESC', include_inactive } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(s.name LIKE ? OR s.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      whereConditions.push('s.category = ?');
      queryParams.push(category);
    }

    if (!include_inactive || include_inactive === 'false') {
      whereConditions.push('(s.active = 1 OR s.active IS NULL)');
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const allowedSort = ['created_at', 'name', 'description', 'category', 'set_id', 'updated_at', 'active'];
    const safeSort = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM set_parts WHERE set_id = s.set_id) as part_count,
        (SELECT COUNT(*) FROM set_tools WHERE set_id = s.set_id) as tool_count,
        (SELECT COUNT(*) FROM set_media WHERE set_id = s.set_id) as media_count,
        COALESCE(
          ps.available_quantity,
          (SELECT MIN(FLOOR(p.stock_quantity / sp.quantity))
           FROM set_parts sp
           JOIN parts p ON sp.part_id = p.part_id
           WHERE sp.set_id = s.set_id AND sp.is_optional = 0 AND p.stock_quantity > 0
          ), 0
        ) as available_quantity,
        ps.provider_set_id,
        ps.provider_id,
        ps.price as provider_price,
        ps.available_quantity as provider_available_quantity,
        ps.provider_visible,
        u.username as provider_username,
        u.first_name as provider_first_name,
        u.last_name as provider_last_name,
        u.company_name as provider_company,
        u.provider_code
      FROM sets s
      LEFT JOIN provider_sets ps ON s.set_id = ps.set_id AND ps.is_active = 1
      LEFT JOIN users u ON ps.provider_id = u.user_id
      ${whereClause}
      ORDER BY s.${safeSort} ${safeOrder}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sets s
      LEFT JOIN provider_sets ps ON s.set_id = ps.set_id AND ps.is_active = 1
      LEFT JOIN users u ON ps.provider_id = u.user_id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    // Get rating data for each set
    const setsWithRatings = await Promise.all(
      result.rows.map(async (set) => {
        const ratingData = await getRealRatingData(set.set_id);
        return {
          ...set,
          ...ratingData,
          set_type: set.provider_set_id ? 'provider' : 'admin'
        };
      })
    );

    res.json({
      sets: setsWithRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching sets:', error);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

// Validate stock availability for cart/checkout
router.post('/validate-stock', async (req, res) => {
  try {
    const { sets } = req.body || {};
    if (!sets || !Array.isArray(sets)) {
      return res.status(400).json({ error: 'Sets array is required' });
    }

    const results = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const item of sets) {
      const { set_id, quantity } = item;
      if (set_id == null || quantity == null) {
        results.push({ set_id: set_id ?? 0, valid: false, error: 'Missing set_id or quantity' });
        invalidCount++;
        continue;
      }

      if (set_id === -1) {
        results.push({ set_id, valid: true, parts_configured: true });
        validCount++;
        continue;
      }

      const partsQuery = `
        SELECT
          sp.part_id,
          sp.quantity as required_quantity,
          p.stock_quantity,
          COALESCE(p.name, p.part_number) as part_name,
          p.part_number
        FROM set_parts sp
        JOIN parts p ON sp.part_id = p.part_id
        WHERE sp.set_id = ?
      `;
      const partsResult = await db.query(partsQuery, [set_id]);
      const parts = partsResult.rows || [];

      if (parts.length === 0) {
        results.push({
          set_id,
          valid: false,
          parts_configured: false,
          error: 'No parts configured for this set'
        });
        invalidCount++;
        continue;
      }

      const insufficientParts = [];
      for (const part of parts) {
        const totalRequired = (part.required_quantity || 0) * quantity;
        const available = part.stock_quantity ?? 0;
        if (available < totalRequired) {
          insufficientParts.push({
            part_id: part.part_id,
            part_number: part.part_number || '',
            part_name: part.part_name || part.part_number || '',
            required: totalRequired,
            available,
            shortfall: totalRequired - available
          });
        }
      }

      if (insufficientParts.length > 0) {
        results.push({
          set_id,
          valid: false,
          parts_configured: true,
          insufficient_parts: insufficientParts
        });
        invalidCount++;
      } else {
        results.push({ set_id, valid: true, parts_configured: true });
        validCount++;
      }
    }

    const totalItems = results.length;
    res.json({
      valid: invalidCount === 0,
      results,
      summary: {
        total_items: totalItems,
        valid_items: validCount,
        invalid_items: invalidCount
      }
    });
  } catch (error) {
    console.error('Error validating stock:', error);
    res.status(500).json({
      error: 'Failed to validate stock availability',
      details: error.message
    });
  }
});

// Get set by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const setQuery = `
      SELECT *
      FROM sets
      WHERE set_id = ?
    `;

    const setResult = await db.query(setQuery, [id]);
    
    if (setResult.rows.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }

    const set = setResult.rows[0];

    // Get parts for this set (set_parts has is_optional; alias is_required for API compatibility)
    try {
      const partsQuery = `
        SELECT 
          p.*,
          sp.quantity,
          (1 - COALESCE(sp.is_optional, 0)) as is_required
        FROM set_parts sp
        JOIN parts p ON sp.part_id = p.part_id
        WHERE sp.set_id = ?
        ORDER BY p.part_id
      `;
      const partsResult = await db.query(partsQuery, [id]);
      set.parts = partsResult.rows || [];
    } catch (partsErr) {
      console.error('Error fetching set parts:', partsErr);
      set.parts = [];
    }

    // Get tools for this set (tools table has tool_name; set_tools may not exist in minimal schema)
    try {
      const toolsQuery = `
        SELECT 
          t.*,
          st.quantity,
          COALESCE(st.is_required, 1) as is_required
        FROM set_tools st
        JOIN tools t ON st.tool_id = t.tool_id
        WHERE st.set_id = ?
        ORDER BY COALESCE(t.tool_name, t.tool_number, '')
      `;
      const toolsResult = await db.query(toolsQuery, [id]);
      set.tools = toolsResult.rows || [];
    } catch (toolsErr) {
      console.error('Error fetching set tools:', toolsErr);
      set.tools = [];
    }

    // Get rating data (ratings/users may not exist in minimal schema)
    try {
      const ratingData = await getRealRatingData(id);
      Object.assign(set, ratingData);
    } catch (ratingErr) {
      console.error('Error fetching set rating data:', ratingErr.message || ratingErr);
      Object.assign(set, {
        average_rating: 0,
        review_count: 0,
        customer_feedback: [],
        customer_name: null
      });
    }

    res.json({ set });

  } catch (error) {
    console.error('Error fetching set:', error);
    res.status(500).json({ error: 'Failed to fetch set' });
  }
});

// Create new set
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      difficulty_level,
      estimated_duration_minutes,
      base_price,
      video_url,
      learning_outcomes,
      parts = [],
      tools = []
    } = req.body;

    // Insert set
    const setQuery = `
      INSERT INTO sets (
        name, description, category, difficulty_level, estimated_duration_minutes,
        base_price, video_url, learning_outcomes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const setResult = await db.run(setQuery, [
      name, description, category, difficulty_level, estimated_duration_minutes,
      base_price, video_url, learning_outcomes
    ]);

    const setId = setResult.lastID;

    // Insert set parts
    if (parts.length > 0) {
      for (const part of parts) {
        const partQuery = `
          INSERT INTO set_parts (set_id, part_id, quantity, is_optional)
          VALUES (?, ?, ?, ?)
        `;
        
        await db.run(partQuery, [setId, part.part_id, part.quantity, part.is_required ? 0 : 1]);
      }
    }

    // Insert set tools
    if (tools.length > 0) {
      for (const tool of tools) {
        const toolQuery = `
          INSERT INTO set_tools (set_id, tool_id, quantity, is_optional)
          VALUES (?, ?, ?, ?)
        `;
        
        await db.run(toolQuery, [setId, tool.tool_id, tool.quantity, tool.is_required ? 0 : 1]);
      }
    }

    res.status(201).json({
      message: 'Set created successfully',
      set_id: setId
    });

  } catch (error) {
    console.error('Error creating set:', error);
    res.status(500).json({ error: 'Failed to create set' });
  }
});

// Update set
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      difficulty_level,
      estimated_duration_minutes,
      base_price,
      video_url,
      learning_outcomes
    } = req.body;

    const query = `
      UPDATE sets 
      SET name = ?, description = ?, category = ?, difficulty_level = ?,
          estimated_duration_minutes = ?, base_price = ?, video_url = ?, learning_outcomes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE set_id = ?
    `;

    await db.query(query, [name, description, category, difficulty_level, estimated_duration_minutes, base_price, video_url, learning_outcomes, id]);

    res.json({ message: 'Set updated successfully' });

  } catch (error) {
    console.error('Error updating set:', error);
    res.status(500).json({ error: 'Failed to update set' });
  }
});

// Update set visibility
router.put('/:id/visibility', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_visible } = req.body;

    const updateQuery = `
      UPDATE sets 
      SET admin_visible = ?
      WHERE set_id = ?
    `;

    await db.run(updateQuery, [admin_visible ? 1 : 0, id]);
    
    res.json({ message: 'Set visibility updated successfully' });
  } catch (error) {
    console.error('Error updating set visibility:', error);
    res.status(500).json({ error: 'Failed to update set visibility' });
  }
});

// Update trust certification
router.put('/:id/trust-certification', async (req, res) => {
  try {
    const { id } = req.params;
    const { tested_by_makerset } = req.body;

    const updateQuery = `
      UPDATE sets 
      SET tested_by_makerset = ?
      WHERE set_id = ?
    `;

    await db.run(updateQuery, [tested_by_makerset ? 1 : 0, id]);
    
    res.json({ message: 'Trust certification updated successfully' });
  } catch (error) {
    console.error('Error updating trust certification:', error);
    res.status(500).json({ error: 'Failed to update trust certification' });
  }
});

// Update set price
router.patch('/:id/price', async (req, res) => {
  try {
    const { id } = req.params;
    const { base_price } = req.body;

    const updateQuery = `
      UPDATE sets 
      SET base_price = ?
      WHERE set_id = ?
    `;

    await db.run(updateQuery, [base_price, id]);
    
    res.json({ message: 'Set price updated successfully' });
  } catch (error) {
    console.error('Error updating set price:', error);
    res.status(500).json({ error: 'Failed to update set price' });
  }
});

// Delete set
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete set parts first
    await db.query('DELETE FROM set_parts WHERE set_id = ?', [id]);
    
    // Delete set tools
    await db.query('DELETE FROM set_tools WHERE set_id = ?', [id]);
    
    // Delete set
    await db.query('DELETE FROM sets WHERE set_id = ?', [id]);

    res.json({ message: 'Set deleted successfully' });

  } catch (error) {
    console.error('Error deleting set:', error);
    res.status(500).json({ error: 'Failed to delete set' });
  }
});

module.exports = router;
