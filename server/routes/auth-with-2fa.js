const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { authenticateToken, requireAdmin, requireAdminOrSelf } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'makerset_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Register new user
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, first_name, last_name, company_name, username, role = 'customer' } = req.body;

    // Validation
    if (!email || !password || !first_name || !last_name || !username) {
      return res.status(400).json({ error: 'Email, password, username, first name, and last name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, company_name, username, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING user_id, email, username, first_name, last_name, company_name, role, created_at`,
      [email.toLowerCase(), hashedPassword, first_name, last_name, company_name, username, role]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        role: user.role,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  } finally {
    client.release();
  }
});

// Login user
router.post('/login', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, twoFactorToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await client.query(
      'SELECT user_id, email, username, password_hash, first_name, last_name, company_name, role, created_at, two_factor_enabled, two_factor_secret, backup_codes FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      if (!twoFactorToken) {
        return res.status(200).json({
          requiresTwoFactor: true,
          message: 'Two-factor authentication required',
          user: {
            user_id: user.user_id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            company_name: user.company_name,
            role: user.role
          }
        });
      }

      // Verify 2FA token
      const TwoFactorAuthService = require('../services/twoFactorAuthService');
      let isValid2FA = TwoFactorAuthService.verifyToken(user.two_factor_secret, twoFactorToken);

      // If TOTP fails, try backup codes
      if (!isValid2FA && user.backup_codes) {
        const backupResult = TwoFactorAuthService.verifyBackupCode([...user.backup_codes], twoFactorToken);
        isValid2FA = backupResult.valid;
        
        if (isValid2FA) {
          // Update backup codes
          await client.query(
            'UPDATE users SET backup_codes = $1 WHERE user_id = $2',
            [backupResult.updatedCodes, user.user_id]
          );
        }
      }

      if (!isValid2FA) {
        return res.status(401).json({ error: 'Invalid two-factor authentication code' });
      }
    }

    // Update last login
    await client.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        role: user.role,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message });
  } finally {
    client.release();
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT user_id, email, username, first_name, last_name, company_name, role, created_at, last_login FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  } finally {
    client.release();
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { first_name, last_name, company_name, username } = req.body;
    const userId = req.user.user_id;

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await client.query(
        'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
        [username, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const result = await client.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, company_name = $3, username = $4, updated_at = NOW()
       WHERE user_id = $5
       RETURNING user_id, email, username, first_name, last_name, company_name, role, created_at, updated_at`,
      [first_name, last_name, company_name, username, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  } finally {
    client.release();
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.user_id;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current password hash
    const result = await client.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message });
  } finally {
    client.release();
  }
});

// Admin: Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT user_id, email, username, first_name, last_name, company_name, role, is_active, created_at, updated_at, last_login
      FROM users
    `;
    let countQuery = 'SELECT COUNT(*) FROM users';
    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      const searchCondition = `WHERE email ILIKE $${paramCount} OR username ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR company_name ILIKE $${paramCount}`;
      query += ` ${searchCondition}`;
      countQuery += ` ${searchCondition}`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const [usersResult, countResult] = await Promise.all([
      client.query(query, queryParams),
      client.query(countQuery, search ? [`%${search}%`] : [])
    ]);

    const totalUsers = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users: usersResult.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_users: totalUsers,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  } finally {
    client.release();
  }
});

// Admin: Get user by ID
router.get('/users/:userId', authenticateToken, requireAdminOrSelf, async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;

    const result = await client.query(
      'SELECT user_id, email, username, first_name, last_name, company_name, role, is_active, created_at, updated_at, last_login FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  } finally {
    client.release();
  }
});

// Admin: Update user
router.put('/users/:userId', authenticateToken, requireAdminOrSelf, async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;
    const { first_name, last_name, company_name, role, username, is_active } = req.body;

    // Only admin can change role and is_active
    const updateFields = ['first_name', 'last_name', 'company_name'];
    const updateValues = [first_name, last_name, company_name];
    let paramCount = 0;

    if (req.user.role === 'admin') {
      if (role) {
        updateFields.push('role');
        updateValues.push(role);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active');
        updateValues.push(is_active);
      }
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await client.query(
        'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
        [username, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updateFields.push('username');
      updateValues.push(username);
    }

    const setClause = updateFields.map(field => {
      paramCount++;
      return `${field} = $${paramCount}`;
    }).join(', ');

    paramCount++;
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE user_id = $${paramCount}
      RETURNING user_id, email, username, first_name, last_name, company_name, role, is_active, created_at, updated_at, last_login
    `;

    const result = await client.query(query, [...updateValues, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  } finally {
    client.release();
  }
});

// Admin: Delete user
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await client.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id, email',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
