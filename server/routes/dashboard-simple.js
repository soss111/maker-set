const express = require('express');
const router = express.Router();
const pool = require('../models/database');

// Simple dashboard statistics that work with existing SQLite schema
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching simple dashboard statistics...');
    
    // Get basic counts from all tables
    const [
      partsResult,
      toolsResult,
      usersResult,
      setsResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM parts'),
      pool.query('SELECT COUNT(*) as count FROM tools'),
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM sets')
    ]);

    const stats = {
      inventory: {
        totalItems: parseInt(partsResult.rows[0].count) || 0,
        available: parseInt(partsResult.rows[0].count) || 0,
        reserved: 0,
        lowStockItems: 0,
        efficiency: 100,
        totalValue: 0
      },
      tools: {
        total: parseInt(toolsResult.rows[0].count) || 0,
        active: parseInt(toolsResult.rows[0].count) || 0,
        maintenance: 0,
        efficiency: 100,
        overdueMaintenance: 0
      },
      orders: {
        pending: 0,
        processing: 0,
        completed: 0,
        total: 0,
        revenue: 0
      },
      users: {
        total: parseInt(usersResult.rows[0].count) || 0,
        active: parseInt(usersResult.rows[0].count) || 0,
        new: parseInt(usersResult.rows[0].count) || 0
      },
      sets: {
        total: parseInt(setsResult.rows[0].count) || 0,
        active: parseInt(setsResult.rows[0].count) || 0,
        inactive: 0
      },
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ Simple dashboard statistics fetched successfully');
    res.json({
      success: true,
      data: stats
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

// Analytics endpoint for compatibility with frontend
router.get('/analytics', async (req, res) => {
  try {
    console.log('📊 Fetching dashboard analytics...');
    
    // Get comprehensive statistics
    const [
      partsResult,
      toolsResult,
      ordersResult,
      usersResult,
      setsResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM parts'),
      pool.query('SELECT COUNT(*) as count FROM tools'),
      pool.query('SELECT COUNT(*) as count FROM orders'),
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM sets')
    ]);

    // Get raw data for the frontend
    const [rawPartsResult, rawToolsResult, rawOrdersResult, rawUsersResult, rawSetsResult] = await Promise.all([
      pool.query('SELECT * FROM parts LIMIT 10'),
      pool.query('SELECT * FROM tools LIMIT 10'),
      pool.query('SELECT * FROM orders LIMIT 10'),
      pool.query('SELECT * FROM users LIMIT 10'),
      pool.query('SELECT * FROM sets LIMIT 10')
    ]);

    const analytics = {
      inventory: {
        totalParts: parseInt(partsResult.rows[0].count) || 0,
        totalStock: parseInt(partsResult.rows[0].count) || 0,
        lowStockParts: 0,
        efficiency: 100,
        inventoryValue: 0
      },
      tools: {
        totalTools: parseInt(toolsResult.rows[0].count) || 0,
        activeTools: parseInt(toolsResult.rows[0].count) || 0,
        maintenanceTools: 0,
        efficiency: 100
      },
      orders: {
        pendingOrders: 0,
        processingOrders: 0,
        completedOrders: parseInt(ordersResult.rows[0].count) || 0,
        totalOrders: parseInt(ordersResult.rows[0].count) || 0,
        efficiency: 100,
        totalRevenue: 0
      },
      users: {
        activeUsers: parseInt(usersResult.rows[0].count) || 0,
        totalUsers: parseInt(usersResult.rows[0].count) || 0,
        newUsers: parseInt(usersResult.rows[0].count) || 0
      },
      sets: {
        totalSets: parseInt(setsResult.rows[0].count) || 0,
        activeSets: parseInt(setsResult.rows[0].count) || 0,
        inactiveSets: 0
      },
      rawData: {
        parts: rawPartsResult.rows || [],
        tools: rawToolsResult.rows || [],
        orders: rawOrdersResult.rows || [],
        users: rawUsersResult.rows || [],
        sets: rawSetsResult.rows || []
      }
    };

    console.log('✅ Dashboard analytics fetched successfully');
    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics',
      details: error.message
    });
  }
});

module.exports = router;
