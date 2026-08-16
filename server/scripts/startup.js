/**
 * Startup Script
 * 
 * Handles proper application startup
 * Checks dependencies and initializes services
 * Provides startup diagnostics
 */

const fs = require('fs');
const path = require('path');
const connectionManager = require('../utils/sqliteConnectionManager');

/** Run schema-simple.sql when parts table is missing (base: languages, sets, parts, etc.). */
function ensureBaseSchema() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    db.get(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='parts'",
      [],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row) {
          resolve();
          return;
        }
        const sqlPath = path.join(__dirname, '../database/schema-simple.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        db.exec(sql, (execErr) => {
          if (execErr) {
            console.error('❌ Base schema init failed:', execErr.message);
            reject(execErr);
          } else {
            console.log('✅ Base schema (languages, sets, parts, etc.) initialized');
            resolve();
          }
        });
      }
    );
  });
}

/** Run init-sqlite-tools.sql when tools table is missing. */
function ensureToolsTable() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    db.get(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='tools'",
      [],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row) {
          resolve();
          return;
        }
        const sqlPath = path.join(__dirname, '../database/init-sqlite-tools.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        db.exec(sql, (execErr) => {
          if (execErr) {
            console.error('❌ Tools table init failed:', execErr.message);
            reject(execErr);
          } else {
            console.log('✅ Tools tables initialized');
            resolve();
          }
        });
      }
    );
  });
}

/** Add missing columns to sets table (name, description, base_price, video_url, learning_outcomes, created_at, updated_at). */
function ensureSetsColumns() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    db.all('PRAGMA table_info(sets)', [], (err, cols) => {
      if (err) {
        reject(err);
        return;
      }
      const have = new Set((cols || []).map((c) => c.name));
      const required = [
        { name: 'name', def: 'TEXT' },
        { name: 'description', def: 'TEXT' },
        { name: 'base_price', def: 'REAL' },
        { name: 'video_url', def: 'TEXT' },
        { name: 'learning_outcomes', def: 'TEXT' },
        { name: 'created_at', def: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
        { name: 'updated_at', def: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
        { name: 'tested_by_makerset', def: 'INTEGER DEFAULT 0' },
        { name: 'admin_visible', def: 'INTEGER DEFAULT 1' },
      ];
      const toAdd = required.filter((r) => !have.has(r.name));
      if (toAdd.length === 0) {
        resolve();
        return;
      }
      const runNext = (i) => {
        if (i >= toAdd.length) {
          console.log('✅ Sets table columns updated');
          resolve();
          return;
        }
        const col = toAdd[i];
        db.run(`ALTER TABLE sets ADD COLUMN ${col.name} ${col.def}`, [], (alterErr) => {
          if (alterErr) {
            console.error('❌ Sets column add failed:', alterErr.message);
            reject(alterErr);
          } else {
            runNext(i + 1);
          }
        });
      };
      runNext(0);
    });
  });
}

/** Add missing columns to provider_sets (provider_visible, admin_visible, admin_status, admin_notes). */
function ensureProviderSetsColumns() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    db.get(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='provider_sets'",
      [],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          resolve();
          return;
        }
        db.all('PRAGMA table_info(provider_sets)', [], (err2, cols) => {
          if (err2) {
            reject(err2);
            return;
          }
          const have = new Set((cols || []).map((c) => c.name));
          const required = [
            { name: 'provider_visible', def: 'INTEGER DEFAULT 1' },
            { name: 'admin_visible', def: 'INTEGER DEFAULT 1' },
            { name: 'admin_status', def: 'TEXT DEFAULT \'active\'' },
            { name: 'admin_notes', def: 'TEXT' },
          ];
          const toAdd = required.filter((r) => !have.has(r.name));
          if (toAdd.length === 0) {
            resolve();
            return;
          }
          const runNext = (i) => {
            if (i >= toAdd.length) {
              console.log('✅ provider_sets table columns updated');
              resolve();
              return;
            }
            const col = toAdd[i];
            db.run(`ALTER TABLE provider_sets ADD COLUMN ${col.name} ${col.def}`, [], (alterErr) => {
              if (alterErr) {
                console.error('❌ provider_sets column add failed:', alterErr.message);
                reject(alterErr);
              } else {
                runNext(i + 1);
              }
            });
          };
          runNext(0);
        });
      }
    );
  });
}

