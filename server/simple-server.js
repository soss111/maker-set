const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const fs = require('fs');
const { translateText } = require('./translation-service');
const AutomatedScheduler = require('./utils/automatedScheduler');
const NotificationService = require('./utils/notificationService');
const PDFGenerator = require('./utils/pdfGenerator');
// const { CacheManager, QueryOptimizer } = require('./utils/cacheManager');

const app = express();
const PORT = 5003;

// Initialize performance optimizers
// const queryOptimizer = QueryOptimizer;

// Initialize services
const scheduler = new AutomatedScheduler();
const notificationService = new NotificationService();
const pdfGenerator = new PDFGenerator();

// Start automated scheduler
scheduler.start();

// Middleware
app.use(cors());
app.use(express.json());

// Simple authentication middleware for testing
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth Debug:', { 
    url: req.url, 
    method: req.method,
    authHeader: authHeader,
    token: token 
  });

  if (!token) {
    // For testing, create a mock user
    req.user = { user_id: 1, role: 'admin', username: 'test_admin' };
    console.log('🔐 No token, using default user:', req.user);
    return next();
  }

  // Handle real tokens from login API
  if (token.startsWith('token-')) {
    // Extract user ID from token format: "token-{user_id}-{timestamp}"
    const parts = token.split('-');
    if (parts.length >= 2) {
      const userId = parseInt(parts[1]);
      
      // Get user details from database
      db.get('SELECT user_id, email, username, role, first_name, last_name FROM users WHERE user_id = ?', [userId], (err, user) => {
        if (err || !user) {
          console.error('Token validation error:', err);
          return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.user = {
          user_id: user.user_id,
          email: user.email,
          username: user.username,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name
        };
        next();
      });
      return;
    }
  }
  
  // In a real implementation, you would verify the JWT token here
  // For now, just create a mock user based on the token
  if (token === 'test') {
    req.user = { user_id: 1, role: 'admin', username: 'test_admin' };
  } else if (token === 'provider') {
    req.user = { user_id: 2, role: 'provider', username: 'test_provider' };
  } else if (token === 'customer') {
    req.user = { user_id: 3, role: 'customer', username: 'test_customer' };
  } else if (token.startsWith('provider-')) {
    // Handle dynamic provider tokens like "provider-8"
    const providerId = parseInt(token.split('-')[1]) || 8;
    req.user = { user_id: providerId, role: 'provider', username: `provider_${providerId}` };
  } else if (token.startsWith('admin-')) {
    // Handle dynamic admin tokens like "admin-1"
    const adminId = parseInt(token.split('-')[1]) || 1;
    req.user = { user_id: adminId, role: 'admin', username: `admin_${adminId}` };
  } else if (token.startsWith('customer-')) {
    // Handle dynamic customer tokens like "customer-3"
    const customerId = parseInt(token.split('-')[1]) || 3;
    req.user = { user_id: customerId, role: 'customer', username: `customer_${customerId}` };
  } else {
    req.user = { user_id: 3, role: 'customer', username: 'test_customer' };
  }
  
  next();
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'), false);
    }
  }
});

// SQLite Database setup
const dbPath = path.join(__dirname, 'database', 'makerset.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Add provider markup percentage column to users table (ignore if already exists)
db.run('ALTER TABLE users ADD COLUMN provider_markup_percentage DECIMAL(5,2) DEFAULT 0', (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding provider_markup_percentage column:', err);
  }
});

// Create provider_sets table for provider-specific set management
db.run(`
  CREATE TABLE IF NOT EXISTS provider_sets (
    provider_set_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    set_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (set_id) REFERENCES sets(set_id) ON DELETE CASCADE,
    UNIQUE(provider_id, set_id)
  )
`);

// Create indexes for provider_sets
db.run('CREATE INDEX IF NOT EXISTS idx_provider_sets_provider_id ON provider_sets(provider_id)');
db.run('CREATE INDEX IF NOT EXISTS idx_provider_sets_set_id ON provider_sets(set_id)');
db.run('CREATE INDEX IF NOT EXISTS idx_provider_sets_active ON provider_sets(is_active)');

// Health check endpoint
app.get('/api/health', (req, res) => {
  db.get('SELECT 1', (err, row) => {
    if (err) {
      res.status(503).json({ status: 'unhealthy', error: err.message });
    } else {
      res.json({ 
        status: 'healthy', 
        database: 'SQLite',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Basic auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  
  // Check database for user
  db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email], (err, user) => {
    if (err) {
      console.error('Login query error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check password - handle both base64 encoded and bcrypt hashed passwords
    let isValidPassword = false;
    
    // Try base64 decoding first (for existing users)
    try {
      const decodedPassword = Buffer.from(user.password_hash, 'base64').toString('utf-8');
      isValidPassword = decodedPassword === password;
    } catch (e) {
      // If base64 decoding fails, try bcrypt comparison
      const bcrypt = require('bcrypt');
      isValidPassword = bcrypt.compareSync(password, user.password_hash);
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Update last login
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id], (err) => {
      if (err) {
        console.error('Error updating last login:', err);
      }
    });
    
    // Generate token (simple for now)
    const token = `token-${user.user_id}-${Date.now()}`;
    
    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.user_id,
        email: user.email,
        username: user.username,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company_name,
        provider_markup_percentage: user.provider_markup_percentage
      }
    });
  });
});

// Register new user endpoint
app.post('/api/auth/register', (req, res) => {
  const { email, password, username, first_name, last_name, company_name, role = 'customer' } = req.body;
  
  // Validation
  if (!email || !password || !username || !first_name || !last_name) {
    return res.status(400).json({ success: false, message: 'Email, password, username, first name, and last name are required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
  }
  
  // Check if user already exists
  db.get('SELECT user_id FROM users WHERE email = ? OR username = ?', [email, username], (err, existingUser) => {
    if (err) {
      console.error('User check error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
    }
    
    // Hash password using bcrypt
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    
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
        db.get('SELECT user_id FROM users WHERE provider_code = ?', [providerCode], (err, existingCode) => {
          if (!err && !existingCode) {
            isUnique = true;
          }
        });
        attempts++;
      }
      
      if (!isUnique) {
        return res.status(500).json({ success: false, message: 'Failed to generate unique provider code' });
      }
    }
    
    // Insert new user
    const sql = `
      INSERT INTO users (email, password_hash, username, first_name, last_name, company_name, role, provider_code, is_active, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    db.run(sql, [email, hashedPassword, username, first_name, last_name, company_name, role, providerCode], function(err) {
      if (err) {
        console.error('User creation error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create user' });
      }
      
      const userId = this.lastID;
      
      // Generate token
      const token = `token-${userId}-${Date.now()}`;
      
      res.status(201).json({
        message: 'User registered successfully',
        token: token,
        user: {
          id: userId,
          email: email,
          username: username,
          role: role,
          first_name: first_name,
          last_name: last_name,
          company_name: company_name,
          provider_code: providerCode
        }
      });
    });
  });
});

// Auth users endpoint (for User Management)
app.get('/api/auth/users', (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  
  // Get total count
  db.get('SELECT COUNT(*) as total FROM users WHERE is_active = 1', (err, countRow) => {
    if (err) {
      console.error('Users count error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const totalUsers = countRow.total;
    const totalPages = Math.ceil(totalUsers / limit);
    const offset = (page - 1) * limit;
    
    // Get users with pagination
    let query = 'SELECT * FROM users WHERE is_active = 1';
    let params = [];
    
    if (search) {
      query += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params = [searchPattern, searchPattern, searchPattern, searchPattern];
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Users query error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        success: true,
        users: rows || [],
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_users: totalUsers,
          limit: parseInt(limit)
        }
      });
    });
  });
});

// Get individual set by ID endpoint
app.get('/api/sets/:id', (req, res) => {
  const setId = req.params.id;
  const language = req.query.language || 'en';

  console.log(`🔍 Fetching set ${setId} with language: ${language}`);

  const query = `
    SELECT 
      s.set_id,
      s.name,
      s.description,
      s.category,
      s.difficulty_level,
      s.recommended_age_min,
      s.recommended_age_max,
      s.estimated_duration_minutes,
      s.manual,
      s.base_price,
      s.video_url,
      s.learning_outcomes,
      s.translations,
      s.active,
      s.admin_visible,
      s.tested_by_makerset,
      s.created_at,
      s.updated_at,
      COALESCE(
        (SELECT COUNT(*)
         FROM media_files mf
         WHERE mf.set_id = s.set_id AND mf.file_type = 'image'
        ), 0
      ) as media_count,
      COALESCE(
        (SELECT json_group_array(
          json_object(
            'media_id', mf.media_id,
            'file_name', mf.file_name,
            'file_path', mf.file_path,
            'file_type', mf.file_type,
            'mime_type', mf.mime_type,
            'description', mf.description,
            'alt_text', mf.alt_text,
            'created_at', mf.created_at
          )
        )
         FROM media_files mf
         WHERE mf.set_id = s.set_id AND mf.file_type = 'image'
        ), json_array()
      ) as media,
      COALESCE(
        (SELECT json_group_array(
          json_object(
            'set_tool_id', st.set_tool_id,
            'tool_id', st.tool_id,
            'quantity', st.quantity,
            'is_optional', st.is_optional,
            'notes', st.notes,
            'safety_notes', st.safety_notes,
            'tool_name', t.tool_name,
            'tool_number', t.tool_number,
            'category', t.category,
            'description', t.description
          )
        )
         FROM set_tools st
         JOIN tools t ON st.tool_id = t.tool_id
         WHERE st.set_id = s.set_id AND t.active = 1
        ), json_array()
      ) as tools,
      COALESCE(
        (SELECT json_group_array(
          json_object(
            'set_part_id', sp.set_part_id,
            'part_id', sp.part_id,
            'quantity', sp.quantity,
            'is_optional', sp.is_optional,
            'notes', sp.notes,
            'safety_notes', sp.safety_notes,
            'part_name', p.part_name,
            'part_number', p.part_number,
            'category', p.category,
            'unit_of_measure', p.unit_of_measure,
            'unit_cost', p.unit_cost
          )
        )
         FROM set_parts sp
         JOIN parts p ON sp.part_id = p.part_id
         WHERE sp.set_id = s.set_id
        ), json_array()
      ) as parts
    FROM sets s
    WHERE s.set_id = ?
  `;

  db.get(query, [setId], (err, row) => {
    if (err) {
      console.error('Error fetching set:', err);
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Set not found' });
    } else {
      // Parse the media JSON array
      if (row.media && typeof row.media === 'string') {
        try {
          row.media = JSON.parse(row.media);
        } catch (parseErr) {
          console.error('Error parsing media JSON:', parseErr);
          row.media = [];
        }
      } else if (!row.media) {
        row.media = [];
      }

      // Parse the tools JSON array
      if (row.tools && typeof row.tools === 'string') {
        try {
          row.tools = JSON.parse(row.tools);
        } catch (parseErr) {
          console.error('Error parsing tools JSON:', parseErr);
          row.tools = [];
        }
      } else if (!row.tools) {
        row.tools = [];
      }

      // Parse the parts JSON array
      if (row.parts && typeof row.parts === 'string') {
        try {
          row.parts = JSON.parse(row.parts);
        } catch (parseErr) {
          console.error('Error parsing parts JSON:', parseErr);
          row.parts = [];
        }
      } else if (!row.parts) {
        row.parts = [];
      }

      // Parse learning outcomes if it's a string
      if (row.learning_outcomes && typeof row.learning_outcomes === 'string') {
        try {
          row.learning_outcomes = JSON.parse(row.learning_outcomes);
        } catch (parseErr) {
          console.error('Error parsing learning_outcomes JSON:', parseErr);
          row.learning_outcomes = [];
        }
      } else if (!row.learning_outcomes) {
        row.learning_outcomes = [];
      }

      // Parse translations if it's a string
      if (row.translations && typeof row.translations === 'string') {
        try {
          row.translations = JSON.parse(row.translations);
        } catch (parseErr) {
          console.error('Error parsing translations JSON:', parseErr);
          row.translations = null;
        }
      }

      console.log(`✅ Found set ${setId}: ${row.name} with ${row.media.length} media files`);
      res.json(row);
    }
  });
});

// Update set price endpoint
app.patch('/api/sets/:id/price', (req, res) => {
  const setId = req.params.id;
  const { base_price } = req.body;

  if (!base_price || base_price < 0) {
    return res.status(400).json({ error: 'Invalid price value' });
  }

  db.run('UPDATE sets SET base_price = ? WHERE set_id = ?', [base_price, setId], function(err) {
    if (err) {
      console.error('Price update error:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Set not found' });
    } else {
      res.json({
        success: true,
        message: 'Price updated successfully',
        set_id: setId,
        base_price: base_price
      });
    }
  });
});

// Delete set endpoint
app.delete('/api/sets/:id', (req, res) => {
  const setId = req.params.id;

  // First check if the set exists
  db.get('SELECT * FROM sets WHERE set_id = ?', [setId], (err, set) => {
    if (err) {
      console.error('Set query error:', err);
      return res.status(500).json({ error: err.message });
    }

    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Check if set has any parts, media, or order items associated with it
    db.get('SELECT COUNT(*) as count FROM set_parts WHERE set_id = ?', [setId], (err, partsCount) => {
      if (err) {
        console.error('Parts count error:', err);
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT COUNT(*) as count FROM media_files WHERE set_id = ?', [setId], (err, mediaCount) => {
        if (err) {
          console.error('Media count error:', err);
          return res.status(500).json({ error: err.message });
        }

        db.get('SELECT COUNT(*) as count FROM order_items WHERE set_id = ?', [setId], (err, orderItemsCount) => {
          if (err) {
            console.error('Order items count error:', err);
            return res.status(500).json({ error: err.message });
          }

          // If set has parts, media, or order items, don't allow deletion
          if (partsCount.count > 0 || mediaCount.count > 0 || orderItemsCount.count > 0) {
            return res.status(400).json({ 
              error: `Cannot delete set that contains parts (${partsCount.count}), media (${mediaCount.count}), or order items (${orderItemsCount.count}). Please remove all dependencies first.` 
            });
          }

          // Delete the set
          db.run('DELETE FROM sets WHERE set_id = ?', [setId], function(err) {
            if (err) {
              console.error('Set deletion error:', err);
              res.status(500).json({ error: err.message });
            } else {
              res.json({
                success: true,
                message: 'Set deleted successfully',
                set_id: setId
              });
            }
          });
        });
      });
    });
  });
});

// Basic sets endpoint
// TEMPORARILY COMMENTED OUT - PROBLEMATIC ENDPOINT
/*
app.get('/api/sets', (req, res) => {
  db.all('SELECT * FROM sets WHERE active = 1 ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Sets query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      // Transform the data to include expected fields
      const transformedSets = rows.map(set => ({
        ...set,
        name: set.name || `${set.category} Set ${set.set_id}`, // Use actual name or generate fallback
        description: set.description || `A ${set.difficulty_level.toLowerCase()} ${set.category.toLowerCase()} set for ages ${set.recommended_age_min}-${set.recommended_age_max}`,
        translations: {
          en: {
            name: set.name || `${set.category} Set ${set.set_id}`,
            description: set.description || `A ${set.difficulty_level.toLowerCase()} ${set.category.toLowerCase()} set for ages ${set.recommended_age_min}-${set.recommended_age_max}`
          }
        },
        learning_outcomes: set.learning_outcomes ? JSON.parse(set.learning_outcomes) : [],
        average_rating: 0, // Will be updated with real data
        review_count: 0, // Will be updated with real data
        customer_feedback: [], // Will be updated with real data
        parts: [],
        instructions: [],
        media: [] // Initialize empty media array
      }));

      // Fetch media and parts for each set
      let completedSets = 0;
      const totalSets = transformedSets.length;
      
      if (totalSets === 0) {
        res.json({
          success: true,
          sets: transformedSets,
          pagination: {
            page: 1,
            limit: transformedSets.length,
            total: transformedSets.length,
            pages: 1
          }
        });
        return;
      }

      transformedSets.forEach((set, index) => {
        let mediaLoaded = false;
        let partsLoaded = false;
        let ratingsLoaded = false;
        
        const checkComplete = () => {
          if (mediaLoaded && partsLoaded && ratingsLoaded) {
            completedSets++;
            if (completedSets === totalSets) {
              res.json({
                success: true,
                sets: transformedSets,
                pagination: {
                  page: 1,
                  limit: transformedSets.length,
                  total: transformedSets.length,
                  pages: 1
                }
              });
            }
          }
        };
        
        // Fetch media
        db.all('SELECT * FROM media_files WHERE set_id = ? ORDER BY display_order, created_at', [set.set_id], (err, mediaRows) => {
          if (err) {
            console.error('Media query error for set', set.set_id, ':', err);
            set.media = [];
          } else {
            // Transform media data to include file_url
            set.media = mediaRows.map(media => ({
              ...media,
              file_url: `http://localhost:5003/uploads/${media.file_name}`,
              alt_text: media.alt_text || media.file_name,
              description: media.description || ''
            }));
          }
          mediaLoaded = true;
          checkComplete();
        });
        
        // Fetch parts
        db.all(`
          SELECT sp.*, p.part_name, p.part_number, p.category, p.unit_cost, p.image_url, p.stock_quantity
          FROM set_parts sp
          JOIN parts p ON sp.part_id = p.part_id
          WHERE sp.set_id = ?
        `, [set.set_id], (err, partsRows) => {
          if (err) {
            console.error('Parts query error for set', set.set_id, ':', err);
            set.parts = [];
          } else {
            set.parts = partsRows.map(part => ({
              set_part_id: part.set_part_id,
              part_id: part.part_id,
              part_name: part.part_name,
              part_number: part.part_number,
              category: part.category,
              quantity: part.quantity,
              unit_cost: part.unit_cost,
              stock_quantity: part.stock_quantity,
              is_optional: part.is_optional,
              notes: part.notes,
              image_url: part.image_url
            }));
          }
          partsLoaded = true;
          checkComplete();
        });
      
        // Fetch ratings and reviews - SIMPLIFIED VERSION
        set.average_rating = 0;
        set.review_count = 0;
        set.customer_feedback = [];
        ratingsLoaded = true;
        checkComplete();
      });
    });
  });
});
*/

// COMPREHENSIVE: Full-featured stable sets endpoint with provider information
app.get('/api/sets', (req, res) => {
  const { include_inactive } = req.query;
  const activeFilter = include_inactive === 'true' ? '' : 'WHERE s.active = 1';
  
  // Get all admin sets and provider sets with owner information
  const query = `
    SELECT 
      s.set_id,
      s.name,
      s.description,
      s.category,
      s.difficulty_level,
      s.recommended_age_min,
      s.recommended_age_max,
      s.estimated_duration_minutes,
      s.manual,
      s.base_price,
      s.video_url,
      s.learning_outcomes,
      s.translations,
      s.active,
      s.admin_visible,
      s.tested_by_makerset,
      s.created_at,
      s.updated_at,
      COALESCE(
        (SELECT MIN(FLOOR((p.stock_quantity - COALESCE(r.reserved_quantity, 0)) / sp.quantity))
         FROM set_parts sp
         JOIN parts p ON sp.part_id = p.part_id
         LEFT JOIN (
           SELECT cr.set_id, SUM(cr.quantity * sp2.quantity) as reserved_quantity
           FROM cart_reservations cr
           JOIN set_parts sp2 ON cr.set_id = sp2.set_id
           WHERE cr.expires_at > datetime('now')
           GROUP BY cr.set_id
         ) r ON r.set_id = sp.set_id
         WHERE sp.set_id = s.set_id AND sp.is_optional = 0
        ), 0
      ) as available_quantity,
      NULL as provider_set_id,
      NULL as provider_id,
      NULL as provider_visible,
      'admin' as set_type,
      'Admin' as provider_username,
      'MakerSet Platform' as provider_company,
      'Admin' as provider_first_name,
      'User' as provider_last_name
    FROM sets s
    ${activeFilter}
    AND s.set_id NOT IN (SELECT DISTINCT ps.set_id FROM provider_sets ps WHERE ps.is_active = 1)
    
    UNION ALL
    
    SELECT 
      s.set_id,
      s.name,
      s.description,
      s.category,
      s.difficulty_level,
      s.recommended_age_min,
      s.recommended_age_max,
      s.estimated_duration_minutes,
      s.manual,
      s.base_price,
      s.video_url,
      s.learning_outcomes,
      s.translations,
      s.active,
      s.admin_visible,
      s.tested_by_makerset,
      s.created_at,
      s.updated_at,
      COALESCE(
        (SELECT MIN(FLOOR((p.stock_quantity - COALESCE(r.reserved_quantity, 0)) / sp.quantity))
         FROM set_parts sp
         JOIN parts p ON sp.part_id = p.part_id
         LEFT JOIN (
           SELECT cr.set_id, SUM(cr.quantity * sp2.quantity) as reserved_quantity
           FROM cart_reservations cr
           JOIN set_parts sp2 ON cr.set_id = sp2.set_id
           WHERE cr.expires_at > datetime('now')
           GROUP BY cr.set_id
         ) r ON r.set_id = sp.set_id
         WHERE sp.set_id = s.set_id AND sp.is_optional = 0
        ), 0
      ) as available_quantity,
      ps.provider_set_id,
      ps.provider_id,
      ps.provider_visible,
      'provider' as set_type,
      u.username as provider_username,
      u.company_name as provider_company,
      u.first_name as provider_first_name,
      u.last_name as provider_last_name
    FROM sets s
    JOIN provider_sets ps ON s.set_id = ps.set_id
    JOIN users u ON ps.provider_id = u.user_id
    ${activeFilter.replace('s.active', 's.active AND ps.is_active')}
    
    ORDER BY created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Sets query error:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    // Transform sets with all required fields including provider information
    const transformedSets = rows.map(set => ({
      ...set,
      name: set.name || `${set.category} Set ${set.set_id}`,
      description: set.description || `A ${set.difficulty_level.toLowerCase()} ${set.category.toLowerCase()} set for ages ${set.recommended_age_min}-${set.recommended_age_max}`,
      translations: {
        en: {
          name: set.name || `${set.category} Set ${set.set_id}`,
          description: set.description || `A ${set.difficulty_level.toLowerCase()} ${set.category.toLowerCase()} set for ages ${set.recommended_age_min}-${set.recommended_age_max}`
        }
      },
      learning_outcomes: set.learning_outcomes ? JSON.parse(set.learning_outcomes) : [],
      average_rating: 0,
      review_count: 0,
      customer_feedback: [],
      parts: [],
      tools: [],
      instructions: [],
      media: [],
      // Include provider/owner information
      set_type: set.set_type,
      provider_set_id: set.provider_set_id,
      provider_id: set.provider_id,
      provider_username: set.provider_username,
      provider_company: set.provider_company,
      provider_first_name: set.provider_first_name,
      provider_last_name: set.provider_last_name,
      admin_visible: Boolean(set.admin_visible),
      provider_visible: set.provider_visible ? Boolean(set.provider_visible) : null,
      tested_by_makerset: Boolean(set.tested_by_makerset),
      available_quantity: set.available_quantity || 0
    }));

    // Process each set with all data fetching
    let completedSets = 0;
    const totalSets = transformedSets.length;

    if (totalSets === 0) {
      return res.json({
        success: true,
        sets: transformedSets,
        pagination: {
          page: 1,
          limit: transformedSets.length,
          total: transformedSets.length,
          pages: 1
        }
      });
    }

    transformedSets.forEach((set) => {
      let dataLoaded = 0;
      const totalDataTypes = 4; // ratings, media, parts, tools

      // Helper function to check if all data is loaded
      const checkComplete = () => {
        dataLoaded++;
        if (dataLoaded === totalDataTypes) {
          completedSets++;
          if (completedSets === totalSets) {
            res.json({
              success: true,
              sets: transformedSets,
              pagination: {
                page: 1,
                limit: transformedSets.length,
                total: transformedSets.length,
                pages: 1
              }
            });
          }
        }
      };

      // Fetch ratings
      db.all(
        'SELECT r.*, u.username, u.first_name, u.last_name FROM ratings r LEFT JOIN users u ON r.user_id = u.user_id WHERE r.set_id = ? ORDER BY r.created_at DESC',
        [set.set_id],
        (err, ratingRows) => {
          if (!err && ratingRows && ratingRows.length > 0) {
            const totalRating = ratingRows.reduce((sum, rating) => sum + rating.rating, 0);
            set.average_rating = Math.round((totalRating / ratingRows.length) * 10) / 10;
            set.review_count = ratingRows.length;
            
            set.customer_feedback = ratingRows.map(rating => ({
              id: rating.rating_id,
              rating: rating.rating,
              review: rating.review_text || '',
              customer_name: rating.first_name && rating.last_name ? 
                `${rating.first_name} ${rating.last_name}` : 
                rating.username || 'Anonymous',
              date: rating.created_at
            }));
          }
          checkComplete();
        }
      );

      // Fetch media
      db.all(
        'SELECT * FROM media_files WHERE set_id = ? ORDER BY created_at DESC',
        [set.set_id],
        (err, mediaRows) => {
          if (!err && mediaRows && mediaRows.length > 0) {
            set.media = mediaRows.map(mediaItem => ({
              id: mediaItem.media_id,
              type: mediaItem.file_type || 'image',
              file_url: `http://localhost:5003/uploads/${mediaItem.file_name}`,
              filename: mediaItem.file_name,
              mime_type: mediaItem.mime_type,
              created_at: mediaItem.created_at,
              alt_text: mediaItem.alt_text || mediaItem.file_name,
              description: mediaItem.description || ''
            }));
          }
          checkComplete();
        }
      );

      // Fetch parts
      db.all(
        `SELECT sp.*, p.part_name, p.part_number, p.category, p.unit_of_measure, 
                p.unit_cost, p.stock_quantity, p.image_url, p.assembly_notes, p.safety_notes
         FROM set_parts sp 
         LEFT JOIN parts p ON sp.part_id = p.part_id 
         WHERE sp.set_id = ?`,
        [set.set_id],
        (err, partRows) => {
          if (!err && partRows && partRows.length > 0) {
            set.parts = partRows.map(part => ({
              set_part_id: part.set_part_id,
              part_id: part.part_id,
              part_name: part.part_name,
              part_number: part.part_number,
              category: part.category,
              quantity: part.quantity,
              unit_of_measure: part.unit_of_measure,
              unit_cost: part.unit_cost,
              stock_quantity: part.stock_quantity,
              image_url: part.image_url,
              assembly_notes: part.assembly_notes,
              safety_notes: part.safety_notes
            }));
          }
          checkComplete();
        }
      );

      // Fetch tools
      db.all(
        `SELECT st.set_tool_id, st.set_id, st.tool_id, st.quantity, st.is_optional, st.notes, st.safety_notes, st.created_at,
                t.tool_name, t.tool_number, t.category, t.description, t.image_url, t.active
         FROM set_tools st 
         LEFT JOIN tools t ON st.tool_id = t.tool_id 
         WHERE st.set_id = ? AND t.active = 1`,
        [set.set_id],
        (err, toolRows) => {
          if (!err && toolRows && toolRows.length > 0) {
            set.tools = toolRows.map(tool => ({
              set_tool_id: tool.set_tool_id,
              tool_id: tool.tool_id,
              tool_name: tool.tool_name,
              tool_number: tool.tool_number,
              category: tool.category,
              quantity: tool.quantity,
              is_optional: tool.is_optional === 1,
              notes: tool.notes,
              safety_notes: tool.safety_notes,
              description: tool.description,
              image_url: tool.image_url,
              created_at: tool.created_at
            }));
          }
          checkComplete();
        }
      );
    });
  });
});

