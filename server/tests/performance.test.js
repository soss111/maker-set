/**
 * Performance Tests
 * 
 * Tests system performance under various loads:
 * - API response times
 * - Database query performance
 * - Memory usage
 * - Concurrent request handling
 */

const request = require('supertest');
const express = require('express');
const pool = require('../models/database');
const { performance } = require('perf_hooks');

// Import routes
const ordersRouter = require('../routes/orders');
const setsRouter = require('../routes/sets');
const partsRouter = require('../routes/parts');
const toolsRouter = require('../routes/tools');
const aiInventoryRouter = require('../routes/ai-inventory');
const aiSetBuilderRouter = require('../routes/ai-set-builder');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/orders', ordersRouter);
app.use('/api/sets', setsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/ai/inventory', aiInventoryRouter);
app.use('/api/ai/set-builder', aiSetBuilderRouter);

describe('Performance Tests', () => {
  let testData = {};

  beforeAll(async () => {
    console.log('⚡ Setting up performance test data...');
    
    // Create test data for performance testing
    const partsResult = await pool.query(`
      INSERT INTO parts (part_number, category, unit_of_measure, unit_cost, stock_quantity, minimum_stock_level)
      VALUES 
        ('PERF-PART-001', 'electronic', 'piece', 10.00, 100, 10),
        ('PERF-PART-002', 'mechanical', 'piece', 15.00, 150, 15),
        ('PERF-PART-003', 'material', 'meter', 5.00, 200, 20)
      RETURNING part_id, part_number
    `);
    
    testData.parts = partsResult.rows;

    const setsResult = await pool.query(`
      INSERT INTO sets (category, difficulty_level, recommended_age_min, recommended_age_max, estimated_duration_minutes)
      VALUES 
        ('electronics', 'beginner', 8, 12, 60),
        ('mechanical', 'intermediate', 10, 16, 90),
        ('crafts', 'advanced', 12, 18, 120)
      RETURNING set_id, category
    `);
    
    testData.sets = setsResult.rows;

    // Add translations
    for (let i = 0; i < testData.sets.length; i++) {
      await pool.query(`
        INSERT INTO set_translations (set_id, language_id, name, description)
        SELECT $1, l.language_id, $2, $3
        FROM languages l
        WHERE l.language_code = 'en'
      `, [
        testData.sets[i].set_id,
        `Performance Test Set ${i + 1}`,
        `A test set for performance testing - ${testData.sets[i].category}`
      ]);
    }

    for (let i = 0; i < testData.parts.length; i++) {
      await pool.query(`
        INSERT INTO part_translations (part_id, language_id, part_name, description)
        SELECT $1, l.language_id, $2, $3
        FROM languages l
        WHERE l.language_code = 'en'
      `, [
        testData.parts[i].part_id,
        `Performance Test Part ${i + 1}`,
        `A test part for performance testing - ${testData.parts[i].part_number}`
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

    console.log('✅ Performance test data setup complete');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up performance test data...');
    
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
    
    console.log('✅ Performance test data cleanup complete');
  });

  describe('API Response Time Tests', () => {
    test('Orders API should respond within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/orders')
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
    });

    test('Sets API should respond within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/sets')
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body).toHaveProperty('data');
    });

    test('Parts API should respond within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/parts')
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body).toHaveProperty('data');
    });

    test('Tools API should respond within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/tools')
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('AI Component Performance Tests', () => {
    test('AI Inventory Analysis should complete within reasonable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/ai/inventory/analysis')
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('demandForecast');
    });

    test('AI Inventory Dashboard should respond quickly', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/ai/inventory/dashboard')
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalParts');
    });

    test('AI Set Builder Analysis should complete within reasonable time', async () => {
      const setData = {
        name: 'Performance Test Set',
        description: 'A test set for performance analysis',
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

      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/ai/set-builder/analyze')
        .send(setData)
        .expect(200);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('educationalValue');
    });
  });

  describe('Database Query Performance Tests', () => {
    test('Complex orders query should perform well', async () => {
      const startTime = performance.now();
      
      const result = await pool.query(`
        SELECT 
          o.*,
          c.first_name as customer_first_name,
          c.last_name as customer_last_name,
          c.email as customer_email,
          c.company_name as customer_company_name,
          p.first_name as provider_first_name,
          p.last_name as provider_last_name,
          p.email as provider_email,
          p.company_name as provider_company_name,
          COUNT(oi.order_item_id) as item_count,
          SUM(oi.quantity * oi.unit_price) as calculated_total,
          COALESCE(
            JSON_AGG(
              CASE 
                WHEN oi.order_item_id IS NOT NULL 
                THEN JSON_BUILD_OBJECT(
                  'order_item_id', oi.order_item_id,
                  'set_id', oi.set_id,
                  'quantity', oi.quantity,
                  'unit_price', oi.unit_price,
                  'line_total', oi.line_total,
                  'set_name', COALESCE(st.name, 'Unnamed Set')
                )
                ELSE NULL
              END
            ) FILTER (WHERE oi.order_item_id IS NOT NULL),
            '[]'::json
          ) as items
        FROM orders o
        LEFT JOIN users c ON o.customer_id = c.user_id
        LEFT JOIN users p ON o.provider_id = p.user_id
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        LEFT JOIN (
          SELECT DISTINCT st.set_id, st.name
          FROM set_translations st
          JOIN languages l ON st.language_id = l.language_id
          WHERE l.language_code = 'en'
        ) st ON oi.set_id = st.set_id
        GROUP BY o.order_id, c.user_id, c.first_name, c.last_name, c.email, c.company_name, p.user_id, p.first_name, p.last_name, p.email, p.company_name
        ORDER BY o.created_at DESC
        LIMIT 20
      `);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });

    test('Packing list query should perform well', async () => {
      // Get a random order with items
      const orderResult = await pool.query(`
        SELECT o.order_id
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        LIMIT 1
      `);
      
      if (orderResult.rows.length === 0) {
        console.log('No orders with items found for packing list performance test');
        return;
      }
      
      const orderId = orderResult.rows[0].order_id;
      const startTime = performance.now();
      
      await pool.query(`
        SELECT 
          o.order_id,
          o.order_number,
          o.customer_first_name,
          o.customer_last_name,
          o.customer_email,
          o.shipping_address,
          o.order_date,
          o.total_amount,
          o.status,
          o.notes,
          o.company_name,
          o.created_at,
          o.updated_at
        FROM orders o
        WHERE o.order_id = $1
      `, [orderId]);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(500); // Should complete within 500ms
    });

    test('Sets with translations query should perform well', async () => {
      const startTime = performance.now();
      
      const result = await pool.query(`
        SELECT 
          s.*,
          COALESCE(
            JSON_AGG(
              CASE 
                WHEN st.set_translation_id IS NOT NULL 
                THEN JSON_BUILD_OBJECT(
                  'language_code', l.language_code,
                  'name', st.name,
                  'description', st.description
                )
                ELSE NULL
              END
            ) FILTER (WHERE st.set_translation_id IS NOT NULL),
            '[]'::json
          ) as translations
        FROM sets s
        LEFT JOIN set_translations st ON s.set_id = st.set_id
        LEFT JOIN languages l ON st.language_id = l.language_id
        GROUP BY s.set_id
        ORDER BY s.created_at DESC
        LIMIT 20
      `);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('Should handle multiple simultaneous requests', async () => {
      const requests = [
        request(app).get('/api/orders'),
        request(app).get('/api/sets'),
        request(app).get('/api/parts'),
        request(app).get('/api/tools'),
        request(app).get('/api/ai/inventory/dashboard')
      ];

      const startTime = performance.now();
      
      const responses = await Promise.all(requests);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // All requests should be successful
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('Should handle concurrent order creation', async () => {
      const orderPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const orderData = {
          customer_first_name: `Concurrent${i}`,
          customer_last_name: 'Test',
          customer_email: `concurrent${i}@test.com`,
          company_name: `Concurrent Test Co ${i}`,
          shipping_address: `${i} Concurrent St`,
          items: [
            {
              set_id: testData.sets[0].set_id,
              quantity: 1
            }
          ]
        };
        
        orderPromises.push(
          request(app)
            .post('/api/orders')
            .send(orderData)
        );
      }

      const startTime = performance.now();
      
      const responses = await Promise.all(orderPromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All orders should be created successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('order_id');
      });
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Cleanup created orders
      const orderIds = responses.map(response => response.body.order_id);
      for (const orderId of orderIds) {
        await request(app)
          .delete(`/api/orders/${orderId}`)
          .expect(200);
      }
    });
  });

  describe('Memory Usage Tests', () => {
    test('Should not have memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api/orders');
        await request(app).get('/api/sets');
        await request(app).get('/api/parts');
        await request(app).get('/api/tools');
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('AI operations should not cause excessive memory usage', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform AI operations
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/ai/inventory/analysis');
        await request(app).get('/api/ai/inventory/dashboard');
        
        const setData = {
          name: `Memory Test Set ${i}`,
          category: 'electronics',
          difficulty_level: 'beginner',
          recommended_age_min: 8,
          recommended_age_max: 12,
          parts: [
            {
              part_id: testData.parts[0].part_id,
              quantity: 1,
              category: 'electronic'
            }
          ]
        };
        
        await request(app)
          .post('/api/ai/set-builder/analyze')
          .send(setData);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Load Testing', () => {
    test('Should handle high volume of requests', async () => {
      const requestCount = 50;
      const requests = [];
      
      // Create many requests
      for (let i = 0; i < requestCount; i++) {
        requests.push(request(app).get('/api/orders'));
      }
      
      const startTime = performance.now();
      
      const responses = await Promise.all(requests);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / requestCount;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(100); // Average less than 100ms per request
      
      // Total time should be reasonable
      expect(totalTime).toBeLessThan(10000); // Total less than 10 seconds
    });
  });
});

module.exports = { app, pool };