/** Add missing columns to parts table (translations, name, description, updated_at for route compatibility). */
function ensurePartsColumns() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    db.all('PRAGMA table_info(parts)', [], (err, cols) => {
      if (err) {
        reject(err);
        return;
      }
      const have = new Set((cols || []).map((c) => c.name));
      const required = [
        { name: 'translations', def: 'TEXT' },
        { name: 'name', def: 'TEXT' },
        { name: 'description', def: 'TEXT' },
        { name: 'updated_at', def: 'TEXT DEFAULT CURRENT_TIMESTAMP' },
      ];
      const toAdd = required.filter((r) => !have.has(r.name));
      if (toAdd.length === 0) {
        resolve();
        return;
      }
      const runNext = (i) => {
        if (i >= toAdd.length) {
          console.log('✅ Parts table columns updated');
          resolve();
          return;
        }
        const col = toAdd[i];
        db.run(`ALTER TABLE parts ADD COLUMN ${col.name} ${col.def}`, [], (alterErr) => {
          if (alterErr) {
            console.error('❌ Parts column add failed:', alterErr.message);
            reject(alterErr);
          } else {
            runNext(i + 1);
          }
        });
      };
      runNext(0);
    });
  });
}

/** Add missing columns to tools table (for existing DBs created before tool_name/translations/active). */
function ensureToolsColumns() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    db.all('PRAGMA table_info(tools)', [], (err, cols) => {
      if (err) {
        reject(err);
        return;
      }
      const have = new Set((cols || []).map((c) => c.name));
      const required = ['tool_name', 'safety_instructions', 'translations', 'active'];
      const toAdd = required.filter((name) => !have.has(name));
      if (toAdd.length === 0) {
        resolve();
        return;
      }
      const runNext = (i) => {
        if (i >= toAdd.length) {
          console.log('✅ Tools table columns updated');
          resolve();
          return;
        }
        const col = toAdd[i];
        const def = col === 'active' ? 'INTEGER DEFAULT 1' : 'TEXT';
        db.run(`ALTER TABLE tools ADD COLUMN ${col} ${def}`, [], (alterErr) => {
          if (alterErr) {
            console.error('❌ Tools column add failed:', alterErr.message);
            reject(alterErr);
          } else {
            runNext(i + 1);
          }
        });
      };
      runNext(0);
    });
  });
}

/** Run init-sqlite-auth.sql so users, orders, system_settings exist (idempotent). */
function ensureAuthTables() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    db.get(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'",
      [],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row) {
          resolve();
          return;
        }
        const sqlPath = path.join(__dirname, '../database/init-sqlite-auth.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        db.exec(sql, (execErr) => {
          if (execErr) {
            console.error('❌ Auth tables init failed:', execErr.message);
            reject(execErr);
          } else {
            console.log('✅ Auth tables (users, orders, system_settings) initialized');
            resolve();
          }
        });
      }
    );
  });
}

/** Ensure login_codes table exists for email OTP login (idempotent). */
function ensureLoginCodesTable() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    const sql = `CREATE TABLE IF NOT EXISTS login_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes(email);`;
    db.exec(sql, (err) => {
      if (err) {
        console.error('❌ login_codes table create failed:', err.message);
        reject(err);
      } else {
        console.log('✅ login_codes table ensured');
        resolve();
      }
    });
  });
}

/** Create ratings table if missing (for shop-sets subqueries). */
function ensureRatingsTable() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    const sql = `CREATE TABLE IF NOT EXISTS ratings (
      rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id INTEGER REFERENCES sets(set_id),
      user_id INTEGER REFERENCES users(user_id),
      rating INTEGER NOT NULL,
      review_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`;
    db.run(sql, [], (err) => {
      if (err) {
        console.error('❌ Ratings table create failed:', err.message);
        reject(err);
      } else {
        console.log('✅ Ratings table ensured');
        resolve();
      }
    });
  });
}

/** Create favorites table if missing. */
function ensureFavoritesTable() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    const sql = `CREATE TABLE IF NOT EXISTS favorites (
      favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(user_id),
      set_id INTEGER NOT NULL REFERENCES sets(set_id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, set_id)
    )`;
    db.run(sql, [], (err) => {
      if (err) {
        console.error('❌ Favorites table create failed:', err.message);
        reject(err);
      } else {
        console.log('✅ Favorites table ensured');
        resolve();
      }
    });
  });
}

