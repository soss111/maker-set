const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'makerset_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function setupDatabase() {
  try {
    console.log('Setting up MakerLab Sets Management Database...');

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    console.log('Creating tables and indexes...');
    await pool.query(schema);

    // Read seed file
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');

    // Execute seed data
    console.log('Inserting seed data...');
    await pool.query(seed);

    // Read views file
    const viewsPath = path.join(__dirname, '../database/views.sql');
    const views = fs.readFileSync(viewsPath, 'utf8');

    // Execute views and functions
    console.log('Creating views and functions...');
    await pool.query(views);

    console.log('Database setup completed successfully!');

  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
