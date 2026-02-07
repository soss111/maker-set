const express = require('express');
const router = express.Router();
const db = require('../models/database');

// GET /api/inventory/parts - Get all parts with inventory details
router.get('/parts', async (req, res) => {
  try {
    const query = `
      SELECT 
        part_id,
        part_number,
        name,
        category,
        unit_of_measure,
        unit_cost,
        stock_quantity,
        minimum_stock_level,
        supplier,
        supplier_part_number,
        image_url,
        translations
      FROM parts 
      ORDER BY COALESCE(name, part_number, '')
    `;
    
    const result = await db.query(query);
    
    // Parse translations and extract English name
    const processedParts = result.rows.map(part => {
      let part_name = part.name || part.part_number || '';
      if (part.translations) {
        try {
          const translations = JSON.parse(part.translations);
          const englishTranslation = translations.find(t => t.language_code === 'en');
          if (englishTranslation) {
            part_name = englishTranslation.part_name || part_name;
          }
        } catch (error) {
          console.error('Error parsing translations for part', part.part_id, ':', error);
        }
      }
      
      return {
        ...part,
        part_name,
        inventory_value: part.stock_quantity * part.unit_cost,
        is_low_stock: part.stock_quantity <= part.minimum_stock_level && part.minimum_stock_level > 0,
        is_out_of_stock: part.stock_quantity === 0
      };
    });
    
    res.json({ parts: processedParts });
  } catch (error) {
    console.error('Error fetching inventory parts:', error);
    res.status(500).json({ error: 'Failed to fetch inventory parts' });
  }
});

// POST /api/inventory/parts/:id/adjust - Adjust stock quantity
router.post('/parts/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment_type, quantity, reason, notes } = req.body;
    
    if (!adjustment_type || !quantity || quantity <= 0) {
      return res.status(400).json({ 
        error: 'adjustment_type and positive quantity are required' 
      });
    }
    
    // Get current part details
    const partQuery = 'SELECT * FROM parts WHERE part_id = ?';
    const partResult = await db.query(partQuery, [id]);
    
    if (partResult.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    const part = partResult.rows[0];
    const currentStock = part.stock_quantity;
    let newStock;
    
    // Calculate new stock based on adjustment type
    switch (adjustment_type) {
      case 'add':
        newStock = currentStock + quantity;
        break;
      case 'remove':
        newStock = currentStock - quantity;
        if (newStock < 0) {
          return res.status(400).json({ 
            error: 'Cannot remove more stock than available' 
          });
        }
        break;
      case 'set':
        newStock = quantity;
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid adjustment_type. Use: add, remove, or set' 
        });
    }
    
    // Update stock quantity
    const updateQuery = 'UPDATE parts SET stock_quantity = ? WHERE part_id = ?';
    await db.run(updateQuery, [newStock, id]);
    
    // Record inventory transaction
    const transactionQuery = `
      INSERT INTO inventory_transactions (
        part_id, transaction_type, quantity, previous_stock, new_stock, 
        reason, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    await db.run(transactionQuery, [
      id, adjustment_type, quantity, currentStock, newStock, 
      reason || '', notes || ''
    ]);
    
    res.json({
      message: 'Stock adjusted successfully',
      part_id: id,
      previous_stock: currentStock,
      new_stock: newStock,
      adjustment: adjustment_type === 'add' ? `+${quantity}` : 
                  adjustment_type === 'remove' ? `-${quantity}` : 
                  `set to ${quantity}`
    });
    
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

// POST /api/inventory/parts/:id/income - Add new stock income
router.post('/parts/:id/income', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, supplier, cost_per_unit, purchase_date, notes } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ 
        error: 'Positive quantity is required' 
      });
    }
    
    // Get current part details
    const partQuery = 'SELECT * FROM parts WHERE part_id = ?';
    const partResult = await db.query(partQuery, [id]);
    
    if (partResult.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found' });
    }
    
    const part = partResult.rows[0];
    const currentStock = part.stock_quantity;
    const newStock = currentStock + quantity;
    
    // Update stock quantity
    const updateQuery = 'UPDATE parts SET stock_quantity = ? WHERE part_id = ?';
    await db.run(updateQuery, [newStock, id]);
    
    // Update supplier and cost if provided
    if (supplier || cost_per_unit) {
      const updatePartQuery = `
        UPDATE parts 
        SET supplier = COALESCE(?, supplier), 
            unit_cost = COALESCE(?, unit_cost)
        WHERE part_id = ?
      `;
      await db.run(updatePartQuery, [supplier, cost_per_unit, id]);
    }
    
    // Record inventory transaction
    const transactionQuery = `
      INSERT INTO inventory_transactions (
        part_id, transaction_type, quantity, previous_stock, new_stock, 
        reason, notes, supplier, cost_per_unit, purchase_date, created_at
      ) VALUES (?, 'income', ?, ?, ?, 'New stock income', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    await db.run(transactionQuery, [
      id, quantity, currentStock, newStock, 
      notes || '', supplier || '', cost_per_unit || null, purchase_date || null
    ]);
    
    res.json({
      message: 'Stock income recorded successfully',
      part_id: id,
      previous_stock: currentStock,
      new_stock: newStock,
      added_quantity: quantity,
      total_cost: cost_per_unit ? quantity * cost_per_unit : null
    });
    
  } catch (error) {
    console.error('Error recording stock income:', error);
    res.status(500).json({ error: 'Failed to record stock income' });
  }
});

// GET /api/inventory/parts/:id/history - Get inventory transaction history
router.get('/parts/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT 
        it.*,
        p.part_number,
        p.name as part_name
      FROM inventory_transactions it
      JOIN parts p ON it.part_id = p.part_id
      WHERE it.part_id = ?
      ORDER BY it.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const result = await db.query(query, [id, parseInt(limit), parseInt(offset)]);
    
    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    res.status(500).json({ error: 'Failed to fetch inventory history' });
  }
});

// GET /api/inventory/summary - Get inventory summary statistics
router.get('/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_parts,
        SUM(stock_quantity) as total_stock,
        SUM(stock_quantity * unit_cost) as total_value,
        COUNT(CASE WHEN stock_quantity <= minimum_stock_level AND minimum_stock_level > 0 THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_count
      FROM parts
    `;
    
    const result = await db.query(query);
    const summary = result.rows[0];
    
    res.json({
      total_parts: parseInt(summary.total_parts),
      total_stock: parseInt(summary.total_stock),
      total_value: parseFloat(summary.total_value || 0),
      low_stock_count: parseInt(summary.low_stock_count),
      out_of_stock_count: parseInt(summary.out_of_stock_count)
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ error: 'Failed to fetch inventory summary' });
  }
});

module.exports = router;
