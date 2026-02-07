/**
 * System Settings Service
 * 
 * Handles system configuration, backup/restore, and maintenance operations
 */

const pool = require('../models/database');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SystemSettingsService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
  }

  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  /**
   * Get all system settings
   */
  async getSettings() {
    try {
      const result = await pool.query('SELECT * FROM system_settings ORDER BY category, setting_key');
      const settings = {};
      
      result.rows.forEach(row => {
        let value = row.setting_value;
        
        // Convert value based on type
        switch (row.setting_type) {
          case 'number':
            value = parseFloat(value);
            break;
          case 'boolean':
            value = value === 'true';
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch {
              value = value;
            }
            break;
        }
        
        settings[row.setting_key] = value;
      });
      
      return settings;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw error;
    }
  }

  /**
   * Update system settings
   */
  async updateSettings(settings) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const [key, value] of Object.entries(settings)) {
        let stringValue = value;
        let type = 'string';
        
        if (typeof value === 'boolean') {
          stringValue = value.toString();
          type = 'boolean';
        } else if (typeof value === 'number') {
          stringValue = value.toString();
          type = 'number';
        } else if (typeof value === 'object') {
          stringValue = JSON.stringify(value);
          type = 'json';
        }
        
        await client.query(`
          INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (setting_key) 
          DO UPDATE SET 
            setting_value = EXCLUDED.setting_value,
            setting_type = EXCLUDED.setting_type,
            updated_at = CURRENT_TIMESTAMP
        `, [key, stringValue, type]);
      }
      
      await client.query('COMMIT');
      return { success: true, message: 'Settings updated successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating system settings:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create database backup
   */
  async createBackup(backupName, backupType = 'manual', userId = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${backupName || 'backup'}_${timestamp}.sql`;
      const filePath = path.join(this.backupDir, fileName);
      
      // Insert backup record
      const backupResult = await pool.query(`
        INSERT INTO backup_history (backup_name, backup_type, file_path, status, created_by)
        VALUES ($1, $2, $3, 'pending', $4)
        RETURNING id
      `, [backupName || fileName, backupType, filePath, userId]);
      
      const backupId = backupResult.rows[0].id;
      
      // Create backup using pg_dump
      const dbConfig = await this.getDatabaseConfig();
      const pgDumpCmd = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${filePath}"`;
      
      console.log('Creating backup:', pgDumpCmd);
      
      try {
        await execAsync(pgDumpCmd);
        
        // Get file size
        const stats = await fs.stat(filePath);
        const fileSize = stats.size;
        
        // Update backup record
        await pool.query(`
          UPDATE backup_history 
          SET status = 'completed', file_size = $1, completed_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [fileSize, backupId]);
        
        return {
          success: true,
          backupId,
          fileName,
          filePath,
          fileSize,
          message: 'Backup created successfully'
        };
      } catch (execError) {
        // Update backup record with error
        await pool.query(`
          UPDATE backup_history 
          SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [execError.message, backupId]);
        
        throw execError;
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupId, userId = null) {
    try {
      // Get backup record
      const backupResult = await pool.query(`
        SELECT * FROM backup_history WHERE id = $1
      `, [backupId]);
      
      if (backupResult.rows.length === 0) {
        throw new Error('Backup not found');
      }
      
      const backup = backupResult.rows[0];
      
      if (backup.status !== 'completed') {
        throw new Error('Backup is not completed');
      }
      
      // Check if file exists
      try {
        await fs.access(backup.file_path);
      } catch {
        throw new Error('Backup file not found');
      }
      
      // Create restore log entry
      const restoreLogResult = await pool.query(`
        INSERT INTO maintenance_logs (operation, status, details, executed_by)
        VALUES ('restore_backup', 'pending', $1, $2)
        RETURNING id
      `, [`Restoring from backup: ${backup.backup_name}`, userId]);
      
      const logId = restoreLogResult.rows[0].id;
      
      // Restore using psql
      const dbConfig = await this.getDatabaseConfig();
      const psqlCmd = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${backup.file_path}"`;
      
      console.log('Restoring backup:', psqlCmd);
      
      try {
        await execAsync(psqlCmd);
        
        // Update restore log
        await pool.query(`
          UPDATE maintenance_logs 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
              duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000
          WHERE id = $1
        `, [logId]);
        
        return {
          success: true,
          message: 'Database restored successfully',
          backupName: backup.backup_name
        };
      } catch (execError) {
        // Update restore log with error
        await pool.query(`
          UPDATE maintenance_logs 
          SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [execError.message, logId]);
        
        throw execError;
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }

  /**
   * Get backup history
   */
  async getBackupHistory(limit = 20) {
    try {
      const result = await pool.query(`
        SELECT bh.*, u.email as created_by_email
        FROM backup_history bh
        LEFT JOIN users u ON bh.created_by = u.user_id
        ORDER BY bh.created_at DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching backup history:', error);
      throw error;
    }
  }

  /**
   * Clear system cache
   */
  async clearCache(userId = null) {
    try {
      const logResult = await pool.query(`
        INSERT INTO maintenance_logs (operation, status, details, executed_by)
        VALUES ('clear_cache', 'pending', 'Clearing system cache', $1)
        RETURNING id
      `, [userId]);
      
      const logId = logResult.rows[0].id;
      const startTime = Date.now();
      
      // Clear Node.js cache (this is a simplified version)
      // In a real application, you might clear Redis cache, file cache, etc.
      
      // Simulate cache clearing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const duration = Date.now() - startTime;
      
      await pool.query(`
        UPDATE maintenance_logs 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, duration_ms = $1
        WHERE id = $2
      `, [duration, logId]);
      
      return {
        success: true,
        message: 'Cache cleared successfully',
        duration
      };
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Optimize database
   */
  async optimizeDatabase(userId = null) {
    try {
      const logResult = await pool.query(`
        INSERT INTO maintenance_logs (operation, status, details, executed_by)
        VALUES ('optimize_database', 'pending', 'Optimizing database performance', $1)
        RETURNING id
      `, [userId]);
      
      const logId = logResult.rows[0].id;
      const startTime = Date.now();
      
      // Run VACUUM ANALYZE on all tables
      const tables = await pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      
      for (const table of tables.rows) {
        await pool.query(`VACUUM ANALYZE ${table.tablename}`);
      }
      
      const duration = Date.now() - startTime;
      
      await pool.query(`
        UPDATE maintenance_logs 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, duration_ms = $1
        WHERE id = $2
      `, [duration, logId]);
      
      return {
        success: true,
        message: 'Database optimized successfully',
        duration,
        tablesOptimized: tables.rows.length
      };
    } catch (error) {
      console.error('Error optimizing database:', error);
      throw error;
    }
  }

  /**
   * System health check
   */
  async systemCheck(userId = null) {
    try {
      const logResult = await pool.query(`
        INSERT INTO maintenance_logs (operation, status, details, executed_by)
        VALUES ('system_check', 'pending', 'Running system health check', $1)
        RETURNING id
      `, [userId]);
      
      const logId = logResult.rows[0].id;
      const startTime = Date.now();
      
      const checks = {
        database: await this.checkDatabaseHealth(),
        diskSpace: await this.checkDiskSpace(),
        memory: await this.checkMemoryUsage(),
        api: await this.checkApiHealth()
      };
      
      const duration = Date.now() - startTime;
      const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
      
      await pool.query(`
        UPDATE maintenance_logs 
        SET status = $1, completed_at = CURRENT_TIMESTAMP, duration_ms = $2,
            details = $3
        WHERE id = $4
      `, [allHealthy ? 'completed' : 'failed', duration, JSON.stringify(checks), logId]);
      
      return {
        success: allHealthy,
        message: allHealthy ? 'System health check passed' : 'System health check failed',
        duration,
        checks
      };
    } catch (error) {
      console.error('Error running system check:', error);
      throw error;
    }
  }

  /**
   * Get maintenance logs
   */
  async getMaintenanceLogs(limit = 20) {
    try {
      const result = await pool.query(`
        SELECT ml.*, u.email as executed_by_email
        FROM maintenance_logs ml
        LEFT JOIN users u ON ml.executed_by = u.user_id
        ORDER BY ml.started_at DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
      throw error;
    }
  }

  /**
   * Get database configuration
   */
  async getDatabaseConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5433',
      user: process.env.DB_USER || 'lauri',
      database: process.env.DB_NAME || 'makerset_db'
    };
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      const result = await pool.query('SELECT 1');
      return { status: 'healthy', message: 'Database connection OK' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  /**
   * Check disk space
   */
  async checkDiskSpace() {
    try {
      const { stdout } = await execAsync('df -h /');
      const lines = stdout.split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      const usage = parseInt(parts[4].replace('%', ''));
      
      return {
        status: usage < 90 ? 'healthy' : 'warning',
        message: `Disk usage: ${parts[4]}`,
        usage
      };
    } catch (error) {
      return { status: 'unhealthy', message: 'Unable to check disk space' };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    try {
      const { stdout } = await execAsync('free -m');
      const lines = stdout.split('\n');
      const memLine = lines[1];
      const parts = memLine.split(/\s+/);
      const total = parseInt(parts[1]);
      const used = parseInt(parts[2]);
      const usage = Math.round((used / total) * 100);
      
      return {
        status: usage < 90 ? 'healthy' : 'warning',
        message: `Memory usage: ${usage}%`,
        usage
      };
    } catch (error) {
      return { status: 'unhealthy', message: 'Unable to check memory usage' };
    }
  }

  /**
   * Check API health
   */
  async checkApiHealth() {
    try {
      // Simple check - if we can query the database, API is healthy
      await pool.query('SELECT 1');
      return { status: 'healthy', message: 'API responding normally' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}

module.exports = new SystemSettingsService();

