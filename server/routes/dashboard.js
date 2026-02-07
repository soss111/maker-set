const express = require('express');
const router = express.Router();
const pool = require('../models/database');

// Get dashboard statistics (no auth required for dashboard display)
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching dashboard statistics...');
    
    // Get all statistics in parallel
    const [
      partsResult,
      toolsResult,
      ordersResult,
      usersResult,
      setsResult
    ] = await Promise.all([
      // Parts statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_parts,
          COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as available_parts,
          COUNT(CASE WHEN stock_quantity <= minimum_stock_level AND minimum_stock_level > 0 THEN 1 END) as low_stock_parts
        FROM parts
      `),
      
      // Tools statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_tools,
          COUNT(CASE WHEN active = 1 THEN 1 END) as active_tools,
          0 as maintenance_tools
        FROM tools
      `),
      
      // Orders statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
          COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as total_revenue
        FROM orders
      `),
      
      // Users statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN last_login IS NOT NULL THEN 1 END) as active_users,
          COUNT(*) as new_users
        FROM users
      `),
      
      // Sets statistics
      pool.query(`
        SELECT 
          COUNT(*) as total_sets,
          COUNT(CASE WHEN active = true THEN 1 END) as active_sets,
          COUNT(CASE WHEN active = false THEN 1 END) as inactive_sets
        FROM sets
      `)
    ]);

    const stats = {
      inventory: {
        totalItems: parseInt(partsResult.rows[0].total_parts) || 0,
        available: parseInt(partsResult.rows[0].available_parts) || 0,
        reserved: 0, // This would need order_items calculation
        lowStockItems: parseInt(partsResult.rows[0].low_stock_parts) || 0,
        efficiency: 100, // Calculate based on low stock ratio
        totalValue: 0 // Would need parts * unit_cost calculation
      },
      tools: {
        total: parseInt(toolsResult.rows[0].total_tools) || 0,
        active: parseInt(toolsResult.rows[0].active_tools) || 0,
        maintenance: parseInt(toolsResult.rows[0].maintenance_tools) || 0,
        efficiency: toolsResult.rows[0].total_tools > 0 
          ? Math.round((parseInt(toolsResult.rows[0].active_tools) / parseInt(toolsResult.rows[0].total_tools)) * 100)
          : 100
      },
      orders: {
        total: parseInt(ordersResult.rows[0].total_orders) || 0,
        pending: parseInt(ordersResult.rows[0].pending_orders) || 0,
        processing: parseInt(ordersResult.rows[0].processing_orders) || 0,
        completed: parseInt(ordersResult.rows[0].completed_orders) || 0,
        efficiency: ordersResult.rows[0].total_orders > 0
          ? Math.round((parseInt(ordersResult.rows[0].completed_orders) / parseInt(ordersResult.rows[0].total_orders)) * 100)
          : 100,
        totalRevenue: parseFloat(ordersResult.rows[0].total_revenue) || 0
      },
      users: {
        total: parseInt(usersResult.rows[0].total_users) || 0,
        active: parseInt(usersResult.rows[0].active_users) || 0,
        newUsers: parseInt(usersResult.rows[0].new_users) || 0,
        efficiency: usersResult.rows[0].total_users > 0
          ? Math.round((parseInt(usersResult.rows[0].active_users) / parseInt(usersResult.rows[0].total_users)) * 100)
          : 100
      },
      sets: {
        total: parseInt(setsResult.rows[0].total_sets) || 0,
        active: parseInt(setsResult.rows[0].active_sets) || 0,
        inactive: parseInt(setsResult.rows[0].inactive_sets) || 0
      }
    };

    console.log('✅ Dashboard statistics calculated:', stats);
    
    res.json({
      success: true,
      data: stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard statistics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message 
    });
  }
});

module.exports = router;
