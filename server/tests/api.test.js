/**
 * Comprehensive Test Suite for MakerLab Management System
 *
 * This test suite covers:
 * - API endpoint functionality
 * - Database operations
 * - AI components
 * - Error handling
 * - Data validation
 */

const request = require('supertest');
const express = require('express');
const pool = require('./models/database');

// Import routes
const ordersRouter = require('./routes/orders');
const setsRouter = require('./routes/sets');
const partsRouter = require('./routes/parts');
const toolsRouter = require('./routes/tools');
const aiInventoryRouter = require('./routes/ai-inventory');
const aiSetBuilderRouter = require('./routes/ai-set-builder');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/orders', ordersRouter);
app.use('/api/sets', setsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/ai/inventory', aiInventoryRouter);
app.use('/api/ai/set-builder', aiSetBuilderRouter);

describe('MakerLab Management System Tests', () => {
  let testOrderId;
  let testSetId;
  let testPartId;
  let testToolId;

  beforeAll(async() => {
    // Setup test data
    console.log('🧪 Setting up test data...');

    // Create test set
    const setResult = await pool.query(`
      INSERT INTO sets (category, difficulty_level, recommended_age_min, recommended_age_max, estimated_duration_minutes)
      VALUES ('electronics', 'beginner', 8, 12, 60)
      RETURNING set_id
    `);
    testSetId = setResult.rows[0].set_id;

    // Create test part
    const partResult = await pool.query(`
      INSERT INTO parts (part_number, category, unit_of_measure, unit_cost, stock_quantity, minimum_stock_level)
      VALUES ('TEST-PART-001', 'electronic', 'piece', 10.50, 100, 10)
      RETURNING part_id
    `);
    testPartId = partResult.rows[0].part_id;

    // Create test tool
    const toolResult = await pool.query(`
      INSERT INTO tools (tool_number, category, tool_type, condition_status, location)
      VALUES ('TEST-TOOL-001', 'hand_tool', 'screwdriver', 'good', 'Toolbox A')
      RETURNING tool_id
    `);
    testToolId = toolResult.rows[0].tool_id;

    // Create test order
    const orderResult = await pool.query(`
      INSERT INTO orders (order_number, customer_id, provider_id, total_amount, status)
      VALUES ('TEST-ORD-001', 2, 3, 50.00, 'pending')
      RETURNING order_id
    `);
    testOrderId = orderResult.rows[0].order_id;

    console.log('✅ Test data setup complete');
  });

  afterAll(async() => {
    // Cleanup test data
    console.log('🧹 Cleaning up test data...');

    if (testOrderId) {
      await pool.query('DELETE FROM order_items WHERE order_id = $1', [testOrderId]);
      await pool.query('DELETE FROM orders WHERE order_id = $1', [testOrderId]);
    }

    if (testSetId) {
      await pool.query('DELETE FROM set_parts WHERE set_id = $1', [testSetId]);
      await pool.query('DELETE FROM set_tools WHERE set_id = $1', [testSetId]);
      await pool.query('DELETE FROM set_translations WHERE set_id = $1', [testSetId]);
      await pool.query('DELETE FROM sets WHERE set_id = $1', [testSetId]);
    }

    if (testPartId) {
      await pool.query('DELETE FROM part_translations WHERE part_id = $1', [testPartId]);
      await pool.query('DELETE FROM parts WHERE part_id = $1', [testPartId]);
    }

    if (testToolId) {
      await pool.query('DELETE FROM tool_translations WHERE tool_id = $1', [testToolId]);
      await pool.query('DELETE FROM tools WHERE tool_id = $1', [testToolId]);
    }

    console.log('✅ Test data cleanup complete');
  });

  describe('Orders API Tests', () => {
    test('GET /api/orders - Should return orders list', async() => {
      const response = await request(app)
        .get('/api/orders')
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    test('GET /api/orders/:id - Should return specific order', async() => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body.order.order_id).toBe(testOrderId);
    });

    test('POST /api/orders - Should create new order', async() => {
      const newOrder = {
        customer_first_name: 'Test',
        customer_last_name: 'Customer',
        customer_email: 'test@example.com',
        company_name: 'Test Company',
        shipping_address: '123 Test St',
        notes: 'Test order',
        items: [
          {
            set_id: testSetId,
            quantity: 2
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .send(newOrder)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });

    test('PUT /api/orders/:id - Should update order', async() => {
      const updateData = {
        shipping_address: 'Updated Test Address',
        notes: 'Updated test notes',
        items: [
          {
            set_id: testSetId,
            quantity: 3
          }
        ]
      };

      const response = await request(app)
        .put(`/api/orders/${testOrderId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });

    test('GET /api/orders/:id/packing-list - Should generate packing list', async() => {
      // First add items to the order
      await pool.query(`
        INSERT INTO order_items (order_id, set_id, quantity, unit_price, line_total)
        VALUES ($1, $2, 1, 50.00, 50.00)
      `, [testOrderId, testSetId]);

      const response = await request(app)
        .get(`/api/orders/${testOrderId}/packing-list`)
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('packingList');
      expect(Array.isArray(response.body.packingList)).toBe(true);
    });

    test('DELETE /api/orders/:id - Should delete order', async() => {
      const response = await request(app)
        .delete(`/api/orders/${testOrderId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });
  });

  describe('Sets API Tests', () => {
    test('GET /api/sets - Should return sets list', async() => {
      const response = await request(app)
        .get('/api/sets')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/sets - Should create new set', async() => {
      const newSet = {
        category: 'electronics',
        difficulty_level: 'intermediate',
        recommended_age_min: 10,
        recommended_age_max: 16,
        estimated_duration_minutes: 90,
        translations: [
          {
            language_code: 'en',
            name: 'Test Electronic Set',
            description: 'A test electronic set for testing'
          }
        ]
      };

      const response = await request(app)
        .post('/api/sets')
        .send(newSet)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });
  });

  describe('Parts API Tests', () => {
    test('GET /api/parts - Should return parts list', async() => {
      const response = await request(app)
        .get('/api/parts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/parts - Should create new part', async() => {
      const newPart = {
        part_number: 'TEST-PART-002',
        category: 'electronic',
        unit_of_measure: 'piece',
        unit_cost: 15.75,
        stock_quantity: 50,
        minimum_stock_level: 5,
        translations: [
          {
            language_code: 'en',
            part_name: 'Test Electronic Part',
            description: 'A test electronic part for testing'
          }
        ]
      };

      const response = await request(app)
        .post('/api/parts')
        .send(newPart)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });
  });

  describe('Tools API Tests', () => {
    test('GET /api/tools - Should return tools list', async() => {
      const response = await request(app)
        .get('/api/tools')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/tools - Should create new tool', async() => {
      const newTool = {
        tool_number: 'TEST-TOOL-002',
        category: 'hand_tool',
        tool_type: 'pliers',
        condition_status: 'good',
        location: 'Toolbox B',
        translations: [
          {
            language_code: 'en',
            tool_name: 'Test Pliers',
            description: 'A test pair of pliers for testing'
          }
        ]
      };

      const response = await request(app)
        .post('/api/tools')
        .send(newTool)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });
  });

  describe('AI Inventory Optimization Tests', () => {
    test('GET /api/ai/inventory/analysis - Should return AI analysis', async() => {
      const response = await request(app)
        .get('/api/ai/inventory/analysis')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('demandForecast');
      expect(response.body.data).toHaveProperty('reorderOptimization');
      expect(response.body.data).toHaveProperty('riskAssessment');
      expect(response.body.data).toHaveProperty('costOptimization');
      expect(response.body.data).toHaveProperty('recommendations');
    });

    test('GET /api/ai/inventory/dashboard - Should return dashboard summary', async() => {
      const response = await request(app)
        .get('/api/ai/inventory/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalParts');
      expect(response.body.data).toHaveProperty('criticalRiskItems');
      expect(response.body.data).toHaveProperty('totalInventoryValue');
      expect(response.body.data).toHaveProperty('recommendations');
    });

    test('GET /api/ai/inventory/risk-assessment - Should return risk assessment', async() => {
      const response = await request(app)
        .get('/api/ai/inventory/risk-assessment')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('riskAssessment');
      expect(Array.isArray(response.body.data.riskAssessment)).toBe(true);
    });
  });

  describe('AI Set Builder Tests', () => {
    test('POST /api/ai/set-builder/analyze - Should analyze set design', async() => {
      const setData = {
        name: 'Test Set',
        description: 'A test set for AI analysis',
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testPartId,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const response = await request(app)
        .post('/api/ai/set-builder/analyze')
        .send(setData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('partRecommendations');
      expect(response.body.data).toHaveProperty('costOptimization');
      expect(response.body.data).toHaveProperty('educationalValue');
      expect(response.body.data).toHaveProperty('safetyAnalysis');
      expect(response.body.data).toHaveProperty('completenessCheck');
      expect(response.body.data).toHaveProperty('performancePrediction');
    });

    test('GET /api/ai/set-builder/part-recommendations - Should return part recommendations', async() => {
      const response = await request(app)
        .get('/api/ai/set-builder/part-recommendations')
        .query({
          category: 'electronics',
          difficulty_level: 'beginner',
          recommended_age_min: 8,
          recommended_age_max: 12
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/ai/set-builder/validate - Should validate set design', async() => {
      const setData = {
        name: 'Test Set',
        description: 'A test set for validation',
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        parts: [
          {
            part_id: testPartId,
            quantity: 2,
            category: 'electronic'
          }
        ]
      };

      const response = await request(app)
        .post('/api/ai/set-builder/validate')
        .send(setData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('validationScore');
      expect(response.body.data).toHaveProperty('validationStatus');
      expect(response.body.data).toHaveProperty('analysis');
    });
  });

  describe('Error Handling Tests', () => {
    test('GET /api/orders/99999 - Should return 404 for non-existent order', async() => {
      const response = await request(app)
        .get('/api/orders/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    test('POST /api/orders - Should return 400 for invalid data', async() => {
      const invalidOrder = {
        // Missing required fields
        customer_email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrder)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('PUT /api/orders/99999 - Should return 404 for non-existent order update', async() => {
      const updateData = {
        shipping_address: 'Updated Address'
      };

      const response = await request(app)
        .put('/api/orders/99999')
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Database Integrity Tests', () => {
    test('Should maintain referential integrity', async() => {
      // Test that foreign key constraints work
      const result = await pool.query(`
        SELECT 
          COUNT(*) as order_count,
          COUNT(DISTINCT customer_id) as unique_customers,
          COUNT(DISTINCT provider_id) as unique_providers
        FROM orders
        WHERE customer_id IS NOT NULL AND provider_id IS NOT NULL
      `);

      expect(result.rows[0].order_count).toBeGreaterThan(0);
      expect(result.rows[0].unique_customers).toBeGreaterThan(0);
      expect(result.rows[0].unique_providers).toBeGreaterThan(0);
    });

    test('Should have consistent multilingual data', async() => {
      // Test that all sets have translations
      const result = await pool.query(`
        SELECT 
          s.set_id,
          COUNT(st.set_translation_id) as translation_count
        FROM sets s
        LEFT JOIN set_translations st ON s.set_id = st.set_id
        GROUP BY s.set_id
        HAVING COUNT(st.set_translation_id) = 0
      `);

      expect(result.rows.length).toBe(0); // No sets without translations
    });

    test('Should have valid stock quantities', async() => {
      // Test that stock quantities are non-negative
      const result = await pool.query(`
        SELECT COUNT(*) as negative_stock_count
        FROM parts
        WHERE stock_quantity < 0
      `);

      expect(parseInt(result.rows[0].negative_stock_count)).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    test('Orders list should respond within reasonable time', async() => {
      const startTime = Date.now();

      await request(app)
        .get('/api/orders')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('AI analysis should complete within reasonable time', async() => {
      const startTime = Date.now();

      await request(app)
        .get('/api/ai/inventory/analysis')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

// Export for use in other test files
module.exports = { app, pool };
