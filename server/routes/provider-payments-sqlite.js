const express = require('express');
const router = express.Router();
const db = require('../utils/sqliteConnectionManager');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/provider-payments/monthly-reports
 * List monthly reports (admin sees all; provider sees own). Returns array of MonthlyReport.
 * For now returns [] unless we add a monthly_reports table later.
 */
router.get('/monthly-reports', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.user_id;
    if (userRole !== 'admin' && userRole !== 'provider') {
      return res.status(403).json({ error: 'Admin or Provider access required' });
    }
    // Return empty array; client accepts [] and shows empty state
    res.json([]);
  } catch (err) {
    console.error('Error fetching monthly reports:', err);
    res.status(500).json([]);
  }
});

// Get provider monthly reports
router.get('/reports', authenticateToken, async (req, res) => {
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
      LEFT JOIN provider_sets ps ON oi.set_id = ps.set_id AND ps.provider_id = ?
      WHERE ps.provider_id = ?
        AND strftime('%Y', o.created_at) = ?
        AND strftime('%m', o.created_at) = ?
        AND o.status IN ('delivered', 'payment_pending', 'payment_completed')
      ORDER BY o.created_at DESC
    `;

    const salesResult = await db.query(salesQuery, [targetProviderId, targetProviderId, targetYear.toString(), targetMonth.toString().padStart(2, '0')]);

    // Calculate totals
    const totalSales = salesResult.rows.length;
    const totalRevenue = salesResult.rows.reduce((sum, order) => sum + (order.line_total || 0), 0);
    const pendingPayments = salesResult.rows.filter(order => order.status === 'payment_pending').length;
    const completedPayments = salesResult.rows.filter(order => order.status === 'payment_completed').length;

    // Get provider info
    const providerQuery = 'SELECT username, company_name, provider_code FROM users WHERE user_id = ?';
    const providerResult = await db.query(providerQuery, [targetProviderId]);
    const provider = providerResult.rows[0];

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
        username: provider?.username,
        company_name: provider?.company_name,
        provider_code: provider?.provider_code
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
        orders: salesResult.rows
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
router.get('/payments', authenticateToken, async (req, res) => {
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
        o.payment_completed_at,
        oi.set_id,
        oi.quantity,
        oi.line_total,
        s.name as set_name
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN sets s ON oi.set_id = s.set_id
      LEFT JOIN provider_sets ps ON oi.set_id = ps.set_id AND ps.provider_id = ?
      WHERE ps.provider_id = ?
        AND o.status = 'payment_completed'
      ORDER BY o.payment_completed_at DESC
    `;

    const paymentsResult = await db.query(paymentsQuery, [targetProviderId, targetProviderId]);

    // Calculate totals
    const totalPaid = paymentsResult.rows.reduce((sum, payment) => sum + (payment.line_total || 0), 0);
    const totalPayments = paymentsResult.rows.length;

    res.json({
      provider_id: targetProviderId,
      payments: paymentsResult.rows,
      summary: {
        total_payments: totalPayments,
        total_amount_paid: totalPaid,
        last_payment_date: paymentsResult.rows[0]?.payment_completed_at || null
      }
    });

  } catch (error) {
    console.error('Error fetching provider payments:', error);
    res.status(500).json({ error: 'Failed to fetch provider payments' });
  }
});

// Generate monthly report (client calls POST /generate-report with { month, year })
router.post('/generate-report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { year, month } = req.body;
    const currentDate = new Date();
    const targetYear = year != null ? Number(year) : currentDate.getFullYear();
    const targetMonth = month != null ? Number(month) : (currentDate.getMonth() === 0 ? 12 : currentDate.getMonth());
    const monthStr = targetMonth.toString().padStart(2, '0');
    const yearStr = targetYear.toString();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const providersQuery = `
      SELECT DISTINCT u.user_id, u.username, u.company_name, u.email
      FROM users u
      JOIN provider_sets ps ON u.user_id = ps.provider_id
      WHERE u.role = 'provider' AND (u.is_active = 1 OR u.is_active IS NULL)
    `;
    const providersResult = await db.query(providersQuery);
    const providerRows = providersResult.rows || [];
    const providers = [];
    let total_revenue = 0;
    let total_platform_fees = 0;
    let total_provider_payments = 0;

    for (const p of providerRows) {
      const ordersResult = await db.query(
        `SELECT o.order_id, o.order_number, o.order_date, o.total_amount, o.status
         FROM orders o
         WHERE o.provider_id = ? AND strftime('%Y', o.order_date) = ? AND strftime('%m', o.order_date) = ?
         AND o.status IN ('delivered', 'shipped', 'payment_received', 'payment_completed')`,
        [p.user_id, yearStr, monthStr]
      );
      const orders = ordersResult.rows || [];
      const rev = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
      const platformPct = 20;
      const providerPct = 80;
      const platform_fee_amount = rev * (platformPct / 100);
      const provider_payment = rev * (providerPct / 100);
      total_revenue += rev;
      total_platform_fees += platform_fee_amount;
      total_provider_payments += provider_payment;
      providers.push({
        provider_id: p.user_id,
        provider_name: p.username || '',
        provider_company: p.company_name || '',
        provider_email: p.email || '',
        provider_markup_percentage: providerPct,
        total_orders: orders.length,
        total_revenue: rev,
        platform_fee_percentage: platformPct,
        platform_fee_amount,
        provider_payment,
        orders: orders.map((o) => ({
          order_id: o.order_id,
          order_number: o.order_number,
          order_date: o.order_date,
          total_amount: parseFloat(o.total_amount) || 0,
          status: o.status,
          payment_status: o.status,
        })),
      });
    }

    const report = {
      month: monthNames[targetMonth - 1] || `Month ${targetMonth}`,
      year: targetYear,
      total_providers: providers.length,
      total_revenue,
      total_platform_fees,
      total_provider_payments,
      providers,
    };
    res.json(report);
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate report' });
  }
});

