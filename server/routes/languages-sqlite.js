const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Get all languages
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM languages ORDER BY language_code';
    const result = await db.query(query);

    res.json({ languages: result.rows });

  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
});

// Get language by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM languages WHERE language_id = ?';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Language not found' });
    }

    res.json({ language: result.rows[0] });

  } catch (error) {
    console.error('Error fetching language:', error);
    res.status(500).json({ error: 'Failed to fetch language' });
  }
});

// Create new language
router.post('/', async (req, res) => {
  try {
    const {
      language_code,
      language_name,
      native_name,
      is_active = true
    } = req.body;

    const query = `
      INSERT INTO languages (language_code, language_name, native_name, is_active)
      VALUES (?, ?, ?, ?)
    `;

    const result = await db.query(query, [language_code, language_name, native_name, is_active]);
    const languageId = result.rows[0].id || result.lastID;

    res.status(201).json({
      message: 'Language created successfully',
      language_id: languageId
    });

  } catch (error) {
    console.error('Error creating language:', error);
    res.status(500).json({ error: 'Failed to create language' });
  }
});

// Update language
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      language_code,
      language_name,
      native_name,
      is_active
    } = req.body;

    const query = `
      UPDATE languages 
      SET language_code = ?, language_name = ?, native_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE language_id = ?
    `;

    await db.query(query, [language_code, language_name, native_name, is_active, id]);

    res.json({ message: 'Language updated successfully' });

  } catch (error) {
    console.error('Error updating language:', error);
    res.status(500).json({ error: 'Failed to update language' });
  }
});

// Delete language
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if language is used in translations
    const translationsResult = await db.query('SELECT COUNT(*) as count FROM set_translations WHERE language_id = ?', [id]);

    if (translationsResult.rows[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete language that has translations' 
      });
    }

    await db.query('DELETE FROM languages WHERE language_id = ?', [id]);

    res.json({ message: 'Language deleted successfully' });

  } catch (error) {
    console.error('Error deleting language:', error);
    res.status(500).json({ error: 'Failed to delete language' });
  }
});

module.exports = router;
