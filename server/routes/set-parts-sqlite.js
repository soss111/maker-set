const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get parts for a specific set
router.get('/set/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const { language = 'en' } = req.query;

    const query = `
      SELECT 
        sp.*,
        p.part_id,
        COALESCE(p.name, p.part_number) as part_name,
        p.description as part_description,
        p.category as part_category,
        p.image_url as part_image_url,
        p.part_number,
        p.unit_cost,
        p.stock_quantity,
        p.minimum_stock_level,
        p.supplier_part_number,
        p.assembly_notes,
        p.safety_notes,
        p.translations
      FROM set_parts sp
      JOIN parts p ON sp.part_id = p.part_id
      WHERE sp.set_id = ?
      ORDER BY COALESCE(p.name, p.part_number)
    `;

    const result = await db.query(query, [setId]);
    
    // Process translations if language is not English
    let parts = result.rows || [];
    if (language !== 'en') {
      parts = parts.map(part => {
        if (!part.translations) return part;
        try {
          const translations = typeof part.translations === 'string'
            ? JSON.parse(part.translations)
            : part.translations;
          const lang = translations[language];
          if (lang) {
            return {
              ...part,
              part_name: lang.part_name || part.part_name,
              part_description: lang.part_description || part.part_description,
              assembly_notes: lang.assembly_notes || part.assembly_notes,
              safety_notes: lang.safety_notes || part.safety_notes
            };
          }
        } catch (e) {
          console.error('Error parsing translations for part', part.part_id, e);
        }
        return part;
      });
    }

    res.json({ parts });
  } catch (error) {
    console.error('Error fetching parts for set:', error);
    res.status(500).json({ error: 'Failed to fetch parts for set' });
  }
});

// Get set-parts relationships
router.get('/', async (req, res) => {
  try {
    const { set_id, part_id } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (set_id) {
      whereConditions.push('sp.set_id = ?');
      queryParams.push(set_id);
    }

    if (part_id) {
      whereConditions.push('sp.part_id = ?');
      queryParams.push(part_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        sp.*,
        COALESCE(p.name, p.part_number) as part_name,
        p.description as part_description,
        p.category as part_category,
        p.unit_cost as part_price,
        s.name as set_name
      FROM set_parts sp
      LEFT JOIN parts p ON sp.part_id = p.part_id
      LEFT JOIN sets s ON sp.set_id = s.set_id
      ${whereClause}
      ORDER BY COALESCE(p.name, p.part_number)
    `;

    const result = await db.query(query, queryParams);

    res.json({ set_parts: result.rows });

  } catch (error) {
    console.error('Error fetching set-parts:', error);
    res.status(500).json({ error: 'Failed to fetch set-parts' });
  }
});

// Add part to set
router.post('/', async (req, res) => {
  try {
    const {
      set_id,
      part_id,
      quantity = 1,
      is_optional = false,
      notes = ''
    } = req.body;

    // Check if relationship already exists
    const existing = await db.query(
      'SELECT * FROM set_parts WHERE set_id = ? AND part_id = ?',
      [set_id, part_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Part is already in this set' });
    }

    const query = `
      INSERT INTO set_parts (set_id, part_id, quantity, is_optional, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await db.run(query, [set_id, part_id, quantity, is_optional, notes]);
    const setId = result.lastID;

    res.status(201).json({
      message: 'Part added to set successfully',
      set_part_id: setId
    });

  } catch (error) {
    console.error('Error adding part to set:', error);
    res.status(500).json({ error: 'Failed to add part to set' });
  }
});

// Update set-part relationship
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quantity,
      is_required
    } = req.body;

    const query = `
      UPDATE set_parts 
      SET quantity = ?, is_required = ?, updated_at = CURRENT_TIMESTAMP
      WHERE set_part_id = ?
    `;

    await db.query(query, [quantity, is_required, id]);

    res.json({ message: 'Set-part relationship updated successfully' });

  } catch (error) {
    console.error('Error updating set-part:', error);
    res.status(500).json({ error: 'Failed to update set-part relationship' });
  }
});

// Remove part from set
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM set_parts WHERE set_part_id = ?', [id]);

    res.json({ message: 'Part removed from set successfully' });

  } catch (error) {
    console.error('Error removing part from set:', error);
    res.status(500).json({ error: 'Failed to remove part from set' });
  }
});

// Remove part from set by set_id and part_id
router.delete('/set/:setId/part/:partId', async (req, res) => {
  try {
    const { setId, partId } = req.params;

    await db.query('DELETE FROM set_parts WHERE set_id = ? AND part_id = ?', [setId, partId]);

    res.json({ message: 'Part removed from set successfully' });

  } catch (error) {
    console.error('Error removing part from set:', error);
    res.status(500).json({ error: 'Failed to remove part from set' });
  }
});

module.exports = router;
