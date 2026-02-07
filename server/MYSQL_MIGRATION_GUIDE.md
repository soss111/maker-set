# SQLite to MySQL Migration Guide

## Why MySQL?
- ✅ Easier deployment on Hostinger
- ✅ Better shared hosting support
- ✅ PhpMyAdmin included
- ✅ Simpler syntax
- ✅ Similar to SQLite (easier migration)

## Step 1: Install MySQL Client

```bash
npm install mysql2
```

## Step 2: Create MySQL Connection

Create `server/models/database-mysql.js`:

```javascript
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'makerset_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
  } else {
    console.log('✅ Connected to MySQL database');
    connection.release();
  }
});

module.exports = pool.promise(); // Use promise API
```

## Step 3: Key Differences from SQLite

### Query Method Changes

**SQLite (Callback):**
```javascript
db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
  if (err) console.error(err);
  else console.log(user);
});
```

**MySQL (Promise - Similar!):**
```javascript
const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
const user = rows[0];
console.log(user);
```

### The Good News:
- ✅ MySQL uses `?` placeholders (SAME as SQLite!)
- ✅ Similar syntax overall
- ✅ Only need to change from callback to async/await

## Step 4: Common Conversions

### Pattern 1: Get Single Row

```javascript
// SQLite
db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
  res.json(user);
});

// MySQL
const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
res.json(rows[0]);
```

### Pattern 2: Get Multiple Rows

```javascript
// SQLite
db.all('SELECT * FROM users', (err, users) => {
  res.json(users);
});

// MySQL
const [rows] = await db.query('SELECT * FROM users');
res.json(rows);
```

### Pattern 3: Insert with Return ID

```javascript
// SQLite
db.run('INSERT INTO users (username) VALUES (?)', [username], function(err) {
  const id = this.lastID;
});

// MySQL
const [result] = await db.query('INSERT INTO users (username) VALUES (?)', [username]);
const id = result.insertId;
```

### Pattern 4: Update

```javascript
// SQLite & MySQL (SAME!)
const result = await db.query('UPDATE users SET username = ? WHERE user_id = ?', [newName, userId]);
```

## Step 5: Update simple-server.js

### Change import:
```javascript
// FROM:
const sqlite3 = require('sqlite3').verbose();

// TO:
const db = require('./models/database-mysql');
```

### Example endpoint conversion:

**BEFORE (SQLite):**
```javascript
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});
```

**AFTER (MySQL):**
```javascript
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## Step 6: Setup MySQL Database

```bash
# Create database
mysql -u root -p
CREATE DATABASE makerset_db;
USE makerset_db;

# Import schema
source database/schema.sql

# Create user (recommended)
CREATE USER 'makerset_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON makerset_db.* TO 'makerset_user'@'localhost';
FLUSH PRIVILEGES;
```

## Step 7: Environment Variables

Create `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=makerset_db
DB_USER=makerset_user
DB_PASSWORD=your_password
```

## Comparison Table

| Feature | SQLite | MySQL | PostgreSQL |
|---------|--------|-------|------------|
| **Placeholder** | `?` | `?` | `$1, $2` |
| **Complexity** | Easy | Easy | Moderate |
| **Shared Hosting** | ⚠️ Limited | ✅ Excellent | ⚠️ Limited |
| **Performance** | Good | Excellent | Excellent |
| **PhpMyAdmin** | No | ✅ Yes | No |
| **Syntax** | Simple | Simple | Complex |
| **Best For** | Prototypes | Production e-commerce | Enterprise |

## Automated Migration Script

Here's a helper function to make migration easier:

```javascript
// utils/dbHelper.js
const db = require('../models/database-mysql');

// Helper to convert SQLite-style callbacks to MySQL promises
async function query(sql, params = []) {
  try {
    const [rows] = await db.query(sql, params);
    return { rows, err: null };
  } catch (err) {
    return { rows: null, err };
  }
}

async function getOne(sql, params = []) {
  const { rows, err } = await query(sql, params);
  if (err) return { row: null, err };
  return { row: rows[0] || null, err: null };
}

async function getAll(sql, params = []) {
  return await query(sql, params);
}

async function insert(sql, params = []) {
  const result = await db.query(sql, params);
  return { insertId: result[0].insertId, err: null };
}

module.exports = { query, getOne, getAll, insert };
```

## Migration Checklist

- [ ] Install `mysql2` package
- [ ] Create `database-mysql.js` connection
- [ ] Replace `sqlite3` import with MySQL
- [ ] Update all `db.all()` to async/await
- [ ] Update all `db.get()` to async/await  
- [ ] Update all `db.run()` to async/await
- [ ] Change `this.lastID` to `result.insertId`
- [ ] Create MySQL database on Hostinger
- [ ] Import schema
- [ ] Update `.env` file
- [ ] Test all endpoints

## Quick Start for Hostinger

1. **In Hostinger cPanel:**
   - Create MySQL database
   - Note: host, username, password

2. **In your code:**
   ```bash
   npm install mysql2
   ```

3. **Update connection:**
   ```javascript
   const db = require('./models/database-mysql');
   ```

4. **Deploy:**
   - Upload files to Hostinger
   - Run `npm install` on server
   - Start with `node simple-server.js`

## Which One to Choose?

**Choose MySQL if:**
- ✅ Using shared hosting (Hostinger)
- ✅ Want easy setup
- ✅ Need phpMyAdmin access
- ✅ Building e-commerce site
- ✅ Team is less technical

**Choose PostgreSQL if:**
- ✅ Using VPS/dedicated server
- ✅ Need advanced SQL features
- ✅ Building data analytics platform
- ✅ Have PostgreSQL expertise

**Recommendation: MySQL for this project!**

