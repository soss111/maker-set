const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get tools for a specific set
router.get('/set/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const { language = 'en' } = req.query;

    const query = `
      SELECT 
        st.*,
        t.tool_id,
        t.tool_name,
        t.description as tool_description,
        t.category as tool_category,
        t.image_url as tool_image_url,
        t.active
      FROM set_tools st
      JOIN tools t ON st.tool_id = t.tool_id
      WHERE st.set_id = ?
      ORDER BY t.tool_name
    `;

    const result = await db.query(query, [setId]);
    
    const tools = result.rows || [];

    res.json({ tools });
  } catch (error) {
    console.error('Error fetching tools for set:', error);
    res.status(500).json({ error: 'Failed to fetch tools for set' });
  }
});

// Get set-tools relationships
router.get('/', async (req, res) => {
  try {
    const { set_id, tool_id } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (set_id) {
      whereConditions.push('st.set_id = ?');
      queryParams.push(set_id);
    }

    if (tool_id) {
      whereConditions.push('st.tool_id = ?');
      queryParams.push(tool_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        st.*,
        t.tool_name,
        t.description as tool_description,
        t.category as tool_category,
        s.name as set_name
      FROM set_tools st
      LEFT JOIN tools t ON st.tool_id = t.tool_id
      LEFT JOIN sets s ON st.set_id = s.set_id
      ${whereClause}
      ORDER BY t.tool_name
    `;

    const result = await db.query(query, queryParams);

    res.json({ set_tools: result.rows });

  } catch (error) {
    console.error('Error fetching set-tools:', error);
    res.status(500).json({ error: 'Failed to fetch set-tools' });
  }
});

// Add tool to set
router.post('/', async (req, res) => {
  try {
    const {
      set_id,
      tool_id,
      quantity = 1,
      is_required = true,
      notes = ''
    } = req.body;

    // Convert is_required to is_optional (inverse logic)
    const is_optional = !is_required;

    // Check if relationship already exists
    const existing = await db.query(
      'SELECT * FROM set_tools WHERE set_id = ? AND tool_id = ?',
      [set_id, tool_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Tool is already in this set' });
    }

    const query = `
      INSERT INTO set_tools (set_id, tool_id, quantity, is_optional, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await db.run(query, [set_id, tool_id, quantity, is_optional ? 1 : 0, notes]);
    const setId = result.lastID;

    res.status(201).json({
      message: 'Tool added to set successfully',
      set_tool_id: setId
    });

  } catch (error) {
    console.error('Error adding tool to set:', error);
    res.status(500).json({ error: 'Failed to add tool to set' });
  }
});

// Update set-tool relationship
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quantity,
      is_required
    } = req.body;

    // Convert is_required to is_optional (inverse logic)
    const is_optional = !is_required;

    const query = `
      UPDATE set_tools 
      SET quantity = ?, is_optional = ?
      WHERE set_tool_id = ?
    `;

    await db.run(query, [quantity, is_optional ? 1 : 0, id]);

    res.json({ message: 'Set-tool relationship updated successfully' });

  } catch (error) {
    console.error('Error updating set-tool:', error);
    res.status(500).json({ error: 'Failed to update set-tool relationship' });
  }
});

// Remove tool from set
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM set_tools WHERE set_tool_id = ?', [id]);

    res.json({ message: 'Tool removed from set successfully' });

  } catch (error) {
    console.error('Error removing tool from set:', error);
    res.status(500).json({ error: 'Failed to remove tool from set' });
  }
});

// Remove tool from set by set_id and tool_id
router.delete('/set/:setId/tool/:toolId', async (req, res) => {
  try {
    const { setId, toolId } = req.params;

    await db.query('DELETE FROM set_tools WHERE set_id = ? AND tool_id = ?', [setId, toolId]);

    res.json({ message: 'Tool removed from set successfully' });

  } catch (error) {
    console.error('Error removing tool from set:', error);
    res.status(500).json({ error: 'Failed to remove tool from set' });
  }
});

module.exports = router;
