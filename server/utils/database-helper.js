/**
 * Database Helper
 * Provides cross-database compatible methods
 * This ensures your code works with SQLite, MySQL, and PostgreSQL
 */

const db = require('../models/database-abstraction');

/**
 * Insert and return the ID
 * Works with SQLite (lastInsertRowid) and MySQL (insertId)
 */
async function insertAndGetId(sql, params = []) {
  try {
    const result = await db.run(sql, params);
    return result.lastID || result.insertId;
  } catch (error) {
    console.error('Insert error:', error);
    throw error;
  }
}

/**
 * Update records and return affected rows count
 */
async function update(sql, params = []) {
  try {
    const result = await db.run(sql, params);
    return result.changes || result.rowsAffected || 0;
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
}

/**
 * Delete records and return affected rows count
 */
async function deleteRecords(sql, params = []) {
  return await update(sql, params);
}

/**
 * Transaction helper
 * Ensures all-or-nothing operations
 */
async function transaction(callback) {
  const trx = await db.knex.transaction();
  
  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    console.error('Transaction error:', error);
    throw error;
  }
}

/**
 * Build WHERE clause with safe parameter binding
 */
function whereIn(column, values) {
  // This uses Knex's query builder for safety
  return values.map((_, i) => '?').join(', ');
}

/**
 * Escape identifier (table or column name)
 * Different databases use different escape characters
 */
function escapeIdentifier(name) {
  const engine = process.env.DATABASE_ENGINE || 'sqlite';
  
  switch (engine) {
    case 'mysql':
      return `\`${name}\``;
    case 'postgresql':
      return `"${name}"`;
    case 'sqlite':
    default:
      return `"${name}"`;
  }
}

/**
 * Get current timestamp in database-specific format
 */
function getCurrentTimestamp() {
  const engine = process.env.DATABASE_ENGINE || 'sqlite';
  
  switch (engine) {
    case 'mysql':
      return 'CURRENT_TIMESTAMP';
    case 'postgresql':
      return 'CURRENT_TIMESTAMP';
    case 'sqlite':
    default:
      return "datetime('now')";
  }
}

/**
 * Get placeholder for parameterized queries
 * SQLite and MySQL use "?"
 * PostgreSQL uses "$1, $2, $3..."
 */
function getPlaceholder(index = 0) {
  const engine = process.env.DATABASE_ENGINE || 'sqlite';
  
  switch (engine) {
    case 'postgresql':
      return `$${index + 1}`;
    case 'mysql':
    case 'sqlite':
    default:
      return '?';
  }
}

/**
 * Convert SQLite syntax to target database
 * Helps migrate existing SQL queries
 */
function convertQuery(sql) {
  const engine = process.env.DATABASE_ENGINE || 'sqlite';
  
  // SQLite to MySQL conversions
  if (engine === 'mysql') {
    sql = sql.replace(/datetime\('now'\)/gi, 'NOW()');
    sql = sql.replace(/datetime\('([^']+)'\)/gi, "STR_TO_DATE('$1', '%Y-%m-%d %H:%i:%s')");
    sql = sql.replace(/LAST_INSERT_ROWID\(\)/gi, 'LAST_INSERT_ID()');
  }
  
  // SQLite to PostgreSQL conversions
  if (engine === 'postgresql') {
    sql = sql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
    sql = sql.replace(/LAST_INSERT_ROWID\(\)/gi, 'RETURNING id');
  }
  
  return sql;
}

module.exports = {
  insertAndGetId,
  update,
  deleteRecords,
  transaction,
  whereIn,
  escapeIdentifier,
  getCurrentTimestamp,
  getPlaceholder,
  convertQuery
};

