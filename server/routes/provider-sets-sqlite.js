const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all provider sets (public for customers, filtered for providers)
router.get('/', authenticateToken, async(req, res) => {
  try {
    const { provider_id, set_id, is_active, page = 1, limit = 50 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.user_id;

    let query = `
      SELECT ps.*, 
             s.category, s.difficulty_level, s.recommended_age_min, s.recommended_age_max,
             s.estimated_duration_minutes, s.active as set_active,
             st.name as set_name, st.description as set_description,
             u.username as provider_username, u.company_name as provider_company
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN set_translations st ON s.set_id = st.set_id
      JOIN languages l ON st.language_id = l.language_id
      JOIN users u ON ps.provider_id = u.user_id
      WHERE l.language_code = 'en' AND s.active = 1
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

    if (is_active !== undefined) {
      query += ' AND ps.is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ' ORDER BY ps.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN set_translations st ON s.set_id = st.set_id
      JOIN languages l ON st.language_id = l.language_id
      WHERE l.language_code = 'en' AND s.active = 1
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
      countParams.push(is_active === 'true' ? 1 : 0);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      provider_sets: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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
    const userId = req.user.user_id;

    let query = `
      SELECT ps.*, 
             s.category, s.difficulty_level, s.recommended_age_min, s.recommended_age_max,
             s.estimated_duration_minutes, s.active as set_active,
             st.name as set_name, st.description as set_description,
             u.username as provider_username, u.company_name as provider_company
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN set_translations st ON s.set_id = st.set_id
      JOIN languages l ON st.language_id = l.language_id
      JOIN users u ON ps.provider_id = u.user_id
      WHERE ps.provider_set_id = ? AND l.language_code = 'en'
    `;

    const params = [id];

    // Role-based access control
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
      currency = 'EUR',
      is_active = true,
      notes
    } = req.body;

    const userRole = req.user.role;
    const userId = req.user.user_id;

    // Only providers can create provider sets for themselves, or admins can create for anyone
    if (userRole === 'provider' && provider_id != userId) {
      return res.status(403).json({ error: 'Providers can only create sets for themselves' });
    }

    const query = `
      INSERT INTO provider_sets (
        set_id, provider_id, price, currency, is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await db.query(query, [
      set_id, provider_id, price, currency, is_active ? 1 : 0, notes
    ]);

    const providerSetId = result.rows[0].id || result.lastID;

    res.status(201).json({
      message: 'Provider set created successfully',
      provider_set_id: providerSetId
    });

  } catch (error) {
    console.error('Error creating provider set:', error);
    res.status(500).json({ error: 'Failed to create provider set' });
  }
});

// Update provider set
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      price,
      currency,
      is_active,
      notes
    } = req.body;

    const userRole = req.user.role;
    const userId = req.user.user_id;

    // Check if user can update this provider set
    const checkQuery = 'SELECT provider_id FROM provider_sets WHERE provider_set_id = ?';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    const providerId = checkResult.rows[0].provider_id;

    // Only the provider who owns the set or an admin can update it
    if (userRole === 'provider' && providerId != userId) {
      return res.status(403).json({ error: 'You can only update your own provider sets' });
    }

    const query = `
      UPDATE provider_sets 
      SET price = ?, currency = ?, is_active = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE provider_set_id = ?
    `;

    await db.query(query, [price, currency, is_active ? 1 : 0, notes, id]);

    res.json({ message: 'Provider set updated successfully' });

  } catch (error) {
    console.error('Error updating provider set:', error);
    res.status(500).json({ error: 'Failed to update provider set' });
  }
});

// Delete provider set
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.user_id;

    // Check if user can delete this provider set
    const checkQuery = 'SELECT provider_id FROM provider_sets WHERE provider_set_id = ?';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    const providerId = checkResult.rows[0].provider_id;

    // Only the provider who owns the set or an admin can delete it
    if (userRole === 'provider' && providerId != userId) {
      return res.status(403).json({ error: 'You can only delete your own provider sets' });
    }

    await db.query('DELETE FROM provider_sets WHERE provider_set_id = ?', [id]);

    res.json({ message: 'Provider set deleted successfully' });

  } catch (error) {
    console.error('Error deleting provider set:', error);
    res.status(500).json({ error: 'Failed to delete provider set' });
  }
});

// Update provider set visibility
router.put('/:id/visibility', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_visible } = req.body;
    
    const userRole = req.user.role;
    const userId = req.user.user_id;

    // Check if user can update this provider set
    const checkQuery = 'SELECT provider_id FROM provider_sets WHERE provider_set_id = ?';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    const providerId = checkResult.rows[0].provider_id;

    // Only the provider who owns the set or an admin can update it
    if (userRole === 'provider' && providerId != userId) {
      return res.status(403).json({ error: 'You can only update your own provider sets' });
    }

    const query = `
      UPDATE provider_sets 
      SET provider_visible = ?, updated_at = CURRENT_TIMESTAMP
      WHERE provider_set_id = ?
    `;
    
    await db.run(query, [provider_visible ? 1 : 0, id]);
    
    console.log(`✅ Updated provider visibility for provider set ${id}: ${provider_visible}`);
    
    res.json({ 
      success: true, 
      message: `Provider set ${provider_visible ? 'enabled' : 'disabled'} by provider`,
      provider_visible: !!provider_visible
    });
    
  } catch (error) {
    console.error('❌ Error updating provider visibility:', error);
    res.status(500).json({ error: 'Failed to update provider visibility' });
  }
});

module.exports = router;