// Validate stock availability for sets endpoint
app.post('/api/sets/validate-stock', (req, res) => {
  console.log('📦 Stock validation request:', req.body);
  const { sets } = req.body; // Array of { set_id, quantity }

  if (!sets || !Array.isArray(sets)) {
    console.log('❌ Invalid request: sets array missing or not an array');
    return res.status(400).json({ error: 'Sets array is required' });
  }

  const validationResults = [];
  let allValid = true;

  // Process each set
  Promise.all(sets.map(async (setItem) => {
    const { set_id, quantity } = setItem;
    
    if (!set_id || !quantity) {
      validationResults.push({
        set_id,
        valid: false,
        error: 'Missing set_id or quantity'
      });
      allValid = false;
      return;
    }

    // Skip validation for handling fee items (set_id = -1)
    if (set_id === -1) {
      console.log(`⚠️  Skipping stock validation for handling fee item (set_id=${set_id})`);
      validationResults.push({
        set_id,
        valid: true,
        parts_configured: true
      });
      return;
    }

    try {
      // Get all parts for this set
      const partsQuery = `
        SELECT 
          sp.part_id,
          sp.quantity as required_quantity,
          p.stock_quantity,
          p.part_name,
          p.part_number
        FROM set_parts sp
        JOIN parts p ON sp.part_id = p.part_id
        WHERE sp.set_id = ?
      `;

      return new Promise((resolve) => {
        db.all(partsQuery, [set_id], (err, parts) => {
          if (err) {
            console.error('Error fetching set parts:', err);
            validationResults.push({
              set_id,
              valid: false,
              error: 'Database error'
            });
            allValid = false;
            resolve();
            return;
          }

          // Check if set has parts configured
          if (!parts || parts.length === 0) {
            console.log(`⚠️  Set ${set_id} has no parts configured`);
            validationResults.push({
              set_id,
              valid: false,
              parts_configured: false,
              error: 'No parts configured for this set'
            });
            allValid = false;
            resolve();
            return;
          }

          // Check if we have enough stock for each part
          const insufficientParts = [];
          for (const part of parts) {
            const totalRequired = part.required_quantity * quantity;
            if (part.stock_quantity < totalRequired) {
              insufficientParts.push({
                part_id: part.part_id,
                part_name: part.part_name,
                part_number: part.part_number,
                required: totalRequired,
                available: part.stock_quantity,
                shortfall: totalRequired - part.stock_quantity
              });
            }
          }

          if (insufficientParts.length > 0) {
            validationResults.push({
              set_id,
              valid: false,
              parts_configured: true,
              insufficient_parts: insufficientParts
            });
            allValid = false;
          } else {
            validationResults.push({
              set_id,
              valid: true,
              parts_configured: true
            });
          }
          resolve();
        });
      });
    } catch (error) {
      console.error('Error validating stock for set:', set_id, error);
      validationResults.push({
        set_id,
        valid: false,
        error: 'Validation error'
      });
      allValid = false;
    }
  })).then(() => {
    res.json({
      valid: allValid,
      results: validationResults
    });
  }).catch((error) => {
    console.error('Stock validation error:', error);
    res.status(500).json({ 
      error: 'Failed to validate stock availability',
      details: error.message 
    });
  });
});

// Create new set endpoint
app.post('/api/sets', (req, res) => {
  const {
    name,
    description,
    category,
    difficulty_level,
    recommended_age_min,
    recommended_age_max,
    estimated_duration_minutes,
    manual,
    base_price,
    video_url,
    learning_outcomes,
    translations,
    parts, // Array of { part_id, quantity, is_optional, notes }
    tools, // Array of { tool_id, quantity, is_required, notes }
    active = 1
  } = req.body;

  // Validate required fields
  if (!category || !difficulty_level) {
    return res.status(400).json({ error: 'Category and difficulty_level are required' });
  }

  const insertSetQuery = `
    INSERT INTO sets (
      name, description, category, difficulty_level, recommended_age_min, recommended_age_max, 
      estimated_duration_minutes, manual, base_price, video_url, 
      learning_outcomes, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const setParams = [
    name || null,
    description || null,
    category,
    difficulty_level,
    recommended_age_min || null,
    recommended_age_max || null,
    estimated_duration_minutes || null,
    manual || null,
    base_price || 0,
    video_url || null,
    learning_outcomes ? JSON.stringify(learning_outcomes) : null,
    active
  ];

  db.run(insertSetQuery, setParams, function(err) {
    if (err) {
      console.error('Error creating set:', err);
      return res.status(500).json({ error: 'Failed to create set' });
    }

    const setId = this.lastID;

    // Insert parts for the set
    if (parts && parts.length > 0) {
      const insertPartQuery = 'INSERT INTO set_parts (set_id, part_id, quantity, is_optional, notes) VALUES (?, ?, ?, ?, ?)';
      
      parts.forEach((part, index) => {
        db.run(insertPartQuery, [
          setId,
          part.part_id,
          part.quantity || 1,
          part.is_optional ? 1 : 0,
          part.notes || null
        ], (err) => {
          if (err) {
            console.error(`Error inserting part ${index}:`, err);
          }
        });
      });
    }

    // Insert tools for the set
    if (tools && tools.length > 0) {
      const insertToolQuery = 'INSERT INTO set_tools (set_id, tool_id, quantity, is_optional) VALUES (?, ?, ?, ?)';
      
      tools.forEach((tool, index) => {
        db.run(insertToolQuery, [
          setId,
          tool.tool_id,
          tool.quantity || 1,
          tool.is_required ? 0 : 1 // Note: is_optional is opposite of is_required
        ], (err) => {
          if (err) {
            console.error(`Error inserting tool ${index}:`, err);
          }
        });
      });
    }

    res.status(201).json({ 
      set_id: setId, 
      message: 'Set created successfully' 
    });
  });
});

// Update set endpoint
app.put('/api/sets/:id', (req, res) => {
  const setId = req.params.id;
  const {
    name,
    description,
    category,
    difficulty_level,
    recommended_age_min,
    recommended_age_max,
    estimated_duration_minutes,
    manual,
    base_price,
    video_url,
    learning_outcomes,
    translations,
    parts, // Array of { part_id, quantity, is_optional, notes }
    tools, // Array of { tool_id, quantity, is_required, notes }
    active
  } = req.body;

  // Validate required fields
  if (!category || !difficulty_level) {
    return res.status(400).json({ error: 'Category and difficulty_level are required' });
  }

  // Extract name and description from translations if available
  let extractedName = name;
  let extractedDescription = description;
  if (translations) {
    let englishTranslation = null;
    
    // Handle both array and object formats
    if (Array.isArray(translations)) {
      englishTranslation = translations.find(t => t.language_code === 'en');
    } else if (typeof translations === 'object' && translations.en) {
      englishTranslation = translations.en;
    }
    
    if (englishTranslation) {
      if (englishTranslation.name) {
        extractedName = englishTranslation.name;
      }
      if (englishTranslation.description) {
        extractedDescription = englishTranslation.description;
      }
    }
  }

  console.log('🔧 Updating set:', setId, 'name:', extractedName, 'description:', extractedDescription, 'translations:', translations);

  const updateSetQuery = `
    UPDATE sets SET 
      name = ?, description = ?, category = ?, difficulty_level = ?, recommended_age_min = ?, 
      recommended_age_max = ?, estimated_duration_minutes = ?, manual = ?,
      base_price = ?, video_url = ?, learning_outcomes = ?, translations = ?, active = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE set_id = ?
  `;

  const setParams = [
    extractedName || null,
    extractedDescription || null,
    category,
    difficulty_level,
    recommended_age_min || null,
    recommended_age_max || null,
    estimated_duration_minutes || null,
    manual || null,
    base_price || 0,
    video_url || null,
    learning_outcomes ? JSON.stringify(learning_outcomes) : null,
    translations ? JSON.stringify(translations) : null,
    active !== undefined ? active : 1,
    setId
  ];

  console.log('🔧 Set params:', setParams);

  db.run(updateSetQuery, setParams, function(err) {
    console.log('🔧 Database update result - err:', err, 'changes:', this.changes);
    if (err) {
      console.error('Error updating set:', err);
      return res.status(500).json({ error: 'Failed to update set' });
    }

    if (this.changes === 0) {
      console.log('🔧 No changes made to set:', setId);
      return res.status(404).json({ error: 'Set not found' });
    }

    // Update parts for the set
    if (parts && Array.isArray(parts) && parts.length > 0) {
      // First, delete existing parts
      db.run('DELETE FROM set_parts WHERE set_id = ?', [setId], (err) => {
        if (err) {
          console.error('Error deleting existing parts:', err);
        }
        
        // Then insert new parts
        const insertPartQuery = 'INSERT INTO set_parts (set_id, part_id, quantity, is_optional, notes, safety_notes) VALUES (?, ?, ?, ?, ?, ?)';
        
        parts.forEach((part, index) => {
          db.run(insertPartQuery, [
            setId,
            part.part_id,
            part.quantity || 1,
            part.is_optional ? 1 : 0,
            part.notes || null,
            part.safety_notes || null
          ], (err) => {
            if (err) {
              console.error(`Error inserting part ${index}:`, err);
            }
          });
        });
      });
    }

    // Update tools for the set
    if (tools && Array.isArray(tools) && tools.length > 0) {
      // First, delete existing tools
      db.run('DELETE FROM set_tools WHERE set_id = ?', [setId], (err) => {
        if (err) {
          console.error('Error deleting existing tools:', err);
        }
        
        // Then insert new tools
        const insertToolQuery = 'INSERT INTO set_tools (set_id, tool_id, quantity, is_optional, notes, safety_notes) VALUES (?, ?, ?, ?, ?, ?)';
        
        tools.forEach((tool, index) => {
          db.run(insertToolQuery, [
            setId,
            tool.tool_id,
            tool.quantity || 1,
            tool.is_optional ? 1 : 0,
            tool.notes || null,
            tool.safety_notes || null
          ], (err) => {
            if (err) {
              console.error(`Error inserting tool ${index}:`, err);
            }
          });
        });
      });
    }

    res.json({ 
      message: 'Set updated successfully',
      set_id: setId
    });
  });
});

// Get tools for a specific set
app.get('/api/set-tools/set/:setId', (req, res) => {
  const setId = req.params.setId;
  const { language = 'en' } = req.query;

  const query = `
    SELECT 
      st.set_tool_id,
      st.set_id,
      st.tool_id,
      st.quantity,
      st.is_optional,
      st.notes,
      st.safety_notes,
      st.created_at,
      t.tool_name,
      t.category,
      t.description,
      t.image_url,
      t.active
    FROM set_tools st
    JOIN tools t ON st.tool_id = t.tool_id
    WHERE st.set_id = ? AND t.active = 1
    ORDER BY t.tool_name
  `;

  db.all(query, [setId], (err, rows) => {
    if (err) {
      console.error('Set tools query error:', err);
      return res.status(500).json({ error: err.message });
    }

    // Transform the data to match expected format
    const transformedTools = rows.map(row => ({
      set_tool_id: row.set_tool_id,
      set_id: row.set_id,
      tool_id: row.tool_id,
      quantity: row.quantity,
      is_optional: row.is_optional === 1,
      is_required: row.is_optional === 0, // Convert is_optional to is_required
      notes: row.notes,
      safety_notes: row.safety_notes,
      created_at: row.created_at,
      // Flatten tool properties to the top level
      tool_name: row.tool_name,
      tool_number: row.tool_name, // Use tool_name as tool_number for compatibility
      category: row.category,
      description: row.description,
      image_url: row.image_url,
      active: row.active === 1,
      translations: {
        [language]: {
          tool_name: row.tool_name,
          description: row.description
        }
      }
    }));

    res.json(transformedTools);
  });
});

// Add tool to set endpoint
app.post('/api/set-tools', (req, res) => {
  const {
    set_id,
    tool_id,
    quantity = 1,
    is_optional = true, // Tools should be optional by default
    notes = null,
    safety_notes = null
  } = req.body;

  // Validate required fields
  if (!set_id || !tool_id) {
    return res.status(400).json({ error: 'set_id and tool_id are required' });
  }

  // Check if the set exists
  db.get('SELECT set_id FROM sets WHERE set_id = ?', [set_id], (err, setRow) => {
    if (err) {
      console.error('Error checking set:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!setRow) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Check if the tool exists
    db.get('SELECT tool_id FROM tools WHERE tool_id = ? AND active = 1', [tool_id], (err, toolRow) => {
      if (err) {
        console.error('Error checking tool:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!toolRow) {
        return res.status(404).json({ error: 'Tool not found' });
      }

      // Check if the tool is already in the set
      db.get('SELECT set_tool_id FROM set_tools WHERE set_id = ? AND tool_id = ?', [set_id, tool_id], (err, existingRow) => {
        if (err) {
          console.error('Error checking existing tool:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingRow) {
          return res.status(409).json({ error: 'Tool is already in this set' });
        }

        // Insert the tool into the set
        const insertQuery = `
          INSERT INTO set_tools (set_id, tool_id, quantity, is_optional, notes, safety_notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        db.run(insertQuery, [set_id, tool_id, quantity, is_optional ? 1 : 0, notes, safety_notes], function(err) {
          if (err) {
            console.error('Error adding tool to set:', err);
            return res.status(500).json({ error: 'Failed to add tool to set' });
          }

          res.status(201).json({
            set_tool_id: this.lastID,
            message: 'Tool added to set successfully'
          });
        });
      });
    });
  });
});

// Delete tool from set endpoint
app.delete('/api/set-tools/:setToolId', (req, res) => {
  const setToolId = req.params.setToolId;

  // Validate setToolId
  if (!setToolId || isNaN(parseInt(setToolId))) {
    return res.status(400).json({ error: 'Valid set_tool_id is required' });
  }

  // Check if the set-tool relationship exists
  db.get('SELECT * FROM set_tools WHERE set_tool_id = ?', [setToolId], (err, row) => {
    if (err) {
      console.error('Error checking set-tool relationship:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Set-tool relationship not found' });
    }

    // Delete the set-tool relationship
    db.run('DELETE FROM set_tools WHERE set_tool_id = ?', [setToolId], function(err) {
      if (err) {
        console.error('Error deleting set-tool relationship:', err);
        return res.status(500).json({ error: 'Failed to remove tool from set' });
      }

      res.json({
        message: 'Tool removed from set successfully',
        deleted_set_tool_id: setToolId
      });
    });
  });
});

// Update set-tool relationship endpoint
app.put('/api/set-tools/:setToolId', (req, res) => {
  const setToolId = req.params.setToolId;
  const { quantity, is_required, notes, safety_notes } = req.body;

  // Validate setToolId
  if (!setToolId || isNaN(parseInt(setToolId))) {
    return res.status(400).json({ error: 'Valid set_tool_id is required' });
  }

  // Validate required fields
  if (quantity === undefined || quantity === null) {
    return res.status(400).json({ error: 'Quantity is required' });
  }

  if (quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  // Check if the set-tool relationship exists
  db.get('SELECT * FROM set_tools WHERE set_tool_id = ?', [setToolId], (err, row) => {
    if (err) {
      console.error('Error checking set-tool relationship:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Set-tool relationship not found' });
    }

    // Update the set-tool relationship
    const updateQuery = `
      UPDATE set_tools 
      SET quantity = ?, is_optional = ?, notes = ?, safety_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE set_tool_id = ?
    `;
    const isOptional = is_required === false ? 1 : 0; // Convert is_required to is_optional
    
    db.run(updateQuery, [quantity, isOptional, notes, safety_notes, setToolId], function(err) {
      if (err) {
        console.error('Error updating set-tool relationship:', err);
        return res.status(500).json({ error: 'Failed to update tool in set' });
      }

      res.json({
        message: 'Tool updated in set successfully',
        set_tool_id: setToolId,
        quantity: quantity,
        is_required: !isOptional
      });
    });
  });
});

