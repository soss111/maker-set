/**
 * SQLite Connection Manager
 * 
 * Temporary SQLite implementation for development
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteConnectionManager {
  constructor() {
    this.db = null;
    this.isConnected = false;
    this.dbPath = path.join(__dirname, '..', 'database', 'makerset.db');
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Initializing SQLite database connection...');
        
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('❌ SQLite connection failed:', err.message);
            this.isConnected = false;
            reject(err);
            return;
          } else {
            console.log('✅ SQLite database connection established');
            this.isConnected = true;
            
            // Enable foreign keys
            this.db.run('PRAGMA foreign_keys = ON');
            
            // Test connection
            this.db.get('SELECT 1', (err, row) => {
              if (err) {
                console.error('❌ SQLite connection test failed:', err.message);
                this.isConnected = false;
                reject(err);
              } else {
                console.log('✅ SQLite connection test successful');
                resolve(true);
              }
            });
          }
        });
      } catch (error) {
        console.error('❌ SQLite connection failed:', error.message);
        this.isConnected = false;
        reject(error);
      }
    });
  }

  /**
   * Execute query with error handling
   */
  async query(text, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      // Convert PostgreSQL syntax to SQLite
      let sqliteQuery = text
        .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
        .replace(/DECIMAL\(\d+,\s*\d+\)/g, 'REAL')
        .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
        .replace(/BOOLEAN/g, 'INTEGER')
        .replace(/true/g, '1')
        .replace(/false/g, '0');

      // Convert PostgreSQL parameter placeholders ($1, $2, etc.) to SQLite placeholders (?)
      sqliteQuery = sqliteQuery.replace(/\$\d+/g, '?');

      this.db.all(sqliteQuery, params, (err, rows) => {
        if (err) {
          console.error('🚨 SQLite query error:', {
            query: sqliteQuery,
            params,
            error: err.message,
          });
          reject(err);
        } else {
          resolve({ rows, rowCount: rows ? rows.length : 0 });
        }
      });
    });
  }

  /**
   * Execute INSERT/UPDATE/DELETE query with lastID support
   */
  async run(text, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      // Convert PostgreSQL syntax to SQLite
      let sqliteQuery = text
        .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
        .replace(/DECIMAL\(\d+,\s*\d+\)/g, 'REAL')
        .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
        .replace(/BOOLEAN/g, 'INTEGER')
        .replace(/true/g, '1')
        .replace(/false/g, '0');

      // Convert PostgreSQL parameter placeholders ($1, $2, etc.) to SQLite placeholders (?)
      sqliteQuery = sqliteQuery.replace(/\$\d+/g, '?');

      this.db.run(sqliteQuery, params, function(err) {
        if (err) {
          console.error('🚨 SQLite run error:', {
            query: sqliteQuery,
            params,
            error: err.message,
          });
          reject(err);
        } else {
          resolve({ 
            lastID: this.lastID, 
            changes: this.changes 
          });
        }
      });
    });
  }

  /**
   * Get database connection
   */
  getConnection() {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: 0,
      poolStats: null,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔄 Shutting down SQLite connection...');
    
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing SQLite database:', err.message);
        } else {
          console.log('✅ SQLite database closed');
        }
      });
    }

    this.isConnected = false;
    console.log('✅ SQLite connection manager shutdown complete');
  }
}

// Create singleton instance
const connectionManager = new SQLiteConnectionManager();

module.exports = connectionManager;
