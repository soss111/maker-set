# SQLite to PostgreSQL Migration Guide

## Overview
This guide shows you what to change to migrate from SQLite to PostgreSQL.

## Step 1: Install PostgreSQL Client

```bash
npm install pg
```

## Step 2: Create Database Connection Module

Create a new file `server/models/database-postgres.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'makerset_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection error:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database');
  }
});

module.exports = pool;
```

## Step 3: Update `simple-server.js`

### 3.1 Change Database Import

**From:**
```javascript
const sqlite3 = require('sqlite3').verbose();
```

**To:**
```javascript
const db = require('./models/database-postgres');
```

### 3.2 Replace Database Initialization

**Remove:**
```javascript
const dbPath = path.join(__dirname, 'database', 'makerset.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

db.run('PRAGMA foreign_keys = ON');
```

**Replace with:**
```javascript
const db = require('./models/database-postgres');
console.log('✅ PostgreSQL connection initialized');
```

### 3.3 Change Query Methods

#### SQLite → PostgreSQL Method Mapping

| SQLite | PostgreSQL | Notes |
|--------|------------|-------|
| `db.get()` | `db.query().then(rows => rows[0])` | Get single row |
| `db.all()` | `db.query().then(rows => rows)` | Get all rows |
| `db.run()` | `db.query()` | Execute query |
| `this.lastID` | `RETURNING id` | Get inserted ID |
| `?` placeholders | `$1, $2, $3...` | Parameter binding |
| `datetime('now')` | `NOW()` or `CURRENT_TIMESTAMP` | Current timestamp |
| `sqlite3.OPEN_READWRITE` | N/A (connection-based) | Access mode |

### 3.4 Update Parameter Syntax

**SQLite uses `?`:**
```javascript
db.get('SELECT * FROM users WHERE user_id = ?', [userId], callback);
```

**PostgreSQL uses `$1, $2, $3...`:**
```javascript
db.query('SELECT * FROM users WHERE user_id = $1', [userId])
  .then(result => callback(null, result.rows[0]))
  .catch(err => callback(err));
```

### 3.5 Example Query Conversion

**Before (SQLite):**
```javascript
db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
  if (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
  res.json(user);
});
```

**After (PostgreSQL):**
```javascript
db.query('SELECT * FROM users WHERE user_id = $1', [userId])
  .then(result => {
    res.json(result.rows[0]);
  })
  .catch(err => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  });
```

### 3.6 Update INSERT queries

**Before (SQLite):**
```javascript
db.run('INSERT INTO users (username, email) VALUES (?, ?)', [username, email], function(err) {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Inserted ID:', this.lastID);
  }
});
```

**After (PostgreSQL):**
```javascript
db.query('INSERT INTO users (username, email) VALUES ($1, $2) RETURNING user_id', [username, email])
  .then(result => {
    console.log('Inserted ID:', result.rows[0].user_id);
  })
  .catch(err => {
    console.error('Error:', err);
  });
```

## Step 4: Create `.env` File

Create `server/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=makerset_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5003
NODE_ENV=development
```

## Step 5: Initialize PostgreSQL Database

```bash
# Install PostgreSQL locally or use cloud service
createdb makerset_db

# Run migration SQL
psql makerset_db < database/schema.sql
```

## Step 6: Common Query Patterns

### Pattern 1: Get Single Row

```javascript
// Async/Await style
const getUser = async (userId) => {
  const result = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  return result.rows[0];
};
```

### Pattern 2: Get Multiple Rows

```javascript
const getUsers = async () => {
  const result = await db.query('SELECT * FROM users');
  return result.rows;
};
```

### Pattern 3: Insert with Return ID

```javascript
const createUser = async (userData) => {
  const result = await db.query(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING user_id',
    [userData.username, userData.email, userData.password]
  );
  return result.rows[0].user_id;
};
```

### Pattern 4: Update

```javascript
const updateUser = async (userId, data) => {
  const result = await db.query(
    'UPDATE users SET username = $1, email = $2 WHERE user_id = $3',
    [data.username, data.email, userId]
  );
  return result.rowCount > 0;
};
```

### Pattern 5: Transaction

```javascript
const client = await db.connect();
try {
  await client.query('BEGIN');
  
  await client.query('INSERT INTO orders...', [...]);
  await client.query('UPDATE stock...', [...]);
  
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

## Step 7: Auto-convert Function

You can create a helper to automatically convert SQLite queries to PostgreSQL:

```javascript
// In server/utils/queryConverter.js
class QueryConverter {
  static convert(sql, params) {
    let pgSQL = sql;
    let pgParams = [];
    
    // Convert ? to $1, $2, etc.
    let counter = 1;
    pgSQL = sql.replace(/\?/g, () => {
      pgParams.push(params[counter - 1]);
      return `$${counter++}`;
    });
    
    return { sql: pgSQL, params: pgParams };
  }
  
  static execute(db, sql, params, callback) {
    const { sql: pgSQL, params: pgParams } = this.convert(sql, params);
    
    db.query(pgSQL, pgParams)
      .then(result => {
        if (callback) callback(null, result.rows);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }
}

module.exports = QueryConverter;
```

## Complete Rewrite Alternative

Instead of converting query by query, you could:

1. **Keep SQLite for now** (works great for development)
2. **Use both databases** with environment variable
3. **Gradually migrate** endpoints one by one
4. **Create a database abstraction layer**

### Example Dual-Database Setup

```javascript
// In simple-server.js
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

let db;
if (USE_POSTGRES) {
  db = require('./models/database-postgres');
} else {
  db = require('./models/database-sqlite');
}

// Then use the same query interface
```

## Files to Update

1. **server/simple-server.js** - Main database connection
2. **server/models/database-postgres.js** - NEW PostgreSQL connection
3. **All routes that use `db.get`, `db.all`, `db.run`** - Convert to promises
4. **server/package.json** - Add `pg` dependency
5. Create `.env` file for database credentials

## Testing the Migration

```bash
# 1. Install dependencies
npm install pg

# 2. Create PostgreSQL database
createdb makerset_db

# 3. Run schema
psql makerset_db < database/schema.sql

# 4. Update .env with PostgreSQL credentials

# 5. Test connection
node -e "const db = require('./models/database-postgres'); db.query('SELECT 1');"
```

## Quick Start Script

```bash
# Install PostgreSQL client
npm install pg

# Add to .env
echo "DB_HOST=localhost" >> .env
echo "DB_PORT=5432" >> .env
echo "DB_NAME=makerset_db" >> .env
echo "DB_USER=postgres" >> .env
echo "DB_PASSWORD=your_password" >> .env

# Import current SQLite data (optional)
sqlite3 database/makerset.db .dump > data_dump.sql
# Then manually convert and import to PostgreSQL
```

## Migration Strategy

**Option A: Complete Rewrite** (Recommended for production)
- Convert all queries at once
- Test thoroughly
- Better performance

**Option B: Gradual Migration**
- Add PostgreSQL support alongside SQLite
- Migrate one endpoint at a time
- Use environment variable to switch

**Option C: Keep SQLite** (For simple deployments)
- SQLite is sufficient for many use cases
- Easier to backup (single file)
- No server setup needed
- Good for prototypes and small-scale production

