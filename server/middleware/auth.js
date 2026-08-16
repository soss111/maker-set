const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-here', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Normalize JWT claims: tokens use userId; many routes expect user_id
    const userId = user.userId ?? user.user_id ?? user.id;
    req.user = {
      ...user,
      userId,
      user_id: userId,
    };
    next();
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is admin or the user themselves
const requireAdminOrSelf = (req, res, next) => {
  const userId = parseInt(req.params.userId || req.params.id);
  const tokenUserId = req.user.user_id ?? req.user.userId;
  if (!req.user || (req.user.role !== 'admin' && tokenUserId !== userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// Middleware to check if user has required role
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAdminOrSelf,
  requireRole
};