/**
 * Reset Admin Password for SQLite
 * Resets the admin password to a new value
 */

const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/makerset.db');

// Get new password from command line argument, or use default
const newPassword = process.argv[2] || 'admin123';

async function resetAdminPassword() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err.message);
        reject(err);
        return;
      }
    });

    // Check if admin exists
    db.get(
      "SELECT user_id, email FROM users WHERE email = ? OR role = 'admin' LIMIT 1",
      ['laurisoosaar@gmail.com'],
      async (err, row) => {
        if (err) {
          console.error('❌ Error checking admin user:', err.message);
          db.close();
          reject(err);
          return;
        }

        if (!row) {
          console.log('❌ Admin user not found!');
          db.close();
          reject(new Error('Admin user not found'));
          return;
        }

        console.log(`📧 Found admin user: ${row.email}`);

        // Generate password hash
        try {
          const passwordHash = await bcrypt.hash(newPassword, 10);
          
          // Update admin password
          db.run(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE user_id = ?",
            [passwordHash, row.user_id],
            function(updateErr) {
              if (updateErr) {
                console.error('❌ Error updating password:', updateErr.message);
                db.close();
                reject(updateErr);
                return;
              }

              console.log('');
              console.log('✅ Admin password reset successfully!');
              console.log('');
              console.log('='.repeat(50));
              console.log('📋 LOGIN CREDENTIALS');
              console.log('='.repeat(50));
              console.log(`Email: ${row.email}`);
              console.log(`Password: ${newPassword}`);
              console.log('='.repeat(50));
              console.log('');

              db.close();
              resolve();
            }
          );
        } catch (hashErr) {
          console.error('❌ Error generating password hash:', hashErr.message);
          db.close();
          reject(hashErr);
        }
      }
    );
  });
}

// Run the script
resetAdminPassword()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });

