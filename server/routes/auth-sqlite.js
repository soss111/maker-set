const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/sqliteConnectionManager');
const { authenticateToken, requireAdmin, requireAdminOrSelf } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
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
    const existingResult = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    const existingUser = existingResult.rows[0];

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate provider code for providers
    let providerCode = null;
    if (role === 'provider') {
      // Generate a unique 6-digit provider code
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!isUnique && attempts < maxAttempts) {
        providerCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if code already exists
        const existingCodeResult = await db.query('SELECT * FROM users WHERE provider_code = ?', [providerCode]);
        if (existingCodeResult.rows.length === 0) {
          isUnique = true;
        }
        attempts++;
      }
      
      if (!isUnique) {
        return res.status(500).json({ error: 'Failed to generate unique provider code' });
      }
    }

    // Insert new user
    const insertResult = await db.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, company_name, username, role, provider_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, first_name, last_name, company_name, username, role, providerCode]
    );
    
    // Get the inserted user ID
    const userResult = await db.query('SELECT last_insert_rowid() as id');
    const userId = userResult.rows[0].id;

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userId, 
        email, 
        username, 
        role,
        first_name,
        last_name,
        company_name
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        email,
        username,
        first_name,
        last_name,
        company_name,
        role,
        provider_code: providerCode
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        email: user.email, 
        username: user.username, 
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT user_id, email, username, first_name, last_name, company_name, role FROM users WHERE user_id = ?', [req.user.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, company_name, username } = req.body;
    const userId = req.user.userId;

    // Check if username is already taken by another user
    if (username) {
      const existingResult = await db.query('SELECT user_id FROM users WHERE username = ? AND user_id != ?', [username, userId]);
      const existingUser = existingResult.rows[0];

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update user
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, company_name = ?, username = ? WHERE user_id = ?',
      [first_name, last_name, company_name, username, userId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoints for user management
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE user_id = ?', [req.user.userId]);
    const user = userResult.rows[0];
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (search) {
      whereClause = 'WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ? OR company_name LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
    }

    // Get users with pagination (provider_markup_percentage optional - may not exist in SQLite schema)
    const query = `
      SELECT 
        user_id,
        email,
        username,
        first_name,
        last_name,
        company_name,
        role,
        is_active,
        created_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const totalUsers = (countResult.rows && countResult.rows[0] && countResult.rows[0].total) || 0;

    // Client (UserManagement) expects response.data.users and response.data.pagination at top level
    res.json({
      users: result.rows || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_users: totalUsers,
        total_pages: Math.ceil(totalUsers / limit) || 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE user_id = ?', [req.user.userId]);
    const user = userResult.rows[0];
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = req.params.id;
    const result = await db.query(
      'SELECT user_id, email, username, first_name, last_name, company_name, role, is_active, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE user_id = ?', [req.user.userId]);
    const user = userResult.rows[0];
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = req.params.id;
    const { first_name, last_name, company_name, username, role, is_active, provider_markup_percentage } = req.body;

    // Check if username is already taken by another user
    if (username) {
      const existingResult = await db.query('SELECT user_id FROM users WHERE username = ? AND user_id != ?', [username, userId]);
      const existingUser = existingResult.rows[0];

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Update user
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, company_name = ?, username = ?, role = ?, is_active = ?, provider_markup_percentage = ? WHERE user_id = ?',
      [first_name, last_name, company_name, username, role, is_active, provider_markup_percentage, userId]
    );

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const userResult = await db.query('SELECT role FROM users WHERE user_id = ?', [req.user.userId]);
    const user = userResult.rows[0];
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Delete user
    await db.query('DELETE FROM users WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
