const express = require('express');
const router = express.Router();
const connectionManager = require('../utils/sqliteConnectionManager');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/user-credits
 * Return current user's credit balance. Returns 0 if users.credits_balance does not exist.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not found in token' });
    }
    let balance = 0;
    try {
      const result = await connectionManager.query(
        'SELECT COALESCE(credits_balance, 0) AS balance FROM users WHERE user_id = ?',
        [userId]
      );
      const row = result.rows && result.rows[0];
      balance = row != null ? parseFloat(row.balance) || 0 : 0;
    } catch (_) {
      // credits_balance column may not exist; return 0
    }
    res.json({ balance, currency: 'EUR' });
  } catch (err) {
    console.error('Error fetching user credits:', err);
    res.status(500).json({ balance: 0, currency: 'EUR' });
  }
});

/**
 * GET /api/user-credits/transactions
 * Return current user's credit transaction history. Returns [] if no credit_transactions table.
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.userId;
    if (!userId) {
      return res.status(401).json({ transactions: [] });
    }
    let transactions = [];
    try {
      const result = await connectionManager.query(
        'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      transactions = result.rows || [];
    } catch (_) {
      // credit_transactions table may not exist
    }
    res.json({ transactions });
  } catch (err) {
    console.error('Error fetching credit transactions:', err);
    res.status(500).json({ transactions: [] });
  }
});

module.exports = router;
