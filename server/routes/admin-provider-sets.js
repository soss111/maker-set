const express = require('express');
const router = express.Router();
const db = require('../utils/sqliteConnectionManager');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication and admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/admin/provider-sets - Get all provider sets with admin controls
router.get('/', async (req, res) => {
  try {
    console.log('📊 Fetching admin provider sets...');
    
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // Filter by status
    if (status && status !== 'all') {
      whereClause += ' AND ps.admin_status = ?';
      params.push(status);
    }
    
    // Search functionality
    if (search) {
      whereClause += ' AND (s.name LIKE ? OR s.description LIKE ? OR u.username LIKE ? OR u.company_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const query = `
      SELECT 
        ps.provider_set_id,
        ps.provider_id,
        ps.set_id,
        ps.price,
        ps.available_quantity,
        ps.is_active,
        ps.provider_visible,
        ps.admin_visible,
        ps.admin_status,
        ps.admin_notes,
        ps.created_at,
        ps.updated_at,
        s.name as set_name,
        s.description as set_description,
        s.category,
        s.difficulty_level,
        s.base_price,
        u.username as provider_username,
        u.first_name as provider_first_name,
        u.last_name as provider_last_name,
        u.company_name as provider_company,
        u.provider_code,
        u.email as provider_email
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN users u ON ps.provider_id = u.user_id
      ${whereClause}
      ORDER BY ps.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('🔍 Executing query:', query);
    console.log('📊 Query params:', params);
    
    const result = await db.query(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN users u ON ps.provider_id = u.user_id
      ${whereClause}
    `;
    
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await db.query(countQuery, countParams);
    const total = countResult.rows[0].total;
    
    console.log(`✅ Found ${result.rows.length} provider sets (total: ${total})`);
    
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
    console.error('❌ Error fetching admin provider sets:', error);
    res.status(500).json({ error: 'Failed to fetch provider sets' });
  }
});

// GET /api/admin/provider-sets/stats - Get provider set statistics
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_provider_sets,
        COALESCE(SUM(CASE WHEN admin_status = 'active' THEN 1 ELSE 0 END), 0) as active_sets,
        COALESCE(SUM(CASE WHEN admin_status = 'on_hold' THEN 1 ELSE 0 END), 0) as on_hold_sets,
        COALESCE(SUM(CASE WHEN admin_status = 'disabled' THEN 1 ELSE 0 END), 0) as disabled_sets,
        COALESCE(SUM(CASE WHEN admin_visible = 1 THEN 1 ELSE 0 END), 0) as visible_to_customers,
        COALESCE(SUM(CASE WHEN provider_visible = 1 THEN 1 ELSE 0 END), 0) as enabled_by_providers,
        COUNT(DISTINCT provider_id) as unique_providers
      FROM provider_sets
    `;
    
    const result = await db.query(statsQuery);
    const row = result.rows[0] || {};
    res.json({
      stats: {
        total_provider_sets: parseInt(row.total_provider_sets) || 0,
        active_sets: parseInt(row.active_sets) || 0,
        on_hold_sets: parseInt(row.on_hold_sets) || 0,
        disabled_sets: parseInt(row.disabled_sets) || 0,
        visible_to_customers: parseInt(row.visible_to_customers) || 0,
        enabled_by_providers: parseInt(row.enabled_by_providers) || 0,
        unique_providers: parseInt(row.unique_providers) || 0,
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching provider set stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/provider-sets/:id - Get specific provider set details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        ps.*,
        s.name as set_name,
        s.description as set_description,
        s.category,
        s.difficulty_level,
        s.base_price,
        u.username as provider_username,
        u.first_name as provider_first_name,
        u.last_name as provider_last_name,
        u.company_name as provider_company,
        u.provider_code,
        u.email as provider_email
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN users u ON ps.provider_id = u.user_id
      WHERE ps.provider_set_id = ?
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }
    
    res.json({ provider_set: result.rows[0] });
    
  } catch (error) {
    console.error('❌ Error fetching provider set:', error);
    res.status(500).json({ error: 'Failed to fetch provider set' });
  }
});

// PUT /api/admin/provider-sets/:id/visibility - Toggle admin visibility
router.put('/:id/visibility', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_visible } = req.body;
    
    const query = `
      UPDATE provider_sets 
      SET admin_visible = ?, updated_at = CURRENT_TIMESTAMP
      WHERE provider_set_id = ?
    `;
    
    await db.run(query, [admin_visible ? 1 : 0, id]);
    
    console.log(`✅ Updated admin visibility for provider set ${id}: ${admin_visible}`);
    
    res.json({ 
      success: true, 
      message: `Provider set ${admin_visible ? 'shown' : 'hidden'} to customers`,
      admin_visible: !!admin_visible
    });
    
  } catch (error) {
    console.error('❌ Error updating visibility:', error);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// PUT /api/admin/provider-sets/:id/status - Update admin status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_status, admin_notes } = req.body;
    
    const validStatuses = ['active', 'on_hold', 'disabled'];
    if (!validStatuses.includes(admin_status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: active, on_hold, or disabled' });
    }
    
    const query = `
      UPDATE provider_sets 
      SET admin_status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE provider_set_id = ?
    `;
    
    await db.run(query, [admin_status, admin_notes || null, id]);
    
    console.log(`✅ Updated admin status for provider set ${id}: ${admin_status}`);
    
    res.json({ 
      success: true, 
      message: `Provider set status updated to ${admin_status}`,
      admin_status,
      admin_notes
    });
    
  } catch (error) {
    console.error('❌ Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PUT /api/admin/provider-sets/:id/provider-visibility - Toggle provider visibility
router.put('/:id/provider-visibility', async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_visible } = req.body;
    
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

// DELETE /api/admin/provider-sets/:id - Remove provider set from platform
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM provider_sets WHERE provider_set_id = ?';
    await db.run(query, [id]);
    
    console.log(`✅ Deleted provider set ${id} from platform`);
    
    res.json({ 
      success: true, 
      message: 'Provider set removed from platform'
    });
    
  } catch (error) {
    console.error('❌ Error deleting provider set:', error);
    res.status(500).json({ error: 'Failed to delete provider set' });
  }
});

module.exports = router;
