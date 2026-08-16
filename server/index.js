const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import error handling and connection management
const globalErrorHandler = require('./middleware/globalErrorHandler');
const connectionManager = require('./utils/sqliteConnectionManager');
const { startup } = require('./scripts/startup');

const app = express();
const PORT = process.env.PORT || 5001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
// Base URL for file links (uploads, media). Set PUBLIC_URL in production (e.g. https://api.yourdomain.com).
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');
app.set('baseUrl', PUBLIC_URL);
app.set('uploadsDir', UPLOADS_DIR);

function isAllowedCorsOrigin(origin) {
  if (!origin) return true;
  const allowed = String(CORS_ORIGIN)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowed.includes('*') || allowed.includes(origin)) return true;
  // Netlify production site + deploy previews (e.g. https://abc123--maker-set.netlify.app)
  if (/^https:\/\/([a-z0-9-]+--)?[a-z0-9-]+\.netlify\.app$/i.test(origin)) return true;
  return false;
}

function resolveCorsOrigin(origin, callback) {
  if (process.env.NODE_ENV !== 'production') {
    return callback(null, true);
  }
  if (isAllowedCorsOrigin(origin)) {
    return callback(null, true);
  }
  return callback(new Error(`CORS blocked for origin: ${origin}`));
}

// Security middleware (CSP allows API origin so media and API calls work when frontend is on another host)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', PUBLIC_URL],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      connectSrc: ['\'self\'', PUBLIC_URL]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 10000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: resolveCorsOrigin,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(UPLOADS_DIR));

// Initialize application and apply public_url from DB if set
startup().then(async (results) => {
  console.log('🎉 Application startup completed');
  console.log('📊 Startup Results:', results);
  try {
    const { rows } = await connectionManager.query('SELECT setting_value FROM system_settings WHERE setting_key = ?', ['public_url']);
    if (rows && rows[0] && rows[0].setting_value) {
      const url = String(rows[0].setting_value).trim().replace(/\/$/, '');
      app.set('baseUrl', url);
      console.log('📡 Base URL set from settings:', url);
    }
  } catch (e) {
    // ignore; keep env default
  }
}).catch((error) => {
  console.error('❌ Application startup failed:', error);
  process.exit(1);
});

// Routes - All SQLite Compatible
app.use('/api/health', require('./routes/health'));
app.use('/api/sets', require('./routes/sets-sqlite'));
app.use('/api/shop-sets', require('./routes/shop-sets-sqlite'));
app.use('/api/parts', require('./routes/parts-sqlite'));
app.use('/api/set-parts', require('./routes/set-parts-sqlite'));
app.use('/api/set-tools', require('./routes/set-tools-sqlite'));
app.use('/api/receipts', require('./routes/receipts-sqlite'));
app.use('/api/languages', require('./routes/languages-sqlite'));
app.use('/api/instructions', require('./routes/instructions-sqlite'));
app.use('/api/media', require('./routes/media'));
app.use('/api/tools', require('./routes/tools-sqlite'));
app.use('/api/ratings', require('./routes/ratings-sqlite'));
app.use('/api/favorites', require('./routes/favorites-sqlite'));
app.use('/api/cart', require('./routes/cart-sqlite'));

// Authentication and User Management Routes - All SQLite Compatible
app.use('/api/users', require('./routes/users-sqlite'));
app.use('/api/user-credits', require('./routes/user-credits-sqlite'));
app.use('/api/social-shares', require('./routes/social-shares-sqlite'));
app.use('/api/orders', require('./routes/orders-sqlite'));
app.use('/api/monthly-reports', require('./routes/monthly-reports-sqlite'));
app.use('/api/notifications', require('./routes/notifications-sqlite'));
app.use('/api/invoices', require('./routes/invoices-sqlite'));
app.use('/api/provider-sets', require('./routes/provider-sets-sqlite'));
app.use('/api/provider-payments', require('./routes/provider-payments-sqlite'));
app.use('/api/messages', require('./routes/messages-sqlite'));