// Update set visibility in store (Admin only)
app.put('/api/sets/:id/visibility', (req, res) => {
  const setId = req.params.id;
  const { admin_visible } = req.body;

  // Validate input
  if (typeof admin_visible !== 'boolean') {
    return res.status(400).json({ error: 'admin_visible must be a boolean value' });
  }

  const updateQuery = `
    UPDATE sets 
    SET admin_visible = ?, updated_at = CURRENT_TIMESTAMP
    WHERE set_id = ?
  `;

  db.run(updateQuery, [admin_visible ? 1 : 0, setId], function(err) {
    if (err) {
      console.error('Error updating set visibility:', err);
      return res.status(500).json({ error: 'Failed to update set visibility' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }

    console.log(`✅ Set ${setId} visibility updated to ${admin_visible ? 'visible' : 'hidden'}`);
    
    res.json({
      success: true,
      message: `Set visibility updated to ${admin_visible ? 'visible' : 'hidden'}`,
      set_id: setId,
      admin_visible: admin_visible
    });
  });
});

// Update provider set visibility (Admin only - admin can control provider visibility)
app.put('/api/provider-sets/:providerSetId/visibility', (req, res) => {
  const providerSetId = req.params.providerSetId;
  const { provider_visible } = req.body;

  // Validate input
  if (typeof provider_visible !== 'boolean') {
    return res.status(400).json({ error: 'provider_visible must be a boolean value' });
  }

  const updateQuery = `
    UPDATE provider_sets 
    SET provider_visible = ?, updated_at = CURRENT_TIMESTAMP
    WHERE provider_set_id = ?
  `;

  db.run(updateQuery, [provider_visible ? 1 : 0, providerSetId], function(err) {
    if (err) {
      console.error('Error updating provider set visibility:', err);
      return res.status(500).json({ error: 'Failed to update provider set visibility' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    console.log(`✅ Provider set ${providerSetId} visibility updated to ${provider_visible ? 'visible' : 'hidden'} by admin`);
    
    res.json({
      success: true,
      message: `Provider set visibility updated to ${provider_visible ? 'visible' : 'hidden'}`,
      provider_set_id: providerSetId,
      provider_visible: provider_visible
    });
  });
});

// Update provider set admin visibility (Admin only)
app.put('/api/admin/provider-sets/:providerSetId/visibility', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const providerSetId = req.params.providerSetId;
  const { admin_visible } = req.body;
  
  console.log(`📝 Updating provider set ${providerSetId} admin visibility to ${admin_visible}`);
  
  // Validate input
  if (typeof admin_visible !== 'boolean') {
    return res.status(400).json({ error: 'admin_visible must be a boolean value' });
  }

  const updateQuery = `
    UPDATE provider_sets 
    SET admin_visible = ?, updated_at = CURRENT_TIMESTAMP
    WHERE provider_set_id = ?
  `;

  db.run(updateQuery, [admin_visible ? 1 : 0, providerSetId], function(err) {
    if (err) {
      console.error('Error updating provider set admin visibility:', err);
      return res.status(500).json({ error: 'Failed to update provider set admin visibility' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    console.log(`✅ Provider set ${providerSetId} admin visibility updated to ${admin_visible ? 'visible' : 'hidden'}`);
    
    res.json({
      success: true,
      message: `Provider set admin visibility updated to ${admin_visible ? 'visible' : 'hidden'}`,
      provider_set_id: providerSetId,
      admin_visible
    });
  });
});

// Update provider set admin status (Admin only)
app.put('/api/admin/provider-sets/:providerSetId/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const providerSetId = req.params.providerSetId;
  const { admin_status, admin_notes } = req.body;
  
  console.log(`📝 Updating provider set ${providerSetId} status to ${admin_status}`);
  
  // Validate status
  const validStatuses = ['active', 'on_hold', 'disabled'];
  if (!validStatuses.includes(admin_status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const updateQuery = `
    UPDATE provider_sets 
    SET admin_status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE provider_set_id = ?
  `;

  db.run(updateQuery, [admin_status, admin_notes || null, providerSetId], function(err) {
    if (err) {
      console.error('Error updating provider set status:', err);
      return res.status(500).json({ error: 'Failed to update provider set status' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Provider set not found' });
    }

    console.log(`✅ Provider set ${providerSetId} admin status updated to ${admin_status}`);
    
    res.json({
      success: true,
      message: `Provider set status updated to ${admin_status}`,
      provider_set_id: providerSetId,
      admin_status,
      admin_notes
    });
  });
});

// Update set trust certification (Admin only)
app.put('/api/sets/:id/trust-certification', (req, res) => {
  const setId = req.params.id;
  const { tested_by_makerset } = req.body;

  // Validate input
  if (typeof tested_by_makerset !== 'boolean') {
    return res.status(400).json({ error: 'tested_by_makerset must be a boolean value' });
  }

  const updateQuery = `
    UPDATE sets 
    SET tested_by_makerset = ?, updated_at = CURRENT_TIMESTAMP
    WHERE set_id = ?
  `;

  db.run(updateQuery, [tested_by_makerset ? 1 : 0, setId], function(err) {
    if (err) {
      console.error('Error updating set trust certification:', err);
      return res.status(500).json({ error: 'Failed to update set trust certification' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }

    console.log(`✅ Set ${setId} trust certificate updated to ${tested_by_makerset ? 'certified' : 'not certified'}`);
    
    res.json({
      success: true,
      message: `Set trust certificate updated to ${tested_by_makerset ? 'certified' : 'not certified'}`,
      set_id: setId,
      tested_by_makerset: tested_by_makerset
    });
  });
});

// Confirm payment and process order endpoint (Admin only)
app.put('/api/orders/:orderId/confirm-payment', authenticateToken, (req, res) => {
  const orderId = req.params.orderId;
  const { payment_reference, payment_amount, payment_method = 'bank_transfer' } = req.body;
  
  console.log(`💰 Payment confirmation request for order ${orderId}:`, req.body);
  
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  if (!payment_reference || !payment_amount) {
    return res.status(400).json({ error: 'Payment reference and amount are required' });
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Update order with payment confirmation
    const updateOrderSql = `
      UPDATE orders 
      SET payment_status = 'confirmed',
          payment_reference = ?,
          payment_amount = ?,
          payment_method = ?,
          payment_confirmed_by = ?,
          payment_confirmed_at = CURRENT_TIMESTAMP,
          status = 'processing',
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `;
    
    db.run(updateOrderSql, [
      payment_reference,
      payment_amount,
      payment_method,
      req.user.user_id,
      orderId
    ], function(err) {
      if (err) {
        console.error('Error updating order payment:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to confirm payment', details: err.message });
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Add status history entry
      const statusHistorySql = `
        INSERT INTO order_status_history (order_id, status, notes, updated_by, updated_at)
        VALUES (?, 'processing', 'Payment confirmed by admin', ?, CURRENT_TIMESTAMP)
      `;
      
      db.run(statusHistorySql, [orderId, req.user.user_id], function(err) {
        if (err) {
          console.error('Error adding status history:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update status history', details: err.message });
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
            return res.status(500).json({ error: 'Failed to confirm payment', details: err.message });
          }
          
          console.log(`✅ Payment confirmed for order ${orderId}`);
          res.json({ 
            success: true, 
            message: 'Payment confirmed and order processing started',
            order_id: orderId
          });
        });
      });
    });
  });
});

// Provider Payments API Endpoints

// Generate monthly report for provider payments
app.post('/api/provider-payments/generate-report', authenticateToken, (req, res) => {
  const { month, year } = req.body;
  
  console.log(`📊 Generating monthly report for ${month}/${year}`);
  
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }
  
  // Calculate date range for the month in local time (YYYY-MM-DD HH:MM:SS format)
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')} 23:59:59`;
  
  console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);
  
  const reportQuery = `
    SELECT 
      u.user_id as provider_id,
      u.username as provider_name,
      u.company_name as provider_company,
      u.email as provider_email,
      u.provider_markup_percentage,
      COUNT(o.order_id) as total_orders,
      SUM(o.total_amount) as total_revenue,
      CAST(SUM(o.total_amount) AS REAL) * (CAST(u.provider_markup_percentage AS REAL) / 100.0) as provider_payment,
      CAST(SUM(o.total_amount) AS REAL) * ((100.0 - CAST(u.provider_markup_percentage AS REAL)) / 100.0) as platform_fee_amount
    FROM orders o
    JOIN users u ON o.provider_id = u.user_id
    WHERE o.created_at >= ? AND o.created_at <= ?
      AND o.status IN ('shipped', 'delivered', 'payment_received')
      AND u.role = 'provider'
      AND o.set_type = 'provider'
    GROUP BY u.user_id, u.username, u.company_name, u.email, u.provider_markup_percentage
    HAVING total_orders > 0
  `;
  
  console.log(`🔍 Executing query with dates: ${startDateStr} to ${endDateStr}`);
  console.log(`📝 Query:`, reportQuery);
  
  db.all(reportQuery, [startDateStr, endDateStr], (err, rows) => {
    if (err) {
      console.error('❌ Error generating report:', err);
      return res.status(500).json({ error: 'Failed to generate report', details: err.message });
    }
    
    console.log(`🔍 Query returned ${rows?.length || 0} providers`);
    if (rows && rows.length > 0) {
      console.log(`📊 Sample provider data:`, JSON.stringify(rows[0], null, 2));
    }
    
    // Get detailed order information for each provider
    const providers = rows.map(provider => ({
      ...provider,
      total_revenue: parseFloat(provider.total_revenue) || 0,
      platform_fee_amount: parseFloat(provider.platform_fee_amount) || 0,
      provider_payment: parseFloat(provider.provider_payment) || 0,
      platform_fee_percentage: parseFloat(provider.provider_markup_percentage) || 0,
      orders: [] // Will be populated separately
    }));
    
    // Calculate totals
    const totalRevenue = providers.reduce((sum, p) => sum + p.total_revenue, 0);
    const totalPlatformFees = providers.reduce((sum, p) => sum + p.platform_fee_amount, 0);
    const totalProviderPayments = providers.reduce((sum, p) => sum + p.provider_payment, 0);
    
    // Get month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const report = {
      month: monthNames[month - 1] || `Month ${month}`,
      year: year,
      total_providers: providers.length,
      total_revenue: totalRevenue,
      total_platform_fees: totalPlatformFees,
      total_provider_payments: totalProviderPayments,
      providers: providers
    };
    
    console.log(`✅ Monthly report generated: ${providers.length} providers, €${totalRevenue.toFixed(2)} revenue`);
    console.log(`📊 Report data:`, JSON.stringify(report, null, 2));
    
    // Save report to database (overwrites if exists for this month/year)
    // First delete existing report
    db.run('DELETE FROM monthly_reports WHERE month = ? AND year = ?', [month, year], (err) => {
      if (err) {
        console.error('Error deleting existing report:', err);
      }
      
      // Then insert new report
      const saveReportSql = `
        INSERT INTO monthly_reports (month, year, total_providers, total_revenue, 
                                     total_platform_fees, total_provider_payments, report_data, generated_by, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'generated')
      `;
      
      db.run(saveReportSql, [
        month, year,
        report.total_providers,
        report.total_revenue,
        report.total_platform_fees,
        report.total_provider_payments,
        JSON.stringify(report),
        1 // System user ID
      ], function(err) {
        if (err) {
          console.error('Error saving report to database:', err);
        } else {
          console.log(`💾 Report saved to database for ${month}/${year}`);
        }
      });
    });
    
    res.json(report);
  });
});

// Get monthly reports history (Admin and Provider access)
app.get('/api/provider-payments/monthly-reports', authenticateToken, (req, res) => {
  console.log('📊 Fetching monthly reports history');
  
  const userRole = req.user.role;
  const userId = req.user.user_id;

  // Allow both admin and provider access
  if (userRole !== 'admin' && userRole !== 'provider') {
    return res.status(403).json({ error: 'Admin or Provider access required' });
  }

  // For now, return empty array - in a real implementation, you'd store reports in database
  // This should be replaced with actual database queries for monthly reports
  const mockReports = [];
  
  res.json(mockReports);
});

// Email provider invoice (Admin and Provider access)
app.post('/api/provider-payments/email-invoice', authenticateToken, (req, res) => {
  const { provider_id, month, year } = req.body;
  
  console.log(`📧 Sending invoice email to provider ${provider_id} for ${month}/${year}`);
  
  const userRole = req.user.role;
  const userId = req.user.user_id;

  // Allow both admin and provider access, but providers can only access their own invoices
  if (userRole !== 'admin' && userRole !== 'provider') {
    return res.status(403).json({ error: 'Admin or Provider access required' });
  }

  if (userRole === 'provider' && userId != provider_id) {
    return res.status(403).json({ error: 'Providers can only access their own invoices' });
  }
  
  // For now, return success
  // In a real implementation, you'd integrate with an email service like SendGrid or Nodemailer
  res.json({
    message: 'Invoice sent successfully',
    provider_id: provider_id,
    month: month,
    year: year
  });
});

// Generate monthly reports for provider payments (Admin only)
app.post('/api/provider-payments/generate-monthly-reports', authenticateToken, (req, res) => {
  const { month, year } = req.body;
  
  console.log(`📊 Generating monthly reports for ${month}/${year}`);
  
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }
  
  // For now, return success
  // In a real implementation, you'd generate comprehensive monthly reports
  res.json({
    success: true,
    message: 'Monthly reports generated successfully',
    month: month,
    year: year,
    reports_generated: 0 // Would be actual count in real implementation
  });
});

// Get provider monthly reports
app.get('/api/provider-payments/reports', authenticateToken, async (req, res) => {
  try {
    const { provider_id, year, month } = req.query;
    const userRole = req.user.role;
    const userId = req.user.user_id;

    // Only providers can access their own reports, or admins can access any
    if (userRole === 'provider' && provider_id && provider_id != userId) {
      return res.status(403).json({ error: 'Providers can only access their own reports' });
    }

    const targetProviderId = userRole === 'provider' ? userId : provider_id;
    if (!targetProviderId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }

    // Default to current month if not specified
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || (currentDate.getMonth() + 1);

    // Get monthly sales data
    const salesQuery = `
      SELECT 
        o.order_id,
        o.order_number,
        o.created_at,
        o.total_amount,
        o.status,
        oi.set_id,
        oi.quantity,
        oi.unit_price,
        oi.line_total,
        s.name as set_name,
        ps.price as provider_price,
        ps.provider_id
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN sets s ON oi.set_id = s.set_id
      JOIN provider_sets ps ON oi.set_id = ps.set_id
      WHERE ps.provider_id = ?
        AND strftime('%Y', o.created_at) = ?
        AND strftime('%m', o.created_at) = ?
        AND o.status IN ('shipped', 'delivered', 'payment_received')
      ORDER BY o.created_at DESC
    `;

    const salesResult = await new Promise((resolve, reject) => {
      db.all(salesQuery, [targetProviderId, targetYear.toString(), targetMonth.toString().padStart(2, '0')], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Calculate totals
    const totalSales = salesResult.length;
    const totalRevenue = salesResult.reduce((sum, order) => sum + (order.line_total || 0), 0);
    const pendingPayments = salesResult.filter(order => order.status === 'payment_pending').length;
    const completedPayments = salesResult.filter(order => order.status === 'payment_completed').length;

    // Get provider info
    const providerQuery = 'SELECT username, company_name, provider_code FROM users WHERE user_id = ?';
    const providerResult = await new Promise((resolve, reject) => {
      db.get(providerQuery, [targetProviderId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Generate AI motivation message
    const motivationMessages = [
      `🌟 Outstanding performance this month! Your dedication to quality is inspiring.`,
      `🚀 Your sales momentum is incredible! Keep up the excellent work.`,
      `💎 Your customers love your sets! Your attention to detail shows.`,
      `🎯 Perfect execution this month! Your professionalism is commendable.`,
      `⭐ You're setting the standard for excellence! Keep pushing forward.`,
      `🔥 Amazing results! Your commitment to customer satisfaction is evident.`,
      `🏆 Top-tier performance! You're making a real difference.`,
      `✨ Your hard work is paying off beautifully! Continue the great work.`
    ];

    const randomMotivation = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];

    res.json({
      provider: {
        user_id: targetProviderId,
        username: providerResult?.username,
        company_name: providerResult?.company_name,
        provider_code: providerResult?.provider_code
      },
      period: {
        year: parseInt(targetYear),
        month: parseInt(targetMonth),
        month_name: new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })
      },
      sales: {
        total_orders: totalSales,
        total_revenue: totalRevenue,
        pending_payments: pendingPayments,
        completed_payments: completedPayments,
        orders: salesResult
      },
      ai_motivation: randomMotivation,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching provider reports:', error);
    res.status(500).json({ error: 'Failed to fetch provider reports' });
  }
});

// Get provider payment history
app.get('/api/provider-payments/payments', authenticateToken, async (req, res) => {
  try {
    const { provider_id, year, month } = req.query;
    const userRole = req.user.role;
    const userId = req.user.user_id;

    // Only providers can access their own payments, or admins can access any
    if (userRole === 'provider' && provider_id && provider_id != userId) {
      return res.status(403).json({ error: 'Providers can only access their own payments' });
    }

    const targetProviderId = userRole === 'provider' ? userId : provider_id;
    if (!targetProviderId) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }

    // Get payment history
    const paymentsQuery = `
      SELECT 
        o.order_id,
        o.order_number,
        o.created_at,
        o.total_amount,
        o.status,
        o.payment_confirmed_at,
        oi.set_id,
        oi.quantity,
        oi.line_total,
        s.name as set_name
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN sets s ON oi.set_id = s.set_id
      JOIN provider_sets ps ON oi.set_id = ps.set_id
      WHERE ps.provider_id = ?
        AND o.status IN ('payment_received', 'shipped', 'delivered')
      ORDER BY o.payment_confirmed_at DESC, o.created_at DESC
    `;

    const paymentsResult = await new Promise((resolve, reject) => {
      db.all(paymentsQuery, [targetProviderId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Calculate totals
    const totalPaid = paymentsResult.reduce((sum, payment) => sum + (payment.line_total || 0), 0);
    const totalPayments = paymentsResult.length;

    res.json({
      provider_id: targetProviderId,
      payments: paymentsResult,
      summary: {
        total_payments: totalPayments,
        total_amount_paid: totalPaid,
        last_payment_date: paymentsResult[0]?.payment_confirmed_at || null
      }
    });

  } catch (error) {
    console.error('Error fetching provider payments:', error);
    res.status(500).json({ error: 'Failed to fetch provider payments' });
  }
});

// Basic orders endpoint
app.get('/api/orders', authenticateToken, (req, res) => {
  console.log('📋 Orders fetch request:', req.query);
  
  const { customer_id, provider_id, status } = req.query;
  const userRole = req.user.role;
  const userId = req.user.user_id;
  
  // Build WHERE clause based on query parameters and user role
  let whereClause = [];
  let params = [];
  
  // Role-based access control
  if (userRole === 'customer') {
    // Customers can only see their own orders
    whereClause.push('o.customer_id = ?');
    params.push(userId);
  } else if (userRole === 'provider') {
    // Providers can only see orders for their sets
    whereClause.push('o.provider_id = ?');
    params.push(userId);
  } else if (userRole === 'production') {
    // Production can see admin orders (provider_id is NULL)
    whereClause.push('o.set_type = ?');
    params.push('admin');
  }
  
  // Additional filters from query params
  if (customer_id && userRole !== 'customer') {
    whereClause.push('o.customer_id = ?');
    params.push(customer_id);
  }
  
  if (provider_id && userRole !== 'provider') {
    whereClause.push('o.provider_id = ?');
    params.push(provider_id);
  }
  
  if (status && status !== 'all') {
    whereClause.push('o.status = ?');
    params.push(status);
  }
  
  const whereSql = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';
  
  const ordersQuery = `
    SELECT 
      o.*,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.email as customer_email_from_user,
      c.company_name as customer_company_name,
      c.phone as customer_phone_from_user,
      p.first_name as provider_first_name,
      p.last_name as provider_last_name,
      p.email as provider_email,
      p.company_name as provider_company_name,
      p.provider_code as provider_code
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.user_id
    LEFT JOIN users p ON o.provider_id = p.user_id
    ${whereSql}
    ORDER BY o.created_at DESC
  `;
  
  console.log('📋 Orders query:', ordersQuery);
  console.log('📋 Orders params:', params);
  
  db.all(ordersQuery, params, (err, rows) => {
    if (err) {
      console.error('Orders query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      console.log(`📋 Returning ${rows?.length || 0} orders`);
      
      // Transform the data to include customer info and items
      const transformedOrders = rows?.map(order => ({
        ...order,
        // Use customer_email from orders table if available, otherwise from users table
        customer_email: order.customer_email || order.customer_email_from_user,
        // Use customer_phone from orders table if available, otherwise from users table  
        customer_phone: order.customer_phone || order.customer_phone_from_user,
        // Add customer name fields for invoice generation
        customer_first_name: order.customer_first_name,
        customer_last_name: order.customer_last_name,
        company_name: order.customer_company_name,
        // Initialize items array (will be populated below)
        items: []
      })) || [];
      
      // Get order items for all orders
      if (transformedOrders.length === 0) {
        return res.json({ 
          orders: transformedOrders,
          pagination: {
            total: transformedOrders.length,
            page: 1,
            limit: 100
          }
        });
      }
      
      const orderIds = transformedOrders.map(order => order.order_id);
      const orderIdsPlaceholder = orderIds.map(() => '?').join(',');
      
      const itemsQuery = `
        SELECT 
          oi.*,
          s.name as set_name,
          s.description as set_description
        FROM order_items oi
        LEFT JOIN sets s ON oi.set_id = s.set_id
        WHERE oi.order_id IN (${orderIdsPlaceholder})
        ORDER BY oi.order_id, oi.order_item_id
      `;
      
      db.all(itemsQuery, orderIds, (err, items) => {
        if (err) {
          console.error('Order items query error:', err);
          res.status(500).json({ error: err.message });
        } else {
          // Group items by order_id
          const itemsByOrder = {};
          items?.forEach(item => {
            if (!itemsByOrder[item.order_id]) {
              itemsByOrder[item.order_id] = [];
            }
            itemsByOrder[item.order_id].push(item);
          });
          
          // Add items to each order
          const ordersWithItems = transformedOrders.map(order => ({
            ...order,
            items: itemsByOrder[order.order_id] || []
          }));
          
          res.json({ 
            orders: ordersWithItems,
            pagination: {
              total: ordersWithItems.length,
              page: 1,
              limit: 100
            }
          });
        }
      });
    }
  });
});

// Get provider-specific orders endpoint
app.get('/api/orders/provider/:provider_id', (req, res) => {
  const providerId = req.params.provider_id;
  const { status } = req.query;
  
  console.log(`📋 Fetching orders for provider ${providerId}, status: ${status || 'all'}`);
  
  let whereClause = 'WHERE o.provider_id = ?';
  let params = [providerId];
  
  if (status && status !== 'all') {
    whereClause += ' AND o.status = ?';
    params.push(status);
  }
  
  const ordersQuery = `
    SELECT 
      o.*,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.email as customer_email_from_user,
      c.company_name as customer_company_name,
      c.phone as customer_phone_from_user,
      p.first_name as provider_first_name,
      p.last_name as provider_last_name,
      p.email as provider_email,
      p.company_name as provider_company_name,
      p.provider_code as provider_code
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.user_id
    LEFT JOIN users p ON o.provider_id = p.user_id
    ${whereClause}
    ORDER BY o.created_at DESC
  `;
  
  db.all(ordersQuery, params, (err, rows) => {
    if (err) {
      console.error('Provider orders query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      console.log(`📋 Returning ${rows?.length || 0} orders for provider ${providerId}`);
      
      // Transform the data
      const transformedOrders = rows?.map(order => ({
        ...order,
        customer_email: order.customer_email || order.customer_email_from_user,
        customer_phone: order.customer_phone || order.customer_phone_from_user,
        customer_first_name: order.customer_first_name,
        customer_last_name: order.customer_last_name,
        company_name: order.customer_company_name,
        items: []
      })) || [];
      
      // Get order items for all orders
      if (transformedOrders.length === 0) {
        return res.json({ 
          orders: transformedOrders,
          provider_id: providerId,
          status: status || 'all'
        });
      }
      
      const orderIds = transformedOrders.map(order => order.order_id);
      const orderIdsPlaceholder = orderIds.map(() => '?').join(',');
      
      const itemsQuery = `
        SELECT 
          oi.*,
          s.name as set_name,
          s.description as set_description
        FROM order_items oi
        LEFT JOIN sets s ON oi.set_id = s.set_id
        WHERE oi.order_id IN (${orderIdsPlaceholder})
        ORDER BY oi.order_id, oi.order_item_id
      `;
      
      db.all(itemsQuery, orderIds, (err, items) => {
        if (err) {
          console.error('Provider order items query error:', err);
          res.status(500).json({ error: err.message });
        } else {
          // Group items by order_id
          const itemsByOrder = {};
          items?.forEach(item => {
            if (!itemsByOrder[item.order_id]) {
              itemsByOrder[item.order_id] = [];
            }
            itemsByOrder[item.order_id].push(item);
          });
          
          // Add items to each order
          const ordersWithItems = transformedOrders.map(order => ({
            ...order,
            items: itemsByOrder[order.order_id] || []
          }));
          
          res.json({ 
            orders: ordersWithItems,
            provider_id: providerId,
            status: status || 'all',
            total: ordersWithItems.length
          });
        }
      });
    }
  });
});

// Get individual order details endpoint
app.get('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  console.log(`📋 Fetching order details for order ${orderId}`);
  
  const orderQuery = `
    SELECT 
      o.*,
      u.first_name as customer_first_name,
      u.last_name as customer_last_name,
      u.email as customer_email,
      u.company_name as customer_company_name,
      p.first_name as provider_first_name,
      p.last_name as provider_last_name,
      p.email as provider_email,
      p.company_name as provider_company_name,
      p.provider_code as provider_code
    FROM orders o
    LEFT JOIN users u ON o.customer_id = u.user_id
    LEFT JOIN users p ON o.provider_id = p.user_id
    WHERE o.order_id = ?
  `;
  
  db.get(orderQuery, [orderId], (err, order) => {
    if (err) {
      console.error('Error fetching order:', err);
      return res.status(500).json({ error: 'Failed to fetch order' });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items with simplified query
    const itemsQuery = `
      SELECT 
        oi.*,
        COALESCE(s.name, 'Handling, Packaging & Transport') as set_name,
        s.base_price,
        s.category,
        COALESCE(s.description, 'Handling, packaging, and transport costs for your order') as set_description
      FROM order_items oi
      LEFT JOIN sets s ON oi.set_id = s.set_id
      WHERE oi.order_id = ?
      ORDER BY oi.order_item_id
    `;
    
    db.all(itemsQuery, [orderId], (err, items) => {
      if (err) {
        console.error('Error fetching order items:', err);
        return res.status(500).json({ error: 'Failed to fetch order items' });
      }
      
      // Transform items to include proper set information (handle empty items array)
      const transformedItems = (items || []).map(item => ({
        ...item,
        set_name: item.set_name || (item.set_id ? `Set ${item.set_id}` : 'Handling Fee'),
        set_type: 'admin' // Simplified for now
      }));
      
      res.json({
        success: true,
        order: {
          ...order,
          items: transformedItems
        }
      });
    });
  });
});

// Get order items endpoint
app.get('/api/orders/:id/items', (req, res) => {
  const orderId = req.params.id;
  console.log(`📋 Fetching items for order ${orderId}`);
  
  const itemsQuery = `
    SELECT 
      oi.*,
      COALESCE(s.name, 'Handling, Packaging & Transport') as set_name,
      COALESCE(s.description, 'Handling, packaging, and transport costs for your order') as set_description
    FROM order_items oi
    LEFT JOIN sets s ON oi.set_id = s.set_id
    WHERE oi.order_id = ?
    ORDER BY oi.order_item_id
  `;
  
  db.all(itemsQuery, [orderId], (err, rows) => {
    if (err) {
      console.error('Order items query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      console.log(`📋 Returning ${rows?.length || 0} items for order ${orderId}`);
      res.json(rows || []);
    }
  });
});

// Get packing list for an order endpoint
app.get('/api/orders/:id/packing-list', (req, res) => {
  const orderId = req.params.id;
  const language = req.query.language || 'en';
  console.log(`📦 Fetching packing list for order ${orderId} in language ${language}`);
  
  // First get the order details
  const orderQuery = `
    SELECT 
      o.*,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.email as customer_email,
      c.phone as customer_phone,
      c.company_name as customer_company_name
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.user_id
    WHERE o.order_id = ?
  `;
  
  db.get(orderQuery, [orderId], (err, order) => {
    if (err) {
      console.error('Order query error:', err);
      return res.status(500).json({ error: 'Failed to fetch order' });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items with set details
    const itemsQuery = `
      SELECT 
        oi.*,
        COALESCE(s.name, 'Handling, Packaging & Transport') as set_name,
        COALESCE(s.description, 'Handling, packaging, and transport costs for your order') as set_description,
        s.category as set_category,
        s.difficulty_level,
        s.recommended_age_min,
        s.recommended_age_max
      FROM order_items oi
      LEFT JOIN sets s ON oi.set_id = s.set_id
      WHERE oi.order_id = ?
      ORDER BY oi.order_item_id
    `;
    
    db.all(itemsQuery, [orderId], (err, items) => {
      if (err) {
        console.error('Order items query error:', err);
        return res.status(500).json({ error: 'Failed to fetch order items' });
      }
      
      if (!items || items.length === 0) {
        return res.json({
          order: order,
          items: [],
          packingList: []
        });
      }
      
      // Get all parts for all sets in this order
      const setIds = items.map(item => item.set_id).filter(id => id);
      
      if (setIds.length === 0) {
        return res.json({
          order: order,
          items: items,
          packingList: []
        });
      }
      
      const setIdsPlaceholder = setIds.map(() => '?').join(',');
      const partsQuery = `
        SELECT 
          sp.part_id,
          sp.set_id,
          sp.quantity as required_quantity,
          sp.is_optional,
          p.part_name,
          p.part_number,
          p.category,
          p.unit_of_measure,
          p.stock_quantity,
          p.image_url,
          p.assembly_notes,
          p.safety_notes
        FROM set_parts sp
        JOIN parts p ON sp.part_id = p.part_id
        WHERE sp.set_id IN (${setIdsPlaceholder})
        ORDER BY p.part_number
      `;
      
      db.all(partsQuery, setIds, (err, parts) => {
        if (err) {
          console.error('Parts query error:', err);
          return res.status(500).json({ error: 'Failed to fetch parts' });
        }
        
        // Calculate total quantities needed for each part
        const partsPackingList = {};
        
        parts.forEach(part => {
          const partId = part.part_id;
          
          if (!partsPackingList[partId]) {
            partsPackingList[partId] = {
              part_id: partId,
              part_name: part.part_name,
              part_number: part.part_number,
              category: part.category,
              unit_of_measure: part.unit_of_measure,
              stock_quantity: part.stock_quantity,
              image_url: part.image_url,
              assembly_notes: part.assembly_notes,
              safety_notes: part.safety_notes,
              total_quantity_needed: 0,
              used_in_sets: [],
              type: 'part'
            };
          }
          
          // Find which order item this part belongs to
          const orderItem = items.find(item => item.set_id === part.set_id);
          if (orderItem) {
            const totalQuantity = part.required_quantity * orderItem.quantity;
            partsPackingList[partId].total_quantity_needed += totalQuantity;
            
            // Add to used_in_sets if not already there
            const existingSet = partsPackingList[partId].used_in_sets.find(
              set => set.set_id === part.set_id
            );
            
            if (existingSet) {
              existingSet.total_for_set += totalQuantity;
            } else {
              partsPackingList[partId].used_in_sets.push({
                set_id: part.set_id,
                set_name: orderItem.set_name || `Set ${part.set_id}`,
                quantity_per_set: part.required_quantity,
                order_quantity: orderItem.quantity,
                total_for_set: totalQuantity,
                is_required: !part.is_optional,
                notes: part.assembly_notes
              });
            }
          }
        });
        
        // Convert to array and sort by part number
        const packingList = Object.values(partsPackingList).sort((a, b) => 
          a.part_number.localeCompare(b.part_number)
        );
        
        console.log(`📦 Returning packing list with ${packingList.length} items for order ${orderId}`);
        
        res.json({
          order: order,
          items: items,
          packingList: packingList
        });
      });
    });
  });
});

// Update order endpoint
app.put('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  console.log(`📝 Updating order ${orderId}:`, req.body);
  
  const {
    shipping_address,
    billing_address,
    notes,
    payment_method,
    items,
    status
  } = req.body;

  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update order basic info
    const updateOrderSql = `
      UPDATE orders 
      SET shipping_address = ?, billing_address = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `;

    db.run(updateOrderSql, [
      shipping_address || null,
      billing_address || shipping_address || null,
      notes || null,
      status || null,
      orderId
    ], function(err) {
      if (err) {
        console.error('Error updating order:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to update order', details: err.message });
      }

      console.log(`✅ Order ${orderId} updated successfully`);
      
      // If items are provided, update order items
      if (items && Array.isArray(items)) {
        // Delete existing order items
        db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
          if (err) {
            console.error('Error deleting order items:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update order items', details: err.message });
          }

          // Add new order items
          let itemsProcessed = 0;
          if (items.length === 0) {
            db.run('COMMIT');
            return res.json({ message: 'Order updated successfully' });
          }

          items.forEach((item) => {
            const itemSql = `
              INSERT INTO order_items (order_id, set_id, quantity, unit_price, line_total)
              VALUES (?, ?, ?, ?, ?)
            `;

            const unitPrice = item.unit_price || item.price || 0;
            const lineTotal = unitPrice * item.quantity;

            db.run(itemSql, [
              orderId,
              item.set_id,
              item.quantity,
              unitPrice,
              lineTotal
            ], function(err) {
              if (err) {
                console.error('Error creating order item:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to create order item', details: err.message });
              }

              itemsProcessed++;
              if (itemsProcessed === items.length) {
                db.run('COMMIT');
                res.json({ message: 'Order updated successfully' });
              }
            });
          });
        });
      } else {
        db.run('COMMIT');
        res.json({ message: 'Order updated successfully' });
      }
    });
  });
});

// Provider-specific order status update endpoint
app.put('/api/orders/:id/provider-status', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const { status, notes, tracking_number } = req.body;
  const providerId = req.user.user_id;
  
  console.log(`📦 Provider ${providerId} updating order ${orderId} status to: ${status}`);
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  // Verify that this order belongs to the provider
  const verifyOrderSql = 'SELECT provider_id FROM orders WHERE order_id = ?';
  
  db.get(verifyOrderSql, [orderId], (err, order) => {
    if (err) {
      console.error('Error verifying order ownership:', err);
      return res.status(500).json({ error: 'Failed to verify order ownership' });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.provider_id !== providerId) {
      return res.status(403).json({ error: 'You can only update orders for your own sets' });
    }
    
    // Update order status
    const updateStatusSql = `
      UPDATE orders 
      SET status = ?, 
          notes = COALESCE(?, notes), 
          tracking_number = COALESCE(?, tracking_number),
          shipped_at = CASE WHEN ? = 'shipped' THEN CURRENT_TIMESTAMP ELSE shipped_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `;

    db.run(updateStatusSql, [status, notes || null, tracking_number || null, status, orderId], function(err) {
      if (err) {
        console.error('Error updating order status:', err);
        return res.status(500).json({ error: 'Failed to update order status', details: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Add status history entry
      const statusHistorySql = `
        INSERT INTO order_status_history (order_id, status, notes, updated_by, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const statusNotes = notes || `Status updated to ${status} by provider`;
      
      db.run(statusHistorySql, [orderId, status, statusNotes, providerId], function(err) {
        if (err) {
          console.error('Error adding status history:', err);
          // Don't fail the request, just log the error
        }
        
        // Get order details for customer notification
        const orderDetailsSql = `
          SELECT o.customer_id, o.customer_email, u.first_name as customer_first_name 
          FROM orders o 
          LEFT JOIN users u ON o.customer_id = u.user_id 
          WHERE o.order_id = ?
        `;
        
        db.get(orderDetailsSql, [orderId], (err, orderDetails) => {
          if (err) {
            console.error('Error fetching order details for notifications:', err);
            return res.status(500).json({ error: 'Failed to fetch order details' });
          }
          
          // Send notification to admin
          const adminNotificationSql = `
            INSERT INTO system_notifications (type, title, message, created_for, priority, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
          `;
          
          const adminNotificationTitle = `🚚 Order Shipped by Provider - Order #${orderId}`;
          const adminNotificationMessage = `Provider has marked order #${orderId} as shipped. ${tracking_number ? `Tracking: ${tracking_number}` : ''}`;
          
          db.run(adminNotificationSql, [
            'provider_order_shipped',
            adminNotificationTitle,
            adminNotificationMessage,
            null, // null means all admins
            'high'
          ], function(err) {
            if (err) {
              console.error('Error creating admin notification:', err);
            }
            
            // Send notification to customer
            if (orderDetails && orderDetails.customer_id) {
              const customerNotificationSql = `
                INSERT INTO system_notifications (type, title, message, created_for, priority, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
              `;
              
              const customerNotificationTitle = `🚚 Your Order Has Been Shipped - Order #${orderId}`;
              const customerNotificationMessage = `Great news! Your order #${orderId} has been shipped and is on its way. ${tracking_number ? `You can track your package using: ${tracking_number}` : 'You will receive tracking information soon.'}`;
              
              db.run(customerNotificationSql, [
                'order_shipped',
                customerNotificationTitle,
                customerNotificationMessage,
                orderDetails.customer_id,
                'medium'
              ], function(err) {
                if (err) {
                  console.error('Error creating customer notification:', err);
                }
                
                console.log(`✅ Order ${orderId} status updated to ${status} by provider ${providerId}`);
                console.log(`📧 Notifications sent to admin and customer ${orderDetails.customer_id}`);
                res.json({ 
                  message: 'Order status updated successfully',
                  order_id: orderId,
                  status: status,
                  notifications_sent: {
                    admin: true,
                    customer: orderDetails.customer_id
                  }
                });
              });
            } else {
              console.log(`✅ Order ${orderId} status updated to ${status} by provider ${providerId}`);
              console.log(`📧 Notification sent to admin (no customer ID found)`);
              res.json({ 
                message: 'Order status updated successfully',
                order_id: orderId,
                status: status,
                notifications_sent: {
                  admin: true,
                  customer: null
                }
              });
            }
          });
        });
      });
    });
  });
});

// Update order status endpoint
app.put('/api/orders/:id/status', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const userRole = req.user.role;
  const userId = req.user.user_id;
  console.log(`📝 Updating status for order ${orderId} by ${userRole} ${userId}:`, req.body);
  
  const { status, notes, updated_by } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  // Get current order status and order details
  db.get('SELECT status, provider_id, set_type FROM orders WHERE order_id = ?', [orderId], (err, order) => {
    if (err) {
      console.error('Error fetching order status:', err);
      return res.status(500).json({ error: 'Failed to fetch order status', details: err.message });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = order.status;
    const orderProviderId = order.provider_id;
    const orderSetType = order.set_type;
    
    // Check if this is a provider set order
    const isProviderSetOrder = orderSetType === 'provider' && orderProviderId !== null;
    
    // Authorization checks
    if (isProviderSetOrder) {
      // Provider orders: Only provider can change status to 'shipped', admin can only mark payment received
      if (userRole === 'admin' && status === 'shipped') {
        return res.status(403).json({ 
          error: 'Admins cannot ship provider sets. Only the provider can mark orders as shipped.' 
        });
      }
      
      if (userRole === 'provider' && orderProviderId != userId) {
        return res.status(403).json({ 
          error: 'You can only update status for your own provider orders' 
        });
      }
    }
    
    const shouldRestoreStock = (['pending', 'pending_payment', 'payment_received', 'processing'].includes(currentStatus)) && status === 'cancelled';

    if (shouldRestoreStock) {
      console.log(`🔄 Order cancelled - restoring stock for order ${orderId}`);
      
      // Get order items
      db.all('SELECT oi.set_id, oi.quantity FROM order_items oi WHERE oi.order_id = ? AND oi.set_id IS NOT NULL', [orderId], (err, items) => {
        if (err) {
          console.error('Error fetching order items:', err);
          return res.status(500).json({ error: 'Failed to fetch order items' });
        }

        if (items.length === 0) {
          // No items to restore, just update status
          db.run('UPDATE orders SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', 
            [status, notes || null, orderId], (err) => {
              if (err) return res.status(500).json({ error: 'Failed to update order status', details: err.message });
              console.log(`✅ Order ${orderId} status updated to ${status}`);
              res.json({ message: 'Order status updated successfully', order_id: orderId, status: status });
            }
          );
          return;
        }

        // Count total parts that need to be restored
        let totalPartsToRestore = 0;
        let partsRestored = 0;
        
        items.forEach(item => {
          db.all('SELECT sp.part_id, sp.quantity as required_quantity FROM set_parts sp WHERE sp.set_id = ? AND sp.is_optional = 0', 
            [item.set_id], (err, parts) => {
              if (err) {
                console.error('Error fetching set parts:', err);
                return;
              }

              totalPartsToRestore += parts.length;
              
              // After getting all counts, process the actual restorations
              if (totalPartsToRestore > 0) {
                const itemsProcessed = items.indexOf(item) + 1;
                if (itemsProcessed === items.length) {
                  // All counts done, now actually restore stock
                  items.forEach(processItem => {
                    db.all('SELECT sp.part_id, sp.quantity as required_quantity FROM set_parts sp WHERE sp.set_id = ? AND sp.is_optional = 0', 
                      [processItem.set_id], (err, processParts) => {
                        if (err) {
                          console.error('Error fetching set parts:', err);
                          return;
                        }

                        processParts.forEach(part => {
                          const quantityToRestore = part.required_quantity * processItem.quantity;
                          
                          db.run('UPDATE parts SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE part_id = ?',
                            [quantityToRestore, part.part_id], (err) => {
                              if (!err) {
                                console.log(`🔄 Restored ${quantityToRestore} units of part ${part.part_id}`);
                              }
                              
                              partsRestored++;
                              if (partsRestored === totalPartsToRestore) {
                                // All stock restored, now update order status
                                db.run('UPDATE orders SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', 
                                  [status, notes || null, orderId], (err) => {
                                    if (err) {
                                      console.error('Error updating order status:', err);
                                      return res.status(500).json({ error: 'Failed to update order status', details: err.message });
                                    }
                                    console.log(`✅ Order ${orderId} status updated to ${status} with stock restored`);
                                    res.json({ message: 'Order status updated successfully with stock restored', order_id: orderId, status: status });
                                  }
                                );
                              }
                            }
                          );
                        });
                      }
                    );
                  });
                }
              }
            }
          );
        });
      });
    } else {
      // Normal status update without stock restoration
      const updateStatusSql = `
        UPDATE orders 
        SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `;

      db.run(updateStatusSql, [status, notes || null, orderId], function(err) {
        if (err) {
          console.error('Error updating order status:', err);
          return res.status(500).json({ error: 'Failed to update order status', details: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Order not found' });
        }

        console.log(`✅ Order ${orderId} status updated to ${status}`);
        res.json({ 
          message: 'Order status updated successfully',
          order_id: orderId,
          status: status
        });
      });
    }
  });
});

// Delete order endpoint (soft delete - just mark as cancelled)
app.delete('/api/orders/:id', (req, res) => {
  const orderId = req.params.id;
  console.log(`🗑️ Soft deleting order ${orderId}`);
  
  const updateStatusSql = `
    UPDATE orders 
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ?
  `;

  db.run(updateStatusSql, [orderId], function(err) {
    if (err) {
      console.error('Error soft deleting order:', err);
      return res.status(500).json({ error: 'Failed to delete order', details: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`✅ Order ${orderId} soft deleted (marked as cancelled)`);
    res.json({ 
      message: 'Order deleted successfully',
      order_id: orderId,
      status: 'cancelled'
    });
  });
});

// Permanently delete order endpoint
app.delete('/api/orders/:id/permanent', (req, res) => {
  const orderId = req.params.id;
  const { putPartsBackToStock = true } = req.body;
  console.log(`🗑️ Permanently deleting order ${orderId}, putPartsBackToStock: ${putPartsBackToStock}`);
  
  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // First get order items to know which parts to restore
    const getOrderItemsSql = `
      SELECT oi.*, sp.part_id, sp.quantity as required_quantity
      FROM order_items oi
      LEFT JOIN set_parts sp ON oi.set_id = sp.set_id
      WHERE oi.order_id = ?
    `;

    db.all(getOrderItemsSql, [orderId], (err, orderItems) => {
      if (err) {
        console.error('Error fetching order items:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to fetch order items', details: err.message });
      }

      // If putPartsBackToStock is true, restore stock quantities
      if (putPartsBackToStock && orderItems && orderItems.length > 0) {
        let partsProcessed = 0;
        
        orderItems.forEach((item) => {
          if (item.part_id && item.required_quantity) {
            const restoreStockSql = `
              UPDATE parts 
              SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
              WHERE part_id = ?
            `;
            
            const quantityToRestore = item.required_quantity * item.quantity;
            
            db.run(restoreStockSql, [quantityToRestore, item.part_id], (err) => {
              if (err) {
                console.error('Error restoring stock:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to restore stock', details: err.message });
              }
              
              partsProcessed++;
              if (partsProcessed === orderItems.length) {
                // All parts restored, now delete the order
                deleteOrder();
              }
            });
          } else {
            partsProcessed++;
            if (partsProcessed === orderItems.length) {
              deleteOrder();
            }
          }
        });
      } else {
        // Skip stock restoration, just delete the order
        deleteOrder();
      }

      function deleteOrder() {
        // Delete order items first (foreign key constraint)
        db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
          if (err) {
            console.error('Error deleting order items:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to delete order items', details: err.message });
          }

          // Delete the order
          db.run('DELETE FROM orders WHERE order_id = ?', [orderId], function(err) {
            if (err) {
              console.error('Error deleting order:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to delete order', details: err.message });
            }

            if (this.changes === 0) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'Order not found' });
            }

            db.run('COMMIT');
            console.log(`✅ Order ${orderId} permanently deleted${putPartsBackToStock ? ' with stock restored' : ''}`);
            res.json({ 
              message: `Order permanently deleted${putPartsBackToStock ? ' and parts returned to stock' : ''}`,
              order_id: orderId,
              stock_restored: putPartsBackToStock
            });
          });
        });
      }
    });
  });
});

// Create new order endpoint
app.post('/api/orders', (req, res) => {
  console.log('📦 Order creation request:', req.body);
  
  const {
    customer_id,
    provider_id,
    provider_code,
    company_name,
    customer_first_name,
    customer_last_name,
    customer_email,
    customer_phone,
    items,
    shipping_address,
    billing_address,
    notes,
    payment_method = 'credit_card',
    payment_status = 'pending',
    total_amount,
    invoice_required = false,
    set_type = 'provider'
  } = req.body;

  // Validate required fields
  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    console.log('❌ Invalid request: missing required fields');
    return res.status(400).json({ error: 'Missing required fields: customer_id and items are required' });
  }
  
  // For provider sets, provider_id is required
  if (set_type === 'provider' && !provider_id) {
    console.log('❌ Invalid request: provider_id required for provider sets');
    return res.status(400).json({ error: 'provider_id is required for provider sets' });
  }

  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Use the status from request body, or default to 'pending_payment' (customer orders need admin approval)
  const status = req.body.status || (invoice_required ? 'pending_payment' : 'pending_payment');

  // Calculate total amount if not provided
  let calculatedTotal = total_amount || 0;
  if (!total_amount) {
    for (const item of items) {
      const itemTotal = (item.price || item.unit_price || 0) * item.quantity;
      calculatedTotal += itemTotal;
    }
  }
  
  // For admin sets, set provider_id to null and provider_code to "111111"
  const finalProviderId = set_type === 'admin' ? null : provider_id;
  const finalProviderCode = set_type === 'admin' ? '111111' : provider_code;

  // Start transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Create order
    const orderSql = `
      INSERT INTO orders (
        order_number, customer_id, provider_id, provider_code, customer_email, customer_phone,
        total_amount, shipping_address, billing_address, notes, status, 
        payment_method, payment_status, invoice_required, set_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(orderSql, [
      orderNumber,
      customer_id,
      finalProviderId,
      finalProviderCode,
      customer_email || null,
      customer_phone || null,
      calculatedTotal,
      shipping_address || null,
      billing_address || shipping_address || null,
      notes || null,
      status,
      payment_method,
      payment_status,
      invoice_required ? 1 : 0,
      set_type
    ], function(err) {
      if (err) {
        console.error('Error creating order:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to create order', details: err.message });
      }

      const orderId = this.lastID;
      console.log(`✅ Order created with ID: ${orderId}`);

      // Create order items and reduce stock quantities
      let itemsProcessed = 0;
      let hasError = false;

      if (items.length === 0) {
        db.run('COMMIT');
        return res.status(201).json({
          message: 'Order created successfully',
          order: {
            order_id: orderId,
            order_number: orderNumber,
            total_amount: calculatedTotal,
            status: status,
            items: items
          }
        });
      }

      items.forEach((item, index) => {
        const itemSql = `
          INSERT INTO order_items (order_id, set_id, quantity, unit_price, line_total)
          VALUES (?, ?, ?, ?, ?)
        `;

        const unitPrice = item.unit_price || item.price || 0;
        const lineTotal = unitPrice * item.quantity;
        
        // For handling fee items (set_id = -1), use NULL instead to avoid foreign key constraint
        const setIdForDb = item.set_id === -1 ? null : item.set_id;

        db.run(itemSql, [
          orderId,
          setIdForDb,
          item.quantity,
          unitPrice,
          lineTotal
        ], function(err) {
          if (err) {
            console.error('Error creating order item:', err);
            hasError = true;
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create order item', details: err.message });
          }

          // Skip stock reduction for handling fee items (set_id = -1 or NULL)
          if (item.set_id === -1 || setIdForDb === null) {
            console.log(`⚠️  Skipping stock reduction for handling fee item (set_id=${item.set_id})`);
            itemsProcessed++;
            checkCompletion();
            return;
          }
          
          function checkCompletion() {
            if (itemsProcessed === items.length && !hasError) {
              // Clear cart reservations for this user after successful order
              console.log(`🗑️  Clearing cart reservations for user ${customer_id}`);
              db.run('DELETE FROM cart_reservations WHERE user_id = ?', [customer_id], (err) => {
                if (err) {
                  console.error(`❌ Error clearing cart reservations:`, err);
                } else {
                  console.log(`✅ Cleared cart reservations for user ${customer_id}`);
                }
                
                // Commit transaction
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    console.error('❌ Error committing transaction:', commitErr);
                    return res.status(500).json({ error: 'Failed to commit transaction', details: commitErr.message });
                  }
                  
                  console.log(`✅ Order ${orderId} completed successfully with transaction committed`);
                  res.status(201).json({
                    message: 'Order created successfully',
                    order: {
                      order_id: orderId,
                      order_number: orderNumber,
                      total_amount: calculatedTotal,
                      status: status,
                      items: items
                    }
                  });
                });
              });
            }
          }

          // Reduce stock quantities for all parts in this set
          const setPartsSql = `
            SELECT sp.part_id, sp.quantity as required_quantity, p.stock_quantity, p.part_number
            FROM set_parts sp
            JOIN parts p ON sp.part_id = p.part_id
            WHERE sp.set_id = ? AND sp.is_optional = 0
          `;

          console.log(`🔍 Fetching parts for set ${setIdForDb}, order quantity: ${item.quantity}`);

          db.all(setPartsSql, [setIdForDb], (err, setParts) => {
            if (err) {
              console.error('❌ Error fetching set parts:', err);
              hasError = true;
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to fetch set parts', details: err.message });
            }

            console.log(`📦 Found ${setParts.length} parts for set ${setIdForDb}`);

            // Update stock for each part
            let partsProcessed = 0;
            if (setParts.length === 0) {
              console.log(`⚠️  No parts found for set ${setIdForDb}, skipping stock update`);
              itemsProcessed++;
              checkCompletion();
              return;
            }

            setParts.forEach((setPart, partIndex) => {
              const newStock = Math.max(0, setPart.stock_quantity - (setPart.required_quantity * item.quantity));
              
              console.log(`📦 Updating stock for part ${setPart.part_id} (${setPart.part_number}): ${setPart.stock_quantity} → ${newStock} (need ${setPart.required_quantity * item.quantity})`);
              
              const updateStockSql = `
                UPDATE parts 
                SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP
                WHERE part_id = ?
              `;

              db.run(updateStockSql, [newStock, setPart.part_id], (err) => {
                if (err) {
                  console.error(`❌ Error updating stock for part ${setPart.part_id}:`, err);
                  hasError = true;
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to update stock', details: err.message });
                }

                partsProcessed++;
                console.log(`✅ Updated stock for part ${setPart.part_id} (${setPart.part_number}): ${setPart.stock_quantity} → ${newStock}`);
                
                if (partsProcessed === setParts.length) {
                  console.log(`✅ All ${setParts.length} parts updated for set ${setIdForDb}`);
                  itemsProcessed++;
                  checkCompletion();
                }
              });
            });
          });
        });
      });
    });
  });
});

// Dashboard stats endpoint (for STEMDashboard)
app.get('/api/dashboard/stats', (req, res) => {
  // Return the same data as analytics for compatibility
  db.get('SELECT COUNT(*) as total_sets FROM sets', (err, setsRow) => {
    if (err) {
      console.error('Dashboard stats query error:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    db.get('SELECT COUNT(*) as total_orders FROM orders', (err, ordersRow) => {
      if (err) {
        console.error('Dashboard orders query error:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      db.get('SELECT COUNT(*) as total_users FROM users WHERE is_active = 1', (err, usersRow) => {
        if (err) {
          console.error('Dashboard users query error:', err);
          res.status(500).json({ error: err.message });
          return;
        }

        res.json({
          totalSets: setsRow.total_sets || 0,
          totalOrders: ordersRow.total_orders || 0,
          totalUsers: usersRow.total_users || 0,
          timestamp: new Date().toISOString()
        });
      });
    });
  });
});

// Dashboard analytics endpoint
app.get('/api/dashboard/analytics', (req, res) => {
  // Get comprehensive dashboard data
  const analytics = {};
  
  // Get parts data
  db.all('SELECT * FROM parts', (err, parts) => {
    if (err) {
      console.error('Parts error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Get tools data
    db.all('SELECT * FROM tools', (err, tools) => {
      if (err) {
        console.error('Tools error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Get orders data
      db.all('SELECT * FROM orders', (err, orders) => {
        if (err) {
          console.error('Orders error:', err);
          return res.status(500).json({ error: err.message });
        }
        
        // Get users data
        db.all('SELECT * FROM users WHERE is_active = 1', (err, users) => {
          if (err) {
            console.error('Users error:', err);
            return res.status(500).json({ error: err.message });
          }
          
          // Get sets data
          db.all('SELECT * FROM sets WHERE active = 1', (err, sets) => {
            if (err) {
              console.error('Sets error:', err);
              return res.status(500).json({ error: err.message });
            }
            
            // Calculate comprehensive metrics
            const totalParts = parts.length;
            const totalStock = parts.reduce((sum, part) => sum + (part.stock_quantity || 0), 0);
            const lowStockParts = parts.filter(part => 
              (part.stock_quantity || 0) <= (part.minimum_stock_level || 0)
            ).length;
            const inventoryValue = parts.reduce((sum, part) => 
              sum + ((part.unit_cost || 0) * (part.stock_quantity || 0)), 0
            );
            
            const totalTools = tools.length;
            const activeTools = tools.filter(tool => tool.active === 1).length; // Filter by active column
            const maintenanceTools = 0; // No maintenance data available in current schema
            
            const totalOrders = orders.length;
            const pendingOrders = orders.filter(order => order.status === 'pending').length;
            const processingOrders = orders.filter(order => order.status === 'processing' || order.status === 'in_production').length;
            const completedOrders = orders.filter(order => order.status === 'completed').length;
            const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
            
            const totalUsers = users.length;
            const activeUsers = users.filter(user => {
              if (!user.last_login) return false;
              const lastLogin = new Date(user.last_login);
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              return lastLogin >= thirtyDaysAgo;
            }).length;
            
            const totalSets = sets.length;
            const activeSets = sets.filter(set => set.active === true).length;
            
  res.json({
              success: true,
              data: {
                // Inventory metrics
                inventory: {
                  totalParts,
                  totalStock,
                  lowStockParts,
                  inventoryValue: Math.round(inventoryValue * 100) / 100,
                  efficiency: totalParts > 0 ? Math.round(((totalParts - lowStockParts) / totalParts) * 100) : 100
                },
                // Tools metrics
                tools: {
                  totalTools,
                  activeTools,
                  maintenanceTools,
                  efficiency: totalTools > 0 ? Math.round((activeTools / totalTools) * 100) : 100
                },
                // Orders metrics
                orders: {
                  totalOrders,
                  pendingOrders,
                  processingOrders,
                  completedOrders,
                  totalRevenue: Math.round(totalRevenue * 100) / 100,
                  efficiency: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 100
                },
                // Users metrics
                users: {
                  totalUsers,
                  activeUsers,
                  efficiency: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100
                },
                // Sets metrics
                sets: {
                  totalSets,
                  activeSets,
                  inactiveSets: totalSets - activeSets
                },
                // Raw data for frontend calculations
                rawData: {
                  parts,
                  tools,
                  orders,
                  users,
                  sets
                }
              }
            });
          });
        });
      });
    });
  });
});

// Users endpoint
app.get('/api/users', (req, res) => {
  db.all('SELECT user_id, username, email, role, first_name, last_name, is_active, created_at FROM users WHERE is_active = 1 ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Users query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows || []);
    }
  });
});

// User profile endpoint (for authentication)
app.get('/api/users/profile', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  
  db.get('SELECT user_id, username, email, role, first_name, last_name, company_name, phone, address, city, postal_code, country, is_active, created_at, last_login, provider_markup_percentage, provider_code FROM users WHERE user_id = ?', [userId], (err, row) => {
    if (err) {
      console.error('Profile query error:', err);
      res.status(500).json({ error: err.message });
    } else if (row) {
      res.json({ user: row });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// User stats endpoint
app.get('/api/users/stats', (req, res) => {
  db.get('SELECT COUNT(*) as total_users FROM users WHERE is_active = 1', (err, totalRow) => {
    if (err) {
      console.error('User stats error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    db.get('SELECT COUNT(*) as active_users FROM users WHERE is_active = 1 AND last_login IS NOT NULL', (err, activeRow) => {
      if (err) {
        console.error('Active users error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      db.get('SELECT COUNT(*) as new_users FROM users WHERE created_at >= datetime("now", "-30 days")', (err, newRow) => {
        if (err) {
          console.error('New users error:', err);
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          total_users: totalRow.total_users || 0,
          active_users: activeRow.active_users || 0,
          new_users: newRow.new_users || 0
        });
      });
    });
  });
});

// User role stats endpoint
app.get('/api/users/role-stats', (req, res) => {
  db.all('SELECT role, COUNT(*) as count FROM users WHERE is_active = 1 GROUP BY role', (err, rows) => {
    if (err) {
      console.error('Role stats error:', err);
      res.status(500).json({ error: err.message });
    } else {
      const roleCounts = {};
      rows.forEach(row => {
        roleCounts[row.role] = row.count;
      });
      
      res.json({
        success: true,
        data: roleCounts
      });
    }
  });
});

// Update user endpoint (admin only)
app.put('/api/auth/users/:userId', (req, res) => {
  const { userId } = req.params;
  const { first_name, last_name, company_name, role, username, is_active, provider_markup_percentage } = req.body;
  
  // For now, we'll allow updates without authentication check
  // In a real app, you would validate admin permissions here
  
  const sql = `
    UPDATE users 
    SET first_name = ?, last_name = ?, company_name = ?, role = ?, username = ?, is_active = ?, provider_markup_percentage = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `;
  
  const values = [first_name, last_name, company_name, role, username, is_active, provider_markup_percentage || 0, userId];
  
  db.run(sql, values, function(err) {
    if (err) {
      console.error('User update error:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.json({
        message: 'User updated successfully',
        user: {
          user_id: parseInt(userId),
          first_name,
          last_name,
          company_name,
          role,
          username,
          is_active: Boolean(is_active),
          provider_markup_percentage: parseFloat(provider_markup_percentage || 0)
        }
      });
    }
  });
});

// Delete user endpoint (admin only)
app.delete('/api/auth/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  // For now, we'll allow deletion without authentication check
  // In a real app, you would validate admin permissions here
  
  const sql = 'DELETE FROM users WHERE user_id = ?';
  
  db.run(sql, [userId], function(err) {
    if (err) {
      console.error('User deletion error:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.json({ message: 'User deleted successfully' });
    }
  });
});

// Parts endpoint
app.get('/api/parts', (req, res) => {
  // First get all parts
  db.all('SELECT * FROM parts', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // Get set usage count for each part
      const partsWithUsage = rows.map(part => {
        // Count how many sets this part is used in
        db.get(`
          SELECT COUNT(DISTINCT sp.set_id) as usage_count
          FROM set_parts sp
          WHERE sp.part_id = ?
        `, [part.part_id], (err, usageResult) => {
          if (err) {
            console.error('Error getting usage count for part', part.part_id, ':', err);
          }
        });

        // Parse translations from database
        let parsedTranslations = {
          en: {
            part_name: part.part_name || part.part_number,
            description: part.description || ''
          }
        };
        
        if (part.translations) {
          try {
            const dbTranslations = JSON.parse(part.translations);
            if (Array.isArray(dbTranslations)) {
              // Convert array format to object format
              parsedTranslations = {};
              dbTranslations.forEach(t => {
                parsedTranslations[t.language_code] = {
                  part_name: t.part_name || part.part_name || part.part_number,
                  description: t.description || part.description || ''
                };
              });
            } else if (typeof dbTranslations === 'object') {
              parsedTranslations = dbTranslations;
            }
          } catch (error) {
            console.error('Error parsing translations for part', part.part_id, ':', error);
          }
        }

        return {
          ...part,
          part_name: part.part_name || part.part_number, // Use actual part_name if available, fallback to part_number
          translations: parsedTranslations,
          is_low_stock: (part.stock_quantity || 0) <= (part.minimum_stock_level || 0),
          set_usage_count: 0 // Will be updated below
        };
      });

      // Get usage counts for all parts in a single query
      db.all(`
        SELECT 
          sp.part_id,
          COUNT(DISTINCT sp.set_id) as usage_count
        FROM set_parts sp
        GROUP BY sp.part_id
      `, (err, usageRows) => {
        if (err) {
          console.error('Error getting usage counts:', err);
          // Return parts with 0 usage count if query fails
          const transformedParts = partsWithUsage.map(part => ({
            ...part,
            set_usage_count: 0
          }));
          res.json({ 
            success: true,
            parts: transformedParts || [],
            pagination: {
              page: 1,
              limit: transformedParts?.length || 0,
              total: transformedParts?.length || 0,
              pages: 1
            }
          });
        } else {
          // Create a map of part_id to usage_count
          const usageMap = {};
          usageRows.forEach(row => {
            usageMap[row.part_id] = row.usage_count;
          });

          // Transform the data with correct usage counts
          const transformedParts = partsWithUsage.map(part => ({
            ...part,
            set_usage_count: usageMap[part.part_id] || 0
          }));
          res.json({ 
            success: true,
            parts: transformedParts || [],
            pagination: {
              page: 1,
              limit: transformedParts?.length || 0,
              total: transformedParts?.length || 0,
              pages: 1
            }
          });
        }
      });
    }
  });
});

// Create new part endpoint
app.post('/api/parts', (req, res) => {
  const {
    part_number,
    category,
    unit_of_measure,
    unit_cost,
    supplier,
    supplier_part_number,
    stock_quantity,
    minimum_stock_level,
    image_url,
    instruction_pdf,
    drawing_pdf,
    assembly_notes,
    safety_notes,
    translations
  } = req.body;

  // Get the English part name from translations
  const englishTranslation = translations?.find(t => t.language_code === 'en');
  const part_name = englishTranslation?.part_name || part_number;

  // Validate required fields
  if (!part_number || !category || !unit_of_measure) {
    return res.status(400).json({ 
      error: 'Missing required fields: part_number, category, and unit_of_measure are required' 
    });
  }

  const sql = `
    INSERT INTO parts (
      part_number, category, unit_of_measure, unit_cost, supplier, 
      supplier_part_number, stock_quantity, minimum_stock_level, 
      image_url, instruction_pdf, drawing_pdf, assembly_notes, safety_notes, part_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    part_number,
    category,
    unit_of_measure,
    unit_cost || 0,
    supplier || null,
    supplier_part_number || null,
    stock_quantity || 0,
    minimum_stock_level || 0,
    image_url || null,
    instruction_pdf || null,
    drawing_pdf || null,
    assembly_notes || null,
    safety_notes || null,
    part_name
  ];

  db.run(sql, values, function(err) {
    if (err) {
      console.error('Error creating part:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Part number already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
    } else {
      res.json({
        success: true,
        part_id: this.lastID,
        message: 'Part created successfully'
      });
    }
  });
});

// Update part endpoint
app.put('/api/parts/:id', (req, res) => {
  const partId = req.params.id;
  const {
    part_number,
    category,
    unit_of_measure,
    unit_cost,
    supplier,
    supplier_part_number,
    stock_quantity,
    minimum_stock_level,
    image_url,
    instruction_pdf,
    drawing_pdf,
    assembly_notes,
    safety_notes,
    translations
  } = req.body;

  // Extract part_name and description from translations if available
  let part_name = null;
  let description = null;
  if (translations && Array.isArray(translations)) {
    const englishTranslation = translations.find(t => t.language_code === 'en');
    if (englishTranslation) {
      if (englishTranslation.part_name) {
        part_name = englishTranslation.part_name;
      }
      if (englishTranslation.description) {
        description = englishTranslation.description;
      }
    }
  }
  
  console.log('🔧 Updating part:', partId, 'part_name:', part_name, 'description:', description, 'translations:', translations);

  const sql = `
    UPDATE parts SET 
      part_number = ?, category = ?, unit_of_measure = ?, unit_cost = ?, 
      supplier = ?, supplier_part_number = ?, stock_quantity = ?, 
      minimum_stock_level = ?, image_url = ?, instruction_pdf = ?, 
      drawing_pdf = ?, assembly_notes = ?, safety_notes = ?, 
      part_name = ?, description = ?, translations = ?, updated_at = CURRENT_TIMESTAMP
    WHERE part_id = ?
  `;

  const values = [
    part_number,
    category,
    unit_of_measure,
    unit_cost || 0,
    supplier || null,
    supplier_part_number || null,
    stock_quantity || 0,
    minimum_stock_level || 0,
    image_url || null,
    instruction_pdf || null,
    drawing_pdf || null,
    assembly_notes || null,
    safety_notes || null,
    part_name,
    description,
    translations ? JSON.stringify(translations) : null,
    partId
  ];

  db.run(sql, values, function(err) {
    if (err) {
      console.error('Error updating part:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Part not found' });
    } else {
      res.json({
        success: true,
        message: 'Part updated successfully'
      });
    }
  });
});

