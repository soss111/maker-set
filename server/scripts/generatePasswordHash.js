const bcrypt = require('bcryptjs');

/**
 * Generate a secure password hash for admin user
 * Usage: node generatePasswordHash.js "YourNewPassword"
 */

const generatePasswordHash = async (password) => {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('='.repeat(60));
    console.log('🔐 PASSWORD HASH GENERATOR');
    console.log('='.repeat(60));
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 SQL UPDATE COMMAND:');
    console.log('='.repeat(60));
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@makerset.com';`);
    console.log('='.repeat(60));
    
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
  }
};

// Get password from command line argument
const newPassword = process.argv[2];

if (!newPassword) {
  console.log('❌ Please provide a password as an argument');
  console.log('Usage: node generatePasswordHash.js "YourNewPassword"');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.log('❌ Password must be at least 8 characters long');
  process.exit(1);
}

generatePasswordHash(newPassword);
