const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

function tokenUserId(req) {
  return req.user?.user_id ?? req.user?.userId ?? req.user?.id;
}

// Get all provider sets (public for customers, filtered for providers)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { provider_id, set_id, is_active, include_inactive, page = 1, limit = 50 } = req.query;
    const userRole = req.user.role;
    const userId = tokenUserId(req);

    let query = `
      SELECT ps.*,
             s.name as set_name,
             s.description as set_description,
             s.category, s.difficulty_level, s.recommended_age_min, s.recommended_age_max,
             s.estimated_duration_minutes, s.active as set_active, s.base_price,
             u.username as provider_username, u.company_name as provider_company,
             u.first_name as provider_first_name, u.last_name as provider_last_name
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN users u ON ps.provider_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    // Role-based filtering
    if (userRole === 'provider') {
      query += ' AND ps.provider_id = ?';
      params.push(userId);
    }

    // Additional filters
    if (provider_id) {
      query += ' AND ps.provider_id = ?';
      params.push(provider_id);
    }

    if (set_id) {
      query += ' AND ps.set_id = ?';
      params.push(set_id);
    }

    const wantInactive = include_inactive === 'true' || include_inactive === true;
    if (is_active !== undefined) {
      query += ' AND ps.is_active = ?';
      params.push(is_active === 'true' || is_active === true ? 1 : 0);
    } else if (!wantInactive && userRole !== 'provider') {
      query += ' AND ps.is_active = 1';
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ' ORDER BY ps.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      WHERE 1=1
    `;

    const countParams = [];
    if (userRole === 'provider') {
      countQuery += ' AND ps.provider_id = ?';
      countParams.push(userId);
    }

    if (provider_id) {
      countQuery += ' AND ps.provider_id = ?';
      countParams.push(provider_id);
    }

    if (set_id) {
      countQuery += ' AND ps.set_id = ?';
      countParams.push(set_id);
    }

    if (is_active !== undefined) {
      countQuery += ' AND ps.is_active = ?';
      countParams.push(is_active === 'true' || is_active === true ? 1 : 0);
    } else if (!wantInactive && userRole !== 'provider') {
      countQuery += ' AND ps.is_active = 1';
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    res.json({
      provider_sets: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching provider sets:', error);
    res.status(500).json({ error: 'Failed to fetch provider sets' });
  }
});

// Get provider set by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = tokenUserId(req);

    let query = `
      SELECT ps.*,
             s.name as set_name,
             s.description as set_description,
             s.category, s.difficulty_level, s.recommended_age_min, s.recommended_age_max,
             s.estimated_duration_minutes, s.active as set_active, s.base_price,
             u.username as provider_username, u.company_name as provider_company
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN users u ON ps.provider_id = u.user_id
      WHERE ps.provider_set_id = ?
    `;

    const params = [id];

    if (userRole === 'provider') {
      query += ' AND ps.provider_id = ?';
      params.push(userId);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    res.json({ provider_set: result.rows[0] });
  } catch (error) {
    console.error('Error fetching provider set:', error);
    res.status(500).json({ error: 'Failed to fetch provider set' });
  }
});

// Create new provider set
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      set_id,
      provider_id,
      price,
      available_quantity = 0,
      is_active = true,
      notes
    } = req.body;

    const userRole = req.user.role;
    const userId = tokenUserId(req);
    // Providers always bind to their JWT identity (ignore stale client provider_id)
    const targetProviderId = userRole === 'provider' ? userId : provider_id;

    if (!targetProviderId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }

    if (!set_id) {
      return res.status(400).json({ error: 'set_id is required' });
    }

    const result = await db.run(
      `INSERT INTO provider_sets (
        set_id, provider_id, price, available_quantity, is_active, admin_notes,
        provider_visible, admin_visible, admin_status
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'pending')`,
      [
        set_id,
        targetProviderId,
        price ?? 0,
        available_quantity ?? 0,
        is_active ? 1 : 0,
        notes || null
      ]
    );

    res.status(201).json({
      message: 'Provider set created successfully',
      provider_set_id: result.lastID
    });
  } catch (error) {
    console.error('Error creating provider set:', error);
    res.status(500).json({ error: 'Failed to create provider set', details: error.message });
  }
});

// Update provider set
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      price,
      available_quantity,
      is_active,
      notes
    } = req.body;

    const userRole = req.user.role;
    const userId = tokenUserId(req);

    const checkResult = await db.query(
      'SELECT provider_id FROM provider_sets WHERE provider_set_id = ?',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    const providerId = checkResult.rows[0].provider_id;

    if (userRole === 'provider' && Number(providerId) !== Number(userId)) {
      return res.status(403).json({ error: 'You can only update your own provider sets' });
    }

    await db.run(
      `UPDATE provider_sets
       SET price = COALESCE(?, price),
           available_quantity = COALESCE(?, available_quantity),
           is_active = COALESCE(?, is_active),
           admin_notes = COALESCE(?, admin_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE provider_set_id = ?`,
      [
        price !== undefined ? price : null,
        available_quantity !== undefined ? available_quantity : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        notes !== undefined ? notes : null,
        id
      ]
    );

    res.json({ message: 'Provider set updated successfully' });
  } catch (error) {
    console.error('Error updating provider set:', error);
    res.status(500).json({ error: 'Failed to update provider set' });
  }
});

// Update provider visibility
router.put('/:id/visibility', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_visible } = req.body;
    const userRole = req.user.role;
    const userId = tokenUserId(req);

    const checkResult = await db.query(
      'SELECT provider_id FROM provider_sets WHERE provider_set_id = ?',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    if (userRole === 'provider' && Number(checkResult.rows[0].provider_id) !== Number(userId)) {
      return res.status(403).json({ error: 'You can only update your own provider sets' });
    }

    await db.run(
      `UPDATE provider_sets SET provider_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE provider_set_id = ?`,
      [provider_visible ? 1 : 0, id]
    );

    res.json({ message: 'Visibility updated successfully' });
  } catch (error) {
    console.error('Error updating provider set visibility:', error);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// Delete provider set
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = tokenUserId(req);

    const checkResult = await db.query(
      'SELECT provider_id FROM provider_sets WHERE provider_set_id = ?',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    if (userRole === 'provider' && Number(checkResult.rows[0].provider_id) !== Number(userId)) {
      return res.status(403).json({ error: 'You can only delete your own provider sets' });
    }

    await db.run('DELETE FROM provider_sets WHERE provider_set_id = ?', [id]);
    res.json({ message: 'Provider set deleted successfully' });
  } catch (error) {
    console.error('Error deleting provider set:', error);
    res.status(500).json({ error: 'Failed to delete provider set' });
  }
});

module.exports = router;