// Delete part endpoint
app.delete('/api/parts/:id', (req, res) => {
  const partId = req.params.id;

  // First check if the part is referenced in set_parts table
  db.get('SELECT COUNT(*) as count FROM set_parts WHERE part_id = ?', [partId], (err, row) => {
    if (err) {
      console.error('Error checking part references:', err);
      return res.status(500).json({ error: err.message });
    }

    const referenceCount = row.count;
    
    if (referenceCount > 0) {
      // Part is referenced in sets, return error with details
      return res.status(400).json({ 
        error: `Cannot delete part. It is currently used in ${referenceCount} set(s). Please remove it from all sets first.`,
        referenceCount: referenceCount
      });
    }

    // Part is not referenced, safe to delete
    db.run('DELETE FROM parts WHERE part_id = ?', [partId], function(err) {
      if (err) {
        console.error('Error deleting part:', err);
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Part not found' });
      } else {
        res.json({
          success: true,
          message: 'Part deleted successfully'
        });
      }
    });
  });
});

// Inventory endpoints
app.get('/api/inventory/parts', (req, res) => {
  try {
    const query = `
      SELECT 
        part_id,
        part_number,
        part_name,
        category,
        unit_of_measure,
        unit_cost,
        stock_quantity,
        minimum_stock_level,
        supplier,
        supplier_part_number,
        image_url,
        assembly_notes,
        safety_notes,
        translations,
        created_at,
        updated_at,
        CASE 
          WHEN stock_quantity <= 0 THEN 1 
          ELSE 0 
        END as is_out_of_stock,
        CASE 
          WHEN stock_quantity > 0 AND stock_quantity <= minimum_stock_level THEN 1 
          ELSE 0 
        END as is_low_stock,
        (stock_quantity * unit_cost) as inventory_value
      FROM parts 
      ORDER BY part_name ASC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching inventory parts:', err);
        return res.status(500).json({ error: 'Failed to fetch inventory parts' });
      }
      
      // Parse translations for each part
      const partsWithTranslations = rows.map(part => {
        let translations = {};
        try {
          // Handle both array and object formats
          const rawTranslations = JSON.parse(part.translations || '{}');
          if (Array.isArray(rawTranslations)) {
            // Convert array format to object format
            translations = rawTranslations.reduce((acc, item) => {
              acc[item.language_code] = {
                part_name: item.part_name,
                description: item.description || ''
              };
              return acc;
            }, {});
          } else {
            translations = rawTranslations;
          }
        } catch (e) {
          console.error('Error parsing translations for part', part.part_id, ':', e);
        }
        
        return {
          ...part,
          translations,
          part_name: translations.en?.part_name || part.part_name,
          description: translations.en?.description || ''
        };
      });
      
      res.json({
        success: true,
        parts: partsWithTranslations,
        total: partsWithTranslations.length
      });
    });
  } catch (error) {
    console.error('Error in inventory parts endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/inventory/parts/:partId/adjust', (req, res) => {
  const { partId } = req.params;
  const { adjustment_type, quantity, notes } = req.body;
  
  if (!adjustment_type || !quantity) {
    return res.status(400).json({ error: 'adjustment_type and quantity are required' });
  }
  
  try {
    // Get current stock
    db.get('SELECT stock_quantity FROM parts WHERE part_id = ?', [partId], (err, part) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch part' });
      }
      
      if (!part) {
        return res.status(404).json({ error: 'Part not found' });
      }
      
      let newQuantity;
      if (adjustment_type === 'add') {
        newQuantity = part.stock_quantity + quantity;
      } else if (adjustment_type === 'remove') {
        newQuantity = Math.max(0, part.stock_quantity - quantity);
      } else if (adjustment_type === 'set') {
        newQuantity = quantity;
      } else {
        return res.status(400).json({ error: 'Invalid adjustment_type' });
      }
      
      // Update stock
      db.run('UPDATE parts SET stock_quantity = ? WHERE part_id = ?', [newQuantity, partId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update stock' });
        }
        
        // Log transaction
        const transactionQuery = `
          INSERT INTO inventory_transactions 
          (part_id, transaction_type, quantity, previous_stock, new_stock, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(transactionQuery, [
          partId,
          adjustment_type,
          quantity,
          part.stock_quantity,
          newQuantity,
          notes || ''
        ], function(err) {
          if (err) {
            console.error('Error logging transaction:', err);
          }
          
          res.json({
            success: true,
            part_id: partId,
            previous_stock: part.stock_quantity,
            new_stock: newQuantity,
            adjustment_type,
            quantity
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in inventory adjust endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add stock income endpoint
app.post('/api/inventory/parts/:partId/income', (req, res) => {
  const { partId } = req.params;
  const { quantity, supplier, cost_per_unit, purchase_date, notes } = req.body;
  
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Positive quantity is required' });
  }
  
  try {
    // Get current part details
    db.get('SELECT * FROM parts WHERE part_id = ?', [partId], (err, part) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch part' });
      }
      
      if (!part) {
        return res.status(404).json({ error: 'Part not found' });
      }
      
      const currentStock = part.stock_quantity;
      const newStock = currentStock + quantity;
      
      // Update stock quantity
      db.run('UPDATE parts SET stock_quantity = ? WHERE part_id = ?', [newStock, partId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update stock' });
        }
        
        // Update supplier and cost if provided
        if (supplier || cost_per_unit) {
          const updatePartQuery = `
            UPDATE parts 
            SET supplier = COALESCE(?, supplier), 
                unit_cost = COALESCE(?, unit_cost)
            WHERE part_id = ?
          `;
          db.run(updatePartQuery, [supplier, cost_per_unit, partId], function(err) {
            if (err) {
              console.error('Error updating supplier/cost:', err);
            }
          });
        }
        
        // Record inventory transaction
        const transactionQuery = `
          INSERT INTO inventory_transactions 
          (part_id, transaction_type, quantity, previous_stock, new_stock, 
           reason, notes, supplier, cost_per_unit, purchase_date, created_at)
          VALUES (?, 'income', ?, ?, ?, 'New stock income', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(transactionQuery, [
          partId,
          quantity,
          currentStock,
          newStock,
          notes || '',
          supplier || '',
          cost_per_unit || null,
          purchase_date || null
        ], function(err) {
          if (err) {
            console.error('Error logging transaction:', err);
          }
          
          res.json({
            success: true,
            message: 'Stock income recorded successfully',
            part_id: partId,
            previous_stock: currentStock,
            new_stock: newStock,
            added_quantity: quantity,
            total_cost: cost_per_unit ? quantity * cost_per_unit : null
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in inventory income endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/inventory/parts/:partId/transactions', (req, res) => {
  const { partId } = req.params;
  
  try {
    const query = `
      SELECT 
        transaction_id,
        part_id,
        transaction_type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        notes,
        supplier,
        cost_per_unit,
        purchase_date,
        created_at
      FROM inventory_transactions 
      WHERE part_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    db.all(query, [partId], (err, rows) => {
      if (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ error: 'Failed to fetch transactions' });
      }
      
      res.json({
        success: true,
        transactions: rows
      });
    });
  } catch (error) {
    console.error('Error in inventory transactions endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tools endpoint
app.get('/api/tools', (req, res) => {
  db.all('SELECT * FROM tools WHERE active = 1 ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Tools query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      // Transform the data to include expected fields
      const transformedTools = rows.map(tool => ({
        ...tool,
        tool_number: tool.tool_id.toString().padStart(3, '0'), // Generate tool number
        tool_type: 'general',
        condition_status: 'good',
        translations: {
          en: {
            tool_name: tool.tool_name,
            description: tool.description || '',
            safety_instructions: ''
          }
        }
      }));
      res.json({
        success: true,
        tools: transformedTools || [],
        pagination: {
          page: 1,
          limit: transformedTools?.length || 0,
          total: transformedTools?.length || 0,
          pages: 1
        }
      });
    }
  });
});

// Create new tool
app.post('/api/tools', (req, res) => {
  const {
    tool_name,
    category,
    description,
    image_url,
    translations
  } = req.body;

  // Extract tool_name from translations if not provided directly
  let finalToolName = tool_name;
  if (!finalToolName && translations && Array.isArray(translations)) {
    const englishTranslation = translations.find(t => t.language_code === 'en');
    if (englishTranslation && englishTranslation.tool_name) {
      finalToolName = englishTranslation.tool_name;
    }
  }

  // Validate required fields
  if (!finalToolName) {
    return res.status(400).json({ 
      error: 'Missing required fields: tool_name is required' 
    });
  }

  const sql = `
    INSERT INTO tools (
      tool_name, category, description, image_url, active, created_at
    ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
  `;

  const values = [
    finalToolName,
    category || null,
    description || null,
    image_url || null
  ];

  db.run(sql, values, function(err) {
    if (err) {
      console.error('Error creating tool:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        success: true,
        tool_id: this.lastID,
        message: 'Tool created successfully'
      });
    }
  });
});

// Update tool
app.put('/api/tools/:id', (req, res) => {
  const toolId = req.params.id;
  const {
    tool_number,
    category,
    tool_type,
    condition_status,
    location,
    purchase_date,
    last_maintenance_date,
    next_maintenance_date,
    notes,
    image_url,
    translations
  } = req.body;

  // Extract tool_name and safety_instructions from translations
  let tool_name = null;
  let description = null;
  let safety_instructions = null;
  
  if (translations && Array.isArray(translations)) {
    const englishTranslation = translations.find(t => t.language_code === 'en');
    if (englishTranslation) {
      if (englishTranslation.tool_name) {
        tool_name = englishTranslation.tool_name;
      }
      if (englishTranslation.description) {
        description = englishTranslation.description;
      }
      if (englishTranslation.safety_instructions) {
        safety_instructions = englishTranslation.safety_instructions;
      }
    }
  }

  // Validate required fields
  if (!tool_name || tool_name.trim() === '') {
    return res.status(400).json({ error: 'Tool name is required' });
  }

  const sql = `
    UPDATE tools SET
      tool_number = ?, 
      tool_name = ?, 
      category = ?, 
      tool_type = ?, 
      condition_status = ?, 
      location = ?, 
      purchase_date = ?, 
      last_maintenance_date = ?, 
      next_maintenance_date = ?, 
      notes = ?, 
      description = ?, 
      safety_instructions = ?, 
      image_url = ?, 
      updated_at = CURRENT_TIMESTAMP
    WHERE tool_id = ?
  `;

  const values = [
    tool_number || null,
    tool_name.trim(),
    category || null,
    tool_type || null,
    condition_status || 'good',
    location || null,
    purchase_date || null,
    last_maintenance_date || null,
    next_maintenance_date || null,
    notes || null,
    description || null,
    safety_instructions || null,
    image_url || null,
    toolId
  ];

  db.run(sql, values, function(err) {
    if (err) {
      console.error('Error updating tool:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Tool not found' });
    } else {
      res.json({
        success: true,
        message: 'Tool updated successfully'
      });
    }
  });
});

// Delete tool
app.delete('/api/tools/:id', (req, res) => {
  const toolId = req.params.id;

  const sql = 'UPDATE tools SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE tool_id = ?';

  db.run(sql, [toolId], function(err) {
    if (err) {
      console.error('Error deleting tool:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Tool not found' });
    } else {
      res.json({
        success: true,
        message: 'Tool deleted successfully'
      });
    }
  });
});

// Activate/Deactivate tool
app.put('/api/tools/:id/activate', (req, res) => {
  const toolId = req.params.id;
  const { active } = req.body;

  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'Active status must be a boolean value' });
  }

  const sql = 'UPDATE tools SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE tool_id = ?';
  const activeValue = active ? 1 : 0;

  db.run(sql, [activeValue, toolId], function(err) {
    if (err) {
      console.error('Error updating tool active status:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Tool not found' });
    } else {
      res.json({
        success: true,
        message: `Tool ${active ? 'activated' : 'deactivated'} successfully`,
        active: active
      });
    }
  });
});

// Languages endpoint
app.get('/api/languages', (req, res) => {
  res.json([
    { language_id: 1, language_code: 'en', language_name: 'English' },
    { language_id: 2, language_code: 'et', language_name: 'Estonian' },
    { language_id: 3, language_code: 'ru', language_name: 'Russian' },
    { language_id: 4, language_code: 'fi', language_name: 'Finnish' }
  ]);
});

// Media endpoint
app.get('/api/media', (req, res) => {
  res.json([]);
});

// Media upload endpoint
app.post('/api/media/upload', upload.single('media'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      set_id,
      part_id,
      media_category,
      description,
      alt_text
    } = req.body;

    // Create media record in database
    const sql = `
      INSERT INTO media_files (
        file_name, file_path, file_type, mime_type, file_size_bytes,
        media_category, description, alt_text, set_id, part_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      req.file.filename, // Use the generated filename, not originalname
      req.file.path,
      req.file.mimetype.startsWith('image/') ? 'image' : 'document',
      req.file.mimetype,
      req.file.size,
      media_category || 'general',
      description || null,
      alt_text || null,
      set_id || null,
      part_id || null
    ];

    db.run(sql, values, function(err) {
      if (err) {
        console.error('Error saving media record:', err);
        // Clean up uploaded file if database insert fails
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
      } else {
        const mediaId = this.lastID;
        
        // If set_id is provided, create the set_media relationship
        if (set_id) {
          const setMediaSql = `INSERT INTO set_media (set_id, media_id) VALUES (?, ?)`;
          db.run(setMediaSql, [set_id, mediaId], function(setMediaErr) {
            if (setMediaErr) {
              console.error('Error creating set_media relationship:', setMediaErr);
              // Don't fail the upload, just log the error
            }
          });
        }
        
        res.json({
          success: true,
          media_id: mediaId,
          file_url: `/uploads/${req.file.filename}`,
          message: 'File uploaded successfully'
        });
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Get media by set ID
app.get('/api/media/set/:setId', (req, res) => {
  const setId = req.params.setId;
  
  db.all('SELECT * FROM media_files WHERE set_id = ?', [setId], (err, rows) => {
    if (err) {
      console.error('Media query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      // Transform media data to include file_url and check if file exists
      const transformedMedia = (rows || []).map(media => {
        const fileExists = fs.existsSync(media.file_path);
        return {
          ...media,
          file_url: fileExists ? `http://localhost:5003/uploads/${media.file_name}` : null,
          file_exists: fileExists,
          alt_text: media.alt_text || media.file_name,
          description: media.description || '',
          error: fileExists ? null : 'File not found on disk'
        };
      }).filter(media => media.file_exists); // Only return existing files
      
      res.json(transformedMedia);
    }
  });
});

