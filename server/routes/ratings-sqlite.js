const express = require('express');
const router = express.Router();
const db = require('../utils/sqliteConnectionManager');

// Get all ratings with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, set_id, user_id, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const allowedSort = ['created_at', 'rating', 'rating_id', 'set_id', 'user_id'];
    const safeSortBy = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const safeOrder = (sort_order || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereConditions = [];
    let queryParams = [];

    if (set_id) {
      whereConditions.push('r.set_id = ?');
      queryParams.push(set_id);
    }

    if (user_id) {
      whereConditions.push('r.user_id = ?');
      queryParams.push(user_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.company_name,
        s.name as set_name
      FROM ratings r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN sets s ON r.set_id = s.set_id
      ${whereClause}
      ORDER BY r.${safeSortBy} ${safeOrder}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ratings r
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows && countResult.rows[0] && countResult.rows[0].total, 10) || 0;

    res.json({
      ratings: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// Get rating by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.company_name,
        s.name as set_name
      FROM ratings r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN sets s ON r.set_id = s.set_id
      WHERE r.rating_id = ?
    `;

    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }

    res.json({ rating: result.rows[0] });

  } catch (error) {
    console.error('Error fetching rating:', error);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

// Create new rating
router.post('/', async (req, res) => {
  try {
    const {
      set_id,
      user_id,
      rating,
      review_text,
      title
    } = req.body;

    // Check if user already rated this set
    const existingRating = await db.query(
      'SELECT rating_id FROM ratings WHERE set_id = ? AND user_id = ?',
      [set_id, user_id]
    );

    if (existingRating.rows.length > 0) {
      return res.status(400).json({ error: 'User has already rated this set' });
    }

    const query = `
      INSERT INTO ratings (set_id, user_id, rating, review_text)
      VALUES (?, ?, ?, ?)
    `;

    const result = await db.run(query, [set_id, user_id, rating, review_text]);
    const ratingId = result.lastID;

    res.status(201).json({
      message: 'Rating created successfully',
      rating_id: ratingId
    });

  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({ error: 'Failed to create rating' });
  }
});

// Update rating
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rating,
      review_text,
      title
    } = req.body;

    const query = `
      UPDATE ratings 
      SET rating = ?, review_text = ?, title = ?, updated_at = CURRENT_TIMESTAMP
      WHERE rating_id = ?
    `;

    await db.query(query, [rating, review_text, title, id]);

    res.json({ message: 'Rating updated successfully' });

  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ error: 'Failed to update rating' });
  }
});

// Delete rating
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM ratings WHERE rating_id = ?', [id]);

    res.json({ message: 'Rating deleted successfully' });

  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

// Get all reviews for a specific set
router.get('/set/:setId', async (req, res) => {
  try {
    const { setId } = req.params;

    const query = `
      SELECT 
        r.rating_id,
        r.rating,
        r.review_text,
        r.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name
      FROM ratings r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.set_id = ?
      ORDER BY r.created_at DESC
    `;

    const result = await db.query(query, [setId]);
    
    // Calculate average rating
    const averageRating = result.rows.length > 0 
      ? result.rows.reduce((sum, review) => sum + review.rating, 0) / result.rows.length 
      : 0;
    
    res.json({
      success: true,
      data: {
        set_id: parseInt(setId),
        review_count: result.rows.length,
        average_rating: averageRating,
        reviews: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching reviews for set:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get average rating for a set
router.get('/set/:setId/average', async (req, res) => {
  try {
    const { setId } = req.params;

    const query = `
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN review_text IS NOT NULL AND review_text != '' THEN 1 END) as review_count
      FROM ratings
      WHERE set_id = ?
    `;

    const result = await db.query(query, [setId]);
    const data = result.rows[0];

    res.json({
      average_rating: data.average_rating ? Math.round(Number(data.average_rating) * 10) / 10 : 0,
      total_ratings: parseInt(data.total_ratings),
      review_count: parseInt(data.review_count)
    });

  } catch (error) {
    console.error('Error fetching average rating:', error);
    res.status(500).json({ error: 'Failed to fetch average rating' });
  }
});

module.exports = router;
