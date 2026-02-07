const express = require('express');
const router = express.Router();

/**
 * GET /api/notifications
 * List notifications. Client expects { notifications: [] }.
 */
router.get('/', (req, res) => {
  res.json({ notifications: [] });
});

/**
 * GET /api/notifications/unread-count
 * Unread count. Client expects { count: number }.
 */
router.get('/unread-count', (req, res) => {
  res.json({ count: 0 });
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read. Stub: returns success.
 */
router.put('/:id/read', (req, res) => {
  res.json({ success: true });
});

/**
 * POST /api/notifications
 * Create notification. Stub: returns success.
 */
router.post('/', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