// Get media by part ID
app.get('/api/media/part/:partId', (req, res) => {
  const partId = req.params.partId;
  
  db.all('SELECT * FROM media_files WHERE part_id = ?', [partId], (err, rows) => {
    if (err) {
      console.error('Media query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      // Transform media data to include file_url and check if file exists
      const transformedMedia = (rows || []).map(media => {
        const fileExists = fs.existsSync(media.file_path);
        return {
          ...media,
          file_url: fileExists ? `http://localhost:5003/uploads/${media.file_name}` : null,
          file_exists: fileExists,
          alt_text: media.alt_text || media.file_name,
          description: media.description || '',
          error: fileExists ? null : 'File not found on disk'
        };
      }).filter(media => media.file_exists); // Only return existing files
      
      res.json(transformedMedia);
    }
  });
});

// Delete media endpoint
app.delete('/api/media/:mediaId', (req, res) => {
  const mediaId = req.params.mediaId;
  
  // First get the file path
  db.get('SELECT file_path FROM media_files WHERE media_id = ?', [mediaId], (err, row) => {
    if (err) {
      console.error('Media query error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Media not found' });
    }
    
    // Delete from database
    db.run('DELETE FROM media_files WHERE media_id = ?', [mediaId], function(err) {
      if (err) {
        console.error('Error deleting media:', err);
        res.status(500).json({ error: err.message });
      } else {
        // Delete physical file
        try {
          if (fs.existsSync(row.file_path)) {
            fs.unlinkSync(row.file_path);
          }
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
        }
        
        res.json({
          success: true,
          message: 'Media deleted successfully'
        });
      }
    });
  });
});

// Update media endpoint
app.put('/api/media/:mediaId', (req, res) => {
  const mediaId = req.params.mediaId;
  const { description, alt_text, media_category } = req.body;

  const sql = `
    UPDATE media_files SET 
      description = ?, alt_text = ?, media_category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE media_id = ?
  `;

  const values = [description, alt_text, media_category, mediaId];

  db.run(sql, values, function(err) {
    if (err) {
      console.error('Error updating media:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Media not found' });
    } else {
      res.json({
        success: true,
        message: 'Media updated successfully'
      });
    }
  });
});

// Set featured media endpoint
app.patch('/api/media/:mediaId/featured', (req, res) => {
  const mediaId = req.params.mediaId;
  const { is_featured } = req.body;

  const sql = `
    UPDATE media_files SET 
      is_featured = ?, updated_at = CURRENT_TIMESTAMP
    WHERE media_id = ?
  `;

  db.run(sql, [is_featured, mediaId], function(err) {
    if (err) {
      console.error('Error updating featured media:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Media not found' });
    } else {
      res.json({
        success: true,
        message: is_featured ? 'Media set as featured' : 'Media unfeatured'
      });
    }
  });
});

// Update media translations endpoint
app.patch('/api/media/:mediaId/translations', (req, res) => {
  const mediaId = req.params.mediaId;
  const { description, alt_text } = req.body;

  const sql = `
    UPDATE media_files SET 
      description = ?, alt_text = ?, updated_at = CURRENT_TIMESTAMP
    WHERE media_id = ?
  `;

  db.run(sql, [description, alt_text, mediaId], function(err) {
    if (err) {
      console.error('Error updating media translations:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Media not found' });
    } else {
      res.json({
        success: true,
        message: 'Media translations updated successfully'
      });
    }
  });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ratings endpoint
app.get('/api/ratings', (req, res) => {
  res.json([]);
});

// Submit rating endpoint
app.post('/api/ratings', (req, res) => {
  const { set_id, user_id, rating, review_text } = req.body;

  // Validate required fields
  if (!set_id || !user_id || !rating) {
    return res.status(400).json({ 
      error: 'Missing required fields: set_id, user_id, and rating are required' 
    });
  }

  // Validate rating range
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ 
      error: 'Rating must be between 1 and 5' 
    });
  }

  const sql = `
    INSERT INTO ratings (set_id, user_id, rating, review_text, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const values = [
    set_id,
    user_id,
    rating,
    review_text || null
  ];

  db.run(sql, values, function(err) {
    if (err) {
      console.error('Error submitting rating:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        success: true,
        rating_id: this.lastID,
        message: 'Rating submitted successfully'
      });
    }
  });
});

// Favorites endpoints
app.get('/api/favorites', (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const sql = `
    SELECT f.*, s.name as set_name, s.description as set_description
    FROM favorites f
    LEFT JOIN sets s ON f.set_id = s.set_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `;

  db.all(sql, [user_id], (err, rows) => {
    if (err) {
      console.error('Error fetching favorites:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows || []);
    }
  });
});

app.post('/api/favorites', (req, res) => {
  const { user_id, set_id } = req.body;
  
  if (!user_id || !set_id) {
    return res.status(400).json({ error: 'user_id and set_id are required' });
  }

  const sql = `
    INSERT OR IGNORE INTO favorites (user_id, set_id, created_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `;

  db.run(sql, [user_id, set_id], function(err) {
    if (err) {
      console.error('Error adding favorite:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        success: true,
        favorite_id: this.lastID,
        message: 'Favorite added successfully'
      });
    }
  });
});

app.delete('/api/favorites', (req, res) => {
  const { user_id, set_id } = req.query;
  
  if (!user_id || !set_id) {
    return res.status(400).json({ error: 'user_id and set_id are required' });
  }

  const sql = `DELETE FROM favorites WHERE user_id = ? AND set_id = ?`;

  db.run(sql, [user_id, set_id], function(err) {
    if (err) {
      console.error('Error removing favorite:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        success: true,
        message: 'Favorite removed successfully'
      });
    }
  });
});

// Get ratings for a specific set
app.get('/api/ratings/set/:setId', (req, res) => {
  const setId = req.params.setId;
  
  db.all('SELECT * FROM ratings WHERE set_id = ? ORDER BY created_at DESC', [setId], (err, rows) => {
    if (err) {
      console.error('Ratings query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      // Calculate average rating and count
      const ratings = rows || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0;
      
      res.json({
        success: true,
        data: {
          average_rating: Math.round(averageRating * 10) / 10,
          review_count: ratings.length,
          reviews: ratings
        }
      });
    }
  });
});

// Provider sets endpoint
app.get('/api/provider-sets', (req, res) => {
  const { provider_id, include_inactive } = req.query;
  
  // Build the WHERE clause based on parameters
  let whereClause = 'WHERE s.active = 1'; // Always require the base set to be active
  
  // If include_inactive is not true, only show active provider sets
  if (include_inactive !== 'true') {
    whereClause += ' AND ps.is_active = 1';
  }
  
  let query = `
    SELECT 
      ps.provider_set_id,
      ps.provider_id,
      ps.set_id,
      ps.price,
      ps.available_quantity,
      ps.is_active,
      ps.created_at,
      ps.updated_at,
      s.category,
      s.difficulty_level,
      s.recommended_age_min,
      s.recommended_age_max,
      s.estimated_duration_minutes,
      s.base_price,
      s.name as set_name,
      s.description as set_description,
      s.active as set_active,
      u.username as provider_username,
      u.company_name as provider_company,
      u.first_name as provider_first_name,
      u.last_name as provider_last_name
    FROM provider_sets ps
    JOIN sets s ON ps.set_id = s.set_id
    JOIN users u ON ps.provider_id = u.user_id
    ${whereClause}
  `;
  
  const params = [];
  if (provider_id) {
    query += ' AND ps.provider_id = ?';
    params.push(provider_id);
  }
  
  query += ' ORDER BY ps.created_at DESC';
  
  db.all(query, params, async (err, rows) => {
    if (err) {
      console.error('Provider sets query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      // Transform the data to include set names, descriptions, parts, and media
      const providerSets = await Promise.all(rows.map(async (row) => {
        // Fetch parts for this set
        const partsPromise = new Promise((resolve) => {
          db.all(`
            SELECT sp.set_part_id, sp.set_id, sp.part_id, sp.quantity, sp.is_optional, sp.notes,
                   p.part_name
            FROM set_parts sp
            LEFT JOIN parts p ON sp.part_id = p.part_id
            WHERE sp.set_id = ?
          `, [row.set_id], (err, parts) => {
            if (err) {
              console.error('Parts query error:', err);
              resolve([]);
            } else {
              resolve(parts || []);
            }
          });
        });
        
        // Fetch media for this set
        const mediaPromise = new Promise((resolve) => {
          db.all(`
            SELECT mf.media_id, mf.set_id, mf.file_name, mf.file_path as file_url, mf.media_category, mf.alt_text
            FROM set_media sm
            JOIN media_files mf ON sm.media_id = mf.media_id
            WHERE sm.set_id = ?
          `, [row.set_id], (err, media) => {
            if (err) {
              console.error('Media query error:', err);
              resolve([]);
            } else {
              resolve(media || []);
            }
          });
        });
        
        const [parts, media] = await Promise.all([partsPromise, mediaPromise]);
        
        return {
          provider_set_id: row.provider_set_id,
          provider_id: row.provider_id,
          set_id: row.set_id,
          name: row.set_name || `${row.category} Set ${row.set_id}`,
          description: row.set_description || `A ${row.difficulty_level.toLowerCase()} ${row.category.toLowerCase()} set for ages ${row.recommended_age_min}-${row.recommended_age_max}`,
          price: row.price,
          base_price: row.base_price,
          display_price: row.price,
          available_quantity: row.available_quantity,
          is_active: Boolean(row.is_active),
          category: row.category,
          difficulty_level: row.difficulty_level,
          recommended_age_min: row.recommended_age_min,
          recommended_age_max: row.recommended_age_max,
          estimated_duration_minutes: row.estimated_duration_minutes,
          provider_username: row.provider_username,
          provider_company: row.provider_company,
          provider_name: `${row.provider_first_name} ${row.provider_last_name}`,
          set_type: 'provider', // All sets from this endpoint are provider sets
          created_at: row.created_at,
          updated_at: row.updated_at,
          parts: parts,
          media: media
        };
      }));
      
      res.json({ provider_sets: providerSets });
    }
  });
});

// Get provider payment statistics and status
app.get('/api/provider-payment-stats', authenticateToken, (req, res) => {
  const provider_id = req.user.user_id;
  const userRole = req.user.role;

  // Only providers can access this endpoint
  if (userRole !== 'provider') {
    return res.status(403).json({ error: 'Only providers can access payment statistics' });
  }

  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Get provider's orders for current month
  const ordersQuery = `
    SELECT 
      o.order_id,
      o.total_amount,
      o.status,
      o.payment_status,
      o.payment_method,
      o.payment_reference,
      o.payment_amount,
      o.payment_date,
      o.payment_confirmed_by,
      o.payment_confirmed_at,
      o.created_at,
      oi.quantity,
      oi.unit_price,
      oi.line_total,
      ps.price as provider_price,
      s.name as set_name
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN provider_sets ps ON oi.set_id = ps.provider_set_id
    JOIN sets s ON ps.set_id = s.set_id
    WHERE ps.provider_id = ?
    AND strftime('%m', o.created_at) = ?
    AND strftime('%Y', o.created_at) = ?
    AND o.status IN ('delivered', 'completed')
    ORDER BY o.created_at DESC
  `;

  db.all(ordersQuery, [provider_id, currentMonth.toString().padStart(2, '0'), currentYear.toString()], (err, orders) => {
    if (err) {
      console.error('Provider payment stats query error:', err);
      return res.status(500).json({ error: err.message });
    }

    // Calculate statistics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.line_total || 0), 0);
    const totalOrders = orders.length;
    const platformFee = 0.20; // 20% platform fee
    const providerEarnings = totalRevenue * (1 - platformFee); // 80% to provider

    // Group by payment status
    const paymentStats = {
      pending: orders.filter(o => !o.payment_status || o.payment_status === 'pending').length,
      processing: orders.filter(o => o.payment_status === 'processing').length,
      completed: orders.filter(o => o.payment_status === 'completed').length,
      failed: orders.filter(o => o.payment_status === 'failed').length
    };

    // Calculate earnings by payment status
    const earningsByStatus = {
      pending: orders.filter(o => !o.payment_status || o.payment_status === 'pending')
        .reduce((sum, order) => sum + (order.line_total || 0) * (1 - platformFee), 0),
      processing: orders.filter(o => o.payment_status === 'processing')
        .reduce((sum, order) => sum + (order.line_total || 0) * (1 - platformFee), 0),
      completed: orders.filter(o => o.payment_status === 'completed')
        .reduce((sum, order) => sum + (order.line_total || 0) * (1 - platformFee), 0),
      failed: orders.filter(o => o.payment_status === 'failed')
        .reduce((sum, order) => sum + (order.line_total || 0) * (1 - platformFee), 0)
    };

    console.log(`💰 Provider ${provider_id} payment stats: ${totalOrders} orders, €${providerEarnings.toFixed(2)} earnings`);

    res.json({
      success: true,
      provider_id,
      month: currentMonth,
      year: currentYear,
      statistics: {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        platform_fee_percentage: platformFee * 100,
        platform_fee_amount: totalRevenue * platformFee,
        provider_earnings: providerEarnings,
        payment_stats: paymentStats,
        earnings_by_status: earningsByStatus
      },
      orders: orders.map(order => ({
        order_id: order.order_id,
        set_name: order.set_name,
        quantity: order.quantity,
        unit_price: order.unit_price,
        line_total: order.line_total,
        provider_price: order.provider_price,
        status: order.status,
        payment_status: order.payment_status || 'pending',
        payment_method: order.payment_method,
        payment_reference: order.payment_reference,
        payment_amount: order.payment_amount,
        payment_date: order.payment_date,
        payment_confirmed_by: order.payment_confirmed_by,
        payment_confirmed_at: order.payment_confirmed_at,
        created_at: order.created_at
      }))
    });
  });
});

// Update order payment status (Admin only)
app.put('/api/orders/:id/payment-status', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const userRole = req.user.role;
  const userId = req.user.user_id;

  // Only admins can update payment status
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update payment status' });
  }

  const { payment_status, payment_method, payment_reference, payment_amount, payment_date, notes } = req.body;

  // Validate required fields
  if (!payment_status) {
    return res.status(400).json({ error: 'Payment status is required' });
  }

  const validStatuses = ['pending', 'processing', 'completed', 'failed'];
  if (!validStatuses.includes(payment_status)) {
    return res.status(400).json({ error: 'Invalid payment status' });
  }

  // Update order payment status
  const updateQuery = `
    UPDATE orders 
    SET 
      payment_status = ?,
      payment_method = ?,
      payment_reference = ?,
      payment_amount = ?,
      payment_date = ?,
      payment_confirmed_by = ?,
      payment_confirmed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ?
  `;

  const updateParams = [
    payment_status,
    payment_method || null,
    payment_reference || null,
    payment_amount || null,
    payment_date || null,
    userId,
    orderId
  ];

  db.run(updateQuery, updateParams, function(err) {
    if (err) {
      console.error('Payment status update error:', err);
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Log the payment status change
    const logQuery = `
      INSERT INTO payment_history (order_id, old_status, new_status, changed_by, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.run(logQuery, [orderId, 'pending', payment_status, userId, notes || null], (logErr) => {
      if (logErr) {
        console.error('Payment history log error:', logErr);
        // Don't fail the request if logging fails
      }
    });

    console.log(`✅ Admin ${userId} updated order ${orderId} payment status to ${payment_status}`);

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      order_id: orderId,
      payment_status,
      payment_method,
      payment_reference,
      payment_amount,
      payment_date,
      updated_by: userId,
      updated_at: new Date().toISOString()
    });
  });
});

