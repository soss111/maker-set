/**
 * Knex Configuration
 * Switch between SQLite, MySQL, or PostgreSQL by setting DATABASE_ENGINE
 * Example: DATABASE_ENGINE=mysql npm start
 */

require('dotenv').config();

const dbEngine = process.env.DATABASE_ENGINE || 'sqlite';

// Get database configuration based on engine
const configs = {
  sqlite: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILE || './database/makerset.db'
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.run('PRAGMA foreign_keys = ON', done);
      }
    }
  },

  mysql: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'makerset_db'
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  postgresql: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'makerset_db'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};

// Return the appropriate configuration
const config = configs[dbEngine];

if (!config) {
  throw new Error(`Unknown database engine: ${dbEngine}. Use: sqlite, mysql, or postgresql`);
}

console.log(`🔌 Using database engine: ${dbEngine}`);
console.log(`📊 Database: ${config.connection.database || config.connection.filename}`);

module.exports = config;

