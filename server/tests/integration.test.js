/**
 * Integration Tests for End-to-End Workflows
 * 
 * Tests complete user workflows:
 * - Order creation and management
 * - Set building with AI assistance
 * - Inventory management with AI optimization
 * - User role-based workflows
 */

const request = require('supertest');
const express = require('express');
const pool = require('../models/database');

// Import routes
const ordersRouter = require('../routes/orders');
const setsRouter = require('../routes/sets');
const partsRouter = require('../routes/parts');
const toolsRouter = require('../routes/tools');
const aiInventoryRouter = require('../routes/ai-inventory');
const aiSetBuilderRouter = require('../routes/ai-set-builder');
const usersRouter = require('../routes/users');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/orders', ordersRouter);
app.use('/api/sets', setsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/ai/inventory', aiInventoryRouter);
app.use('/api/ai/set-builder', aiSetBuilderRouter);
app.use('/api/users', usersRouter);

describe('End-to-End Integration Tests', () => {
  let testData = {};

  beforeAll(async () => {
    console.log('🔄 Setting up integration test data...');
    
    // Create test users
    const usersResult = await pool.query(`
      INSERT INTO users (email, password_hash, role, first_name, last_name, company_name)
      VALUES 
        ('integration-customer@test.com', '$2b$10$test', 'customer', 'Integration', 'Customer', 'Test Customer Co'),
        ('integration-provider@test.com', '$2b$10$test', 'provider', 'Integration', 'Provider', 'Test Provider Co'),
        ('integration-admin@test.com', '$2b$10$test', 'admin', 'Integration', 'Admin', 'Test Admin Co')
      RETURNING user_id, email, role
    `);
    
    testData.users = usersResult.rows;

    // Create test parts
    const partsResult = await pool.query(`
      INSERT INTO parts (part_number, category, unit_of_measure, unit_cost, stock_quantity, minimum_stock_level)
      VALUES 
        ('INT-PART-001', 'electronic', 'piece', 15.50, 50, 10),
        ('INT-PART-002', 'mechanical', 'piece', 8.75, 100, 20),
        ('INT-PART-003', 'material', 'meter', 2.25, 200, 50)
      RETURNING part_id, part_number
    `);
    
    testData.parts = partsResult.rows;

    // Create test tools
    const toolsResult = await pool.query(`
      INSERT INTO tools (tool_number, category, tool_type, condition_status, location)
      VALUES 
        ('INT-TOOL-001', 'hand_tool', 'screwdriver', 'good', 'Integration Toolbox'),
        ('INT-TOOL-002', 'hand_tool', 'pliers', 'excellent', 'Integration Toolbox'),
        ('INT-TOOL-003', 'power_tool', 'drill', 'good', 'Integration Workshop')
      RETURNING tool_id, tool_number
    `);
    
    testData.tools = toolsResult.rows;

    // Create test sets
    const setsResult = await pool.query(`
      INSERT INTO sets (category, difficulty_level, recommended_age_min, recommended_age_max, estimated_duration_minutes)
      VALUES 
        ('electronics', 'beginner', 8, 12, 60),
        ('mechanical', 'intermediate', 10, 16, 90),
        ('crafts', 'advanced', 12, 18, 120)
      RETURNING set_id, category
    `);
    
    testData.sets = setsResult.rows;

    // Add translations for sets
    for (let i = 0; i < testData.sets.length; i++) {
      await pool.query(`
        INSERT INTO set_translations (set_id, language_id, name, description)
        SELECT $1, l.language_id, $2, $3
        FROM languages l
        WHERE l.language_code = 'en'
      `, [
        testData.sets[i].set_id,
        `Integration Test Set ${i + 1}`,
        `A comprehensive test set for integration testing - ${testData.sets[i].category}`
      ]);
    }

    // Add translations for parts
    for (let i = 0; i < testData.parts.length; i++) {
      await pool.query(`
        INSERT INTO part_translations (part_id, language_id, part_name, description)
        SELECT $1, l.language_id, $2, $3
        FROM languages l
        WHERE l.language_code = 'en'
      `, [
        testData.parts[i].part_id,
        `Integration Test Part ${i + 1}`,
        `A test part for integration testing - ${testData.parts[i].part_number}`
      ]);
    }

    // Add translations for tools
    for (let i = 0; i < testData.tools.length; i++) {
      await pool.query(`
        INSERT INTO tool_translations (tool_id, language_id, tool_name, description)
        SELECT $1, l.language_id, $2, $3
        FROM languages l
        WHERE l.language_code = 'en'
      `, [
        testData.tools[i].tool_id,
        `Integration Test Tool ${i + 1}`,
        `A test tool for integration testing - ${testData.tools[i].tool_number}`
      ]);
    }

    // Create set-parts relationships
    await pool.query(`
      INSERT INTO set_parts (set_id, part_id, quantity, is_optional)
      VALUES 
        ($1, $2, 2, false),
        ($1, $3, 1, false),
        ($2, $3, 3, false),
        ($2, $4, 2, true),
        ($3, $2, 1, false),
        ($3, $4, 4, false)
    `, [
      testData.sets[0].set_id, testData.parts[0].part_id,
      testData.sets[0].set_id, testData.parts[1].part_id,
      testData.sets[1].set_id, testData.parts[1].part_id,
      testData.sets[1].set_id, testData.parts[2].part_id,
      testData.sets[2].set_id, testData.parts[0].part_id,
      testData.sets[2].set_id, testData.parts[2].part_id
    ]);

    // Create set-tools relationships
    await pool.query(`
      INSERT INTO set_tools (set_id, tool_id, quantity, is_optional)
      VALUES 
        ($1, $2, 1, false),
        ($1, $3, 1, true),
        ($2, $3, 1, false),
        ($2, $4, 1, false),
        ($3, $2, 1, false),
        ($3, $4, 1, false)
    `, [
      testData.sets[0].set_id, testData.tools[0].tool_id,
      testData.sets[0].set_id, testData.tools[1].tool_id,
      testData.sets[1].set_id, testData.tools[1].tool_id,
      testData.sets[1].set_id, testData.tools[2].tool_id,
      testData.sets[2].set_id, testData.tools[0].tool_id,
      testData.sets[2].set_id, testData.tools[2].tool_id
    ]);

    console.log('✅ Integration test data setup complete');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up integration test data...');
    
    // Clean up in reverse order of dependencies
    if (testData.sets) {
      await pool.query('DELETE FROM set_tools WHERE set_id = ANY($1)', 
        [testData.sets.map(s => s.set_id)]);
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
    
    if (testData.tools) {
      await pool.query('DELETE FROM tool_translations WHERE tool_id = ANY($1)', 
        [testData.tools.map(t => t.tool_id)]);
      await pool.query('DELETE FROM tools WHERE tool_id = ANY($1)', 
        [testData.tools.map(t => t.tool_id)]);
    }
    
    if (testData.users) {
      await pool.query('DELETE FROM users WHERE user_id = ANY($1)', 
        [testData.users.map(u => u.user_id)]);
    }
    
    console.log('✅ Integration test data cleanup complete');
  });

  describe('Complete Order Management Workflow', () => {
    test('Customer creates order → Provider processes → Admin manages', async () => {
      // Step 1: Customer creates an order
      const orderData = {
        customer_first_name: 'Integration',
        customer_last_name: 'Customer',
        customer_email: 'integration-customer@test.com',
        company_name: 'Test Customer Co',
        shipping_address: '123 Integration St, Test City',
        notes: 'Integration test order',
        items: [
          {
            set_id: testData.sets[0].set_id,
            quantity: 2
          },
          {
            set_id: testData.sets[1].set_id,
            quantity: 1
          }
        ]
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(200);

      expect(createResponse.body).toHaveProperty('message');
      expect(createResponse.body.message).toContain('successfully');

      const orderId = createResponse.body.order_id;

      // Step 2: Verify order was created
      const getOrderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(getOrderResponse.body.order.order_id).toBe(orderId);
      expect(getOrderResponse.body.order.status).toBe('pending');
      expect(getOrderResponse.body.order.items).toHaveLength(2);

      // Step 3: Provider updates order status
      const updateData = {
        status: 'confirmed',
        notes: 'Order confirmed by provider'
      };

      const updateResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.message).toContain('successfully');

      // Step 4: Verify status update
      const updatedOrderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(updatedOrderResponse.body.order.status).toBe('confirmed');

      // Step 5: Generate packing list
      const packingListResponse = await request(app)
        .get(`/api/orders/${orderId}/packing-list`)
        .expect(200);

      expect(packingListResponse.body).toHaveProperty('packingList');
      expect(packingListResponse.body.packingList.length).toBeGreaterThan(0);

      // Step 6: Admin processes order
      const processData = {
        status: 'processing',
        notes: 'Order being processed by admin'
      };

      const processResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .send(processData)
        .expect(200);

      expect(processResponse.body.message).toContain('successfully');

      // Step 7: Complete order workflow
      const completeData = {
        status: 'shipped',
        notes: 'Order shipped successfully'
      };

      const completeResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .send(completeData)
        .expect(200);

      expect(completeResponse.body.message).toContain('successfully');

      // Cleanup
      await request(app)
        .delete(`/api/orders/${orderId}`)
        .expect(200);
    });
  });

  describe('AI-Powered Set Building Workflow', () => {
    test('Create set → AI analysis → Optimization → Final set', async () => {
      // Step 1: Create a new set
      const setData = {
        category: 'electronics',
        difficulty_level: 'beginner',
        recommended_age_min: 8,
        recommended_age_max: 12,
        estimated_duration_minutes: 60,
        translations: [
          {
            language_code: 'en',
            name: 'AI Test Electronic Set',
            description: 'A test set for AI analysis workflow'
          }
        ]
      };

      const createSetResponse = await request(app)
        .post('/api/sets')
        .send(setData)
        .expect(200);

      expect(createSetResponse.body).toHaveProperty('message');
      const setId = createSetResponse.body.set_id;

      // Step 2: Add parts to the set
      const addPartsData = {
        parts: [
          {
            part_id: testData.parts[0].part_id,
            quantity: 2,
            is_optional: false
          },
          {
            part_id: testData.parts[1].part_id,
            quantity: 1,
            is_optional: true
          }
        ]
      };

      const addPartsResponse = await request(app)
        .post(`/api/sets/${setId}/parts`)
        .send(addPartsData)
        .expect(200);

      expect(addPartsResponse.body.message).toContain('successfully');

      // Step 3: AI analyze the set design
      const analysisData = {
        name: 'AI Test Electronic Set',
        description: 'A test set for AI analysis workflow',
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

      const aiAnalysisResponse = await request(app)
        .post('/api/ai/set-builder/analyze')
        .send(analysisData)
        .expect(200);

      expect(aiAnalysisResponse.body).toHaveProperty('success', true);
      expect(aiAnalysisResponse.body.data).toHaveProperty('educationalValue');
      expect(aiAnalysisResponse.body.data).toHaveProperty('safetyAnalysis');
      expect(aiAnalysisResponse.body.data).toHaveProperty('costOptimization');

      // Step 4: Get AI recommendations
      const recommendationsResponse = await request(app)
        .get('/api/ai/set-builder/part-recommendations')
        .query({
          category: 'electronics',
          difficulty_level: 'beginner',
          recommended_age_min: 8,
          recommended_age_max: 12
        })
        .expect(200);

      expect(recommendationsResponse.body).toHaveProperty('success', true);
      expect(Array.isArray(recommendationsResponse.body.data)).toBe(true);

      // Step 5: Validate set design
      const validationResponse = await request(app)
        .post('/api/ai/set-builder/validate')
        .send(analysisData)
        .expect(200);

      expect(validationResponse.body).toHaveProperty('success', true);
      expect(validationResponse.body.data).toHaveProperty('validationScore');
      expect(validationResponse.body.data).toHaveProperty('validationStatus');

      // Cleanup
      await request(app)
        .delete(`/api/sets/${setId}`)
        .expect(200);
    });
  });

  describe('AI Inventory Management Workflow', () => {
    test('Inventory analysis → Risk assessment → Optimization → Actions', async () => {
      // Step 1: Get AI inventory analysis
      const analysisResponse = await request(app)
        .get('/api/ai/inventory/analysis')
        .expect(200);

      expect(analysisResponse.body).toHaveProperty('success', true);
      expect(analysisResponse.body.data).toHaveProperty('demandForecast');
      expect(analysisResponse.body.data).toHaveProperty('reorderOptimization');
      expect(analysisResponse.body.data).toHaveProperty('riskAssessment');

      // Step 2: Get dashboard summary
      const dashboardResponse = await request(app)
        .get('/api/ai/inventory/dashboard')
        .expect(200);

      expect(dashboardResponse.body).toHaveProperty('success', true);
      expect(dashboardResponse.body.data).toHaveProperty('totalParts');
      expect(dashboardResponse.body.data).toHaveProperty('criticalRiskItems');
      expect(dashboardResponse.body.data).toHaveProperty('totalInventoryValue');

      // Step 3: Get risk assessment
      const riskResponse = await request(app)
        .get('/api/ai/inventory/risk-assessment')
        .expect(200);

      expect(riskResponse.body).toHaveProperty('success', true);
      expect(Array.isArray(riskResponse.body.data.riskAssessment)).toBe(true);

      // Step 4: Simulate inventory updates based on AI recommendations
      const recommendations = analysisResponse.body.data.recommendations;
      if (recommendations.length > 0) {
        const urgentRecommendations = recommendations.filter(rec => rec.priority === 'HIGH');
        expect(urgentRecommendations.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Multi-User Role-Based Workflow', () => {
    test('Customer → Provider → Admin collaboration', async () => {
      // Step 1: Customer creates order
      const customerOrderData = {
        customer_first_name: 'Integration',
        customer_last_name: 'Customer',
        customer_email: 'integration-customer@test.com',
        company_name: 'Test Customer Co',
        shipping_address: '123 Integration St, Test City',
        notes: 'Multi-user workflow test',
        items: [
          {
            set_id: testData.sets[0].set_id,
            quantity: 1
          }
        ]
      };

      const customerOrderResponse = await request(app)
        .post('/api/orders')
        .send(customerOrderData)
        .expect(200);

      const orderId = customerOrderResponse.body.order_id;

      // Step 2: Provider reviews and confirms
      const providerUpdateData = {
        status: 'confirmed',
        notes: 'Confirmed by provider - ready for processing'
      };

      const providerResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .send(providerUpdateData)
        .expect(200);

      expect(providerResponse.body.message).toContain('successfully');

      // Step 3: Admin processes and ships
      const adminProcessData = {
        status: 'processing',
        notes: 'Processing by admin team'
      };

      const adminProcessResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .send(adminProcessData)
        .expect(200);

      const adminShipData = {
        status: 'shipped',
        notes: 'Shipped by admin - tracking provided'
      };

      const adminShipResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .send(adminShipData)
        .expect(200);

      expect(adminShipResponse.body.message).toContain('successfully');

      // Step 4: Verify final order state
      const finalOrderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(finalOrderResponse.body.order.status).toBe('shipped');
      expect(finalOrderResponse.body.order.notes).toContain('tracking provided');

      // Cleanup
      await request(app)
        .delete(`/api/orders/${orderId}`)
        .expect(200);
    });
  });

  describe('Data Consistency Across Workflows', () => {
    test('Verify data integrity across all operations', async () => {
      // Step 1: Create order with multiple items
      const orderData = {
        customer_first_name: 'Consistency',
        customer_last_name: 'Test',
        customer_email: 'consistency@test.com',
        company_name: 'Consistency Test Co',
        shipping_address: '456 Consistency Ave',
        items: [
          {
            set_id: testData.sets[0].set_id,
            quantity: 2
          },
          {
            set_id: testData.sets[1].set_id,
            quantity: 1
          },
          {
            set_id: testData.sets[2].set_id,
            quantity: 3
          }
        ]
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(200);

      const orderId = createResponse.body.order_id;

      // Step 2: Verify order items consistency
      const orderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(orderResponse.body.order.items).toHaveLength(3);
      
      // Verify each item has correct data
      orderResponse.body.order.items.forEach(item => {
        expect(item).toHaveProperty('set_id');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('unit_price');
        expect(item).toHaveProperty('line_total');
        expect(item.quantity).toBeGreaterThan(0);
        expect(parseFloat(item.line_total)).toBeGreaterThan(0);
      });

      // Step 3: Generate packing list and verify consistency
      const packingListResponse = await request(app)
        .get(`/api/orders/${orderId}/packing-list`)
        .expect(200);

      expect(packingListResponse.body).toHaveProperty('packingList');
      expect(packingListResponse.body.packingList.length).toBeGreaterThan(0);

      // Verify packing list items have required fields
      packingListResponse.body.packingList.forEach(item => {
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('total_quantity_needed');
        expect(item.total_quantity_needed).toBeGreaterThan(0);
      });

      // Step 4: Update order and verify consistency
      const updateData = {
        status: 'confirmed',
        notes: 'Consistency test update'
      };

      const updateResponse = await request(app)
        .put(`/api/orders/${orderId}`)
        .send(updateData)
        .expect(200);

      // Step 5: Verify update didn't break data consistency
      const updatedOrderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(updatedOrderResponse.body.order.status).toBe('confirmed');
      expect(updatedOrderResponse.body.order.items).toHaveLength(3);
      expect(updatedOrderResponse.body.order.notes).toBe('Consistency test update');

      // Cleanup
      await request(app)
        .delete(`/api/orders/${orderId}`)
        .expect(200);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('Handle errors gracefully and maintain system stability', async () => {
      // Step 1: Test invalid order creation
      const invalidOrderData = {
        // Missing required fields
        customer_email: 'invalid-email'
      };

      const invalidResponse = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);

      expect(invalidResponse.body).toHaveProperty('error');

      // Step 2: Test non-existent order access
      const nonExistentResponse = await request(app)
        .get('/api/orders/99999')
        .expect(404);

      expect(nonExistentResponse.body).toHaveProperty('error');

      // Step 3: Test invalid set creation
      const invalidSetData = {
        // Missing required fields
        category: 'invalid'
      };

      const invalidSetResponse = await request(app)
        .post('/api/sets')
        .send(invalidSetData)
        .expect(400);

      expect(invalidSetResponse.body).toHaveProperty('error');

      // Step 4: Verify system is still stable after errors
      const healthCheckResponse = await request(app)
        .get('/api/orders')
        .expect(200);

      expect(healthCheckResponse.body).toHaveProperty('orders');
      expect(Array.isArray(healthCheckResponse.body.orders)).toBe(true);
    });
  });
});

module.exports = { app, pool };
