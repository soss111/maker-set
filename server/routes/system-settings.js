/**
 * System Settings API Routes
 * 
 * Provides REST API endpoints for system configuration, backup/restore, and maintenance
 */

const express = require('express');
const router = express.Router();
const systemSettingsService = require('../services/systemSettingsService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get a single setting by key (public, no auth required for certain settings)
router.get('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const connectionManager = require('../utils/sqliteConnectionManager');
    
    const query = 'SELECT * FROM system_settings WHERE setting_key = ?';
    const { rows } = await connectionManager.query(query, [key]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Setting not found',
        setting: null,
        value: null
      });
    }
    
    const row = rows[0];
    res.json({ 
      success: true,
      setting: row,
      value: row.setting_value,
      setting_value: row.setting_value
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch setting',
      details: error.message
    });
  }
});

// Get all system settings
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await systemSettingsService.getSettings();
    res.json({
      success: true,
      data: settings,
      message: 'System settings retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system settings',
      details: error.message
    });
  }
});

// Update system settings
router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    const result = await systemSettingsService.updateSettings(settings);
    res.json({
      success: true,
      data: result,
      message: 'System settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system settings',
      details: error.message
    });
  }
});

// Create backup
router.post('/backup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { backupName, backupType = 'manual' } = req.body;
    const userId = req.user.user_id;
    
    const result = await systemSettingsService.createBackup(backupName, backupType, userId);
    res.json({
      success: true,
      data: result,
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup',
      details: error.message
    });
  }
});

// Restore backup
router.post('/restore/:backupId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { backupId } = req.params;
    const userId = req.user.user_id;
    
    const result = await systemSettingsService.restoreBackup(backupId, userId);
    res.json({
      success: true,
      data: result,
      message: 'Database restored successfully'
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup',
      details: error.message
    });
  }
});

// Get backup history
router.get('/backups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const backups = await systemSettingsService.getBackupHistory(parseInt(limit));
    
    res.json({
      success: true,
      data: backups,
      message: 'Backup history retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching backup history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup history',
      details: error.message
    });
  }
});

// Alias: client calls /backup-history
router.get('/backup-history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const backups = await systemSettingsService.getBackupHistory(parseInt(limit));
    res.json({ success: true, data: backups, message: 'Backup history retrieved successfully' });
  } catch (error) {
    console.error('Error fetching backup history:', error);
    res.json({ success: true, data: [], message: 'Backup history unavailable' });
  }
});

// Clear cache
router.post('/maintenance/clear-cache', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await systemSettingsService.clearCache(userId);
    
    res.json({
      success: true,
      data: result,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

// Optimize database
router.post('/maintenance/optimize-database', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await systemSettingsService.optimizeDatabase(userId);
    
    res.json({
      success: true,
      data: result,
      message: 'Database optimized successfully'
    });
  } catch (error) {
    console.error('Error optimizing database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize database',
      details: error.message
    });
  }
});

// System health check
router.post('/maintenance/system-check', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const result = await systemSettingsService.systemCheck(userId);
    
    res.json({
      success: true,
      data: result,
      message: 'System health check completed'
    });
  } catch (error) {
    console.error('Error running system check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run system check',
      details: error.message
    });
  }
});

// Get maintenance logs
router.get('/maintenance/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const logs = await systemSettingsService.getMaintenanceLogs(parseInt(limit));
    
    res.json({
      success: true,
      data: logs,
      message: 'Maintenance logs retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance logs',
      details: error.message
    });
  }
});

// Alias: client calls /maintenance-logs
router.get('/maintenance-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const logs = await systemSettingsService.getMaintenanceLogs(parseInt(limit));
    res.json({ success: true, data: logs, message: 'Maintenance logs retrieved successfully' });
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    res.json({ success: true, data: [], message: 'Maintenance logs unavailable' });
  }
});

// Get system health status (no auth required for dashboard)
router.get('/health', async (req, res) => {
  try {
    const checks = {
      database: await systemSettingsService.checkDatabaseHealth(),
      diskSpace: await systemSettingsService.checkDiskSpace(),
      memory: await systemSettingsService.checkMemoryUsage(),
      api: await systemSettingsService.checkApiHealth()
    };
    
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    res.json({
      success: true,
      data: {
        status: allHealthy ? 'healthy' : 'warning',
        checks,
        timestamp: new Date().toISOString()
      },
      message: 'System health status retrieved'
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system health',
      details: error.message
    });
  }
});

// Get system alerts (no auth required for dashboard)
router.get('/alerts', async (req, res) => {
  try {
    const connectionManager = require('../utils/sqliteConnectionManager');
    
    // Get low stock parts
    const lowStockQuery = `
      SELECT 
        part_id,
        name as part_name,
        stock_quantity,
        minimum_stock_level
      FROM parts 
      WHERE stock_quantity <= minimum_stock_level AND minimum_stock_level > 0
      ORDER BY (stock_quantity - minimum_stock_level) ASC
      LIMIT 5
    `;
    
    const { rows: lowStockRows } = await connectionManager.query(lowStockQuery);
    
    // Get tools that might need maintenance (simplified)
    const maintenanceQuery = `
      SELECT 
        tool_id,
        tool_name,
        description
      FROM tools 
      LIMIT 3
    `;
    
    const { rows: maintenanceRows } = await connectionManager.query(maintenanceQuery);
    
    const alerts = [];
    
    // Add low stock alerts
    lowStockRows.forEach(part => {
      alerts.push({
        id: `low-stock-${part.part_id}`,
        type: 'inventory',
        severity: part.stock_quantity === 0 ? 'critical' : 'warning',
        title: 'Low Stock Alert',
        message: `${part.part_name} is running low (${part.stock_quantity}/${part.minimum_stock_level})`,
        timestamp: new Date().toISOString(),
        data: {
          part_id: part.part_id,
          part_name: part.part_name,
          current_stock: part.stock_quantity,
          minimum_stock: part.minimum_stock_level
        }
      });
    });
    
    // Add maintenance alerts (simplified)
    maintenanceRows.forEach(tool => {
      alerts.push({
        id: `maintenance-${tool.tool_id}`,
        type: 'maintenance',
        severity: 'info',
        title: 'Tool Maintenance',
        message: `${tool.tool_name} may need maintenance`,
        timestamp: new Date().toISOString(),
        data: {
          tool_id: tool.tool_id,
          tool_name: tool.tool_name
        }
      });
    });
    
    res.json({
      success: true,
      data: alerts,
      message: 'System alerts retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system alerts',
      details: error.message
    });
  }
});

module.exports = router;

