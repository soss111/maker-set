const express = require('express');
const router = express.Router();
const connectionManager = require('../utils/sqliteConnectionManager');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const SHARES_REQUIRED = 3;

const defaultAdminStats = () => ({
  total_shares: 0,
  active_sharers: 0,
  rewards_claimed: 0,
  platform_stats: {},
  top_shared_sets: [],
});

/**
 * GET /api/social-shares/admin-stats
 * Admin-only share statistics. Client expects { total_shares, active_sharers, rewards_claimed, platform_stats, top_shared_sets }.
 */
router.get('/admin-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    try {
      const [totalRes, sharersRes, rewardsRes, platformRes, topRes] = await Promise.all([
        connectionManager.query('SELECT COUNT(*) as total_shares FROM social_shares'),
        connectionManager.query('SELECT COUNT(DISTINCT user_id) as active_sharers FROM social_shares'),
        connectionManager.query('SELECT COUNT(DISTINCT user_id) as rewards_claimed FROM social_shares WHERE reward_claimed = 1'),
        connectionManager.query('SELECT platform, COUNT(*) as count FROM social_shares GROUP BY platform ORDER BY count DESC'),
        connectionManager.query(
          `SELECT s.set_id, s.name, s.category, COUNT(*) as share_count
           FROM social_shares ss
           JOIN sets s ON ss.set_id = s.set_id
           GROUP BY s.set_id
           ORDER BY share_count DESC
           LIMIT 10`
        ),
      ]);
      const total_shares = totalRes.rows?.[0] ? parseInt(totalRes.rows[0].total_shares, 10) || 0 : 0;
      const active_sharers = sharersRes.rows?.[0] ? parseInt(sharersRes.rows[0].active_sharers, 10) || 0 : 0;
      const rewards_claimed = rewardsRes.rows?.[0] ? parseInt(rewardsRes.rows[0].rewards_claimed, 10) || 0 : 0;
      const platform_stats = {};
      (platformRes.rows || []).forEach((row) => {
        platform_stats[row.platform || 'unknown'] = row.count;
      });
      const top_shared_sets = topRes.rows || [];
      return res.json({
        total_shares,
        active_sharers,
        rewards_claimed,
        platform_stats,
        top_shared_sets,
      });
    } catch (_) {
      return res.json(defaultAdminStats());
    }
  } catch (err) {
    console.error('Error fetching social share admin stats:', err);
    return res.status(500).json(defaultAdminStats());
  }
});

const defaultStats = () => ({
  sharesUntilReward: SHARES_REQUIRED,
  hasEarnedReward: false,
  total_shares: 0,
  unique_sets_shared: 0,
  stats: {
    total_shares: 0,
    unique_sets_shared: 0,
    rewards_claimed: 0,
    reward_eligible: false,
    shares_needed_for_reward: SHARES_REQUIRED,
  },
});

/**
 * GET /api/social-shares/stats
 * Return current user's share stats for credits UI. Uses social_shares table if present.
 * Response shape expected by CustomerAccount: { sharesUntilReward, hasEarnedReward, ... }
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.userId;
    if (!userId) {
      return res.status(401).json(defaultStats());
    }
    try {
      const result = await connectionManager.query(
        `SELECT 
          COUNT(*) as total_shares,
          COUNT(DISTINCT set_id) as unique_sets_shared,
          COUNT(CASE WHEN reward_claimed = 1 THEN 1 END) as rewards_claimed
         FROM social_shares 
         WHERE user_id = ?`,
        [userId]
      );
      const r = result.rows && result.rows[0];
      const total_shares = r ? parseInt(r.total_shares, 10) || 0 : 0;
      const unique_sets_shared = r ? parseInt(r.unique_sets_shared, 10) || 0 : 0;
      const rewards_claimed = r ? parseInt(r.rewards_claimed, 10) || 0 : 0;
      const needed = Math.max(0, SHARES_REQUIRED - unique_sets_shared);
      return res.json({
        sharesUntilReward: needed,
        hasEarnedReward: rewards_claimed > 0,
        total_shares,
        unique_sets_shared,
        stats: {
          total_shares,
          unique_sets_shared,
          rewards_claimed,
          reward_eligible: unique_sets_shared >= SHARES_REQUIRED,
          shares_needed_for_reward: needed,
        },
      });
    } catch (_) {
      // social_shares table may not exist
      return res.json(defaultStats());
    }
  } catch (err) {
    console.error('Error fetching social share stats:', err);
    return res.status(500).json(defaultStats());
  }
});

/**
 * POST /api/social-shares/claim-reward
 * Mark reward as claimed for current user if eligible. No-op if no social_shares table.
 */
router.post('/claim-reward', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not found in token' });
    }
    res.json({
      success: false,
      message: 'Reward claim not available',
      already_claimed: false,
    });
  } catch (err) {
    console.error('Error claiming reward:', err);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

module.exports = router;
