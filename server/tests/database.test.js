/**
 * Database Integrity Test Suite
 *
 * Tests for database:
 * - Data consistency
 * - Referential integrity
 * - Performance
 * - Data validation
 */

const pool = require('../models/database');

describe('Database Integrity Tests', () => {
  describe('Referential Integrity Tests', () => {
    test('All orders should have valid customer references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_customers
        FROM orders o
        LEFT JOIN users c ON o.customer_id = c.user_id
        WHERE o.customer_id IS NOT NULL AND c.user_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_customers)).toBe(0);
    });

    test('All orders should have valid provider references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_providers
        FROM orders o
        LEFT JOIN users p ON o.provider_id = p.user_id
        WHERE o.provider_id IS NOT NULL AND p.user_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_providers)).toBe(0);
    });

    test('All order items should have valid order references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_orders
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.order_id
        WHERE o.order_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_orders)).toBe(0);
    });

    test('All order items should have valid set references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_sets
        FROM order_items oi
        LEFT JOIN sets s ON oi.set_id = s.set_id
        WHERE s.set_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_sets)).toBe(0);
    });

    test('All set parts should have valid set references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_sets
        FROM set_parts sp
        LEFT JOIN sets s ON sp.set_id = s.set_id
        WHERE s.set_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_sets)).toBe(0);
    });

    test('All set parts should have valid part references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_parts
        FROM set_parts sp
        LEFT JOIN parts p ON sp.part_id = p.part_id
        WHERE p.part_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_parts)).toBe(0);
    });

    test('All set tools should have valid set references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_sets
        FROM set_tools st
        LEFT JOIN sets s ON st.set_id = s.set_id
        WHERE s.set_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_sets)).toBe(0);
    });

    test('All set tools should have valid tool references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_tools
        FROM set_tools st
        LEFT JOIN tools t ON st.tool_id = t.tool_id
        WHERE t.tool_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_tools)).toBe(0);
    });

    test('All translations should have valid language references', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_languages
        FROM (
          SELECT language_id FROM set_translations
          UNION
          SELECT language_id FROM part_translations
          UNION
          SELECT language_id FROM tool_translations
        ) t
        LEFT JOIN languages l ON t.language_id = l.language_id
        WHERE l.language_id IS NULL
      `);

      expect(parseInt(result.rows[0].invalid_languages)).toBe(0);
    });
  });

  describe('Data Consistency Tests', () => {
    test('All sets should have translations', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as sets_without_translations
        FROM sets s
        LEFT JOIN set_translations st ON s.set_id = st.set_id
        WHERE st.set_id IS NULL
      `);

      expect(parseInt(result.rows[0].sets_without_translations)).toBe(0);
    });

    test('All parts should have translations', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as parts_without_translations
        FROM parts p
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        WHERE pt.part_id IS NULL
      `);

      expect(parseInt(result.rows[0].parts_without_translations)).toBe(0);
    });

    test('All tools should have translations', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as tools_without_translations
        FROM tools t
        LEFT JOIN tool_translations tt ON t.tool_id = tt.tool_id
        WHERE tt.tool_id IS NULL
      `);

      expect(parseInt(result.rows[0].tools_without_translations)).toBe(0);
    });

    test('Stock quantities should be non-negative', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as negative_stock
        FROM parts
        WHERE stock_quantity < 0
      `);

      expect(parseInt(result.rows[0].negative_stock)).toBe(0);
    });

    test('Minimum stock levels should be non-negative', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as negative_min_stock
        FROM parts
        WHERE minimum_stock_level < 0
      `);

      expect(parseInt(result.rows[0].negative_min_stock)).toBe(0);
    });

    test('Unit costs should be non-negative', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as negative_costs
        FROM parts
        WHERE unit_cost < 0
      `);

      expect(parseInt(result.rows[0].negative_costs)).toBe(0);
    });

    test('Order quantities should be positive', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_quantities
        FROM order_items
        WHERE quantity <= 0
      `);

      expect(parseInt(result.rows[0].invalid_quantities)).toBe(0);
    });

    test('Set part quantities should be positive', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_quantities
        FROM set_parts
        WHERE quantity <= 0
      `);

      expect(parseInt(result.rows[0].invalid_quantities)).toBe(0);
    });

    test('Set tool quantities should be positive', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_quantities
        FROM set_tools
        WHERE quantity <= 0
      `);

      expect(parseInt(result.rows[0].invalid_quantities)).toBe(0);
    });

    test('Order total amounts should be non-negative', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as negative_totals
        FROM orders
        WHERE total_amount < 0
      `);

      expect(parseInt(result.rows[0].negative_totals)).toBe(0);
    });

    test('Order line totals should be non-negative', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as negative_line_totals
        FROM order_items
        WHERE line_total < 0
      `);

      expect(parseInt(result.rows[0].negative_line_totals)).toBe(0);
    });
  });

  describe('Data Validation Tests', () => {
    test('Order numbers should be unique', async() => {
      const result = await pool.query(`
        SELECT order_number, COUNT(*) as count
        FROM orders
        GROUP BY order_number
        HAVING COUNT(*) > 1
      `);

      expect(result.rows.length).toBe(0);
    });

    test('Part numbers should be unique', async() => {
      const result = await pool.query(`
        SELECT part_number, COUNT(*) as count
        FROM parts
        GROUP BY part_number
        HAVING COUNT(*) > 1
      `);

      expect(result.rows.length).toBe(0);
    });

    test('Tool numbers should be unique', async() => {
      const result = await pool.query(`
        SELECT tool_number, COUNT(*) as count
        FROM tools
        GROUP BY tool_number
        HAVING COUNT(*) > 1
      `);

      expect(result.rows.length).toBe(0);
    });

    test('Email addresses should be valid format', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_emails
        FROM users
        WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
      `);

      expect(parseInt(result.rows[0].invalid_emails)).toBe(0);
    });

    test('Order statuses should be valid', async() => {
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      const result = await pool.query(`
        SELECT DISTINCT status
        FROM orders
        WHERE status NOT IN (${validStatuses.map((_, i) => `$${i + 1}`).join(', ')})
      `, validStatuses);

      expect(result.rows.length).toBe(0);
    });

    test('Difficulty levels should be valid', async() => {
      const validLevels = ['beginner', 'intermediate', 'advanced'];
      const result = await pool.query(`
        SELECT DISTINCT difficulty_level
        FROM sets
        WHERE difficulty_level NOT IN (${validLevels.map((_, i) => `$${i + 1}`).join(', ')})
      `, validLevels);

      expect(result.rows.length).toBe(0);
    });

    test('Age ranges should be logical', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_age_ranges
        FROM sets
        WHERE recommended_age_min > recommended_age_max
      `);

      expect(parseInt(result.rows[0].invalid_age_ranges)).toBe(0);
    });

    test('Duration should be positive', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as invalid_durations
        FROM sets
        WHERE estimated_duration_minutes <= 0
      `);

      expect(parseInt(result.rows[0].invalid_durations)).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    test('Orders query should perform well', async() => {
      const startTime = Date.now();

      await pool.query(`
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

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('Packing list query should perform well', async() => {
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
      const startTime = Date.now();

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

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    test('Sets query should perform well', async() => {
      const startTime = Date.now();

      await pool.query(`
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

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Data Completeness Tests', () => {
    test('All orders should have required fields', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as incomplete_orders
        FROM orders
        WHERE order_number IS NULL 
           OR customer_id IS NULL 
           OR provider_id IS NULL 
           OR total_amount IS NULL 
           OR status IS NULL
      `);

      expect(parseInt(result.rows[0].incomplete_orders)).toBe(0);
    });

    test('All sets should have required fields', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as incomplete_sets
        FROM sets
        WHERE category IS NULL 
           OR difficulty_level IS NULL 
           OR recommended_age_min IS NULL 
           OR recommended_age_max IS NULL
      `);

      expect(parseInt(result.rows[0].incomplete_sets)).toBe(0);
    });

    test('All parts should have required fields', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as incomplete_parts
        FROM parts
        WHERE part_number IS NULL 
           OR category IS NULL 
           OR unit_of_measure IS NULL 
           OR unit_cost IS NULL
      `);

      expect(parseInt(result.rows[0].incomplete_parts)).toBe(0);
    });

    test('All tools should have required fields', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as incomplete_tools
        FROM tools
        WHERE tool_number IS NULL 
           OR category IS NULL 
           OR tool_type IS NULL 
           OR condition_status IS NULL
      `);

      expect(parseInt(result.rows[0].incomplete_tools)).toBe(0);
    });

    test('All users should have required fields', async() => {
      const result = await pool.query(`
        SELECT COUNT(*) as incomplete_users
        FROM users
        WHERE email IS NULL 
           OR role IS NULL
      `);

      expect(parseInt(result.rows[0].incomplete_users)).toBe(0);
    });
  });

  describe('Index Performance Tests', () => {
    test('Orders should have proper indexes', async() => {
      const result = await pool.query(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename = 'orders'
        AND indexname NOT LIKE '%_pkey'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('Order items should have proper indexes', async() => {
      const result = await pool.query(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename = 'order_items'
        AND indexname NOT LIKE '%_pkey'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('Sets should have proper indexes', async() => {
      const result = await pool.query(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename = 'sets'
        AND indexname NOT LIKE '%_pkey'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('Parts should have proper indexes', async() => {
      const result = await pool.query(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename = 'parts'
        AND indexname NOT LIKE '%_pkey'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('Tools should have proper indexes', async() => {
      const result = await pool.query(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename = 'tools'
        AND indexname NOT LIKE '%_pkey'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
