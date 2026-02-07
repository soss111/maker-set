const express = require('express');
const router = express.Router();
const db = require('../utils/sqliteConnectionManager');

// Get all orders (simplified for SQLite)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customer_id, provider_id } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('o.status = ?');
      queryParams.push(status);
    }
    if (customer_id) {
      whereConditions.push('o.customer_id = ?');
      queryParams.push(customer_id);
    }
    if (provider_id) {
      whereConditions.push('o.provider_id = ?');
      queryParams.push(provider_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Simple query without complex JSON functions
    const query = `
      SELECT 
        o.*,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        COALESCE(o.customer_email, c.email) as customer_email,
        c.phone as customer_phone,
        c.company_name as customer_company_name,
        p.first_name as provider_first_name,
        p.last_name as provider_last_name,
        p.email as provider_email,
        p.company_name as provider_company_name
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.user_id
      LEFT JOIN users p ON o.provider_id = p.user_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.user_id
      LEFT JOIN users p ON o.provider_id = p.user_id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/orders/stats/by-providers
 * Aggregate order stats per provider for analytics.
 * Query: date_from, date_to (optional, ISO date strings).
 */
router.get('/stats/by-providers', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let whereClause = '';
    const queryParams = [];
    if (date_from) {
      whereClause += (whereClause ? ' AND ' : ' WHERE ') + 'o.order_date >= ?';
      queryParams.push(date_from);
    }
    if (date_to) {
      whereClause += (whereClause ? ' AND ' : ' WHERE ') + 'o.order_date <= ?';
      queryParams.push(date_to);
    }

    const sql = `
      SELECT
        o.provider_id,
        u.username AS provider_username,
        u.company_name AS provider_company,
        COALESCE(u.company_name, (u.first_name || ' ' || u.last_name), u.username) AS provider_name,
        COUNT(o.order_id) AS total_orders,
        SUM(CASE WHEN o.status = 'pending' OR o.status = 'pending_payment' THEN 1 ELSE 0 END) AS pending_orders,
        SUM(CASE WHEN o.status = 'payment_received' OR o.status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_orders,
        SUM(CASE WHEN o.status = 'processing' THEN 1 ELSE 0 END) AS processing_orders,
        SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) AS shipped_orders,
        SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
        SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue,
        COALESCE(AVG(o.total_amount), 0) AS average_order_value,
        0 AS unique_sets_sold,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount * 0.8 ELSE 0 END), 0) AS total_payout_amount
      FROM orders o
      LEFT JOIN users u ON o.provider_id = u.user_id
      ${whereClause}
      GROUP BY o.provider_id
    `;
    const result = await db.query(sql, queryParams);
    const rows = result.rows || [];

    const provider_stats = [];
    let total_revenue = 0;
    let total_orders = 0;
    let total_payout_amount = 0;

    for (const row of rows) {
      if (row.provider_id == null) continue;
      const unitParams = [row.provider_id];
      let unitsWhere = 'WHERE o.provider_id = ?';
      if (date_from) { unitsWhere += ' AND o.order_date >= ?'; unitParams.push(date_from); }
      if (date_to) { unitsWhere += ' AND o.order_date <= ?'; unitParams.push(date_to); }
      const total_units = await db.query(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS n FROM order_items oi INNER JOIN orders o ON oi.order_id = o.order_id ${unitsWhere}`,
        unitParams
      );
      const units = (total_units.rows && total_units.rows[0] && total_units.rows[0].n) || 0;
      provider_stats.push({
        provider_id: row.provider_id,
        provider_username: row.provider_username || '',
        provider_company: row.provider_company || '',
        provider_name: row.provider_name || row.provider_username || '',
        total_orders: row.total_orders || 0,
        pending_orders: row.pending_orders || 0,
        confirmed_orders: row.confirmed_orders || 0,
        processing_orders: row.processing_orders || 0,
        shipped_orders: row.shipped_orders || 0,
        delivered_orders: row.delivered_orders || 0,
        cancelled_orders: row.cancelled_orders || 0,
        total_revenue: Number(row.total_revenue) || 0,
        average_order_value: Number(row.average_order_value) || 0,
        unique_sets_sold: row.unique_sets_sold || 0,
        total_units_sold: Number(units),
        total_payout_amount: Number(row.total_payout_amount) || 0,
        top_selling_sets: [],
        monthly_payouts: [],
      });
      total_revenue += Number(row.total_revenue) || 0;
      total_orders += Number(row.total_orders) || 0;
      total_payout_amount += Number(row.total_payout_amount) || 0;
    }

    res.json({
      provider_stats,
      total_providers: provider_stats.length,
      total_revenue,
      total_orders,
      total_payout_amount,
    });
  } catch (err) {
    console.error('Error fetching provider stats:', err);
    res.status(500).json({
      provider_stats: [],
      total_providers: 0,
      total_revenue: 0,
      total_orders: 0,
      total_payout_amount: 0,
    });
  }
});