// Shop sets endpoint (for customers) - includes both provider sets and admin sets
app.get('/api/shop-sets', (req, res) => {
  // Get user info from token if provided
  const authHeader = req.headers.authorization;
  let userRole = 'customer'; // Default to customer view
  let userId = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Simple token parsing - in production you'd use JWT
    const tokenParts = token.split('-');
    if (tokenParts.length >= 2) {
      userId = parseInt(tokenParts[1]);
      // Get user role from database
      db.get('SELECT role FROM users WHERE user_id = ?', [userId], (err, user) => {
        if (!err && user) {
          userRole = user.role;
        }
        processShopSets();
      });
    } else {
      processShopSets();
    }
  } else {
    processShopSets();
  }
  
  function processShopSets() {
    console.log(`🛒 Shop sets request - User role: ${userRole}, User ID: ${userId || 'unauthenticated'}`);
    console.log(`🛒 Shop access policy: ${(userRole === 'customer' || !userId) ? 'ALLOWED' : 'BLOCKED'}`);
    
    // Build provider sets query based on user role
    let providerSetsQuery = `
      SELECT 
        ps.provider_set_id,
        ps.provider_id,
        ps.set_id,
        ps.price,
        ps.provider_visible,
        COALESCE(
          ps.available_quantity,
          (SELECT MIN(FLOOR((p.stock_quantity - COALESCE(cr.reserved_quantity, 0)) / sp.quantity))
           FROM set_parts sp
           JOIN parts p ON sp.part_id = p.part_id
           LEFT JOIN (
             SELECT cr.set_id, SUM(cr.quantity * sp2.quantity) as reserved_quantity
             FROM cart_reservations cr
             JOIN set_parts sp2 ON cr.set_id = sp2.set_id
             WHERE cr.expires_at > datetime('now')
             GROUP BY cr.set_id
           ) cr ON cr.set_id = sp.set_id
           WHERE sp.set_id = s.set_id AND sp.is_optional = 0
          ), 0
        ) as available_quantity,
        COALESCE(
          (SELECT COUNT(*)
           FROM media_files mf
           WHERE mf.set_id = s.set_id AND mf.file_type = 'image'
          ), 0
        ) as media_count,
        ps.is_active,
        s.*,
        u.username as provider_username,
        u.company_name as provider_company,
        u.first_name as provider_first_name,
        u.last_name as provider_last_name,
        u.role as provider_role,
        u.provider_code as provider_code,
        'provider' as set_type,
        COALESCE(AVG(rat.rating), 0) as average_rating,
        COUNT(rat.rating_id) as review_count
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      JOIN users u ON ps.provider_id = u.user_id
      LEFT JOIN ratings rat ON rat.set_id = s.set_id
      WHERE ps.is_active = 1 
        AND s.active = 1 
        AND ps.admin_status = 'active'
        AND ps.provider_visible = 1
      GROUP BY ps.provider_set_id
    `;
    
    // Show visible provider sets for customers and public (unauthenticated users)
    if (!(userRole === 'customer' || !userId)) {
      // Admin and Provider: No shop access - return empty result
      providerSetsQuery += ` AND 1 = 0`; // This will return no results
    }
    
    // Build admin sets query - ONLY for customers and public users (public shop access)
    let adminSetsQuery = '';
    if (userRole === 'customer' || !userId) {
      // For customers and public users, only show admin sets that are marked as visible
      adminSetsQuery = `
        SELECT 
          NULL as provider_set_id,
          NULL as provider_id,
          s.set_id,
          s.name,
          s.description,
          s.category,
          s.difficulty_level,
          s.recommended_age_min,
          s.recommended_age_max,
          s.estimated_duration_minutes,
          s.manual,
          s.base_price,
          s.video_url,
          s.learning_outcomes,
          s.active,
          s.admin_visible,
          s.tested_by_makerset,
          s.created_at,
          s.updated_at,
          s.base_price as price,
          COALESCE(
            (SELECT MIN(FLOOR((p.stock_quantity - COALESCE(cr.reserved_quantity, 0)) / sp.quantity))
             FROM set_parts sp
             JOIN parts p ON sp.part_id = p.part_id
             LEFT JOIN (
               SELECT cr.set_id, SUM(cr.quantity * sp2.quantity) as reserved_quantity
               FROM cart_reservations cr
               JOIN set_parts sp2 ON cr.set_id = sp2.set_id
               WHERE cr.expires_at > datetime('now')
               GROUP BY cr.set_id
             ) cr ON cr.set_id = sp.set_id
             WHERE sp.set_id = s.set_id AND sp.is_optional = 0
            ), 0
          ) as available_quantity,
          COALESCE(
            (SELECT COUNT(*)
             FROM media_files mf
             WHERE mf.set_id = s.set_id AND mf.file_type = 'image'
            ), 0
          ) as media_count,
          1 as is_active,
          'admin' as provider_username,
          'MakerSet Platform' as provider_company,
          'Admin' as provider_first_name,
          'User' as provider_last_name,
          'admin' as provider_role,
          'admin' as set_type,
          COALESCE(AVG(rat.rating), 0) as average_rating,
          COUNT(rat.rating_id) as review_count
        FROM sets s
        LEFT JOIN ratings rat ON rat.set_id = s.set_id
        WHERE s.active = 1 AND s.admin_visible = 1
        AND s.set_id NOT IN (
          SELECT DISTINCT ps.set_id 
          FROM provider_sets ps 
          WHERE ps.is_active = 1 AND ps.provider_visible = 1
        )
        GROUP BY s.set_id`;
      console.log(`🛒 Admin sets query: ${adminSetsQuery}`);
    } else {
      console.log(`🛒 Skipping admin sets for role: ${userRole} (admin/provider manage sets through dashboards)`);
    }
  
    // Execute provider sets query
    db.all(providerSetsQuery, [], (err, providerRows) => {
      if (err) {
        console.error('Provider sets query error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`🛒 Found ${providerRows.length} provider sets`);
      
      // Execute admin sets query only if needed
      if (adminSetsQuery) {
        db.all(adminSetsQuery, [], (err, adminRows) => {
          if (err) {
            console.error('Admin sets query error:', err);
            return res.status(500).json({ error: err.message });
          }
          
          console.log(`🛒 Found ${adminRows.length} admin sets`);
          
          // Debug: Log admin sets with their available quantities
          adminRows.forEach(row => {
            console.log(`🛒 Admin set "${row.name}" (ID: ${row.set_id}) - Available quantity: ${row.available_quantity}`);
          });
          
          // Combine both result sets
          const allRows = [...providerRows, ...adminRows];
          console.log(`🛒 Total sets returned: ${allRows.length}`);
          processResults(allRows);
        });
      } else {
        // Only provider sets for providers
        console.log(`🛒 No admin sets query, returning ${providerRows.length} provider sets`);
        processResults(providerRows);
      }
    });
  }
  
  function processResults(allRows) {
    // Filter out sets with no available quantity
    const availableRows = allRows.filter(row => row.available_quantity > 0);
    console.log(`🛒 Filtered to ${availableRows.length} sets with available quantity > 0`);
    
    // Transform the data for shop display - use actual set data instead of generated names
    const sets = availableRows.map(row => ({
      set_id: row.set_id,
      provider_set_id: row.provider_set_id,
      provider_id: row.provider_id,
      name: row.name, // Use actual set name instead of generated name
      description: row.description, // Use actual description instead of generated description
      price: row.price,
      base_price: row.base_price,
      display_price: row.price,
      available_quantity: row.available_quantity,
      category: row.category,
      difficulty_level: row.difficulty_level,
      recommended_age_min: row.recommended_age_min,
      recommended_age_max: row.recommended_age_max,
      estimated_duration_minutes: row.estimated_duration_minutes,
      manual: row.manual, // Include manual field for instruction generation
      provider_username: row.provider_username,
      provider_company: row.provider_company,
      provider_name: row.set_type === 'admin' ? 'Admin (Platform)' : `${row.provider_first_name} ${row.provider_last_name}`,
      provider_code: row.provider_code,
      active: Boolean(row.active || row.is_active),
      is_active: Boolean(row.is_active),
      set_type: row.set_type,
      provider_visible: row.provider_visible, // Include provider visibility status
      admin_visible: row.admin_visible, // Include admin visibility status
      tested_by_makerset: Boolean(row.tested_by_makerset), // Include trust certification status
      // Include all the missing fields that shop cards need
      learning_outcomes: row.learning_outcomes ? JSON.parse(row.learning_outcomes) : [],
      media: [], // Will be populated below
      average_rating: row.average_rating,
      review_count: row.review_count,
      customer_feedback: row.customer_feedback,
      video_url: row.video_url,
      parts: row.parts,
      instructions: row.instructions,
      translations: row.translations,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    // Sort by set_id descending (newest first)
    sets.sort((a, b) => b.set_id - a.set_id);
    
    // Fetch media and parts for each set
    let mediaLoaded = 0;
    let partsLoaded = 0;
    const totalSets = sets.length;
    
    if (totalSets === 0) {
      return res.json({ sets: sets });
    }
    
    sets.forEach((set) => {
      // Fetch media
      db.all('SELECT * FROM media_files WHERE set_id = ? ORDER BY created_at', [set.set_id], (err, mediaRows) => {
        if (err) {
          console.error('Media query error for set', set.set_id, ':', err);
          set.media = [];
        } else {
          // Transform media data to include file_url
          set.media = mediaRows.map(media => ({
            id: media.media_id,
            type: media.file_type || 'image',
            file_url: `http://localhost:5003/uploads/${media.file_name}`,
            filename: media.file_name,
            mime_type: media.mime_type,
            created_at: media.created_at,
            alt_text: media.alt_text || media.file_name,
            description: media.description || ''
          }));
        }
        
        mediaLoaded++;
        checkComplete();
      });
      
      // Fetch parts
      db.all(`
        SELECT sp.*, p.part_name, p.part_number, p.category, p.unit_cost, p.image_url, p.stock_quantity, p.unit_of_measure
        FROM set_parts sp
        JOIN parts p ON sp.part_id = p.part_id
        WHERE sp.set_id = ?
      `, [set.set_id], (err, partsRows) => {
        if (err) {
          console.error('Parts query error for set', set.set_id, ':', err);
          set.parts = [];
        } else {
          set.parts = partsRows.map(part => ({
            set_part_id: part.set_part_id,
            part_id: part.part_id,
            part_name: part.part_name,
            part_number: part.part_number,
            category: part.category,
            quantity: part.quantity,
            unit_cost: part.unit_cost,
            stock_quantity: part.stock_quantity,
            is_optional: Boolean(part.is_optional), // Convert 0/1 to boolean
            notes: part.notes,
            image_url: part.image_url,
            unit_of_measure: part.unit_of_measure
          }));
        }
        
        partsLoaded++;
        checkComplete();
      });
    });
    
    function checkComplete() {
      if (mediaLoaded === totalSets && partsLoaded === totalSets) {
        res.json({ sets: sets });
      }
    }
  }
});

// Create provider set endpoint
app.post('/api/provider-sets', authenticateToken, (req, res) => {
  const { provider_id, set_id, price, available_quantity = 0, is_active = true } = req.body;
  const userId = req.user.user_id;
  
  console.log(`🆕 Creating provider set for provider ${provider_id}, set ${set_id}`);
  
  if (!provider_id || !set_id || !price) {
    return res.status(400).json({ error: 'Provider ID, Set ID, and price are required' });
  }
  
  // Only allow providers to create sets for themselves
  if (req.user.role === 'provider' && userId != provider_id) {
    return res.status(403).json({ error: 'Providers can only create sets for themselves' });
  }
  
  // Get default visibility setting
  db.get('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['default_provider_set_visible'], (err, settingRow) => {
    if (err) {
      console.error('Settings query error:', err);
      return res.status(500).json({ error: 'Failed to get default settings' });
    }
    
    const defaultVisible = settingRow ? settingRow.setting_value === 'true' : true;
    console.log(`📋 Default provider set visibility: ${defaultVisible}`);
    
    // Check if set exists and is active
    db.get('SELECT set_id, name FROM sets WHERE set_id = ? AND active = 1', [set_id], (err, setRow) => {
      if (err) {
        console.error('Set check error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (!setRow) {
        return res.status(404).json({ error: 'Set not found or inactive' });
      }
      
      // Check if provider set already exists
      db.get('SELECT provider_set_id FROM provider_sets WHERE provider_id = ? AND set_id = ?', [provider_id, set_id], (err, existingRow) => {
        if (err) {
          console.error('Provider set check error:', err);
          return res.status(500).json({ error: err.message });
        }
        
        if (existingRow) {
          return res.status(409).json({ error: 'Provider set already exists' });
        }
        
        // Get provider info for notification
        db.get('SELECT company_name, username FROM users WHERE user_id = ?', [provider_id], (err, providerInfo) => {
          if (err) {
            console.error('Provider info error:', err);
            providerInfo = { company_name: 'Provider', username: 'provider' };
          }
          
          // Create provider set with default visibility
          const sql = `
            INSERT INTO provider_sets (provider_id, set_id, price, available_quantity, is_active, provider_visible, admin_visible, admin_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          const providerVisible = 1; // Provider always makes their sets visible by default
          const adminVisible = defaultVisible ? 1 : 0; // Use admin's default setting
          const adminStatus = defaultVisible ? 'active' : 'on_hold'; // Set status based on visibility
          
          const values = [provider_id, set_id, parseFloat(price), parseInt(available_quantity), is_active ? 1 : 0, providerVisible, adminVisible, adminStatus];
          
          db.run(sql, values, function(err) {
            if (err) {
              console.error('Provider set creation error:', err);
              res.status(500).json({ error: err.message });
            } else {
              console.log(`✅ Provider set created with visibility: admin_visible=${adminVisible}, admin_status=${adminStatus}`);
              
              const providerSetId = this.lastID;
              
              // Reserve SYS-COMM part (part_id = 60) based on provider set quantity
              const sysCommQuantity = parseInt(available_quantity);
              db.run(
                `INSERT INTO provider_set_inventory (provider_set_id, part_id, reserved_quantity, used_quantity)
                 VALUES (?, 60, ?, 0)`,
                [providerSetId, sysCommQuantity],
                (invErr) => {
                  if (invErr) {
                    console.error('Error creating SYS-COMM reservation:', invErr);
                  } else {
                    console.log(`📦 Reserved ${sysCommQuantity} SYS-COMM parts for provider set ${providerSetId}`);
                  }
                }
              );
              
              // Send notification to admins
              const notificationTitle = `🆕 New Provider Set Published`;
              const notificationMessage = `${providerInfo.company_name || providerInfo.username} published "${setRow.name}" (Set #${set_id})${defaultVisible ? ' and it\'s visible in the shop' : '. Approval required before visibility.'}`;
              
              db.run(`
                INSERT INTO system_notifications (created_for, title, message, type, priority, is_read, created_at)
                VALUES (NULL, ?, ?, 'provider_set_created', 'medium', 0, CURRENT_TIMESTAMP)
              `, [notificationTitle, notificationMessage], (notifErr) => {
                if (notifErr) {
                  console.error('Error creating notification:', notifErr);
                } else {
                  console.log('📢 Notification sent to admins about new provider set');
                }
              });
              
              res.status(201).json({
                message: 'Provider set created successfully',
                provider_set: {
                  provider_set_id: this.lastID,
                  provider_id: parseInt(provider_id),
                  set_id: parseInt(set_id),
                  price: parseFloat(price),
                  available_quantity: parseInt(available_quantity),
                  is_active: Boolean(is_active)
                }
              });
            }
          });
        });
      });
    });
  });
});

// Update provider set endpoint
app.put('/api/provider-sets/:id', (req, res) => {
  const { id } = req.params;
  const { price, available_quantity, is_active } = req.body;
  
  const sql = `
    UPDATE provider_sets 
    SET price = ?, available_quantity = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE provider_set_id = ?
  `;
  
  const values = [parseFloat(price), parseInt(available_quantity), is_active ? 1 : 0, id];
  
  db.run(sql, values, function(err) {
    if (err) {
      console.error('Provider set update error:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Provider set not found' });
    } else {
      // Update SYS-COMM part reservation
      const sysCommQuantity = parseInt(available_quantity);
      db.run(
        `INSERT INTO provider_set_inventory (provider_set_id, part_id, reserved_quantity, used_quantity)
         VALUES (?, 60, ?, 0)
         ON CONFLICT(provider_set_id, part_id) DO UPDATE SET reserved_quantity = ?, updated_at = CURRENT_TIMESTAMP`,
        [id, sysCommQuantity, sysCommQuantity],
        (invErr) => {
          if (invErr) {
            console.error('Error updating SYS-COMM reservation:', invErr);
          } else {
            console.log(`📦 Updated SYS-COMM reservation to ${sysCommQuantity} for provider set ${id}`);
          }
        }
      );
      
      res.json({
        message: 'Provider set updated successfully',
        provider_set: {
          provider_set_id: parseInt(id),
          price: parseFloat(price),
          available_quantity: parseInt(available_quantity),
          is_active: Boolean(is_active)
        }
      });
    }
  });
});

// Delete provider set endpoint
app.delete('/api/provider-sets/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM provider_sets WHERE provider_set_id = ?', [id], function(err) {
    if (err) {
      console.error('Provider set deletion error:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Provider set not found' });
    } else {
      res.json({ message: 'Provider set deleted successfully' });
    }
  });
});

// Admin endpoint to get provider sets statistics
app.get('/api/admin/provider-sets/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const sql = `
    SELECT 
      COUNT(*) as total_provider_sets,
      SUM(CASE WHEN ps.admin_status = 'active' THEN 1 ELSE 0 END) as active_sets,
      SUM(CASE WHEN ps.admin_status = 'on_hold' THEN 1 ELSE 0 END) as on_hold_sets,
      SUM(CASE WHEN ps.admin_status = 'disabled' THEN 1 ELSE 0 END) as disabled_sets,
      SUM(CASE WHEN ps.admin_visible = 1 THEN 1 ELSE 0 END) as admin_visible_sets,
      SUM(CASE WHEN ps.provider_visible = 1 THEN 1 ELSE 0 END) as provider_visible_sets,
      COUNT(DISTINCT ps.provider_id) as unique_providers,
      AVG(ps.price) as average_price,
      SUM(ps.price) as total_value
    FROM provider_sets ps
    WHERE ps.is_active = 1
  `;

  db.get(sql, [], (err, row) => {
    if (err) {
      console.error('Error fetching provider sets stats:', err);
      return res.status(500).json({ error: 'Failed to fetch provider sets statistics' });
    }

    const stats = {
      total_provider_sets: row.total_provider_sets || 0,
      active_sets: row.active_sets || 0,
      on_hold_sets: row.on_hold_sets || 0,
      disabled_sets: row.disabled_sets || 0,
      admin_visible_sets: row.admin_visible_sets || 0,
      provider_visible_sets: row.provider_visible_sets || 0,
      unique_providers: row.unique_providers || 0,
      average_price: Math.round((row.average_price || 0) * 100) / 100,
      total_value: Math.round((row.total_value || 0) * 100) / 100
    };

    res.json({ stats });
  });
});

// Admin endpoint to create default provider sets (0% margin for all providers)
app.post('/api/admin/provider-sets-default', (req, res) => {
  const { set_id, price, available_quantity = 0 } = req.body;
  
  if (!set_id || !price) {
    return res.status(400).json({ error: 'Set ID and price are required' });
  }
  
  // Check if set exists and is active
  db.get('SELECT set_id FROM sets WHERE set_id = ? AND active = 1', [set_id], (err, setRow) => {
    if (err) {
      console.error('Set check error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!setRow) {
      return res.status(404).json({ error: 'Set not found or inactive' });
    }
    
    // Get all active providers
    db.all('SELECT user_id FROM users WHERE role = "provider" AND is_active = 1', [], (err, providers) => {
      if (err) {
        console.error('Providers query error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (providers.length === 0) {
        return res.status(404).json({ error: 'No active providers found' });
      }
      
      let createdCount = 0;
      let skippedCount = 0;
      let errors = [];
      
      // Create provider set for each provider
      providers.forEach((provider, index) => {
        // Check if provider set already exists
        db.get('SELECT provider_set_id FROM provider_sets WHERE provider_id = ? AND set_id = ?', 
          [provider.user_id, set_id], (err, existingRow) => {
          
          if (err) {
            console.error('Provider set check error:', err);
            errors.push(`Error checking provider ${provider.user_id}: ${err.message}`);
            if (index === providers.length - 1) {
              return res.status(500).json({ error: 'Database error', details: errors });
            }
            return;
          }
          
          if (existingRow) {
            skippedCount++;
            if (index === providers.length - 1) {
              return res.json({
                message: 'Default provider sets creation completed',
                created: createdCount,
                skipped: skippedCount,
                total_providers: providers.length,
                details: `${createdCount} sets created, ${skippedCount} already existed`
              });
            }
            return;
          }
          
          // Create provider set with 0% margin (provider keeps 100% of revenue)
          const sql = `
            INSERT INTO provider_sets (provider_id, set_id, price, available_quantity, is_active)
            VALUES (?, ?, ?, ?, 1)
          `;
          
          const values = [provider.user_id, set_id, parseFloat(price), parseInt(available_quantity)];
          
          db.run(sql, values, function(err) {
            if (err) {
              console.error('Provider set creation error:', err);
              errors.push(`Error creating set for provider ${provider.user_id}: ${err.message}`);
            } else {
              createdCount++;
              console.log(`✅ Created provider set for provider ${provider.user_id}, set ${set_id} at €${price}`);
            }
            
            // If this is the last provider, send response
            if (index === providers.length - 1) {
              if (errors.length > 0) {
                return res.status(500).json({ 
                  error: 'Some provider sets could not be created', 
                  details: errors,
                  created: createdCount,
                  skipped: skippedCount
                });
              }
              
              res.json({
                message: 'Default provider sets created successfully',
                created: createdCount,
                skipped: skippedCount,
                total_providers: providers.length,
                details: `${createdCount} sets created for ${providers.length} providers, ${skippedCount} already existed`
              });
            }
          });
        });
      });
    });
  });
});

// Admin endpoint to get all sets available for default provider set creation
app.get('/api/admin/sets-for-providers', (req, res) => {
  const query = `
    SELECT 
      s.set_id,
      s.category,
      s.difficulty_level,
      s.recommended_age_min,
      s.recommended_age_max,
      s.estimated_duration_minutes,
      s.base_price,
      s.active,
      COUNT(ps.provider_set_id) as provider_count
    FROM sets s
    LEFT JOIN provider_sets ps ON s.set_id = ps.set_id
    WHERE s.active = 1
    GROUP BY s.set_id
    ORDER BY s.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Sets for providers query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      const sets = rows.map(row => ({
        set_id: row.set_id,
        name: `${row.category} Set ${row.set_id}`,
        category: row.category,
        difficulty_level: row.difficulty_level,
        recommended_age_min: row.recommended_age_min,
        recommended_age_max: row.recommended_age_max,
        estimated_duration_minutes: row.estimated_duration_minutes,
        base_price: row.base_price,
        provider_count: row.provider_count,
        is_available_for_providers: row.provider_count === 0 // True if no providers have this set yet
      }));
      
      res.json({ sets: sets });
    }
  });
});

// Provider set by ID endpoint
app.get('/api/provider-sets/:id', (req, res) => {
  const setId = req.params.id;
  db.get('SELECT * FROM sets WHERE set_id = ?', [setId], (err, row) => {
    if (err) {
      console.error('Provider set query error:', err);
      res.status(500).json({ error: err.message });
    } else if (row) {
      // Transform to provider set format
      res.json({
        provider_set: {
          ...row,
          name: `${row.category} Set ${row.set_id}`,
          description: `A ${row.difficulty_level.toLowerCase()} ${row.category.toLowerCase()} set for ages ${row.recommended_age_min}-${row.recommended_age_max}`,
          provider_company: 'MakerLab',
          provider_username: 'admin',
          available_quantity: 10,
          base_price: row.base_price || 0
        }
      });
    } else {
      res.status(404).json({ error: 'Provider set not found' });
    }
  });
});

// Set parts endpoint
app.get('/api/set-parts', (req, res) => {
  res.json([]);
});

