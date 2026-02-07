/**
 * Database Abstraction Layer
 * Makes it easy to switch between SQLite, MySQL, or PostgreSQL
 * Just change the DATABASE_ENGINE environment variable!
 */

const knex = require('knex');
const config = require('../knexfile.js');

// Create database connection based on configuration
const db = knex(config);

/**
 * Query method - compatible with current callback style
 * Returns rows as an array
 */
async function query(sql, params = []) {
  try {
    // Knex doesn't support direct SQL with parameters
    // For raw SQL, we need to use the appropriate method
    let query = db.raw(sql, params);
    const result = await query;
    return result.rows || result[0] || [];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get single row
 */
async function getOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Get all rows
 */
async function getAll(sql, params = []) {
  return await query(sql, params);
}

/**
 * Run INSERT/UPDATE/DELETE
 * Returns the lastID (SQLite) or insertId (MySQL)
 */
async function run(sql, params = []) {
  try {
    const result = await db.raw(sql, params);
    return {
      lastID: result.lastInsertRowid || result.insertId || null,
      changes: result.rowsAffected || result.changes || 0
    };
  } catch (error) {
    console.error('Database run error:', error);
    throw error;
  }
}

/**
 * Get connection status
 */
function getStatus() {
  return {
    connected: true,
    engine: config.client,
    host: config.connection?.host || 'localhost',
    database: config.connection?.database || 'makerset_db'
  };
}

/**
 * Shutdown gracefully
 */
async function shutdown() {
  await db.destroy();
  console.log('Database connection closed');
}

module.exports = {
  query,
  getOne,
  getAll,
  run,
  getStatus,
  shutdown,
  // Expose knex for advanced queries
  knex: db
};

