const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

/**
 * Production Admin Setup Script
 * Creates or updates admin user with environment variables
 * 
 * Environment Variables Required:
 * - ADMIN_EMAIL: Admin email address
 * - ADMIN_PASSWORD: Admin password
 * - ADMIN_FIRST_NAME: Admin first name
 * - ADMIN_LAST_NAME: Admin last name
 * - ADMIN_COMPANY: Admin company name
 * - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD: Database connection
 */

const setupProductionAdmin = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'makerset_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    // Check required environment variables
    const requiredVars = [
      'ADMIN_EMAIL',
      'ADMIN_PASSWORD', 
      'ADMIN_FIRST_NAME',
      'ADMIN_LAST_NAME'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\nPlease set these environment variables before running this script.');
      process.exit(1);
    }

    const {
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      ADMIN_FIRST_NAME,
      ADMIN_LAST_NAME,
      ADMIN_COMPANY = 'MakerSet Platform'
    } = process.env;

    // Validate password strength
    if (ADMIN_PASSWORD.length < 8) {
      console.error('❌ Admin password must be at least 8 characters long');
      process.exit(1);
    }

    // Generate password hash
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

    console.log('🔐 PRODUCTION ADMIN SETUP');
    console.log('='.repeat(50));
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Name: ${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`);
    console.log(`Company: ${ADMIN_COMPANY}`);
    console.log('='.repeat(50));

    // Check if admin user exists
    const existingAdmin = await pool.query(
      'SELECT user_id, email FROM users WHERE role = $1',
      ['admin']
    );

    if (existingAdmin.rows.length > 0) {
      // Update existing admin
      const result = await pool.query(
        `UPDATE users SET 
         email = $1,
         password_hash = $2,
         first_name = $3,
         last_name = $4,
         company_name = $5,
         updated_at = NOW()
         WHERE role = 'admin'
         RETURNING user_id, email, first_name, last_name`,
        [ADMIN_EMAIL, passwordHash, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_COMPANY]
      );

      console.log('✅ Admin user updated successfully!');
      console.log(`   User ID: ${result.rows[0].user_id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Name: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
    } else {
      // Create new admin user
      const result = await pool.query(
        `INSERT INTO users (
         email, password_hash, first_name, last_name, 
         company_name, role, is_active, email_verified, 
         created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'admin', true, true, NOW(), NOW())
         RETURNING user_id, email, first_name, last_name`,
        [ADMIN_EMAIL, passwordHash, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_COMPANY]
      );

      console.log('✅ Admin user created successfully!');
      console.log(`   User ID: ${result.rows[0].user_id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Name: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
    }

    console.log('\n🎉 Production admin setup complete!');
    console.log('You can now login with the new credentials.');

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run the setup
setupProductionAdmin();