// Add part to set endpoint
app.post('/api/set-parts', (req, res) => {
  const { set_id, part_id, quantity, is_optional, notes, safety_notes } = req.body;

  // Validate required fields
  if (!set_id || !part_id) {
    return res.status(400).json({ 
      error: 'Missing required fields: set_id and part_id are required' 
    });
  }

  const sql = `
    INSERT INTO set_parts (set_id, part_id, quantity, is_optional, notes, safety_notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [
    set_id,
    part_id,
    quantity || 1,
    is_optional || false,
    notes || null,
    safety_notes || null
  ];

  db.run(sql, values, function(err) {
    if (err) {
      console.error('Error adding part to set:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Part already exists in this set' });
      } else {
        res.status(500).json({ error: err.message });
      }
    } else {
      res.json({
        success: true,
        set_part_id: this.lastID,
        message: 'Part added to set successfully'
      });
    }
  });
});

// Update part in set endpoint
app.put('/api/set-parts/:id', (req, res) => {
  const setPartId = req.params.id;
  const { quantity, is_optional, notes, safety_notes } = req.body;

  const sql = `
    UPDATE set_parts SET 
      quantity = ?, is_optional = ?, notes = ?, safety_notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE set_part_id = ?
  `;

  const values = [quantity, is_optional, notes, safety_notes, setPartId];

  db.run(sql, values, function(err) {
    if (err) {
      console.error('Error updating set part:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Set part not found' });
    } else {
      res.json({
        success: true,
        message: 'Set part updated successfully'
      });
    }
  });
});

// Remove part from set endpoint
app.delete('/api/set-parts/:id', (req, res) => {
  const setPartId = req.params.id;

  db.run('DELETE FROM set_parts WHERE set_part_id = ?', [setPartId], function(err) {
    if (err) {
      console.error('Error removing part from set:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Set part not found' });
    } else {
      res.json({
        success: true,
        message: 'Part removed from set successfully'
      });
    }
  });
});

// Get next part number for a category
app.get('/api/parts/next-number', (req, res) => {
  const { category } = req.query;
  
  let prefix = 'PART';
  if (category) {
    // Generate prefix based on category
    switch (category.toLowerCase()) {
      // Electronic Components
      case 'electronics':
      case 'electronic':
      case 'resistor':
      case 'capacitor':
      case 'transistor':
      case 'diode':
      case 'led':
      case 'microcontroller':
      case 'sensor':
      case 'motor':
      case 'battery':
      case 'wire':
      case 'cable':
      case 'connector':
      case 'switch':
      case 'relay':
      case 'oscillator':
      case 'ic':
      case 'chip':
      case 'board':
      case 'circuit':
      case 'power':
        prefix = 'ELEC';
        break;
      
      // Mechanical Parts
      case 'mechanical':
      case 'screw':
      case 'bolt':
      case 'nut':
      case 'washer':
      case 'spring':
      case 'gear':
      case 'bearing':
      case 'shaft':
      case 'pulley':
      case 'belt':
      case 'chain':
      case 'hinge':
      case 'bracket':
      case 'mount':
      case 'clamp':
        prefix = 'MECH';
        break;
      
      // Materials
      case 'wood':
        prefix = 'WOOD';
        break;
      case 'metal':
        prefix = 'METAL';
        break;
      case 'plastic':
        prefix = 'PLAST';
        break;
      case 'rubber':
        prefix = 'RUBB';
        break;
      case 'ceramic':
        prefix = 'CERAM';
        break;
      case 'glass':
        prefix = 'GLASS';
        break;
      case 'fabric':
        prefix = 'FABR';
        break;
      case 'foam':
        prefix = 'FOAM';
        break;
      
      // Tools & Hardware
      case 'tool':
        prefix = 'TOOL';
        break;
      case 'fastener':
        prefix = 'FAST';
        break;
      case 'adhesive':
        prefix = 'ADH';
        break;
      case 'sealant':
        prefix = 'SEAL';
        break;
      case 'lubricant':
        prefix = 'LUBE';
        break;
      case 'filter':
        prefix = 'FILT';
        break;
      case 'valve':
        prefix = 'VALV';
        break;
      case 'pipe':
        prefix = 'PIPE';
        break;
      case 'fitting':
        prefix = 'FITT';
        break;
      
      // Custom/Other
      case 'custom':
        prefix = 'CUST';
        break;
      case 'other':
        prefix = 'OTHER';
        break;
      
      default:
        // Use first 4 characters of category as prefix, but prefer common prefixes
        if (category.length >= 4) {
          prefix = category.substring(0, 4).toUpperCase();
        } else {
          prefix = category.toUpperCase().padEnd(4, 'X');
        }
    }
  }
  
  // Find the highest number for this prefix
  const sql = `SELECT part_number FROM parts WHERE part_number LIKE ? ORDER BY part_number DESC LIMIT 1`;
  const pattern = `${prefix}-%`;
  
  db.get(sql, [pattern], (err, row) => {
    if (err) {
      console.error('Error getting next part number:', err);
      res.status(500).json({ error: err.message });
    } else {
      let nextNumber = 1;
      if (row) {
        // Extract number from existing part number (e.g., "ELEC-005" -> 5)
        const match = row.part_number.match(/-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      const nextPartNumber = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
      res.json({ next_number: nextPartNumber });
    }
  });
});

// Get parts for a specific set
app.get('/api/set-parts/set/:setId', (req, res) => {
  const setId = req.params.setId;
  
  const sql = `
    SELECT sp.*, p.part_name, p.part_number, p.category, p.unit_of_measure, p.unit_cost, p.image_url
    FROM set_parts sp
    JOIN parts p ON sp.part_id = p.part_id
    WHERE sp.set_id = ?
    ORDER BY sp.created_at DESC
  `;
  
  db.all(sql, [setId], (err, rows) => {
    if (err) {
      console.error('Error fetching set parts:', err);
      res.status(500).json({ error: err.message });
    } else {
      // Get usage counts for all parts in a single query
      db.all(`
        SELECT 
          sp.part_id,
          COUNT(DISTINCT sp.set_id) as usage_count
        FROM set_parts sp
        GROUP BY sp.part_id
      `, (err, usageRows) => {
        if (err) {
          console.error('Error getting usage counts:', err);
          // Return parts with 0 usage count if query fails
          const transformedParts = rows.map(row => ({
            ...row,
            part_name: row.part_name || row.part_number,
            part_description: row.part_name || `Part ${row.part_number}`,
            set_usage_count: 0,
            translations: {
              en: {
                part_name: row.part_name || row.part_number,
                description: row.part_name || `Part ${row.part_number}`
              }
            }
          }));
          res.json(transformedParts || []);
        } else {
          // Create a map of part_id to usage_count
          const usageMap = {};
          usageRows.forEach(row => {
            usageMap[row.part_id] = row.usage_count;
          });

          // Transform the data with correct usage counts
          const transformedParts = rows.map(row => ({
            ...row,
            part_name: row.part_name || row.part_number,
            part_description: row.part_name || `Part ${row.part_number}`,
            set_usage_count: usageMap[row.part_id] || 0,
            translations: {
              en: {
                part_name: row.part_name || row.part_number,
                description: row.part_name || `Part ${row.part_number}`
              }
            }
          }));
          res.json(transformedParts || []);
        }
      });
    }
  });
});

// Set tools endpoint
app.get('/api/set-tools', (req, res) => {
  res.json([]);
});

// Instructions endpoint
app.get('/api/instructions', (req, res) => {
  res.json([]);
});

// Instructions by set ID endpoint
app.get('/api/instructions/set/:setId', (req, res) => {
  const setId = req.params.setId;
  db.all('SELECT * FROM instructions WHERE set_id = ? ORDER BY step_number', [setId], (err, rows) => {
    if (err) {
      console.error('Instructions query error:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows || []);
    }
  });
});

// Messages endpoint
app.get('/api/messages', (req, res) => {
  res.json([]);
});

// Receipts endpoint
app.get('/api/receipts', (req, res) => {
  res.json([]);
});

// AI endpoints (mock responses)
app.post('/api/ai/inventory-optimization', (req, res) => {
  res.json({ success: true, recommendations: [] });
});

app.post('/api/ai/naming', (req, res) => {
  res.json({ success: true, suggestions: [] });
});

// AI Naming Helper endpoints
app.post('/api/ai/naming/suggestions', (req, res) => {
  const { type, description, currentName } = req.body;
  
  // Generate mock suggestions based on type
  let suggestions = [];
  
  if (type === 'part') {
    suggestions = [
      `PART-${Math.floor(Math.random() * 999) + 1}`,
      `COMP-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 99) + 1}`,
      `ITEM-${Math.floor(Math.random() * 9999) + 1}`,
      `RES-${Math.floor(Math.random() * 999) + 1}`
    ];
  } else if (type === 'tool') {
    suggestions = [
      `TOOL-${Math.floor(Math.random() * 999) + 1}`,
      `DEV-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 99) + 1}`,
      `EQ-${Math.floor(Math.random() * 9999) + 1}`,
      `INST-${Math.floor(Math.random() * 99) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
    ];
  } else if (type === 'set') {
    suggestions = [
      `SET-${Math.floor(Math.random() * 999) + 1}`,
      `KIT-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 99) + 1}`,
      `PROJ-${Math.floor(Math.random() * 9999) + 1}`,
      `MOD-${Math.floor(Math.random() * 99) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
    ];
  }
  
  res.json({
    success: true,
    suggestions: suggestions.slice(0, 4), // Return up to 4 suggestions
    guidelines: `Use descriptive names that include the category and a unique identifier.`
  });
});

app.get('/api/ai/naming/guidelines/:type', (req, res) => {
  const { type } = req.params;
  
  let guidelines = {};
  
  if (type === 'part') {
    guidelines = {
      title: 'Part Naming Guidelines',
      rules: [
        'Use format: CATEGORY-NUMBER (e.g., RES-001, CAP-002)',
        'Include category prefix (RES, CAP, LED, WIRE, etc.)',
        'Use sequential numbers with leading zeros',
        'Keep names short and descriptive',
        'Avoid special characters except hyphens'
      ],
      examples: ['RES-001', 'CAP-002', 'LED-003', 'WIRE-004', 'IC-005']
    };
  } else if (type === 'tool') {
    guidelines = {
      title: 'Tool Naming Guidelines',
      rules: [
        'Use format: CATEGORY-NUMBER (e.g., MULTI-001, SCREW-002)',
        'Include category prefix (MULTI, SCREW, DRILL, etc.)',
        'Use sequential numbers with leading zeros',
        'Keep names short and descriptive',
        'Avoid special characters except hyphens'
      ],
      examples: ['MULTI-001', 'SCREW-002', 'DRILL-003', 'HAMMER-004', 'PLIER-005']
    };
  } else if (type === 'set') {
    guidelines = {
      title: 'Set Naming Guidelines',
      rules: [
        'Use format: CATEGORY-NUMBER (e.g., ELECTRONICS-001, ROBOTICS-002)',
        'Include category prefix (ELECTRONICS, ROBOTICS, etc.)',
        'Use sequential numbers with leading zeros',
        'Keep names short and descriptive',
        'Avoid special characters except hyphens'
      ],
      examples: ['ELECTRONICS-001', 'ROBOTICS-002', 'MECHANICS-003', 'CHEMISTRY-004', 'PHYSICS-005']
    };
  } else {
    guidelines = {
      title: 'General Naming Guidelines',
      rules: [
        'Use descriptive names with category prefixes',
        'Include sequential numbers with leading zeros',
        'Keep names short and clear',
        'Avoid special characters except hyphens',
        'Be consistent with naming conventions'
      ],
      examples: ['ITEM-001', 'COMP-002', 'OBJ-003', 'PART-004', 'TOOL-005']
    };
  }
  
  res.json({
    success: true,
    guidelines: guidelines
  });
});

app.post('/api/ai/set-builder', (req, res) => {
  res.json({ success: true, sets: [] });
});

app.post('/api/ai/translation', (req, res) => {
  res.json({ success: true, translations: {} });
});

app.post('/api/ai/translate/text', async (req, res) => {
  const { text, targetLanguage, context } = req.body;
  
  console.log('Translation request:', { text, targetLanguage, context });
  
  try {
    const result = await translateText(text, targetLanguage);
    
    res.json({
      success: true,
      data: {
        translated: result.translated,
        original: text,
        targetLanguage: targetLanguage,
        context: context,
        service: result.service,
        fallbackReason: result.fallbackReason
      }
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
      message: error.message
    });
  }
});

// Two-factor auth endpoints (mock responses)
app.get('/api/2fa/status', (req, res) => {
  res.json({ enabled: false });
});

app.post('/api/2fa/setup', (req, res) => {
  res.json({ success: true, qrCode: 'mock-qr-code' });
});

app.post('/api/2fa/verify', (req, res) => {
  res.json({ success: true });
});

app.post('/api/2fa/disable', (req, res) => {
  res.json({ success: true });
});

// System Settings endpoints
app.get('/api/system/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      systemName: 'MakerLab Sets Management System',
      systemVersion: '1.0.0',
      environment: 'development',
      debugMode: true,
      maintenanceMode: false,
      dbHost: 'localhost',
      dbPort: 5432,
      dbName: 'makerset_db',
      dbSSL: false,
      dbPoolSize: 20,
      dbTimeout: 10000,
      apiPort: 5003,
      apiTimeout: 30000,
      corsEnabled: true,
      rateLimitEnabled: true,
      rateLimitWindow: 900000, // 15 minutes
      rateLimitMax: 100,
      emailNotifications: false,
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      pushNotifications: false,
      slackWebhook: '',
      cacheEnabled: true,
      cacheTTL: 3600,
      compressionEnabled: true,
      maxFileSize: 10485760, // 10MB
      concurrentRequests: 100,
      sessionTimeout: 3600,
      passwordMinLength: 8,
      twoFactorEnabled: false,
      auditLogging: true,
      companyName: 'MakerLab',
      companyAddress: '123 Maker Street, Tech City',
      companyPhone: '+1-555-0123',
      companyEmail: 'info@makerlab.com',
      companyWebsite: 'https://makerlab.com',
      companyTaxId: 'TAX123456789',
      bankName: 'Tech Bank',
      bankAccountNumber: '1234567890',
      bankIban: 'GB29NWBK60161331926819',
      bankSwift: 'NWBKGB2L',
      invoicePrefix: 'INV',
      defaultTaxRate: 20,
      paymentTerms: 'net30',
      defaultInvoiceTemplate: 'modern'
    }
  });
});

app.put('/api/system/settings', (req, res) => {
  res.json({ success: true, message: 'Settings updated successfully' });
});

app.get('/api/system/backup-history', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'backup_2025_10_18_120000.sql',
        type: 'manual',
        size: '2.5MB',
        created_at: '2025-10-18T12:00:00Z',
        status: 'completed'
      }
    ]
  });
});

app.get('/api/system/alerts', (req, res) => {
  // Get tools that need maintenance soon (simplified for current schema)
  const maintenanceQuery = `
    SELECT 
      tool_id as tool_number,
      tool_name,
      NULL as next_maintenance_date,
      0 as days_until_maintenance
    FROM tools 
    LIMIT 0
  `;

  db.all(maintenanceQuery, [], (err, maintenanceRows) => {
    if (err) {
      console.error('Error fetching maintenance alerts:', err);
      return res.status(500).json({ error: err.message });
    }

    // Get low stock parts
    const lowStockQuery = `
      SELECT 
        part_number,
        part_name,
        stock_quantity,
        minimum_stock_level
      FROM parts 
      WHERE stock_quantity <= minimum_stock_level
      ORDER BY (stock_quantity - minimum_stock_level) ASC
      LIMIT 5
    `;

    db.all(lowStockQuery, [], (err, lowStockRows) => {
      if (err) {
        console.error('Error fetching low stock alerts:', err);
        return res.status(500).json({ error: err.message });
      }

      const alerts = [];

      // Add maintenance alerts
      maintenanceRows.forEach(tool => {
        const daysUntil = Math.ceil(tool.days_until_maintenance);
        let severity = 'info';
        let message = '';
        
        if (daysUntil <= 0) {
          severity = 'error';
          message = `${tool.tool_name} (${tool.tool_number}) maintenance is overdue`;
        } else if (daysUntil <= 1) {
          severity = 'warning';
          message = `${tool.tool_name} (${tool.tool_number}) requires maintenance tomorrow`;
        } else if (daysUntil <= 3) {
          severity = 'warning';
          message = `${tool.tool_name} (${tool.tool_number}) requires maintenance in ${daysUntil} days`;
        } else {
          severity = 'info';
          message = `${tool.tool_name} (${tool.tool_number}) requires maintenance in ${daysUntil} days`;
        }

        alerts.push({
          id: `maintenance-${tool.tool_number}`,
          type: 'maintenance',
          severity: severity,
          title: 'Maintenance Required',
          message: message,
          timestamp: new Date().toISOString(),
          data: {
            tool_number: tool.tool_number,
            tool_name: tool.tool_name,
            next_maintenance_date: tool.next_maintenance_date
          }
        });
      });

      // Add low stock alerts
      lowStockRows.forEach(part => {
        alerts.push({
          id: `low-stock-${part.part_number}`,
          type: 'inventory',
          severity: 'warning',
          title: 'Low Stock Alert',
          message: `${part.part_name} (${part.part_number}) is low on stock: ${part.stock_quantity}/${part.minimum_stock_level}`,
          timestamp: new Date().toISOString(),
          data: {
            part_number: part.part_number,
            part_name: part.part_name,
            stock_quantity: part.stock_quantity,
            minimum_stock_level: part.minimum_stock_level
          }
        });
      });

      // Add system update alert (this could be dynamic based on actual system version)
      alerts.push({
        id: 'system-update',
        type: 'system',
        severity: 'info',
        title: 'System Update Available',
        message: 'New features and performance improvements are ready for deployment.',
        timestamp: new Date().toISOString(),
        data: {
          version: '2.1.0',
          features: ['Enhanced inventory management', 'Improved reporting', 'Better performance']
        }
      });

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    });
  });
});

app.get('/api/system/maintenance-logs', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        type: 'maintenance',
        message: 'Database optimization completed',
        timestamp: '2025-10-18T10:00:00Z',
        level: 'info'
      }
    ]
  });
});

app.get('/api/system/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: 'connected',
      timestamp: new Date().toISOString()
    }
  });
});

app.post('/api/system/backup', (req, res) => {
  res.json({ success: true, message: 'Backup created successfully' });
});

// Get next tool number endpoint
app.get('/api/tools/next-number', (req, res) => {
  const { category } = req.query;
  
  // Get all tools and generate next number based on tool_id
  let query = 'SELECT tool_id FROM tools WHERE active = 1';
  let params = [];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY tool_id DESC LIMIT 1';
  
  db.get(query, params, (err, row) => {
    if (err) {
      console.error('Error getting next tool number:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const maxId = row?.tool_id || 0;
    const nextNumber = String(maxId + 1).padStart(3, '0');
    
    res.json({
      success: true,
      next_number: nextNumber
    });
  });
});

// ===== ORDER STATS ENDPOINTS =====

// Get order stats by providers
app.get('/api/orders/stats/by-providers', (req, res) => {
  console.log('📊 Fetching order stats by providers');
  
  const statsQuery = `
    SELECT 
      p.user_id as provider_id,
      p.first_name as provider_first_name,
      p.last_name as provider_last_name,
      p.company_name as provider_company_name,
      p.provider_code,
      COUNT(o.order_id) as total_orders,
      SUM(o.total_amount) as total_revenue,
      COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered_orders,
      COUNT(CASE WHEN o.status = 'shipped' THEN 1 END) as shipped_orders,
      COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders
    FROM users p
    LEFT JOIN orders o ON p.user_id = o.provider_id
    WHERE p.role = 'provider'
    GROUP BY p.user_id, p.first_name, p.last_name, p.company_name, p.provider_code
    ORDER BY total_revenue DESC
  `;
  
  db.all(statsQuery, [], (err, rows) => {
    if (err) {
      console.error('Error fetching provider stats:', err);
      return res.status(500).json({ error: 'Failed to fetch provider stats' });
    }
    
    console.log(`📊 Returning stats for ${rows?.length || 0} providers`);
    res.json({ providers: rows || [] });
  });
});

// Get sales management data
app.get('/api/orders/sales-management', (req, res) => {
  const { provider_id, payment_status, date_from, date_to } = req.query;
  console.log('📊 Fetching sales management data:', { provider_id, payment_status, date_from, date_to });
  
  let whereConditions = [];
  let params = [];
  
  if (provider_id) {
    whereConditions.push('o.provider_id = ?');
    params.push(provider_id);
  }
  
  if (payment_status) {
    whereConditions.push('o.payment_status = ?');
    params.push(payment_status);
  }
  
  if (date_from) {
    whereConditions.push('o.created_at >= ?');
    params.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('o.created_at <= ?');
    params.push(date_to);
  }
  
  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
  
  const salesQuery = `
    SELECT 
      o.*,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.email as customer_email_from_user,
      c.company_name as customer_company_name,
      p.first_name as provider_first_name,
      p.last_name as provider_last_name,
      p.email as provider_email,
      p.company_name as provider_company_name,
      p.provider_code as provider_code
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.user_id
    LEFT JOIN users p ON o.provider_id = p.user_id
    ${whereClause}
    ORDER BY o.created_at DESC
  `;
  
  db.all(salesQuery, params, (err, rows) => {
    if (err) {
      console.error('Error fetching sales management data:', err);
      return res.status(500).json({ error: 'Failed to fetch sales management data' });
    }
    
    console.log(`📊 Returning ${rows?.length || 0} sales records`);
    res.json({ orders: rows || [] });
  });
});

// ===== NOTIFICATION ENDPOINTS =====

// Get notifications for user
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await notificationService.getNotifications(req.user.user_id, req.user.role);
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    await notificationService.markAsRead(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Get unread notification count
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.user_id, req.user.role);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Create notification
app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { type, title, message, created_for, priority } = req.body;
    
    // Validate required fields
    if (!type || !title || !message || !priority) {
      return res.status(400).json({ error: 'Missing required fields: type, title, message, priority' });
    }
    
    // Create notification - pass as object
    await notificationService.createNotification({
      type,
      title,
      message,
      data: null,
      createdFor: created_for || null,
      priority
    });
    
    res.json({ message: 'Notification created successfully' });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ===== AUTOMATED REPORTING ENDPOINTS =====

// Get monthly reports history (Admin and Provider access)
app.get('/api/monthly-reports', authenticateToken, (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.user_id;

  // Allow both admin and provider access
  if (userRole !== 'admin' && userRole !== 'provider') {
    return res.status(403).json({ error: 'Admin or Provider access required' });
  }

  let sql;
  let params = [];

  if (userRole === 'admin') {
    // Admin can see all reports
    sql = `
      SELECT mr.*, u.username as generated_by_name
      FROM monthly_reports mr
      LEFT JOIN users u ON mr.generated_by = u.user_id
      ORDER BY mr.year DESC, mr.month DESC
    `;
  } else {
    // Provider can only see reports where they have invoices
    sql = `
      SELECT DISTINCT mr.*, u.username as generated_by_name
      FROM monthly_reports mr
      LEFT JOIN users u ON mr.generated_by = u.user_id
      LEFT JOIN provider_invoices pi ON mr.report_id = pi.report_id
      WHERE pi.provider_id = ?
      ORDER BY mr.year DESC, mr.month DESC
    `;
    params = [userId];
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching monthly reports:', err);
      return res.status(500).json({ error: 'Failed to fetch monthly reports' });
    }

    const reports = rows.map(row => ({
      ...row,
      report_data: row.report_data ? JSON.parse(row.report_data) : null
    }));

    res.json({ reports });
  });
});

// Get provider invoices for a specific report
app.get('/api/monthly-reports/:reportId/invoices', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const reportId = req.params.reportId;
  const sql = `
    SELECT pi.*, u.username as provider_name, u.company_name as provider_company
    FROM provider_invoices pi
    JOIN users u ON pi.provider_id = u.user_id
    WHERE pi.report_id = ?
    ORDER BY pi.provider_id
  `;

  db.all(sql, [reportId], (err, rows) => {
    if (err) {
      console.error('Error fetching provider invoices:', err);
      return res.status(500).json({ error: 'Failed to fetch provider invoices' });
    }

    res.json({ invoices: rows });
  });
});

// Manual trigger for monthly report generation
app.post('/api/monthly-reports/generate', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { month, year } = req.body;
  
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  try {
    console.log(`🔧 Manual monthly report generation triggered for ${month}/${year}`);
    await scheduler.triggerMonthlyReport(month, year);
    res.json({ success: true, message: `Monthly report generation started for ${month}/${year}` });
  } catch (error) {
    console.error('Error triggering monthly report:', error);
    res.status(500).json({ error: 'Failed to trigger monthly report generation' });
  }
});

// Download PDF invoice
app.get('/api/invoices/download/:filename', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'generated-invoices', filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Invoice file not found' });
  }

  res.download(filepath, filename, (err) => {
    if (err) {
      console.error('Error downloading invoice:', err);
      res.status(500).json({ error: 'Failed to download invoice' });
    }
  });
});

// ===== MISSING API ENDPOINTS =====

// Sales Management endpoint
app.get('/api/orders/sales-management', authenticateToken, (req, res) => {
  console.log('📊 Fetching sales management data');
  
  const { provider_id, payment_status, date_from, date_to } = req.query;
  
  let whereConditions = [];
  let params = [];
  
  if (provider_id) {
    whereConditions.push('o.provider_id = ?');
    params.push(provider_id);
  }
  
  if (payment_status) {
    whereConditions.push('o.payment_status = ?');
    params.push(payment_status);
  }
  
  if (date_from) {
    whereConditions.push('o.created_at >= ?');
    params.push(date_from);
  }
  
  if (date_to) {
    whereConditions.push('o.created_at <= ?');
    params.push(date_to);
  }
  
  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
  
  const salesQuery = `
    SELECT 
      o.*,
      c.first_name as customer_first_name,
      c.last_name as customer_last_name,
      c.email as customer_email_from_user,
      c.company_name as customer_company_name,
      p.first_name as provider_first_name,
      p.last_name as provider_last_name,
      p.email as provider_email,
      p.company_name as provider_company_name,
      p.provider_code as provider_code
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.user_id
    LEFT JOIN users p ON o.provider_id = p.user_id
    ${whereClause}
    ORDER BY o.created_at DESC
  `;
  
  db.all(salesQuery, params, (err, rows) => {
    if (err) {
      console.error('Error fetching sales management data:', err);
      return res.status(500).json({ error: 'Failed to fetch sales management data' });
    }
    
    console.log(`📊 Returning ${rows?.length || 0} sales records`);
    res.json({ orders: rows || [] });
  });
});

// Admin Provider Sets endpoint
app.get('/api/admin/provider-sets', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  console.log('🔍 Fetching admin provider sets');
  
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;
  
  let whereConditions = ['ps.provider_id IS NOT NULL'];
  let params = [];
  
  if (status && status !== 'all') {
    whereConditions.push('ps.admin_status = ?');
    params.push(status);
  }
  
  if (search) {
    whereConditions.push('(s.name LIKE ? OR s.description LIKE ? OR u.company_name LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  const whereClause = 'WHERE ' + whereConditions.join(' AND ');
  
  // Count total
  const countQuery = `
    SELECT COUNT(*) as total
    FROM provider_sets ps
    JOIN sets s ON ps.set_id = s.set_id
    LEFT JOIN users u ON ps.provider_id = u.user_id
    ${whereClause}
  `;
  
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      console.error('Error counting provider sets:', err);
      return res.status(500).json({ error: 'Failed to count provider sets' });
    }
    
    const total = countResult.total;
    const pages = Math.ceil(total / limit);
    
    // Fetch sets
    const setsQuery = `
      SELECT 
        ps.*,
        s.name as set_name,
        s.description as set_description,
        s.category,
        s.difficulty_level,
        s.base_price,
        u.first_name as provider_first_name,
        u.last_name as provider_last_name,
        u.company_name as provider_company_name,
        u.provider_code as provider_code,
        u.email as provider_email,
        COALESCE(psi.reserved_quantity, 0) as sys_comm_reserved,
        COALESCE(psi.used_quantity, 0) as sys_comm_used
      FROM provider_sets ps
      JOIN sets s ON ps.set_id = s.set_id
      LEFT JOIN users u ON ps.provider_id = u.user_id
      LEFT JOIN provider_set_inventory psi ON ps.provider_set_id = psi.provider_set_id AND psi.part_id = 60
      ${whereClause}
      ORDER BY ps.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(setsQuery, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error('Error fetching provider sets:', err);
        return res.status(500).json({ error: 'Failed to fetch provider sets' });
      }
      
      console.log(`🔍 Returning ${rows?.length || 0} provider sets`);
      res.json({
        provider_sets: rows || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: pages
        }
      });
    });
  });
});

