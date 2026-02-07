const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all instructions
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, set_id, language_id, sort_by = 'step_number', sort_order = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (set_id) {
      whereConditions.push('i.set_id = ?');
      queryParams.push(set_id);
    }

    if (language_id) {
      whereConditions.push('i.language_id = ?');
      queryParams.push(language_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        i.*,
        s.name as set_name,
        l.language_code,
        l.language_name
      FROM instructions i
      LEFT JOIN sets s ON i.set_id = s.set_id
      LEFT JOIN languages l ON i.language_id = l.language_id
      ${whereClause}
      ORDER BY i.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM instructions i
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      instructions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching instructions:', error);
    res.status(500).json({ error: 'Failed to fetch instructions' });
  }
});

// Get instruction by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        i.*,
        s.name as set_name,
        l.language_code,
        l.language_name
      FROM instructions i
      LEFT JOIN sets s ON i.set_id = s.set_id
      LEFT JOIN languages l ON i.language_id = l.language_id
      WHERE i.instruction_id = ?
    `;

    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Instruction not found' });
    }

    res.json({ instruction: result.rows[0] });

  } catch (error) {
    console.error('Error fetching instruction:', error);
    res.status(500).json({ error: 'Failed to fetch instruction' });
  }
});

// Create new instruction
router.post('/', async (req, res) => {
  try {
    const {
      set_id,
      language_id,
      step_number,
      title,
      description,
      image_url,
      video_url,
      estimated_time_minutes
    } = req.body;

    const query = `
      INSERT INTO instructions (
        set_id, language_id, step_number, title, description, image_url, video_url, estimated_time_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.query(query, [
      set_id, language_id, step_number, title, description, image_url, video_url, estimated_time_minutes
    ]);

    const instructionId = result.rows[0].id || result.lastID;

    res.status(201).json({
      message: 'Instruction created successfully',
      instruction_id: instructionId
    });

  } catch (error) {
    console.error('Error creating instruction:', error);
    res.status(500).json({ error: 'Failed to create instruction' });
  }
});

// Update instruction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      step_number,
      title,
      description,
      image_url,
      video_url,
      estimated_time_minutes
    } = req.body;

    const query = `
      UPDATE instructions 
      SET step_number = ?, title = ?, description = ?, image_url = ?, video_url = ?, estimated_time_minutes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE instruction_id = ?
    `;

    await db.query(query, [step_number, title, description, image_url, video_url, estimated_time_minutes, id]);

    res.json({ message: 'Instruction updated successfully' });

  } catch (error) {
    console.error('Error updating instruction:', error);
    res.status(500).json({ error: 'Failed to update instruction' });
  }
});

// Delete instruction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM instructions WHERE instruction_id = ?', [id]);

    res.json({ message: 'Instruction deleted successfully' });

  } catch (error) {
    console.error('Error deleting instruction:', error);
    res.status(500).json({ error: 'Failed to delete instruction' });
  }
});

module.exports = router;