/**
 * GET /api/orders/sales-management
 * List orders with customer/provider and line items for sales management.
 * Query: provider_id, payment_status, date_from, date_to (optional).
 */
router.get('/sales-management', async (req, res) => {
  try {
    const { provider_id, payment_status, date_from, date_to } = req.query;
    const whereConditions = [];
    const queryParams = [];
    if (provider_id) {
      whereConditions.push('o.provider_id = ?');
      queryParams.push(provider_id);
    }
    if (payment_status) {
      whereConditions.push('o.status = ?');
      queryParams.push(payment_status);
    }
    if (date_from) {
      whereConditions.push('o.order_date >= ?');
      queryParams.push(date_from);
    }
    if (date_to) {
      whereConditions.push('o.order_date <= ?');
      queryParams.push(date_to);
    }
    const whereClause = whereConditions.length ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const ordersSql = `
      SELECT
        o.order_id, o.order_number, o.order_date, o.status AS order_status, o.total_amount,
        o.customer_id, o.provider_id,
        c.username AS customer_username, c.first_name AS c_first_name, c.last_name AS c_last_name, c.email AS c_email, c.company_name AS c_company,
        p.username AS provider_username, p.first_name AS p_first_name, p.last_name AS p_last_name, p.company_name AS p_company
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.user_id
      LEFT JOIN users p ON o.provider_id = p.user_id
      ${whereClause}
      ORDER BY o.order_date DESC
    `;
    const ordersResult = await db.query(ordersSql, queryParams);
    const orders = ordersResult.rows || [];

    const sales = [];
    let total_amount = 0;
    let paid_amount = 0;
    let pending_amount = 0;

    for (const o of orders) {
      const itemsResult = await db.query(
        'SELECT oi.set_id, s.name AS set_name, s.category AS set_category, oi.quantity, oi.unit_price, oi.line_total FROM order_items oi LEFT JOIN sets s ON oi.set_id = s.set_id WHERE oi.order_id = ?',
        [o.order_id]
      );
      const items = (itemsResult.rows || []).map((row) => ({
        set_id: row.set_id,
        set_name: row.set_name || '',
        set_category: row.set_category || '',
        quantity: row.quantity,
        unit_price: row.unit_price,
        line_total: row.line_total,
      }));
      const amt = Number(o.total_amount) || 0;
      total_amount += amt;
      const paid = ['delivered', 'shipped', 'payment_received'].includes(o.order_status) ? amt : 0;
      paid_amount += paid;
      pending_amount += amt - paid;

      sales.push({
        order_id: o.order_id,
        order_number: o.order_number,
        order_date: o.order_date,
        order_status: o.order_status,
        total_amount: amt,
        payment_status: o.order_status,
        customer: {
          user_id: o.customer_id,
          username: o.customer_username || '',
          name: [o.c_first_name, o.c_last_name].filter(Boolean).join(' ') || o.customer_username || '—',
          email: o.c_email || '',
          company: o.c_company,
        },
        provider: {
          user_id: o.provider_id,
          username: o.provider_username || '',
          name: [o.p_first_name, o.p_last_name].filter(Boolean).join(' ') || o.provider_username || '—',
          company: o.p_company,
        },
        items,
      });
    }

    res.json({
      sales,
      total_orders: orders.length,
      total_amount,
      paid_amount,
      pending_amount,
    });
  } catch (err) {
    console.error('Error fetching sales management:', err);
    res.status(500).json({
      sales: [],
      total_orders: 0,
      total_amount: 0,
      paid_amount: 0,
      pending_amount: 0,
    });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const orderQuery = `
      SELECT 
        o.*,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        COALESCE(o.customer_email, c.email) as customer_email,
        c.phone as customer_phone,
        c.company_name as customer_company_name,
        p.first_name as provider_first_name,
        p.last_name as provider_last_name,
        p.email as provider_email,
        p.company_name as provider_company_name
      FROM orders o
      LEFT JOIN users c ON o.customer_id = c.user_id
      LEFT JOIN users p ON o.provider_id = p.user_id
      WHERE o.order_id = ?
    `;

    const orderResult = await db.query(orderQuery, [id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get order items separately
    const itemsQuery = `
      SELECT 
        oi.*,
        s.name as set_name
      FROM order_items oi
      LEFT JOIN sets s ON oi.set_id = s.set_id
      WHERE oi.order_id = ?
    `;

    const itemsResult = await db.query(itemsQuery, [id]);
    order.items = itemsResult.rows;

    res.json({ order });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    const {
      customer_id,
      provider_id,
      customer_email,
      customer_phone,
      shipping_address,
      billing_address,
      items,
      total_amount,
      status = 'pending',
      payment_method,
      payment_status,
      notes,
      invoice_required,
      set_type
    } = req.body;

    // Insert order
    const orderQuery = `
      INSERT INTO orders (
        order_number, customer_id, provider_id, customer_email, customer_phone,
        shipping_address, billing_address, total_amount, currency, status,
        payment_method, payment_status, notes, invoice_required, set_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const orderResult = await db.run(orderQuery, [
      orderNumber, customer_id, provider_id, customer_email, customer_phone,
      shipping_address, billing_address, total_amount, 'EUR', status,
      payment_method, payment_status, notes, invoice_required, set_type
    ]);

    const orderId = orderResult.lastID;

    // Insert order items
    if (items && items.length > 0) {
      for (const item of items) {
        const itemQuery = `
          INSERT INTO order_items (
            order_id, set_id, quantity, unit_price, line_total
          ) VALUES (?, ?, ?, ?, ?)
        `;
        
        const lineTotal = item.price * item.quantity;
        await db.run(itemQuery, [
          orderId, item.set_id, item.quantity, item.price, lineTotal
        ]);
      }
    }

    // Automatically reduce stock for ordered sets
    try {
      console.log(`📦 Reducing stock for order ${orderId}`);
      
      // Get all set items from the order (exclude handling fees)
      const setItemsQuery = `
        SELECT set_id, quantity 
        FROM order_items 
        WHERE order_id = ? AND set_id IS NOT NULL
      `;
      
      const setItemsResult = await db.query(setItemsQuery, [orderId]);
      const setItems = setItemsResult.rows;
      
      for (const setItem of setItems) {
        // Get all parts required for this set
        const partsQuery = `
          SELECT part_id, quantity as required_quantity
          FROM set_parts 
          WHERE set_id = ? AND is_optional = 0
        `;
        
        const partsResult = await db.query(partsQuery, [setItem.set_id]);
        const requiredParts = partsResult.rows;
        
        for (const part of requiredParts) {
          // Calculate total quantity needed (set quantity * part quantity per set)
          const totalQuantityNeeded = Math.ceil(setItem.quantity * part.required_quantity);
          
          // Check current stock
          const stockQuery = 'SELECT stock_quantity FROM parts WHERE part_id = ?';
          const stockResult = await db.query(stockQuery, [part.part_id]);
          
          if (stockResult.rows.length > 0) {
            const currentStock = stockResult.rows[0].stock_quantity;
            const newStock = Math.max(0, currentStock - totalQuantityNeeded);
            
            // Update stock
            await db.run(
              'UPDATE parts SET stock_quantity = ? WHERE part_id = ?',
              [newStock, part.part_id]
            );
            
            console.log(`📦 Reduced stock for part ${part.part_id}: ${currentStock} → ${newStock} (used ${totalQuantityNeeded})`);
            
            // Log inventory transaction
            await db.run(`
              INSERT INTO inventory_transactions (
                part_id, transaction_type, quantity, reason, reference_id, reference_type
              ) VALUES (?, 'out', ?, ?, ?, 'order')
            `, [
              part.part_id,
              totalQuantityNeeded,
              `Order ${orderNumber} - Set ${setItem.set_id}`,
              orderId
            ]);
          }
        }
      }
      
      console.log(`✅ Stock reduction completed for order ${orderId}`);
    } catch (error) {
      console.error('Error reducing stock:', error);
      // Don't fail the order creation if stock reduction fails
    }

    // Automatically generate invoice if required
    let invoiceData = null;
    if (invoice_required) {
      try {
        console.log(`📄 Auto-generating invoice for order ${orderId}`);
        
        // Make internal API call to generate invoice
        const invoiceResponse = await fetch(`http://localhost:${process.env.PORT || 5001}/api/invoices/generate/${orderId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (invoiceResponse.ok) {
          invoiceData = await invoiceResponse.json();
          console.log(`✅ Invoice generated: ${invoiceData.invoiceNumber}`);
        } else {
          console.error('Failed to generate invoice:', await invoiceResponse.text());
        }
      } catch (error) {
        console.error('Error auto-generating invoice:', error);
        // Don't fail the order creation if invoice generation fails
      }
    }

    res.status(201).json({
      message: 'Order created successfully',
      order_id: orderId,
      invoice_generated: invoice_required,
      invoice: invoiceData
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Get current order status
    const currentOrderQuery = 'SELECT status FROM orders WHERE order_id = ?';
    const currentOrderResult = await db.query(currentOrderQuery, [id]);
    
    if (currentOrderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const currentStatus = currentOrderResult.rows[0].status;
    
    // Update order status
    const query = 'UPDATE orders SET status = ? WHERE order_id = ?';
    await db.run(query, [status, id]);

    // Handle stock restoration for cancelled/failed orders
    if (shouldRestoreStock(currentStatus, status)) {
      try {
        console.log(`🔄 Restoring stock for order ${id} (${currentStatus} → ${status})`);
        await restoreStockForOrder(id);
        console.log(`✅ Stock restoration completed for order ${id}`);
      } catch (error) {
        console.error('Error restoring stock:', error);
        // Don't fail the status update if stock restoration fails
      }
    }

    res.json({ message: 'Order status updated successfully' });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Helper function to determine if stock should be restored
function shouldRestoreStock(currentStatus, newStatus) {
  // Restore stock when moving from a "reserved" status to a "cancelled" status
  const reservedStatuses = ['pending', 'pending_payment', 'payment_received'];
  const cancelledStatuses = ['cancelled', 'failed', 'payment_failed', 'refunded'];
  
  return reservedStatuses.includes(currentStatus) && cancelledStatuses.includes(newStatus);
}

// Function to restore stock for a cancelled order
async function restoreStockForOrder(orderId) {
  // Get order number for logging
  const orderNumberQuery = 'SELECT order_number FROM orders WHERE order_id = ?';
  const orderNumberResult = await db.query(orderNumberQuery, [orderId]);
  const orderNumber = orderNumberResult.rows[0]?.order_number || `ORDER-${orderId}`;
  
  // Get all set items from the order (exclude handling fees)
  const setItemsQuery = `
    SELECT set_id, quantity 
    FROM order_items 
    WHERE order_id = ? AND set_id IS NOT NULL
  `;
  
  const setItemsResult = await db.query(setItemsQuery, [orderId]);
  const setItems = setItemsResult.rows;
  
  for (const setItem of setItems) {
    // Get all parts required for this set
    const partsQuery = `
      SELECT part_id, quantity as required_quantity
      FROM set_parts 
      WHERE set_id = ? AND is_optional = 0
    `;
    
    const partsResult = await db.query(partsQuery, [setItem.set_id]);
    const requiredParts = partsResult.rows;
    
    for (const part of requiredParts) {
      // Calculate total quantity to restore (set quantity * part quantity per set)
      const totalQuantityToRestore = Math.ceil(setItem.quantity * part.required_quantity);
      
      // Check current stock
      const stockQuery = 'SELECT stock_quantity FROM parts WHERE part_id = ?';
      const stockResult = await db.query(stockQuery, [part.part_id]);
      
      if (stockResult.rows.length > 0) {
        const currentStock = stockResult.rows[0].stock_quantity;
        const newStock = currentStock + totalQuantityToRestore;
        
        // Update stock
        await db.run(
          'UPDATE parts SET stock_quantity = ? WHERE part_id = ?',
          [newStock, part.part_id]
        );
        
        console.log(`🔄 Restored stock for part ${part.part_id}: ${currentStock} → ${newStock} (restored ${totalQuantityToRestore})`);
        
        // Log inventory transaction
        await db.run(`
          INSERT INTO inventory_transactions (
            part_id, transaction_type, quantity, reason, reference_id, reference_type
          ) VALUES (?, 'in', ?, ?, ?, 'order_cancellation')
        `, [
          part.part_id,
          totalQuantityToRestore,
          `Order ${orderNumber} cancelled - Set ${setItem.set_id}`,
          orderId
        ]);
      }
    }
  }
}

module.exports = router;