// Generate monthly report for all providers (Admin only)
router.post('/generate-monthly-reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { year, month } = req.body;
    
    // Default to previous month if not specified
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || (currentDate.getMonth() === 0 ? 12 : currentDate.getMonth());

    // Get all active providers
    const providersQuery = `
      SELECT DISTINCT u.user_id, u.username, u.company_name, u.provider_code
      FROM users u
      JOIN provider_sets ps ON u.user_id = ps.provider_id
      WHERE u.role = 'provider' AND u.active = 1
    `;

    const providersResult = await db.query(providersQuery);
    const providers = providersResult.rows;

    const reports = [];

    for (const provider of providers) {
      // Get monthly sales data for this provider
      const salesQuery = `
        SELECT 
          o.order_id,
          o.order_number,
          o.created_at,
          o.total_amount,
          o.status,
          oi.set_id,
          oi.quantity,
          oi.line_total,
          s.name as set_name
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        JOIN sets s ON oi.set_id = s.set_id
        LEFT JOIN provider_sets ps ON oi.set_id = ps.set_id AND ps.provider_id = ?
        WHERE ps.provider_id = ?
          AND strftime('%Y', o.created_at) = ?
          AND strftime('%m', o.created_at) = ?
          AND o.status IN ('delivered', 'payment_pending', 'payment_completed')
        ORDER BY o.created_at DESC
      `;

      const salesResult = await db.query(salesQuery, [
        provider.user_id, 
        provider.user_id, 
        targetYear.toString(), 
        targetMonth.toString().padStart(2, '0')
      ]);

      // Calculate totals
      const totalSales = salesResult.rows.length;
      const totalRevenue = salesResult.rows.reduce((sum, order) => sum + (order.line_total || 0), 0);
      const pendingPayments = salesResult.rows.filter(order => order.status === 'payment_pending').length;
      const completedPayments = salesResult.rows.filter(order => order.status === 'payment_completed').length;

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

      reports.push({
        provider: provider,
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
          orders: salesResult.rows
        },
        ai_motivation: randomMotivation,
        generated_at: new Date().toISOString()
      });
    }

    res.json({
      message: 'Monthly reports generated successfully',
      period: {
        year: parseInt(targetYear),
        month: parseInt(targetMonth),
        month_name: new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' })
      },
      reports: reports,
      total_providers: providers.length
    });

  } catch (error) {
    console.error('Error generating monthly reports:', error);
    res.status(500).json({ error: 'Failed to generate monthly reports' });
  }
});

// Mark payment as completed (Admin only)
router.post('/complete-payment', requireAdmin, async (req, res) => {
  try {
    const { order_id, payment_amount, payment_method, payment_reference, notes } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Update order status to payment_completed
    const updateQuery = `
      UPDATE orders 
      SET status = 'payment_completed', 
          payment_completed_at = datetime('now'),
          payment_method = ?,
          payment_reference = ?,
          notes = ?
      WHERE order_id = ?
    `;

    await db.run(updateQuery, [payment_method, payment_reference, notes, order_id]);

    // Get order details for notification
    const orderQuery = 'SELECT * FROM orders WHERE order_id = ?';
    const orderResult = await db.query(orderQuery, [order_id]);
    const order = orderResult.rows[0];

    res.json({
      message: 'Payment marked as completed successfully',
      order_id: order_id,
      status: 'payment_completed'
    });

  } catch (error) {
    console.error('Error completing payment:', error);
    res.status(500).json({ error: 'Failed to complete payment' });
  }
});

module.exports = router;
