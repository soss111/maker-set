/**
 * Create Test User for SQLite
 * Creates a test customer user that can add items to cart
 */

const bcrypt = require('bcryptjs');
const connectionManager = require('../utils/sqliteConnectionManager');

async function createTestUser() {
  try {
    console.log('🔐 Creating test user...');
    
    // Check if test user already exists
    const existingUser = await connectionManager.query(
      'SELECT user_id, email, role FROM users WHERE email = ?',
      ['test@example.com']
    );
    
    if (existingUser.rows && existingUser.rows.length > 0) {
      console.log('✅ Test user already exists!');
      console.log('Email: test@example.com');
      console.log('Password: test123');
      return;
    }
    
    // Generate password hash for "test123"
    const passwordHash = await bcrypt.hash('test123', 10);
    
    // Create test user
    const result = await connectionManager.query(
      `INSERT INTO users (
        email, 
        password_hash, 
        username,
        first_name, 
        last_name, 
        role, 
        is_active,
        email_verified,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        'test@example.com',
        passwordHash,
        'testuser',
        'Test',
        'User',
        'customer',
        1, // is_active
        1  // email_verified
      ]
    );
    
    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('Login Credentials:');
    console.log('==================');
    console.log('Email: test@example.com');
    console.log('Password: test123');
    console.log('Role: customer');
    console.log('');
    console.log('You can now use these credentials to log in and add items to cart!');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
}

// Run the script
createTestUser().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