// AI-Powered Features
app.use('/api/inventory', require('./routes/inventory-sqlite'));
app.use('/api/ai/inventory', require('./routes/ai-inventory'));
app.use('/api/ai/set-builder', require('./routes/ai-set-builder'));
app.use('/api/ai/translate', require('./routes/ai-translation'));
app.use('/api/ai/naming', require('./routes/ai-naming'));
app.use('/api/auth', require('./routes/auth-sqlite'));

// Dashboard
app.use('/api/dashboard', require('./routes/dashboard-simple'));
app.use('/api/system', require('./routes/system-settings'));

// System settings bulk (SystemSettings page expects GET /api/system-settings -> { settings: {...} })
app.get('/api/system-settings', async (req, res) => {
  try {
    const connectionManager = require('./utils/sqliteConnectionManager');
    const { rows } = await connectionManager.query('SELECT setting_key, setting_value, setting_type FROM system_settings', []);
    const port = process.env.PORT || 5001;
    const defaults = {
      shipping_handling_cost: 15,
      minimum_order_amount: 0,
      free_shipping_threshold: 0,
      currency: 'EUR',
      tax_rate: 0,
      automatic_report_enabled: true,
      social_share_required: 3,
      social_share_reward_amount: 5,
      social_share_message: '📱 Share 3 sets & get €5 off!',
      credit_validity_days: 90,
      default_provider_set_visible: true,
      public_url: process.env.PUBLIC_URL || `http://localhost:${port}`,
    };
    const settings = { ...defaults };
    (rows || []).forEach((row) => {
      let value = row.setting_value;
      const type = (row.setting_type || 'string').toLowerCase();
      if (type === 'number') value = parseFloat(value) || 0;
      else if (type === 'boolean') value = value === '1' || value === 'true' || value === true;
      settings[row.setting_key] = value;
    });
    res.json({ settings });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    const port = process.env.PORT || 5001;
    res.status(500).json({
      settings: {
        shipping_handling_cost: 15,
        minimum_order_amount: 0,
        free_shipping_threshold: 0,
        currency: 'EUR',
        tax_rate: 0,
        automatic_report_enabled: true,
        social_share_required: 3,
        social_share_reward_amount: 5,
        social_share_message: '📱 Share 3 sets & get €5 off!',
        credit_validity_days: 90,
        default_provider_set_visible: true,
        public_url: process.env.PUBLIC_URL || `http://localhost:${port}`,
      },
    });
  }
});

// Public settings endpoint (for shipping cost, etc.)
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const connectionManager = require('./utils/sqliteConnectionManager');
    
    const query = 'SELECT * FROM system_settings WHERE setting_key = ?';
    const { rows } = await connectionManager.query(query, [key]);
    
    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        setting: null,
        value: null,
        setting_value: null
      });
    }

    const row = rows[0];
    res.json({ 
      success: true,
      setting: row,
      value: row.setting_value,
      setting_value: row.setting_value
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch setting',
      details: error.message
    });
  }
});

// Update a single setting by key (for SystemSettingsDialog save)
app.put('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, type = 'string' } = req.body || {};
    const connectionManager = require('./utils/sqliteConnectionManager');

    const sql = `
      INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        setting_type = excluded.setting_type,
        updated_at = datetime('now')
    `;
    await connectionManager.run(sql, [key, value != null ? String(value) : '', type]);
    if (key === 'public_url' && value) {
      const url = String(value).trim().replace(/\/$/, '');
      app.set('baseUrl', url);
    }
    res.json({ success: true, key, value: value != null ? String(value) : '', type });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update setting',
      details: error.message
    });
  }
});

// Admin Management Routes
app.use('/api/admin/provider-sets', require('./routes/admin-provider-sets'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: {
      message: 'Route not found',
      statusCode: 404,
      path: req.originalUrl,
      method: req.method,
    }
  });
});

// Global error handler (must be last)
app.use(globalErrorHandler);

// Graceful shutdown handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origin: ${CORS_ORIGIN}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  await connectionManager.shutdown();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await connectionManager.shutdown();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
