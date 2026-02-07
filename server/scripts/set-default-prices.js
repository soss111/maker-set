#!/usr/bin/env node

/**
 * Script to set default prices for all sets that have null or 0 base_price
 * This ensures all sets have a reasonable default price for the store
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'makerset_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function setDefaultPrices() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding sets with null or zero prices...');
    
    // Get all sets with null or zero prices
    const result = await client.query(`
      SELECT s.set_id, st.name, s.category, s.difficulty_level 
      FROM sets s
      LEFT JOIN set_translations st ON s.set_id = st.set_id
      LEFT JOIN languages l ON st.language_id = l.language_id AND l.language_code = 'en'
      WHERE s.base_price IS NULL OR s.base_price = 0
      ORDER BY s.set_id
    `);
    
    console.log(`📊 Found ${result.rows.length} sets without prices`);
    
    if (result.rows.length === 0) {
      console.log('✅ All sets already have prices set');
      return;
    }
    
    // Set default prices based on category and difficulty
    const defaultPrices = {
      'electronics': { 'beginner': 25.00, 'intermediate': 35.00, 'advanced': 45.00 },
      'woodwork': { 'beginner': 20.00, 'intermediate': 30.00, 'advanced': 40.00 },
      'games': { 'beginner': 15.00, 'intermediate': 25.00, 'advanced': 35.00 },
      'mechanical': { 'beginner': 30.00, 'intermediate': 40.00, 'advanced': 50.00 },
      'multimaterial': { 'beginner': 35.00, 'intermediate': 45.00, 'advanced': 55.00 },
      'default': { 'beginner': 25.00, 'intermediate': 35.00, 'advanced': 45.00 }
    };
    
    let updatedCount = 0;
    
    for (const set of result.rows) {
      const category = set.category || 'default';
      const difficulty = set.difficulty_level || 'beginner';
      
      const categoryPrices = defaultPrices[category] || defaultPrices.default;
      const price = categoryPrices[difficulty] || categoryPrices.beginner;
      
      await client.query(
        'UPDATE sets SET base_price = $1, updated_at = CURRENT_TIMESTAMP WHERE set_id = $2',
        [price, set.set_id]
      );
      
      console.log(`💰 Set ${set.set_id} (${set.name || 'Unnamed'}) - ${category}/${difficulty}: €${price.toFixed(2)}`);
      updatedCount++;
    }
    
    console.log(`✅ Updated ${updatedCount} sets with default prices`);
    
    // Show summary
    const summaryResult = await client.query(`
      SELECT 
        category,
        difficulty_level,
        COUNT(*) as count,
        AVG(base_price) as avg_price,
        MIN(base_price) as min_price,
        MAX(base_price) as max_price
      FROM sets 
      WHERE base_price > 0
      GROUP BY category, difficulty_level
      ORDER BY category, difficulty_level
    `);
    
    console.log('\n📊 Price Summary:');
    console.log('Category          | Difficulty   | Count | Avg Price | Min Price | Max Price');
    console.log('------------------|--------------|-------|-----------|-----------|----------');
    
    for (const row of summaryResult.rows) {
      console.log(
        `${(row.category || 'Unknown').padEnd(17)} | ${(row.difficulty_level || 'Unknown').padEnd(12)} | ${row.count.toString().padStart(5)} | €${parseFloat(row.avg_price).toFixed(2).padStart(7)} | €${parseFloat(row.min_price).toFixed(2).padStart(7)} | €${parseFloat(row.max_price).toFixed(2).padStart(7)}`
      );
    }
    
  } catch (error) {
    console.error('❌ Error setting default prices:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
setDefaultPrices().catch(console.error);