/** Add missing columns to media_files (media_category, set_id, part_id, is_featured, display_order for upload route). */
function ensureMediaFilesColumns() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    db.get(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='media_files'",
      [],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          resolve();
          return;
        }
        db.all('PRAGMA table_info(media_files)', [], (err2, cols) => {
          if (err2) {
            reject(err2);
            return;
          }
          const have = new Set((cols || []).map((c) => c.name));
          const required = [
            { name: 'media_category', def: 'TEXT' },
            { name: 'set_id', def: 'INTEGER REFERENCES sets(set_id)' },
            { name: 'part_id', def: 'INTEGER REFERENCES parts(part_id)' },
            { name: 'is_featured', def: 'INTEGER DEFAULT 0' },
            { name: 'display_order', def: 'INTEGER DEFAULT 0' },
            { name: 'description', def: 'TEXT' },
            { name: 'alt_text', def: 'TEXT' },
            { name: 'created_at', def: 'TEXT' },
          ];
          const toAdd = required.filter((r) => !have.has(r.name));
          if (toAdd.length === 0) {
            resolve();
            return;
          }
          const runNext = (i) => {
            if (i >= toAdd.length) {
              console.log('✅ media_files columns updated');
              resolve();
              return;
            }
            const col = toAdd[i];
            db.run(`ALTER TABLE media_files ADD COLUMN ${col.name} ${col.def}`, [], (alterErr) => {
              if (alterErr) {
                console.error('❌ media_files column add failed:', alterErr.message);
                reject(alterErr);
              } else {
                runNext(i + 1);
              }
            });
          };
          runNext(0);
        });
      }
    );
  });
}

/** Create inventory_transactions table if missing (for inventory and orders routes). */
function ensureInventoryTransactionsTable() {
  return new Promise((resolve, reject) => {
    const db = connectionManager.getConnection();
    const sql = `CREATE TABLE IF NOT EXISTS inventory_transactions (
      transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_id INTEGER NOT NULL REFERENCES parts(part_id),
      transaction_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      previous_stock REAL,
      new_stock REAL,
      reason TEXT,
      notes TEXT,
      supplier TEXT,
      cost_per_unit REAL,
      purchase_date TEXT,
      reference_id INTEGER,
      reference_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`;
    db.run(sql, [], (err) => {
      if (err) {
        console.error('❌ inventory_transactions table create failed:', err.message);
        reject(err);
      } else {
        console.log('✅ inventory_transactions table ensured');
        resolve();
      }
    });
  });
}

async function startup() {
  console.log('🚀 Starting MakerLab STEM Platform...');
  console.log('=' .repeat(50));

  // Check environment variables
  console.log('🔍 Checking environment configuration...');
  console.log('📝 Using SQLite database - no external database configuration needed');

  // Initialize database connection
  console.log('🔌 Initializing database connection...');
  const dbSuccess = await connectionManager.initializeDatabase();
  
  if (dbSuccess) {
    console.log('✅ Database connection established');
    // Ensure base schema (parts, sets, languages), then column migrations, then auth
    await ensureBaseSchema();
    await ensureSetsColumns();
    await ensurePartsColumns();
    await ensureToolsTable();
    await ensureToolsColumns();
    await ensureAuthTables();
    await ensureLoginCodesTable();
    await ensureProviderSetsColumns();
    await ensureRatingsTable();
    await ensureFavoritesTable();
    await ensureInventoryTransactionsTable();
    await ensureMediaFilesColumns();
  } else {
    console.error('❌ Database connection failed');
    console.log('🔄 Will attempt reconnection in background');
  }

  // Check translation services
  console.log('🌐 Checking translation services...');
  try {
    const translationService = require('../ai/translation-service-v2');
    console.log('✅ Translation service initialized');
    console.log('📊 Translation layers: LibreTranslate → OpenAI → Static Fallback');
  } catch (error) {
    console.error('❌ Translation service initialization failed:', error.message);
  }

  // Check file system
  console.log('📁 Checking file system...');
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Created uploads directory');
    } else {
      console.log('✅ Uploads directory exists');
    }
  } catch (error) {
    console.error('❌ File system check failed:', error.message);
  }

  // Display system information
  console.log('=' .repeat(50));
  console.log('📊 System Information:');
  console.log(`   Node.js Version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database: SQLite (makerset.db)`);
  console.log('=' .repeat(50));

  return {
    database: dbSuccess,
    translation: true,
    filesystem: true,
  };
}

module.exports = { startup };
