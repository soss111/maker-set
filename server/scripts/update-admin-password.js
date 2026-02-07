const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'makerset_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function updateAdminPassword() {
  try {
    console.log('Updating admin password...');

    // Generate hash for password "123"
    const passwordHash = bcrypt.hashSync('123', 10);

    // Update admin user password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [passwordHash, 'admin']
    );

    if (result.rowCount > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('Username: admin');
      console.log('Password: 123');
    } else {
      console.log('❌ Admin user not found. Creating new admin user...');

      // Create admin user if it doesn't exist
      await pool.query(`
        INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active, email_verified) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['admin', 'admin@makerset.com', passwordHash, 'admin', 'System', 'Administrator', true, true]);

      console.log('✅ Admin user created successfully!');
      console.log('Username: admin');
      console.log('Password: 123');
    }

  } catch (error) {
    console.error('Error updating admin password:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();

