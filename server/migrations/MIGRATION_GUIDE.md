# Database Migration Guide

## Overview
This system uses **Knex.js** as an abstraction layer, making it easy to switch between SQLite, MySQL, and PostgreSQL with just a configuration change.

## Current Setup (SQLite)
The system is currently using SQLite. To migrate to MySQL or PostgreSQL in the future:

### Step 1: Update Environment Variables

```bash
# In .env file, add:
DATABASE_ENGINE=mysql  # or 'postgresql'

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=makerset_user
DB_PASSWORD=your_password
DB_NAME=makerset_db

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=makerset_db
```

### Step 2: Install Database Drivers

```bash
# For MySQL (already installed)
npm install mysql2

# For PostgreSQL
npm install pg
```

### Step 3: Run Migration

The system will automatically adapt queries based on the `DATABASE_ENGINE` environment variable.

## Code Changes Needed

### Current Code (SQLite-specific):
```javascript
// Raw SQL with SQLite syntax
const result = await db.query(
  "SELECT * FROM users WHERE user_id = ?",
  [userId]
);
```

### Migrated Code (Database-agnostic):
```javascript
// Using Knex query builder
const result = await db
  .select('*')
  .from('users')
  .where('user_id', userId);

// Or using raw SQL with conversion
const helper = require('./utils/database-helper');
const sql = "SELECT * FROM users WHERE user_id = " + helper.getPlaceholder();
const converted = helper.convertQuery(sql);
const result = await db.raw(converted, [userId]);
```

## Migration Checklist

- [ ] Install required database drivers (mysql2, pg)
- [ ] Update .env with `DATABASE_ENGINE=mysql` or `DATABASE_ENGINE=postgresql`
- [ ] Update database connection credentials
- [ ] Test all CRUD operations
- [ ] Update any SQLite-specific queries
- [ ] Test stock reduction logic
- [ ] Test order creation flow
- [ ] Test cart reservation system
- [ ] Verify notifications work
- [ ] Check provider reports

## Common Issues

### Issue 1: DATE/TIME Functions
**SQLite:** `datetime('now')`
**MySQL:** `NOW()` or `CURRENT_TIMESTAMP`
**PostgreSQL:** `CURRENT_TIMESTAMP`

**Solution:** Use `database-helper.getCurrentTimestamp()`

### Issue 2: LAST INSERT ID
**SQLite:** `LAST_INSERT_ROWID()`
**MySQL:** `LAST_INSERT_ID()`
**PostgreSQL:** Use `RETURNING id`

**Solution:** Use `database-helper.insertAndGetId()`

### Issue 3: Placeholders
**SQLite/MySQL:** `?`
**PostgreSQL:** `$1, $2, $3...`

**Solution:** Use `database-helper.getPlaceholder(index)`

## Testing

Run the following to test your database setup:

```bash
# Test SQLite (current)
npm start

# Test MySQL
DATABASE_ENGINE=mysql npm start

# Test PostgreSQL
DATABASE_ENGINE=postgresql npm start
```

## Rollback

To rollback to SQLite:
1. Set `DATABASE_ENGINE=sqlite` in `.env`
2. Restart the server

