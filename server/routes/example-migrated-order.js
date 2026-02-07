/**
 * Example: Migrated Order Endpoint
 * This shows how to use the database abstraction layer
 * Works with SQLite, MySQL, or PostgreSQL - just change DATABASE_ENGINE!
 */

const express = require('express');
const router = express.Router();
const db = require('../models/database-abstraction');
const helper = require('../utils/database-helper');

/**
 * GET /api/example-orders
 * Get all orders - now works with any database!
 */
router.get('/api/example-orders', async (req, res) => {
  try {
    // Option 1: Using Knex query builder (most portable)
    const orders = await db.knex
      .select('*')
      .from('orders')
      .orderBy('created_at', 'desc');
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/example-orders
 * Create an order - database-agnostic
 */
router.post('/api/example-orders', async (req, res) => {
  const { customer_id, total_amount, items } = req.body;

  try {
    // Using transaction for safety
    const orderId = await helper.transaction(async (trx) => {
      // Insert order
      const [orderResult] = await trx
        .insert({
          customer_id,
          total_amount,
          status: 'pending',
          created_at: trx.raw('CURRENT_TIMESTAMP')
        })
        .into('orders')
        .returning('order_id'); // Works with PostgreSQL
      
      const orderId = orderResult || await trx.raw('SELECT LAST_INSERT_ROWID()');
      
      // Insert order items
      for (const item of items) {
        await trx.insert({
          order_id: orderId,
          set_id: item.set_id,
          quantity: item.quantity,
          unit_price: item.price
        }).into('order_items');
      }
      
      return orderId;
    });

    res.status(201).json({ 
      message: 'Order created successfully',
      order_id: orderId 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/example-orders/:id
 * Get single order with items
 */
router.get('/api/example-orders/:id', async (req, res) => {
  const orderId = req.params.id;

  try {
    // Using Knex joins (works with all databases!)
    const order = await db.knex
      .select('orders.*')
      .from('orders')
      .where('orders.order_id', orderId)
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await db.knex
      .select('order_items.*', 'sets.name as set_name')
      .from('order_items')
      .leftJoin('sets', 'order_items.set_id', 'sets.set_id')
      .where('order_items.order_id', orderId);

    res.json({ ...order, items });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * UPDATE /api/example-orders/:id/status
 * Update order status
 */
router.put('/api/example-orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  try {
    const rowsAffected = await db.knex('orders')
      .where('order_id', orderId)
      .update({ 
        status,
        updated_at: db.knex.raw('CURRENT_TIMESTAMP')
      });

    if (rowsAffected === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

