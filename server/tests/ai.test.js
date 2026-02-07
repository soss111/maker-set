/**
 * AI Components Test Suite
 *
 * Tests for AI-powered features:
 * - Inventory Optimization
 * - Set Builder Agent
 * - Performance and accuracy
 */

const inventoryAI = require('../ai/inventory-optimization');
const setBuilderAI = require('../ai/set-builder-agent');
const pool = require('../models/database');

describe('AI Components Tests', () => {
  let testData = {};

  beforeAll(async() => {
    // Setup test data for AI testing
    console.log('🤖 Setting up AI test data...');

    // Create test parts with different usage patterns
    const partsResult = await pool.query(`
      INSERT INTO parts (part_number, category, unit_cost, stock_quantity, minimum_stock_level)
      VALUES 
        ('AI-TEST-HIGH', 'electronic', 25.00, 5, 10),
        ('AI-TEST-MED', 'mechanical', 15.00, 50, 20),
        ('AI-TEST-LOW', 'material', 5.00, 200, 50)
      RETURNING part_id, part_number
    `);

    testData.parts = partsResult.rows;

    // Create test sets
    const setsResult = await pool.query(`
      INSERT INTO sets (category, difficulty_level, recommended_age_min, recommended_age_max)
      VALUES 
        ('electronics', 'beginner', 8, 12),
        ('mechanical', 'intermediate', 10, 16),
        ('crafts', 'advanced', 12, 18)
      RETURNING set_id, category
    `);

    testData.sets = setsResult.rows;

    // Create test orders with different patterns
    const ordersResult = await pool.query(`
      INSERT INTO orders (order_number, customer_id, provider_id, total_amount, status)
      VALUES 
        ('AI-TEST-001', 2, 3, 100.00, 'pending'),
        ('AI-TEST-002', 2, 3, 150.00, 'confirmed'),
        ('AI-TEST-003', 2, 3, 200.00, 'processing')
      RETURNING order_id, order_number
    `);

    testData.orders = ordersResult.rows;

    // Create set-parts relationships
    for (let i = 0; i < testData.sets.length; i++) {
      await pool.query(`
        INSERT INTO set_parts (set_id, part_id, quantity, is_optional)
        VALUES ($1, $2, $3, false)
      `, [testData.sets[i].set_id, testData.parts[i].part_id, (i + 1) * 2]);
    }

    // Create order items
    for (let i = 0; i < testData.orders.length; i++) {
      await pool.query(`
        INSERT INTO order_items (order_id, set_id, quantity, unit_price, line_total)
        VALUES ($1, $2, $3, 50.00, $4)
      `, [testData.orders[i].order_id, testData.sets[i % testData.sets.length].set_id, i + 1, (i + 1) * 50]);
    }

    console.log('✅ AI test data setup complete');
  });

  afterAll(async() => {
    // Cleanup AI test data
    console.log('🧹 Cleaning up AI test data...');

    if (testData.orders) {
      await pool.query('DELETE FROM order_items WHERE order_id = ANY($1)',
        [testData.orders.map(o => o.order_id)]);
      await pool.query('DELETE FROM orders WHERE order_id = ANY($1)',
        [testData.orders.map(o => o.order_id)]);
    }

    if (testData.sets) {
      await pool.query('DELETE FROM set_parts WHERE set_id = ANY($1)',
        [testData.sets.map(s => s.set_id)]);
      await pool.query('DELETE FROM set_translations WHERE set_id = ANY($1)',
        [testData.sets.map(s => s.set_id)]);
      await pool.query('DELETE FROM sets WHERE set_id = ANY($1)',
        [testData.sets.map(s => s.set_id)]);
    }

    if (testData.parts) {
      await pool.query('DELETE FROM part_translations WHERE part_id = ANY($1)',
        [testData.parts.map(p => p.part_id)]);
      await pool.query('DELETE FROM parts WHERE part_id = ANY($1)',
        [testData.parts.map(p => p.part_id)]);
    }

    console.log('✅ AI test data cleanup complete');
  });

  describe('Inventory Optimization AI Tests', () => {
    test('Should analyze demand patterns correctly', async() => {
      const analysis = await inventoryAI.analyzeInventoryOptimization();

      expect(analysis).toHaveProperty('demandForecast');
      expect(analysis).toHaveProperty('reorderOptimization');
      expect(analysis).toHaveProperty('seasonalAnalysis');
      expect(analysis).toHaveProperty('riskAssessment');
      expect(analysis).toHaveProperty('costOptimization');
      expect(analysis).toHaveProperty('recommendations');
      expect(analysis).toHaveProperty('timestamp');

      // Check that demand forecast has reasonable data
      expect(Array.isArray(analysis.demandForecast)).toBe(true);
      analysis.demandForecast.forEach(item => {
        expect(item).toHaveProperty('part_id');
        expect(item).toHaveProperty('part_name');
        expect(item).toHaveProperty('total_usage');
        expect(item).toHaveProperty('predicted_30_day_demand');
        expect(typeof item.predicted_30_day_demand).toBe('number');
        expect(item.predicted_30_day_demand).toBeGreaterThanOrEqual(0);
      });
    });

    test('Should calculate optimal reorder points', async() => {
      const analysis = await inventoryAI.analyzeInventoryOptimization();

      expect(Array.isArray(analysis.reorderOptimization)).toBe(true);
      analysis.reorderOptimization.forEach(item => {
        expect(item).toHaveProperty('part_id');
        expect(item).toHaveProperty('part_name');
        expect(item).toHaveProperty('stock_quantity');
        expect(item).toHaveProperty('ai_optimal_reorder_point');
        expect(item).toHaveProperty('ai_economic_order_quantity');
        expect(item).toHaveProperty('risk_level');

        // Validate risk level values
        expect(['Critical', 'High Risk', 'Medium Risk', 'Low Risk']).toContain(item.risk_level);

        // Validate quantities are positive
        expect(item.ai_optimal_reorder_point).toBeGreaterThanOrEqual(0);
        expect(item.ai_economic_order_quantity).toBeGreaterThanOrEqual(0);
      });
    });

    test('Should assess inventory risks accurately', async() => {
      const analysis = await inventoryAI.analyzeInventoryOptimization();

      expect(Array.isArray(analysis.riskAssessment)).toBe(true);
      analysis.riskAssessment.forEach(item => {
        expect(item).toHaveProperty('part_id');
        expect(item).toHaveProperty('part_name');
        expect(item).toHaveProperty('risk_level');
        expect(item).toHaveProperty('days_of_stock_remaining');
        expect(item).toHaveProperty('impact_score');
        expect(item).toHaveProperty('recommendation_priority');

        // Validate risk levels
        expect(['Critical - Out of Stock', 'High Risk - Less than 1 week',
          'Medium Risk - Less than 1 month', 'Low Risk - Less than 3 months',
          'Very Low Risk - More than 3 months']).toContain(item.risk_level);

        // Validate impact scores
        expect(item.impact_score).toBeGreaterThanOrEqual(0);
        expect(item.impact_score).toBeLessThanOrEqual(3);
      });
    });

    test('Should generate meaningful recommendations', async() => {
      const analysis = await inventoryAI.analyzeInventoryOptimization();

      expect(Array.isArray(analysis.recommendations)).toBe(true);
      analysis.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('action');

        // Validate recommendation types
        expect(['URGENT', 'COST_OPTIMIZATION', 'SEASONAL']).toContain(rec.type);

        // Validate priorities
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(rec.priority);
      });
    });

    test('Should provide dashboard summary', async() => {
      const summary = await inventoryAI.getDashboardSummary();

      expect(summary).toHaveProperty('totalParts');
      expect(summary).toHaveProperty('criticalRiskItems');
      expect(summary).toHaveProperty('highValueItems');
      expect(summary).toHaveProperty('seasonalItems');
      expect(summary).toHaveProperty('totalInventoryValue');
      expect(summary).toHaveProperty('totalCarryingCost');
      expect(summary).toHaveProperty('recommendations');
      expect(summary).toHaveProperty('lastUpdated');

      // Validate numeric values
      expect(typeof summary.totalParts).toBe('number');
      expect(summary.totalParts).toBeGreaterThanOrEqual(0);
      expect(typeof summary.totalInventoryValue).toBe('number');
      expect(summary.totalInventoryValue).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Set Builder AI Tests', () => {
    test('Should analyze set design comprehensively', async() => {
      const setData = {
        name: 'AI Test Set',
        description: 'A comprehensive test set for AI analysis',
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            category: 'electronic'
          },
          {
            part_id: testData.parts[1].part_id,
            quantity: 1,
            category: 'mechanical'
          }
        ]
      };

      const analysis = await setBuilderAI.analyzeSetDesign(setData);

      expect(analysis).toHaveProperty('partRecommendations');
      expect(analysis).toHaveProperty('costOptimization');
      expect(analysis).toHaveProperty('educationalValue');
      expect(analysis).toHaveProperty('safetyAnalysis');
      expect(analysis).toHaveProperty('completenessCheck');
      expect(analysis).toHaveProperty('performancePrediction');
      expect(analysis).toHaveProperty('suggestions');
      expect(analysis).toHaveProperty('timestamp');
    });

    test('Should provide intelligent part recommendations', async() => {
      const setData = {
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12
      };

      const recommendations = await setBuilderAI.getPartRecommendations(setData);

      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('part_id');
        expect(rec).toHaveProperty('part_name');
        expect(rec).toHaveProperty('part_category');
        expect(rec).toHaveProperty('unit_cost');
        expect(rec).toHaveProperty('recommendation_type');
        expect(rec).toHaveProperty('reason');
        expect(rec).toHaveProperty('stock_status');

        // Validate recommendation types
        expect(['Essential', 'Cost Effective']).toContain(rec.recommendation_type);

        // Validate stock status
        expect(['Available', 'Low Stock', 'Out of Stock']).toContain(rec.stock_status);
      });
    });

    test('Should analyze educational value correctly', async() => {
      const setData = {
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const analysis = await setBuilderAI.analyzeSetDesign(setData);

      expect(analysis.educationalValue).toHaveProperty('educationalScore');
      expect(analysis.educationalValue).toHaveProperty('educationalLevel');
      expect(analysis.educationalValue).toHaveProperty('factors');
      expect(analysis.educationalValue).toHaveProperty('recommendations');

      // Validate score range
      expect(analysis.educationalValue.educationalScore).toBeGreaterThanOrEqual(0);
      expect(analysis.educationalValue.educationalScore).toBeLessThanOrEqual(100);

      // Validate educational level
      expect(['Excellent', 'Good', 'Fair', 'Needs Improvement']).toContain(
        analysis.educationalValue.educationalLevel
      );
    });

    test('Should perform safety analysis', async() => {
      const setData = {
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const analysis = await setBuilderAI.analyzeSetDesign(setData);

      expect(analysis.safetyAnalysis).toHaveProperty('safetyScore');
      expect(analysis.safetyAnalysis).toHaveProperty('safetyLevel');
      expect(analysis.safetyAnalysis).toHaveProperty('concerns');
      expect(analysis.safetyAnalysis).toHaveProperty('recommendations');

      // Validate score range
      expect(analysis.safetyAnalysis.safetyScore).toBeGreaterThanOrEqual(0);
      expect(analysis.safetyAnalysis.safetyScore).toBeLessThanOrEqual(100);

      // Validate safety level
      expect(['Very Safe', 'Safe', 'Caution Required', 'High Risk']).toContain(
        analysis.safetyAnalysis.safetyLevel
      );
    });

    test('Should check completeness accurately', async() => {
      const setData = {
        name: 'Complete Test Set',
        description: 'A complete test set',
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const analysis = await setBuilderAI.analyzeSetDesign(setData);

      expect(analysis.completenessCheck).toHaveProperty('completenessScore');
      expect(analysis.completenessCheck).toHaveProperty('completenessLevel');
      expect(analysis.completenessCheck).toHaveProperty('issues');
      expect(analysis.completenessCheck).toHaveProperty('recommendations');

      // Validate score range
      expect(analysis.completenessCheck.completenessScore).toBeGreaterThanOrEqual(0);
      expect(analysis.completenessCheck.completenessScore).toBeLessThanOrEqual(100);

      // Validate completeness level
      expect(['Complete', 'Mostly Complete', 'Partially Complete', 'Incomplete']).toContain(
        analysis.completenessCheck.completenessLevel
      );
    });

    test('Should predict performance metrics', async() => {
      const setData = {
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const analysis = await setBuilderAI.analyzeSetDesign(setData);

      expect(analysis.performancePrediction).toHaveProperty('predictedSuccessRate');
      expect(analysis.performancePrediction).toHaveProperty('estimatedCompletionTime');
      expect(analysis.performancePrediction).toHaveProperty('predictedPopularity');
      expect(analysis.performancePrediction).toHaveProperty('confidence');

      // Validate success rate range
      expect(analysis.performancePrediction.predictedSuccessRate).toBeGreaterThanOrEqual(0);
      expect(analysis.performancePrediction.predictedSuccessRate).toBeLessThanOrEqual(100);

      // Validate completion time
      expect(analysis.performancePrediction.estimatedCompletionTime).toBeGreaterThan(0);

      // Validate popularity
      expect(analysis.performancePrediction.predictedPopularity).toBeGreaterThanOrEqual(0);
      expect(analysis.performancePrediction.predictedPopularity).toBeLessThanOrEqual(100);
    });

    test('Should generate actionable suggestions', async() => {
      const setData = {
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const analysis = await setBuilderAI.analyzeSetDesign(setData);

      expect(Array.isArray(analysis.suggestions)).toBe(true);
      analysis.suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('title');
        expect(suggestion).toHaveProperty('description');
        expect(suggestion).toHaveProperty('action');

        // Validate suggestion types
        expect(['COST_OPTIMIZATION', 'EDUCATIONAL_VALUE', 'SAFETY', 'COMPLETENESS', 'PERFORMANCE']).toContain(suggestion.type);

        // Validate priorities
        expect(['High', 'Medium', 'Low']).toContain(suggestion.priority);
      });
    });
  });

  describe('AI Performance Tests', () => {
    test('Inventory analysis should complete within reasonable time', async() => {
      const startTime = Date.now();

      await inventoryAI.analyzeInventoryOptimization();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('Set builder analysis should complete within reasonable time', async() => {
      const setData = {
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const startTime = Date.now();

      await setBuilderAI.analyzeSetDesign(setData);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('AI recommendations should be consistent across multiple runs', async() => {
      const setData = {
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const analysis1 = await setBuilderAI.analyzeSetDesign(setData);
      const analysis2 = await setBuilderAI.analyzeSetDesign(setData);

      // Educational score should be consistent
      expect(analysis1.educationalValue.educationalScore).toBe(analysis2.educationalValue.educationalScore);

      // Safety score should be consistent
      expect(analysis1.safetyAnalysis.safetyScore).toBe(analysis2.safetyAnalysis.safetyScore);

      // Completeness score should be consistent
      expect(analysis1.completenessCheck.completenessScore).toBe(analysis2.completenessCheck.completenessScore);
    });
  });
});
