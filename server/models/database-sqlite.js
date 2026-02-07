const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file path
const dbPath = path.join(__dirname, '..', 'database', 'makerset.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Test database connection
db.get('SELECT 1', (err, row) => {
  if (err) {
    console.error('Database connection test failed:', err.message);
  } else {
    console.log('Database connection test successful');
  }
});

module.exports = db;
