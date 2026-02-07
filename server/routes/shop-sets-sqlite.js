const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../models/database');
const connectionManager = require('../utils/sqliteConnectionManager');

/**
 * GET /api/shop-sets
 * Get all sets available for purchase in the shop
 * This endpoint is for customers to browse available sets
 */
router.get('/', async (req, res) => {
  try {
    console.log('📦 Fetching shop sets...');
    
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      difficulty_level,
      sort_by = 'name', 
      sort_order = 'ASC',
      min_price,
      max_price
    } = req.query;

    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];

    // Admin controls: Only show sets that are admin_visible and not disabled
    // For admin sets (ps.admin_visible IS NULL), show them
    // For provider sets, only show if admin_visible = 1 AND admin_status = 'active'
    // TEMPORARY: Show all sets for debugging
    // whereConditions.push('(ps.admin_visible IS NULL OR ps.admin_visible = 1)');
    // whereConditions.push('(ps.admin_status IS NULL OR ps.admin_status = "active")');

    if (search) {
      whereConditions.push('(s.name LIKE ? OR s.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      whereConditions.push('s.category = ?');
      queryParams.push(category);
    }

    if (difficulty_level) {
      whereConditions.push('s.difficulty_level = ?');
      queryParams.push(difficulty_level);
    }

    if (min_price) {
      whereConditions.push('s.base_price >= ?');
      queryParams.push(parseFloat(min_price));
    }

    if (max_price) {
      whereConditions.push('s.base_price <= ?');
      queryParams.push(parseFloat(max_price));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Whitelist sort column to prevent SQL injection
    const allowedSort = ['name', 'base_price', 'created_at', 'updated_at', 'category', 'difficulty_level', 'estimated_duration_minutes'];
    const sortBy = allowedSort.includes(sort_by) ? sort_by : 'name';
    const sortOrder = (sort_order || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build the main query
    const query = `
      SELECT
        s.set_id,
        s.name,
        s.description,
        s.category,
        s.difficulty_level,
        s.estimated_duration_minutes,
        s.base_price,
        s.video_url,
        s.learning_outcomes,
        s.tested_by_makerset,
        s.admin_visible as set_admin_visible,
        s.created_at,
        s.updated_at,
        (SELECT COUNT(*) FROM set_parts WHERE set_id = s.set_id) as part_count,
        (SELECT COUNT(*) FROM set_tools WHERE set_id = s.set_id) as tool_count,
        (SELECT COUNT(*) FROM set_media WHERE set_id = s.set_id) as media_count,
        (SELECT COUNT(*) FROM ratings WHERE set_id = s.set_id) as review_count,
        (SELECT AVG(rating) FROM ratings WHERE set_id = s.set_id) as average_rating,
        (SELECT review_text FROM ratings WHERE set_id = s.set_id ORDER BY created_at DESC LIMIT 1) as latest_review_text,
        (SELECT (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) FROM ratings r JOIN users u ON r.user_id = u.user_id WHERE r.set_id = s.set_id ORDER BY r.created_at DESC LIMIT 1) as latest_reviewer_name,
        COALESCE(
          ps.available_quantity,
          (SELECT MIN(FLOOR(p.stock_quantity / sp.quantity))
           FROM set_parts sp
           JOIN parts p ON sp.part_id = p.part_id
           WHERE sp.set_id = s.set_id AND sp.is_optional = 0 AND p.stock_quantity > 0
          ), 0
        ) as available_quantity,
        ps.provider_set_id,
        ps.provider_id,
        ps.price as provider_price,
        ps.available_quantity as provider_available_quantity,
        ps.provider_visible,
        CASE 
          WHEN ps.provider_set_id IS NOT NULL THEN ps.admin_visible 
          ELSE s.admin_visible 
        END as admin_visible,
        ps.admin_status,
        u.username as provider_username,
        u.first_name as provider_first_name,
        u.last_name as provider_last_name,
        u.company_name as provider_company,
        u.provider_code
      FROM sets s
      LEFT JOIN provider_sets ps ON s.set_id = ps.set_id AND ps.is_active = 1
      LEFT JOIN users u ON ps.provider_id = u.user_id
      ${whereClause}
      ORDER BY s.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);

    console.log('🔍 Executing query:', query);
    console.log('📊 Query params:', queryParams);

    const result = await connectionManager.query(query, queryParams);
    const sets = result.rows || [];

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sets s
      LEFT JOIN provider_sets ps ON s.set_id = ps.set_id AND ps.is_active = 1
      LEFT JOIN users u ON ps.provider_id = u.user_id
      ${whereClause}
    `;
    
    const countResult = await connectionManager.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const totalCount = countResult.rows[0]?.total || 0;

    console.log(`✅ Found ${sets.length} sets (total: ${totalCount})`);

    // Filter sets based on simplified visibility rules
    const filteredSets = sets.filter(set => {
      // All sets (admin and provider) need admin_visible = 1 to be visible
      return set.admin_visible === 1;
    });

    console.log(`🔍 Filtered to ${filteredSets.length} sets after admin visibility check`);

    // Add set_type field based on whether there's a provider_sets entry
    const setsWithType = filteredSets.map(set => ({
      ...set,
      set_type: set.provider_set_id ? 'provider' : 'admin',
      price: set.provider_price || set.base_price || 0,
      display_price: set.provider_price || set.base_price || 0
    }));

    // Attach media for each set (so shop can show images)
    const setIds = setsWithType.map(s => s.set_id);
    const mediaBySetId = {};
    const baseUrl = req.app.get('baseUrl') || process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
    if (setIds.length > 0) {
      try {
        const placeholders = setIds.map(() => '?').join(',');
        const mediaQuery = `
          SELECT
            sm.set_id,
            mf.media_id,
            mf.file_name,
            mf.file_path,
            mf.file_type,
            mf.mime_type,
            sm.media_category,
            sm.display_order,
            sm.is_featured
          FROM set_media sm
          JOIN media_files mf ON sm.media_id = mf.media_id
          WHERE sm.set_id IN (${placeholders})
          ORDER BY sm.set_id, sm.is_featured DESC, sm.display_order, mf.media_id
        `;
        const mediaResult = await connectionManager.query(mediaQuery, setIds);
        const mediaRows = mediaResult.rows || [];
        mediaRows.forEach(row => {
          if (!mediaBySetId[row.set_id]) mediaBySetId[row.set_id] = [];
          mediaBySetId[row.set_id].push({
            media_id: row.media_id,
            file_name: row.file_name,
            file_path: row.file_path,
            file_type: row.file_type,
            mime_type: row.mime_type,
            media_category: row.media_category,
            display_order: row.display_order,
            is_featured: row.is_featured,
            file_url: row.file_path ? `${baseUrl}/uploads/${path.basename(row.file_path)}` : null
          });
        });
      } catch (mediaErr) {
        console.warn('Shop sets: could not load media:', mediaErr.message);
      }
    }
    const setsWithMedia = setsWithType.map(set => ({
      ...set,
      media: mediaBySetId[set.set_id] || []
    }));

    res.json({
      success: true,
      sets: setsWithMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching shop sets:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch shop sets',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/shop-sets/:id
 * Get a specific set by ID for shop display
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📦 Fetching shop set ${id}...`);

    // Get the set details
    const setQuery = `
      SELECT
        s.set_id,
        s.name,
        s.description,
        s.category,
        s.difficulty_level,
        s.estimated_duration_minutes,
        s.base_price,
        s.video_url,
        s.learning_outcomes,
        s.created_at,
        s.updated_at,
        (SELECT COUNT(*) FROM set_parts WHERE set_id = s.set_id) as part_count,
        (SELECT COUNT(*) FROM set_tools WHERE set_id = s.set_id) as tool_count
      FROM sets s
      WHERE s.set_id = ?
    `;

    const setResult = await connectionManager.query(setQuery, [id]);
    
    if (setResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Set not found'
        }
      });
    }

    const set = setResult.rows[0];

    // Get parts for this set
    const partsQuery = `
      SELECT
        p.part_id,
        p.name AS part_name,
        p.description,
        p.category,
        p.image_url,
        sp.quantity AS quantity_required,
        sp.is_optional
      FROM set_parts sp
      JOIN parts p ON sp.part_id = p.part_id
      WHERE sp.set_id = ?
      ORDER BY p.name
    `;

    const partsResult = await connectionManager.query(partsQuery, [id]);
    set.parts = partsResult.rows || [];

    // Get tools for this set
    const toolsQuery = `
      SELECT
        t.tool_id,
        t.tool_name,
        t.description,
        t.category,
        t.image_url,
        st.quantity AS quantity_required,
        st.is_optional
      FROM set_tools st
      JOIN tools t ON st.tool_id = t.tool_id
      WHERE st.set_id = ?
      ORDER BY t.tool_name
    `;

    const toolsResult = await connectionManager.query(toolsQuery, [id]);
    set.tools = toolsResult.rows || [];

    console.log(`✅ Found set: ${set.name} with ${set.parts.length} parts and ${set.tools.length} tools`);

    res.json({
      success: true,
      set: set
    });

  } catch (error) {
    console.error('❌ Error fetching shop set:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch shop set',
        details: error.message
      }
    });
  }
});

module.exports = router;
