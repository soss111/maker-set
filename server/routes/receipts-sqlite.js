const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all receipts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, user_id, order_id, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (user_id) {
      whereConditions.push('r.user_id = ?');
      queryParams.push(user_id);
    }

    if (order_id) {
      whereConditions.push('r.order_id = ?');
      queryParams.push(order_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        o.order_number,
        o.total_amount
      FROM receipts r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN orders o ON r.order_id = o.order_id
      ${whereClause}
      ORDER BY r.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM receipts r
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      receipts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Get receipt by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        o.order_number,
        o.total_amount
      FROM receipts r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN orders o ON r.order_id = o.order_id
      WHERE r.receipt_id = ?
    `;

    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ receipt: result.rows[0] });

  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

// Create new receipt
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      order_id,
      receipt_number,
      amount,
      currency = 'EUR',
      payment_method,
      payment_reference,
      file_path,
      notes
    } = req.body;

    const query = `
      INSERT INTO receipts (
        user_id, order_id, receipt_number, amount, currency, payment_method, payment_reference, file_path, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.query(query, [
      user_id, order_id, receipt_number, amount, currency, payment_method, payment_reference, file_path, notes
    ]);

    const receiptId = result.rows[0].id || result.lastID;

    res.status(201).json({
      message: 'Receipt created successfully',
      receipt_id: receiptId
    });

  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
});

// Update receipt
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      receipt_number,
      amount,
      currency,
      payment_method,
      payment_reference,
      file_path,
      notes
    } = req.body;

    const query = `
      UPDATE receipts 
      SET receipt_number = ?, amount = ?, currency = ?, payment_method = ?, payment_reference = ?, file_path = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE receipt_id = ?
    `;

    await db.query(query, [receipt_number, amount, currency, payment_method, payment_reference, file_path, notes, id]);

    res.json({ message: 'Receipt updated successfully' });

  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Failed to update receipt' });
  }
});

// Delete receipt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM receipts WHERE receipt_id = ?', [id]);

    res.json({ message: 'Receipt deleted successfully' });

  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

module.exports = router;
