const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all parts with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, sort_by = 'name', sort_order = 'ASC' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT *
      FROM parts
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await db.query(query, queryParams);

    // Parse translations and extract English name/description
    const processedParts = result.rows.map(part => {
      let part_name = part.part_name;
      let description = part.description;
      
      // If translations exist, extract English name and description
      if (part.translations) {
        try {
          const translations = JSON.parse(part.translations);
          const englishTranslation = translations.find(t => t.language_code === 'en');
          if (englishTranslation) {
            part_name = englishTranslation.part_name || part_name;
            description = englishTranslation.description || description;
          }
        } catch (error) {
          console.error('Error parsing translations for part', part.part_id, ':', error);
        }
      }
      
      return {
        ...part,
        part_name,
        description
      };
    });

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM parts
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    res.json({
      parts: processedParts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Failed to fetch parts' });
  }
});

// Get next part number for a category
router.get('/next-number', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT COALESCE(MAX(CAST(SUBSTR(part_number, -3) AS INTEGER)), 0) + 1 as next_number 
      FROM parts 
      WHERE part_number GLOB '[A-Z][A-Z][A-Z][0-9][0-9][0-9]'
    `;
    
    const params = [];
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    const result = await db.query(query, params);
    const nextNumber = result.rows[0].next_number;
    
    // Generate part number with category prefix
    const prefix = category ? category.toUpperCase().substring(0, 3) : 'PRT';
    const formattedNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    
    res.json({ next_number: formattedNumber });
  } catch (error) {
    console.error('Error getting next part number:', error);
    res.status(500).json({ error: 'Failed to get next part number' });
  }
});

// Get part by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM parts WHERE part_id = ?';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }

    const part = result.rows[0];
    
    // Parse translations and extract English name/description
    let part_name = part.part_name;
    let description = part.description;
    
    if (part.translations) {
      try {
        const translations = JSON.parse(part.translations);
        const englishTranslation = translations.find(t => t.language_code === 'en');
        if (englishTranslation) {
          part_name = englishTranslation.part_name || part_name;
          description = englishTranslation.description || description;
        }
      } catch (error) {
        console.error('Error parsing translations for part', part.part_id, ':', error);
      }
    }
    
    const processedPart = {
      ...part,
      part_name,
      description
    };

    res.json({ part: processedPart });

  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: 'Failed to fetch part' });
  }
});

// Create new part
router.post('/', async (req, res) => {
  try {
    const {
      part_number,
      category,
      unit_of_measure,
      unit_cost,
      supplier,
      supplier_part_number,
      stock_quantity,
      minimum_stock_level,
      image_url,
      instruction_pdf,
      drawing_pdf,
      assembly_notes,
      safety_notes,
      translations
    } = req.body;

    // Insert the main part record with translations
    const translationsJson = translations && translations.length > 0 ? JSON.stringify(translations) : null;
    
    const query = `
      INSERT INTO parts (
        part_number, category, unit_of_measure, unit_cost, supplier, 
        supplier_part_number, stock_quantity, minimum_stock_level, 
        image_url, instruction_pdf, drawing_pdf, assembly_notes, safety_notes, translations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.run(query, [
      part_number, category, unit_of_measure, unit_cost, supplier,
      supplier_part_number, stock_quantity, minimum_stock_level,
      image_url, instruction_pdf, drawing_pdf, assembly_notes, safety_notes, translationsJson
    ]);

    const partId = result.lastID;

    res.status(201).json({
      message: 'Part created successfully',
      part_id: partId
    });

  } catch (error) {
    console.error('Error creating part:', error);
    res.status(500).json({ error: 'Failed to create part' });
  }
});

// Update part
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      part_number,
      category,
      unit_of_measure,
      unit_cost,
      supplier,
      supplier_part_number,
      stock_quantity,
      minimum_stock_level,
      image_url,
      instruction_pdf,
      drawing_pdf,
      assembly_notes,
      safety_notes,
      translations
    } = req.body;

    const query = `
      UPDATE parts 
      SET part_number = ?, category = ?, unit_of_measure = ?, unit_cost = ?, 
          supplier = ?, supplier_part_number = ?, stock_quantity = ?, 
          minimum_stock_level = ?, image_url = ?, instruction_pdf = ?, 
          drawing_pdf = ?, assembly_notes = ?, safety_notes = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE part_id = ?
    `;

    await db.query(query, [
      part_number, category, unit_of_measure, unit_cost, supplier,
      supplier_part_number, stock_quantity, minimum_stock_level,
      image_url, instruction_pdf, drawing_pdf, assembly_notes, safety_notes, id
    ]);

    // Update translations if provided
    if (translations && translations.length > 0) {
      // Update the translations column in the parts table
      const translationsJson = JSON.stringify(translations);
      await db.query('UPDATE parts SET translations = ? WHERE part_id = ?', [translationsJson, id]);
    }

    res.json({ message: 'Part updated successfully' });

  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({ error: 'Failed to update part' });
  }
});

// Delete part
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if part is used in any sets
    const setsResult = await db.query('SELECT COUNT(*) as count FROM set_parts WHERE part_id = ?', [id]);

    if (setsResult.rows[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete part that is used in sets' 
      });
    }

    await db.query('DELETE FROM parts WHERE part_id = ?', [id]);

    res.json({ message: 'Part deleted successfully' });

  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({ error: 'Failed to delete part' });
  }
});

module.exports = router;
