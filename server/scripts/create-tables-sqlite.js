/**
 * Create all SQLite tables for MakerSet.
 * Idempotent: skips each step if the relevant tables already exist.
 * Run from server: node scripts/create-tables-sqlite.js
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/makerset.db');
const db = new sqlite3.Database(dbPath);

function runSql(fileName) {
  return new Promise((resolve, reject) => {
    const sqlPath = path.join(__dirname, '../database', fileName);
    if (!fs.existsSync(sqlPath)) {
      resolve({ skipped: true, reason: 'file not found' });
      return;
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve({ ok: true });
    });
  });
}

function tableExists(name) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
      [name],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

function ensureSetsColumns() {
  return new Promise((resolve, reject) => {
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
          console.log('  Sets table: added missing columns.');
          resolve();
          return;
        }
        const col = toAdd[i];
        db.run(`ALTER TABLE sets ADD COLUMN ${col.name} ${col.def}`, [], (alterErr) => {
          if (alterErr) reject(alterErr);
          else runNext(i + 1);
        });
      };
      runNext(0);
    });
  });
}

function ensureProviderSetsColumns() {
  return new Promise((resolve, reject) => {
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
              console.log('  provider_sets table: added missing columns.');
              resolve();
              return;
            }
            const col = toAdd[i];
            db.run(`ALTER TABLE provider_sets ADD COLUMN ${col.name} ${col.def}`, [], (alterErr) => {
              if (alterErr) reject(alterErr);
              else runNext(i + 1);
            });
          };
          runNext(0);
        });
      }
    );
  });
}

function ensurePartsColumns() {
  return new Promise((resolve, reject) => {
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
          console.log('  Parts table: added missing columns.');
          resolve();
          return;
        }
        const col = toAdd[i];
        db.run(`ALTER TABLE parts ADD COLUMN ${col.name} ${col.def}`, [], (alterErr) => {
          if (alterErr) reject(alterErr);
          else runNext(i + 1);
        });
      };
      runNext(0);
    });
  });
}

function ensureToolsColumns() {
  return new Promise((resolve, reject) => {
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
          console.log('  Tools table: added missing columns.');
          resolve();
          return;
        }
        const col = toAdd[i];
        const def = col === 'active' ? 'INTEGER DEFAULT 1' : 'TEXT';
        db.run(`ALTER TABLE tools ADD COLUMN ${col} ${def}`, [], (alterErr) => {
          if (alterErr) reject(alterErr);
          else runNext(i + 1);
        });
      };
      runNext(0);
    });
  });
}

async function main() {
  console.log('Creating SQLite tables at', dbPath);
  console.log('');

  try {
    if (!(await tableExists('parts'))) {
      console.log('Running schema-simple.sql (base: languages, sets, parts, ...)');
      await runSql('schema-simple.sql');
      console.log('  OK');
    } else {
      console.log('Base schema already exists, ensuring sets/parts columns...');
      await ensureSetsColumns();
      await ensurePartsColumns();
    }

    if (!(await tableExists('tools'))) {
      console.log('Running init-sqlite-tools.sql');
      await runSql('init-sqlite-tools.sql');
      console.log('  OK');
    } else {
      console.log('Tools tables already exist, ensuring columns...');
      await ensureToolsColumns();
    }

    if (!(await tableExists('users'))) {
      console.log('Running init-sqlite-auth.sql (users, orders, system_settings)');
      await runSql('init-sqlite-auth.sql');
      console.log('  OK');
    } else {
      console.log('Auth tables already exist, skipping.');
    }
    if (await tableExists('provider_sets')) {
      await ensureProviderSetsColumns();
    }

    if (!(await tableExists('ratings'))) {
      console.log('Creating ratings table...');
      await new Promise((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS ratings (
          rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
          set_id INTEGER REFERENCES sets(set_id),
          user_id INTEGER REFERENCES users(user_id),
          rating INTEGER NOT NULL,
          review_text TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, [], (err) => { if (err) reject(err); else resolve(); });
      });
      console.log('  OK');
    }

    if (!(await tableExists('favorites'))) {
      console.log('Creating favorites table...');
      await new Promise((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS favorites (
          favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(user_id),
          set_id INTEGER NOT NULL REFERENCES sets(set_id),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, set_id)
        )`, [], (err) => { if (err) reject(err); else resolve(); });
      });
      console.log('  OK');
    }

    console.log('');
    console.log('Done. All tables are ready.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
