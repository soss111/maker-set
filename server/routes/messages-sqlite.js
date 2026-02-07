const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all messages
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sender_id, recipient_id, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (sender_id) {
      whereConditions.push('m.sender_id = ?');
      queryParams.push(sender_id);
    }

    if (recipient_id) {
      whereConditions.push('m.recipient_id = ?');
      queryParams.push(recipient_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        m.*,
        s.first_name as sender_first_name,
        s.last_name as sender_last_name,
        s.email as sender_email,
        r.first_name as recipient_first_name,
        r.last_name as recipient_last_name,
        r.email as recipient_email
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.user_id
      LEFT JOIN users r ON m.recipient_id = r.user_id
      ${whereClause}
      ORDER BY m.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM messages m
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      messages: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        m.*,
        s.first_name as sender_first_name,
        s.last_name as sender_last_name,
        s.email as sender_email,
        r.first_name as recipient_first_name,
        r.last_name as recipient_last_name,
        r.email as recipient_email
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.user_id
      LEFT JOIN users r ON m.recipient_id = r.user_id
      WHERE m.message_id = ?
    `;

    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result.rows[0] });

  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Create new message
router.post('/', async (req, res) => {
  try {
    const {
      sender_id,
      recipient_id,
      subject,
      content,
      message_type = 'general',
      is_read = false
    } = req.body;

    const query = `
      INSERT INTO messages (
        sender_id, recipient_id, subject, content, message_type, is_read
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await db.query(query, [
      sender_id, recipient_id, subject, content, message_type, is_read
    ]);

    const messageId = result.rows[0].id || result.lastID;

    res.status(201).json({
      message: 'Message created successfully',
      message_id: messageId
    });

  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Update message
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subject,
      content,
      is_read
    } = req.body;

    const query = `
      UPDATE messages 
      SET subject = ?, content = ?, is_read = ?, updated_at = CURRENT_TIMESTAMP
      WHERE message_id = ?
    `;

    await db.query(query, [subject, content, is_read, id]);

    res.json({ message: 'Message updated successfully' });

  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM messages WHERE message_id = ?', [id]);

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE messages 
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP
      WHERE message_id = ?
    `;

    await db.query(query, [id]);

    res.json({ message: 'Message marked as read' });

  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

module.exports = router;
