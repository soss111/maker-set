const express = require('express');
const router = express.Router();
const connectionManager = require('../utils/sqliteConnectionManager');

/**
 * GET /api/favorites?user_id=1
 * List favorites for a user (returns array of favorite rows with set info).
 */
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    const sql = `
      SELECT f.*, s.name as set_name, s.description as set_description
      FROM favorites f
      LEFT JOIN sets s ON f.set_id = s.set_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `;
    const result = await connectionManager.query(sql, [user_id]);
    res.json(result.rows || []);
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/favorites/check?user_id=1&set_id=2
 * Check if a set is favorited by the user.
 */
router.get('/check', async (req, res) => {
  try {
    const { user_id, set_id } = req.query;
    if (!user_id || !set_id) {
      return res.status(400).json({ error: 'user_id and set_id are required' });
    }
    const sql = 'SELECT favorite_id FROM favorites WHERE user_id = ? AND set_id = ?';
    const result = await connectionManager.query(sql, [user_id, set_id]);
    const row = result.rows && result.rows[0];
    res.json({
      is_favorite: !!row,
      favorite_id: row ? row.favorite_id : null,
    });
  } catch (err) {
    console.error('Error checking favorite:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/favorites
 * Body: { user_id, set_id }
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, set_id } = req.body || {};
    if (!user_id || !set_id) {
      return res.status(400).json({ error: 'user_id and set_id are required' });
    }
    const sql = `
      INSERT OR IGNORE INTO favorites (user_id, set_id, created_at)
      VALUES (?, ?, datetime('now'))
    `;
    const result = await connectionManager.run(sql, [user_id, set_id]);
    res.json({
      success: true,
      favorite_id: result.lastID,
      message: 'Favorite added successfully',
    });
  } catch (err) {
    console.error('Error adding favorite:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/favorites?user_id=1&set_id=2
 */
router.delete('/', async (req, res) => {
  try {
    const { user_id, set_id } = req.query;
    if (!user_id || !set_id) {
      return res.status(400).json({ error: 'user_id and set_id are required' });
    }
    const sql = 'DELETE FROM favorites WHERE user_id = ? AND set_id = ?';
    await connectionManager.run(sql, [user_id, set_id]);
    res.json({ success: true, message: 'Favorite removed successfully' });
  } catch (err) {
    console.error('Error removing favorite:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