// Admin Provider Sets Stats endpoint
app.get('/api/admin/provider-sets/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  console.log('📊 Fetching admin provider sets stats');
  
  const statsQuery = `
    SELECT 
      COUNT(*) as total_sets,
      COUNT(CASE WHEN ps.is_active = 1 THEN 1 END) as active_sets,
      COUNT(CASE WHEN ps.admin_status = 'on_hold' THEN 1 END) as on_hold_sets,
      COUNT(CASE WHEN ps.admin_status = 'disabled' THEN 1 END) as disabled_sets,
      COUNT(DISTINCT ps.provider_id) as total_providers
    FROM provider_sets ps
  `;
  
  db.get(statsQuery, [], (err, stats) => {
    if (err) {
      console.error('Error fetching provider sets stats:', err);
      return res.status(500).json({ error: 'Failed to fetch provider sets stats' });
    }
    
    console.log('📊 Provider sets stats:', stats);
    res.json({ stats });
  });
});

// Provider Payments Monthly Reports endpoint
app.get('/api/provider-payments/monthly-reports', authenticateToken, (req, res) => {
  console.log('📊 Fetching provider payments monthly reports');
  
  const reportsQuery = `
    SELECT 
      strftime('%Y-%m', created_at) as month_year,
      COUNT(*) as total_reports,
      SUM(total_amount) as total_amount
    FROM provider_payments
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month_year DESC
  `;
  
  db.all(reportsQuery, [], (err, rows) => {
    if (err) {
      console.error('Error fetching monthly reports:', err);
      return res.status(500).json({ error: 'Failed to fetch monthly reports' });
    }
    
    console.log(`📊 Returning ${rows?.length || 0} monthly reports`);
    res.json(rows || []);
  });
});

// Provider Payments Invoice endpoint
app.post('/api/provider-payments/invoice/:provider_id', authenticateToken, (req, res) => {
  console.log('📄 Generating provider invoice PDF');
  
  const { provider_id } = req.params;
  const { month, year } = req.body;
  
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }
  
  // Import PDFKit
  const PDFDocument = require('pdfkit');
  
  // Get provider payment data for the month
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')} 23:59:59`;
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const reportQuery = `
    SELECT 
      u.user_id as provider_id,
      u.username as provider_name,
      u.company_name as provider_company,
      u.email as provider_email,
      u.provider_markup_percentage,
      COUNT(o.order_id) as total_orders,
      SUM(o.total_amount) as total_revenue,
      CAST(SUM(o.total_amount) AS REAL) * (CAST(u.provider_markup_percentage AS REAL) / 100.0) as provider_payment,
      CAST(SUM(o.total_amount) AS REAL) * ((100.0 - CAST(u.provider_markup_percentage AS REAL)) / 100.0) as platform_fee_amount
    FROM orders o
    JOIN users u ON o.provider_id = u.user_id
    WHERE o.created_at >= ? AND o.created_at <= ?
      AND o.status IN ('shipped', 'delivered', 'payment_received')
      AND u.role = 'provider'
      AND o.set_type = 'provider'
      AND u.user_id = ?
    GROUP BY u.user_id, u.username, u.company_name, u.email, u.provider_markup_percentage
    HAVING total_orders > 0
  `;
  
  db.get(reportQuery, [startDateStr, endDateStr, provider_id], (err, provider) => {
    if (err) {
      console.error('Error generating invoice:', err);
      return res.status(500).json({ error: 'Failed to generate invoice' });
    }
    
    if (!provider) {
      return res.status(404).json({ error: 'No payment data found for this provider in the specified month' });
    }
    
    // Get company information from system settings
    db.all('SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?, ?, ?, ?, ?, ?)', 
      ['company_name', 'company_address', 'company_phone', 'company_email', 'company_website', 'company_tax_id'],
      (settingsErr, settings) => {
        if (settingsErr) {
          console.error('Error fetching company settings:', settingsErr);
        }
        
        // Create settings map
        const settingsMap = {};
        if (settings) {
          settings.forEach(s => {
            settingsMap[s.setting_key] = s.setting_value;
          });
        }
        
        const companyName = settingsMap['company_name'] || 'MakerSet Platform';
        const companyAddress = settingsMap['company_address'] || '123 Innovation Street, Tech City, TC 12345, Estonia';
        const companyPhone = settingsMap['company_phone'] || '+372 123 4567';
        const companyEmail = settingsMap['company_email'] || 'info@makerset.com';
        const companyWebsite = settingsMap['company_website'] || 'www.makerset.com';
        
        // Generate professional HTML invoice
        const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Provider Invoice - ${monthNames[month - 1]} ${year}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .company-info h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 28px;
        }
        .company-info p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
        }
        .invoice-details {
            text-align: right;
        }
        .invoice-details h2 {
            color: #e74c3c;
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        .invoice-details p {
            margin: 3px 0;
            color: #666;
            font-size: 14px;
        }
        .provider-info {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        .provider-info h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .provider-info p {
            margin: 3px 0;
            color: #666;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .summary-table th,
        .summary-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .summary-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        .summary-table .text-right {
            text-align: right;
        }
        .totals {
            margin-left: auto;
            width: 300px;
        }
        .totals table {
            width: 100%;
        }
        .totals td {
            padding: 8px 12px;
            border-bottom: 1px solid #ddd;
        }
        .totals .total-row {
            font-weight: bold;
            font-size: 16px;
            background-color: #f8f9fa;
        }
        .payment-info {
            margin-top: 30px;
            padding: 20px;
            background-color: #e8f5e8;
            border-radius: 5px;
            border-left: 4px solid #27ae60;
        }
        .payment-info h3 {
            margin: 0 0 10px 0;
            color: #27ae60;
        }
        .payment-info p {
            margin: 3px 0;
            color: #2c3e50;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                <h1>${companyName}</h1>
                <p>${companyAddress}</p>
                <p>Phone: ${companyPhone} | Email: ${companyEmail}</p>
                <p>Website: ${companyWebsite}</p>
            </div>
            <div class="invoice-details">
                <h2>PROVIDER PAYMENT INVOICE</h2>
                <p><strong>Period:</strong> ${monthNames[month - 1]} ${year}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        
        <div class="provider-info">
            <h3>Provider Information</h3>
            <p><strong>${provider.provider_company || provider.provider_name}</strong></p>
            <p>Email: ${provider.provider_email}</p>
        </div>
        
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total Orders</td>
                    <td class="text-right">${provider.total_orders}</td>
                </tr>
                <tr>
                    <td>Total Revenue</td>
                    <td class="text-right">€${parseFloat(provider.total_revenue).toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Platform Fee (${100 - provider.provider_markup_percentage}%)</td>
                    <td class="text-right">€${parseFloat(provider.platform_fee_amount).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="totals">
            <table>
                <tr class="total-row">
                    <td>Payment Due:</td>
                    <td class="text-right">€${parseFloat(provider.provider_payment).toFixed(2)}</td>
                </tr>
            </table>
        </div>
        
        <div class="payment-info">
            <h3>Payment Information</h3>
            <p><strong>Amount Due:</strong> €${parseFloat(provider.provider_payment).toFixed(2)}</p>
            <p><strong>Payment Period:</strong> ${monthNames[month - 1]} ${year}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="footer">
            <p>Thank you for partnering with ${companyName}!</p>
            <p>If you have any questions, please contact us at ${companyEmail}</p>
        </div>
    </div>
</body>
</html>
    `;
    
        // Return as HTML (can be printed to PDF)
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `inline; filename="invoice-${provider.provider_company || 'provider'}-${monthNames[month - 1]}-${year}.html"`);
        res.send(invoiceHTML);
      });
    });
});

// Provider Payments Notification endpoint (sends in-app notifications to providers)
app.post('/api/provider-payments/email-invoice/:provider_id', authenticateToken, async (req, res) => {
  console.log('🔔 Sending provider payment notification to dashboard');
  
  const { provider_id } = req.params;
  const { month, year } = req.body;
  
  if (!provider_id || !month || !year) {
    return res.status(400).json({ error: 'Provider ID, month and year are required' });
  }
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  return new Promise((resolve, reject) => {
    // Get provider details
    db.get('SELECT user_id, username, email, company_name FROM users WHERE user_id = ? AND role = ?', [provider_id, 'provider'], (err, provider) => {
      if (err) {
        console.error('Error fetching provider:', err);
        return reject(res.status(500).json({ error: 'Failed to fetch provider details' }));
      }
      
      if (!provider) {
        return reject(res.status(404).json({ error: 'Provider not found' }));
      }
      
      // Get monthly report data for this provider
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')} 23:59:59`;
      
      const reportQuery = `
        SELECT 
          COUNT(o.order_id) as total_orders,
          SUM(o.total_amount) as total_revenue,
          CAST(SUM(o.total_amount) AS REAL) * (CAST(u.provider_markup_percentage AS REAL) / 100.0) as provider_payment,
          CAST(SUM(o.total_amount) AS REAL) * ((100.0 - CAST(u.provider_markup_percentage AS REAL)) / 100.0) as platform_fee_amount
        FROM orders o
        JOIN users u ON o.provider_id = u.user_id
        WHERE o.created_at >= ? AND o.created_at <= ?
          AND o.status IN ('shipped', 'delivered', 'payment_received')
          AND u.role = 'provider'
          AND o.set_type = 'provider'
          AND u.user_id = ?
        GROUP BY u.user_id, u.provider_markup_percentage
      `;
      
      db.get(reportQuery, [startDateStr, endDateStr, provider_id], (err, reportData) => {
        if (err) {
          console.error('Error fetching report data:', err);
          return reject(res.status(500).json({ error: 'Failed to fetch report data' }));
        }
        
        if (!reportData || reportData.total_orders === 0) {
          return reject(res.status(404).json({ error: 'No payment data found for this provider in the specified month' }));
        }
        
        // Create notification for provider
        const notificationTitle = `💰 Payment Report - ${monthNames[month - 1]} ${year}`;
        const notificationMessage = `Your payment report for ${monthNames[month - 1]} ${year} is ready. Revenue: €${parseFloat(reportData.total_revenue).toFixed(2)}, Payment Due: €${parseFloat(reportData.provider_payment).toFixed(2)}`;
        
        db.run('INSERT INTO system_notifications (created_for, title, message, type, is_read, priority, created_at) VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)', 
          [provider_id, notificationTitle, notificationMessage, 'payment_report', 'high'], 
          (err) => {
            if (err) {
              console.error('Error creating notification:', err);
              return reject(res.status(500).json({ error: 'Failed to create notification' }));
            }
            
            console.log(`✅ Notification sent to provider ${provider_id} for ${monthNames[month - 1]} ${year}`);
            resolve(res.json({ 
              success: true,
              message: 'Payment report notification sent to provider',
              provider_id: provider_id,
              month: monthNames[month - 1],
              year: year,
              payment_amount: parseFloat(reportData.provider_payment).toFixed(2)
            }));
          }
        );
      });
    });
  });
});

// ===== SYSTEM SETTINGS ENDPOINTS =====

// Get system setting
app.get('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  
  const query = 'SELECT * FROM system_settings WHERE setting_key = ?';
  
  db.get(query, [key], (err, row) => {
    if (err) {
      console.error('Error fetching setting:', err);
      return res.status(500).json({ error: 'Failed to fetch setting' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    // Return both the full setting object and the value for convenience
    res.json({ 
      setting: row,
      value: row.setting_value,
      setting_value: row.setting_value
    });
  });
});

// Update system setting
app.put('/api/settings/:key', authenticateToken, (req, res) => {
  const { key } = req.params;
  const { value, type, description } = req.body;
  
  // Check if setting exists
  db.get('SELECT * FROM system_settings WHERE setting_key = ?', [key], (err, existing) => {
    if (err) {
      console.error('Error checking setting:', err);
      return res.status(500).json({ error: 'Failed to check setting' });
    }
    
    // Convert value to string if it's not already
    const stringValue = typeof value === 'string' ? value : String(value);
    
    const updateQuery = existing
      ? 'UPDATE system_settings SET setting_value = ?, setting_type = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?'
      : 'INSERT INTO system_settings (setting_key, setting_value, setting_type, description, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)';
    
    const params = existing
      ? [stringValue, type || 'string', key]
      : [key, stringValue, type || 'string', description || ''];
    
    db.run(updateQuery, params, function(err) {
      if (err) {
        console.error('Error updating setting:', err);
        return res.status(500).json({ error: 'Failed to update setting' });
      }
      
      console.log(`✅ Setting ${key} updated to: ${stringValue}`);
      
      // If this is the automatic_report_enabled setting, restart the scheduler
      if (key === 'automatic_report_enabled' && scheduler) {
        if (stringValue === 'true' && !scheduler.isRunning) {
          scheduler.start();
        } else if (stringValue === 'false' && scheduler.isRunning) {
          scheduler.stop();
        }
      }
      
      res.json({ message: 'Setting updated successfully', setting: { key, value: stringValue } });
    });
  });
});

// Get all settings (admin only)
app.get('/api/settings', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  db.all('SELECT * FROM system_settings ORDER BY setting_key', [], (err, rows) => {
    if (err) {
      console.error('Error fetching settings:', err);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
    
    res.json({ settings: rows || [] });
  });
});

// =============================================================================
// SOCIAL SHARING & REWARDS API
// =============================================================================

// Track social share
app.post('/api/social-shares/track', authenticateToken, (req, res) => {
  const { set_id, platform } = req.body;
  const user_id = req.user.user_id;
  
  if (!set_id || !platform) {
    return res.status(400).json({ error: 'set_id and platform are required' });
  }
  
  // Fraud prevention: Check if user already shared this exact set/platform combination in the last hour
  db.get(
    `SELECT share_id FROM social_shares 
     WHERE user_id = ? AND set_id = ? AND platform = ? 
     AND created_at > datetime('now', '-1 hour')`,
    [user_id, set_id, platform],
    (err, existingShare) => {
      if (err) {
        console.error('Error checking for duplicate share:', err);
        return res.status(500).json({ error: 'Failed to verify share' });
      }
      
      // Prevent duplicate shares within 1 hour
      if (existingShare) {
        return res.status(400).json({ 
          error: 'You already shared this on this platform recently',
          duplicate: true,
          message: 'Please wait 1 hour before sharing this set on this platform again'
        });
      }
      
      // Additional fraud check: Rate limiting - max 10 shares per hour per user
      db.get(
        `SELECT COUNT(*) as share_count FROM social_shares 
         WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`,
        [user_id],
        (err, rateCheck) => {
          if (err) {
            console.error('Error checking rate limit:', err);
            return res.status(500).json({ error: 'Failed to verify share rate' });
          }
          
          if (rateCheck && rateCheck.share_count >= 10) {
            return res.status(429).json({ 
              error: 'Too many shares',
              message: 'You can only share 10 items per hour. Please wait and try again.'
            });
          }
          
          // Insert share record
          db.run(
            'INSERT INTO social_shares (set_id, user_id, platform) VALUES (?, ?, ?)',
            [set_id, user_id, platform],
            function(err) {
              if (err) {
                console.error('Error tracking share:', err);
                return res.status(500).json({ error: 'Failed to track share' });
              }
              
              // Check if user can claim reward (share 3 different sets on actual social platforms)
              // Exclude 'copy' and 'email' platforms from reward eligibility
              db.get(
                `SELECT COUNT(DISTINCT set_id) as share_count 
                 FROM social_shares 
                 WHERE user_id = ? AND reward_claimed = 0
                 AND platform NOT IN ('copy', 'email')`,
                [user_id],
                (err, row) => {
                  if (err) {
                    console.error('Error checking share count:', err);
                    return res.json({ 
                      success: true, 
                      share_id: this.lastID,
                      reward_eligible: false 
                    });
                  }
                  
                  const reward_eligible = row.share_count >= 3;
                  const counts_toward_reward = platform !== 'copy' && platform !== 'email';
                  
                  res.json({ 
                    success: true, 
                    share_id: this.lastID,
                    reward_eligible: reward_eligible,
                    shares_this_month: row.share_count,
                    counts_toward_reward: counts_toward_reward
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get user's share statistics
app.get('/api/social-shares/stats', authenticateToken, (req, res) => {
  const user_id = req.user.user_id;
  
  db.get(
    `SELECT 
      COUNT(*) as total_shares,
      COUNT(DISTINCT set_id) as unique_sets_shared,
      COUNT(CASE WHEN reward_claimed = 1 THEN 1 END) as rewards_claimed,
      COUNT(CASE WHEN reward_claimed = 0 AND set_id IN (
        SELECT set_id FROM social_shares 
        WHERE user_id = ? AND platform NOT IN ('copy', 'email')
        GROUP BY set_id HAVING COUNT(*) > 0
      ) THEN 1 END) as reward_eligible
     FROM social_shares 
     WHERE user_id = ? AND platform NOT IN ('copy', 'email')`,
    [user_id, user_id],
    (err, row) => {
      if (err) {
        console.error('Error fetching share stats:', err);
        return res.status(500).json({ error: 'Failed to fetch share statistics' });
      }
      
      res.json({ 
        stats: {
          total_shares: row.total_shares,
          unique_sets_shared: row.unique_sets_shared,
          rewards_claimed: row.rewards_claimed,
          reward_eligible: row.reward_eligible >= 3,
          shares_needed_for_reward: Math.max(0, 3 - (row.unique_sets_shared || 0))
        }
      });
    }
  );
});

// Get set share count
app.get('/api/social-shares/count/:set_id', (req, res) => {
  const { set_id } = req.params;
  
  db.get(
    'SELECT COUNT(*) as share_count FROM social_shares WHERE set_id = ?',
    [set_id],
    (err, row) => {
      if (err) {
        console.error('Error fetching share count:', err);
        return res.status(500).json({ error: 'Failed to fetch share count' });
      }
      
      res.json({ count: row.share_count || 0 });
    }
  );
});

// Claim reward
app.post('/api/social-shares/claim-reward', authenticateToken, (req, res) => {
  const user_id = req.user.user_id;
  
  // Check if user is eligible (shared at least 3 different sets)
  db.get(
    `SELECT COUNT(DISTINCT set_id) as unique_shares 
     FROM social_shares 
     WHERE user_id = ? AND reward_claimed = 0`,
    [user_id],
    (err, row) => {
      if (err) {
        console.error('Error checking eligibility:', err);
        return res.status(500).json({ error: 'Failed to check eligibility' });
      }
      
      if (row.unique_shares < 3) {
        return res.status(400).json({ 
          error: 'Not eligible for reward yet',
          shares_needed: 3 - row.unique_shares 
        });
      }
      
      // Check if already claimed
      db.get(
        'SELECT COUNT(*) as claim_count FROM social_shares WHERE user_id = ? AND reward_claimed = 1',
        [user_id],
        (err, claimRow) => {
          if (err) {
            console.error('Error checking claims:', err);
            return res.status(500).json({ error: 'Failed to check claims' });
          }
          
          if (claimRow.claim_count > 0) {
            return res.status(400).json({ error: 'Reward already claimed' });
          }
          
          // Mark as claimed and issue reward
          db.run(
            `UPDATE social_shares 
             SET reward_claimed = 1, reward_type = 'discount', reward_amount = 5.00 
             WHERE user_id = ? AND reward_claimed = 0 
             LIMIT 3`,
            [user_id],
            function(updateErr) {
              if (updateErr) {
                console.error('Error claiming reward:', updateErr);
                return res.status(500).json({ error: 'Failed to claim reward' });
              }
              
              // Add €5 credits to user account
              db.run(
                `UPDATE users SET credits_balance = COALESCE(credits_balance, 0) + 5.00 WHERE user_id = ?`,
                [user_id],
                function(creditErr) {
                  if (creditErr) {
                    console.error('Error adding credits:', creditErr);
                    return res.status(500).json({ error: 'Failed to add credits' });
                  }
                  
                  // Record the transaction
                  db.run(
                    `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
                     VALUES (?, 5.00, 'reward_earned', 'Social share reward - Shared 3 sets')`,
                    [user_id],
                    function(transactionErr) {
                      if (transactionErr) {
                        console.error('Error recording transaction:', transactionErr);
                      }
                      
                      res.json({ 
                        success: true, 
                        credits_added: 5.00,
                        message: '🎉 You earned €5 credits! They will be automatically applied on your next order.'
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get social share statistics (admin only)
app.get('/api/social-shares/admin-stats', authenticateToken, (req, res) => {
  const userRole = req.user.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Get total shares
  db.get('SELECT COUNT(*) as total_shares FROM social_shares', [], (err, shareRow) => {
    if (err) {
      console.error('Error fetching total shares:', err);
      return res.status(500).json({ error: 'Failed to fetch share statistics' });
    }
    
    // Get active sharers
    db.get('SELECT COUNT(DISTINCT user_id) as active_sharers FROM social_shares', [], (err, sharerRow) => {
      if (err) {
        console.error('Error fetching active sharers:', err);
        return res.status(500).json({ error: 'Failed to fetch share statistics' });
      }
      
      // Get rewards claimed
      db.get('SELECT COUNT(DISTINCT user_id) as rewards_claimed FROM social_shares WHERE reward_claimed = 1', [], (err, rewardRow) => {
        if (err) {
          console.error('Error fetching rewards:', err);
          return res.status(500).json({ error: 'Failed to fetch share statistics' });
        }
        
        // Get platform statistics
        db.all(
          `SELECT platform, COUNT(*) as count 
           FROM social_shares 
           GROUP BY platform 
           ORDER BY count DESC`,
          [],
          (err, platformRows) => {
            if (err) {
              console.error('Error fetching platform stats:', err);
              return res.status(500).json({ error: 'Failed to fetch share statistics' });
            }
            
            const platform_stats = {};
            platformRows.forEach(row => {
              platform_stats[row.platform] = row.count;
            });
            
            // Get top shared sets
            db.all(
              `SELECT s.set_id, s.name, s.category, COUNT(*) as share_count
               FROM social_shares ss
               JOIN sets s ON ss.set_id = s.set_id
               GROUP BY s.set_id
               ORDER BY share_count DESC
               LIMIT 10`,
              [],
              (err, topSets) => {
                if (err) {
                  console.error('Error fetching top sets:', err);
                  return res.status(500).json({ error: 'Failed to fetch share statistics' });
                }
                
                res.json({
                  total_shares: shareRow.total_shares || 0,
                  active_sharers: sharerRow.active_sharers || 0,
                  rewards_claimed: rewardRow.rewards_claimed || 0,
                  platform_stats: platform_stats,
                  top_shared_sets: topSets || []
                });
              }
            );
          }
        );
      });
    });
  });
});

// Get user's credit balance
app.get('/api/user-credits', authenticateToken, (req, res) => {
  const user_id = req.user.user_id;
  
  db.get(
    `SELECT COALESCE(credits_balance, 0) as balance FROM users WHERE user_id = ?`,
    [user_id],
    (err, row) => {
      if (err) {
        console.error('Error fetching credits:', err);
        return res.status(500).json({ error: 'Failed to fetch credits' });
      }
      
      res.json({ 
        balance: parseFloat(row.balance || 0),
        currency: 'EUR' 
      });
    }
  );
});

// Get user's credit transaction history
app.get('/api/user-credits/transactions', authenticateToken, (req, res) => {
  const user_id = req.user.user_id;
  
  db.all(
    `SELECT * FROM credit_transactions 
     WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [user_id],
    (err, rows) => {
      if (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ error: 'Failed to fetch transactions' });
      }
      
      res.json({ transactions: rows || [] });
    }
  );
});

// Apply discount code
app.post('/api/apply-discount', authenticateToken, (req, res) => {
  const { code } = req.body;
  const user_id = req.user.user_id;
  
  if (!code) {
    return res.status(400).json({ error: 'Discount code is required' });
  }
  
  db.get(
    `SELECT * FROM user_discounts 
     WHERE discount_code = ? AND user_id = ? AND status = 'active' 
     AND (expires_at IS NULL OR expires_at > datetime('now'))`,
    [code, user_id],
    (err, row) => {
      if (err) {
        console.error('Error validating discount:', err);
        return res.status(500).json({ error: 'Failed to validate discount' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Invalid or expired discount code' });
      }
      
      res.json({ 
        valid: true, 
        discount_amount: row.discount_amount,
        discount_code: row.discount_code 
      });
    }
  );
});

// ========== CART RESERVATION API ==========

// Reserve stock for cart items
app.post('/api/cart/reserve', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  const { set_id, quantity } = req.body;
  
  if (!set_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Set ID and valid quantity required' });
  }
  
  // Expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  
  // Check if stock is available (excluding other reservations)
  db.all(`SELECT sp.part_id, sp.quantity as required_quantity, 
          p.stock_quantity - COALESCE(SUM(cr.quantity), 0) as available_stock
          FROM set_parts sp
          JOIN parts p ON sp.part_id = p.part_id
          LEFT JOIN cart_reservations cr ON cr.set_id = ? AND cr.expires_at > datetime('now')
          WHERE sp.set_id = ? AND sp.is_optional = 0
          GROUP BY sp.part_id`, [set_id, set_id], (err, parts) => {
    if (err) {
      console.error('Error checking stock:', err);
      return res.status(500).json({ error: 'Failed to check stock availability' });
    }
    
    // Check if enough stock available
    const minAvailable = Math.min(...parts.map(p => Math.floor((p.available_stock || 0) / p.required_quantity)));
    
    if (minAvailable < quantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock', 
        available: minAvailable,
        requested: quantity 
      });
    }
    
    // Create reservation
    db.run('INSERT INTO cart_reservations (user_id, set_id, quantity, expires_at) VALUES (?, ?, ?, ?)',
      [userId, set_id, quantity, expiresAt], function(err) {
        if (err) {
          console.error('Error creating reservation:', err);
          return res.status(500).json({ error: 'Failed to reserve stock' });
        }
        
        res.json({ 
          success: true, 
          reservation_id: this.lastID,
          expires_at: expiresAt 
        });
      }
    );
  });
});

// Release cart reservations
app.delete('/api/cart/reservations', authenticateToken, (req, res) => {
  const userId = req.user.user_id;
  
  db.run('DELETE FROM cart_reservations WHERE user_id = ?', [userId], function(err) {
    if (err) {
      console.error('Error releasing reservations:', err);
      return res.status(500).json({ error: 'Failed to release reservations' });
    }
    
    res.json({ success: true, released: this.changes });
  });
});

// Cleanup expired reservations (run every minute)
setInterval(() => {
  db.run('DELETE FROM cart_reservations WHERE expires_at < datetime("now")', (err) => {
    if (!err) {
      console.log('🧹 Cleaned up expired cart reservations');
    }
  });
}, 60 * 1000); // Run every minute

// ========== END CART RESERVATION API ==========

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple SQLite server running on port ${PORT}`);
  console.log(`🌍 Environment: development`);
  console.log(`🔗 CORS Origin: http://localhost:3000`);
  console.log(`📊 Database: SQLite (${dbPath})`);
  console.log(`📅 Automated scheduler started`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('✅ Database closed');
    }
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('✅ Database closed');
    }
    process.exit(0);
  });
});
