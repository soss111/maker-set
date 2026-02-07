const express = require('express');
const router = express.Router();
const db = require('../models/database');
const authenticateToken = require('../middleware/auth').authenticateToken;

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        user_id,
        email,
        username,
        first_name,
        last_name,
        company_name,
        role,
        created_at,
        updated_at
      FROM users
      WHERE user_id = ?
    `;

    const result = await db.query(query, [req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get all users with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company_name LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereConditions.push('role = ?');
      queryParams.push(role);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        user_id,
        email,
        username,
        first_name,
        last_name,
        company_name,
        role,
        created_at,
        updated_at
      FROM users
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user role counts (for AI Assistant / analytics) - MUST be before /:id route
router.get('/role-stats', async (req, res) => {
  try {
    const [adminRes, productionRes, customerRes, providerRes] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']),
      db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['production']),
      db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['customer']),
      db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['provider'])
    ]);
    const data = {
      admin: parseInt(adminRes.rows && adminRes.rows[0] && adminRes.rows[0].count, 10) || 0,
      production: parseInt(productionRes.rows && productionRes.rows[0] && productionRes.rows[0].count, 10) || 0,
      customer: parseInt(customerRes.rows && customerRes.rows[0] && customerRes.rows[0].count, 10) || 0,
      provider: parseInt(providerRes.rows && providerRes.rows[0] && providerRes.rows[0].count, 10) || 0,
    };
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching role stats:', error);
    res.status(500).json({
      success: false,
      data: { admin: 0, production: 0, customer: 0, provider: 0 },
    });
  }
});

// Get user statistics (for dashboard) - MUST be before /:id route
router.get('/stats', async (req, res) => {
  try {
    // Get basic user statistics
    const [
      totalUsersResult,
      activeUsersResult,
      adminUsersResult,
      providerUsersResult,
      customerUsersResult
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1'),
      db.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"'),
      db.query('SELECT COUNT(*) as count FROM users WHERE role = "provider"'),
      db.query('SELECT COUNT(*) as count FROM users WHERE role = "customer"')
    ]);

    const stats = {
      total_users: parseInt(totalUsersResult.rows[0].count) || 0,
      active_users: parseInt(activeUsersResult.rows[0].count) || 0,
      admin_users: parseInt(adminUsersResult.rows[0].count) || 0,
      provider_users: parseInt(providerUsersResult.rows[0].count) || 0,
      customer_users: parseInt(customerUsersResult.rows[0].count) || 0,
      new_users_this_month: 0, // Could be calculated with date filtering
      efficiency: 100
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics'
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        user_id,
        email,
        username,
        first_name,
        last_name,
        company_name,
        role,
        created_at,
        updated_at
      FROM users
      WHERE user_id = ?
    `;

    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      company_name,
      username,
      role
    } = req.body;

    const query = `
      UPDATE users 
      SET first_name = ?, last_name = ?, company_name = ?, username = ?, role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    await db.query(query, [first_name, last_name, company_name, username, role, id]);

    res.json({ message: 'User updated successfully' });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has any associated data
    const setsResult = await db.query('SELECT COUNT(*) as count FROM sets WHERE provider_id = ?', [id]);
    const ordersResult = await db.query('SELECT COUNT(*) as count FROM orders WHERE customer_id = ? OR provider_id = ?', [id, id]);

    if (setsResult.rows[0].count > 0 || ordersResult.rows[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with associated sets or orders' 
      });
    }

    await db.query('DELETE FROM users WHERE user_id = ?', [id]);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Get sets count
    const setsResult = await db.query('SELECT COUNT(*) as count FROM sets WHERE provider_id = ?', [id]);
    const setsCount = parseInt(setsResult.rows[0].count);

    // Get orders count
    const ordersResult = await db.query('SELECT COUNT(*) as count FROM orders WHERE customer_id = ? OR provider_id = ?', [id, id]);
    const ordersCount = parseInt(ordersResult.rows[0].count);

    // Get total revenue (as provider)
    const revenueResult = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue 
      FROM orders 
      WHERE provider_id = ? AND status = 'completed'
    `, [id]);
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

    res.json({
      sets_count: setsCount,
      orders_count: ordersCount,
      total_revenue: totalRevenue
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;
