/**
 * AI-Powered Inventory Optimization Engine
 *
 * This module provides intelligent inventory management capabilities including:
 * - Demand forecasting based on historical data
 * - Optimal reorder point calculations
 * - Economic order quantity optimization
 * - Seasonal pattern analysis
 * - Risk assessment and recommendations
 */

const pool = require('../models/database');

class InventoryOptimizationAI {
  constructor() {
    this.analysisCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Main analysis function that orchestrates all AI inventory optimizations
   */
  async analyzeInventoryOptimization() {
    try {
      console.log('🧠 Starting AI Inventory Optimization Analysis...');

      const analysis = {
        timestamp: new Date().toISOString(),
        demandForecast: await this.analyzeDemandPatterns(),
        reorderOptimization: await this.calculateOptimalReorderPoints(),
        seasonalAnalysis: await this.analyzeSeasonalPatterns(),
        riskAssessment: await this.assessInventoryRisks(),
        costOptimization: await this.analyzeCostOptimization(),
        recommendations: []
      };

      // Generate AI recommendations based on analysis
      analysis.recommendations = await this.generateRecommendations(analysis);

      console.log('✅ AI Inventory Optimization Analysis Complete');
      return analysis;
    } catch (error) {
      console.error('❌ Error in AI Inventory Optimization:', error);
      throw error;
    }
  }

  /**
   * Analyze demand patterns for parts based on historical usage
   */
  async analyzeDemandPatterns() {
    const query = `
      WITH part_usage AS (
        SELECT 
          sp.part_id,
          pt.part_name,
          SUM(sp.quantity * COALESCE(oi.quantity, 0)) as total_usage,
          COUNT(DISTINCT oi.order_id) as order_count,
          AVG(sp.quantity * COALESCE(oi.quantity, 0)) as avg_usage_per_order,
          MAX(o.order_date) as last_used_date,
          MIN(o.order_date) as first_used_date
        FROM set_parts sp
        LEFT JOIN order_items oi ON sp.set_id = oi.set_id
        LEFT JOIN orders o ON oi.order_id = o.order_id
        LEFT JOIN part_translations pt ON sp.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE o.order_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY sp.part_id, pt.part_name
      ),
      demand_trends AS (
        SELECT 
          part_id,
          part_name,
          total_usage,
          order_count,
          avg_usage_per_order,
          CASE 
            WHEN total_usage = 0 THEN 'No Usage'
            WHEN total_usage < 10 THEN 'Low Usage'
            WHEN total_usage < 50 THEN 'Medium Usage'
            ELSE 'High Usage'
          END as usage_category,
          CASE 
            WHEN last_used_date IS NULL THEN 'Never Used'
            WHEN last_used_date < CURRENT_DATE - INTERVAL '3 months' THEN 'Stale'
            WHEN last_used_date < CURRENT_DATE - INTERVAL '1 month' THEN 'Recent'
            ELSE 'Active'
          END as usage_status,
          -- Calculate demand trend (simplified)
          CASE 
            WHEN order_count = 0 THEN 0
            ELSE total_usage / GREATEST(EXTRACT(DAYS FROM (last_used_date - first_used_date)), 1)
          END as daily_demand_rate
        FROM part_usage
      )
      SELECT 
        part_id,
        part_name,
        total_usage,
        order_count,
        avg_usage_per_order,
        usage_category,
        usage_status,
        daily_demand_rate,
        -- AI Prediction: Forecast next 30 days demand
        CASE 
          WHEN daily_demand_rate = 0 THEN 0
          ELSE GREATEST(1, ROUND(daily_demand_rate * 30))
        END as predicted_30_day_demand
      FROM demand_trends
      ORDER BY predicted_30_day_demand DESC, total_usage DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Calculate optimal reorder points using AI algorithms
   */
  async calculateOptimalReorderPoints() {
    const query = `
      WITH part_analysis AS (
        SELECT 
          p.part_id,
          pt.part_name,
          p.stock_quantity,
          p.minimum_stock_level,
          p.unit_cost,
          p.supplier,
          -- Calculate historical usage rate
          COALESCE(
            (SELECT SUM(sp.quantity * COALESCE(oi.quantity, 0))
             FROM set_parts sp
             LEFT JOIN order_items oi ON sp.set_id = oi.set_id
             LEFT JOIN orders o ON oi.order_id = o.order_id
             WHERE sp.part_id = p.part_id 
             AND o.order_date >= CURRENT_DATE - INTERVAL '6 months'
            ), 0
          ) as usage_6_months,
          -- Calculate lead time (simplified - assume 7 days average)
          7 as estimated_lead_time_days,
          -- Calculate safety stock multiplier based on usage variability
          CASE 
            WHEN p.stock_quantity = 0 AND p.minimum_stock_level = 0 THEN 2.0
            WHEN p.minimum_stock_level > 0 THEN 1.5
            ELSE 1.0
          END as safety_multiplier
        FROM parts p
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE p.stock_quantity IS NOT NULL
      )
      SELECT 
        part_id,
        part_name,
        stock_quantity,
        minimum_stock_level,
        unit_cost,
        supplier,
        usage_6_months,
        estimated_lead_time_days,
        safety_multiplier,
        -- AI Calculation: Daily usage rate
        CASE 
          WHEN usage_6_months = 0 THEN 0
          ELSE GREATEST(0.1, usage_6_months / 180.0) -- 6 months = ~180 days
        END as daily_usage_rate,
        -- AI Calculation: Optimal reorder point
        CASE 
          WHEN usage_6_months = 0 THEN 
            CASE 
              WHEN minimum_stock_level > 0 THEN minimum_stock_level
              ELSE 1
            END
          ELSE 
            GREATEST(
              minimum_stock_level,
              CEILING(
                (GREATEST(0.1, usage_6_months / 180.0) * estimated_lead_time_days * safety_multiplier)
              )
            )
          END as ai_optimal_reorder_point,
        -- AI Calculation: Economic Order Quantity (simplified)
        CASE 
          WHEN usage_6_months = 0 THEN 1
          WHEN unit_cost = 0 THEN CEILING(GREATEST(0.1, usage_6_months / 180.0) * 30)
          ELSE CEILING(SQRT((2 * GREATEST(0.1, usage_6_months / 180.0) * 30 * 10) / unit_cost))
        END as ai_economic_order_quantity,
        -- Risk Assessment
        CASE 
          WHEN stock_quantity = 0 THEN 'Critical'
          WHEN stock_quantity <= minimum_stock_level THEN 'High Risk'
          WHEN stock_quantity <= CEILING(GREATEST(0.1, usage_6_months / 180.0) * 14) THEN 'Medium Risk'
          ELSE 'Low Risk'
        END as risk_level
      FROM part_analysis
      ORDER BY risk_level DESC, ai_optimal_reorder_point DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Analyze seasonal patterns in part usage
   */
  async analyzeSeasonalPatterns() {
    const query = `
      WITH monthly_usage AS (
        SELECT 
          sp.part_id,
          pt.part_name,
          EXTRACT(MONTH FROM o.order_date) as month,
          EXTRACT(YEAR FROM o.order_date) as year,
          SUM(sp.quantity * COALESCE(oi.quantity, 0)) as monthly_usage
        FROM set_parts sp
        LEFT JOIN order_items oi ON sp.set_id = oi.set_id
        LEFT JOIN orders o ON oi.order_id = o.order_id
        LEFT JOIN part_translations pt ON sp.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE o.order_date >= CURRENT_DATE - INTERVAL '24 months'
        GROUP BY sp.part_id, pt.part_name, EXTRACT(MONTH FROM o.order_date), EXTRACT(YEAR FROM o.order_date)
      ),
      seasonal_patterns AS (
        SELECT 
          part_id,
          part_name,
          month,
          AVG(monthly_usage) as avg_monthly_usage,
          STDDEV(monthly_usage) as usage_volatility,
          COUNT(*) as data_points
        FROM monthly_usage
        GROUP BY part_id, part_name, month
        HAVING COUNT(*) >= 1
      )
      SELECT 
        part_id,
        part_name,
        month,
        avg_monthly_usage,
        usage_volatility,
        data_points,
        -- AI Analysis: Seasonal trend
        CASE 
          WHEN avg_monthly_usage = 0 THEN 'No Seasonal Pattern'
          WHEN usage_volatility / NULLIF(avg_monthly_usage, 0) > 0.5 THEN 'High Variability'
          WHEN usage_volatility / NULLIF(avg_monthly_usage, 0) > 0.2 THEN 'Medium Variability'
          ELSE 'Low Variability'
        END as seasonal_pattern,
        -- AI Prediction: Next month forecast
        CASE 
          WHEN avg_monthly_usage = 0 THEN 0
          ELSE GREATEST(0, ROUND(avg_monthly_usage + (usage_volatility * 0.5)))
        END as predicted_next_month_usage
      FROM seasonal_patterns
      ORDER BY part_id, month;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Assess inventory risks and identify critical items
   */
  async assessInventoryRisks() {
    const query = `
      WITH risk_analysis AS (
        SELECT 
          p.part_id,
          pt.part_name,
          p.stock_quantity,
          p.minimum_stock_level,
          p.unit_cost,
          p.supplier,
          -- Calculate usage velocity
          COALESCE(
            (SELECT SUM(sp.quantity * COALESCE(oi.quantity, 0))
             FROM set_parts sp
             LEFT JOIN order_items oi ON sp.set_id = oi.set_id
             LEFT JOIN orders o ON oi.order_id = o.order_id
             WHERE sp.part_id = p.part_id 
             AND o.order_date >= CURRENT_DATE - INTERVAL '3 months'
            ), 0
          ) as usage_3_months,
          -- Count how many sets use this part
          (SELECT COUNT(DISTINCT sp.set_id) 
           FROM set_parts sp 
           WHERE sp.part_id = p.part_id) as sets_using_part,
          -- Calculate days of stock remaining
          CASE 
            WHEN p.stock_quantity = 0 THEN 0
            WHEN COALESCE(
              (SELECT SUM(sp.quantity * COALESCE(oi.quantity, 0))
               FROM set_parts sp
               LEFT JOIN order_items oi ON sp.set_id = oi.set_id
               LEFT JOIN orders o ON oi.order_id = o.order_id
               WHERE sp.part_id = p.part_id 
               AND o.order_date >= CURRENT_DATE - INTERVAL '3 months'
              ), 0
            ) = 0 THEN 999 -- Infinite if no usage
            ELSE p.stock_quantity / GREATEST(
              COALESCE(
                (SELECT SUM(sp.quantity * COALESCE(oi.quantity, 0))
                 FROM set_parts sp
                 LEFT JOIN order_items oi ON sp.set_id = oi.set_id
                 LEFT JOIN orders o ON oi.order_id = o.order_id
                 WHERE sp.part_id = p.part_id 
                 AND o.order_date >= CURRENT_DATE - INTERVAL '3 months'
                ), 0
              ) / 90.0, 0.01 -- 3 months = ~90 days
            )
          END as days_of_stock_remaining
        FROM parts p
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE p.stock_quantity IS NOT NULL
      )
      SELECT 
        part_id,
        part_name,
        stock_quantity,
        minimum_stock_level,
        unit_cost,
        supplier,
        usage_3_months,
        sets_using_part,
        days_of_stock_remaining,
        -- AI Risk Assessment
        CASE 
          WHEN stock_quantity = 0 THEN 'Critical - Out of Stock'
          WHEN days_of_stock_remaining <= 7 THEN 'High Risk - Less than 1 week'
          WHEN days_of_stock_remaining <= 30 THEN 'Medium Risk - Less than 1 month'
          WHEN days_of_stock_remaining <= 90 THEN 'Low Risk - Less than 3 months'
          ELSE 'Very Low Risk - More than 3 months'
        END as risk_level,
        -- AI Impact Score (how critical this part is)
        CASE 
          WHEN sets_using_part = 0 THEN 0
          WHEN sets_using_part <= 2 THEN 1
          WHEN sets_using_part <= 5 THEN 2
          ELSE 3
        END as impact_score,
        -- AI Recommendation Priority
        CASE 
          WHEN stock_quantity = 0 AND sets_using_part > 0 THEN 'URGENT - Reorder Immediately'
          WHEN days_of_stock_remaining <= 7 AND sets_using_part > 2 THEN 'HIGH - Reorder This Week'
          WHEN days_of_stock_remaining <= 30 AND sets_using_part > 1 THEN 'MEDIUM - Reorder This Month'
          WHEN days_of_stock_remaining <= 90 THEN 'LOW - Monitor Closely'
          ELSE 'VERY LOW - No Action Needed'
        END as recommendation_priority
      FROM risk_analysis
      ORDER BY 
        CASE 
          WHEN stock_quantity = 0 THEN 1
          WHEN days_of_stock_remaining <= 7 THEN 2
          WHEN days_of_stock_remaining <= 30 THEN 3
          ELSE 4
        END,
        impact_score DESC,
        usage_3_months DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Analyze cost optimization opportunities
   */
  async analyzeCostOptimization() {
    const query = `
      WITH cost_analysis AS (
        SELECT 
          p.part_id,
          pt.part_name,
          p.unit_cost,
          p.stock_quantity,
          p.supplier,
          -- Calculate annual usage
          COALESCE(
            (SELECT SUM(sp.quantity * COALESCE(oi.quantity, 0))
             FROM set_parts sp
             LEFT JOIN order_items oi ON sp.set_id = oi.set_id
             LEFT JOIN orders o ON oi.order_id = o.order_id
             WHERE sp.part_id = p.part_id 
             AND o.order_date >= CURRENT_DATE - INTERVAL '12 months'
            ), 0
          ) as annual_usage,
          -- Calculate inventory value
          p.stock_quantity * p.unit_cost as inventory_value,
          -- Calculate carrying cost (assume 20% annual carrying cost)
          p.stock_quantity * p.unit_cost * 0.20 as annual_carrying_cost
        FROM parts p
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE p.stock_quantity IS NOT NULL AND p.unit_cost > 0
      )
      SELECT 
        part_id,
        part_name,
        unit_cost,
        stock_quantity,
        supplier,
        annual_usage,
        inventory_value,
        annual_carrying_cost,
        -- AI Analysis: Cost efficiency
        CASE 
          WHEN annual_usage = 0 THEN 'No Usage - Consider Disposal'
          WHEN inventory_value > 1000 THEN 'High Value - Optimize Stock'
          WHEN annual_carrying_cost > 100 THEN 'Medium Value - Monitor'
          ELSE 'Low Value - Standard Management'
        END as cost_category,
        -- AI Recommendation: Cost optimization
        CASE 
          WHEN annual_usage = 0 AND inventory_value > 0 THEN 'Dispose of excess inventory'
          WHEN inventory_value > 5000 THEN 'Consider bulk purchasing discounts'
          WHEN annual_carrying_cost > 200 THEN 'Reduce stock levels'
          WHEN unit_cost > 100 AND stock_quantity > annual_usage THEN 'High-cost item overstocked'
          ELSE 'Cost levels acceptable'
        END as cost_optimization_recommendation,
        -- AI Calculation: Optimal stock level
        CASE 
          WHEN annual_usage = 0 THEN 0
          ELSE GREATEST(1, CEILING(annual_usage / 12.0 * 2)) -- 2 months of usage
        END as ai_optimal_stock_level
      FROM cost_analysis
      ORDER BY inventory_value DESC, annual_carrying_cost DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Generate AI-powered recommendations based on all analyses
   */
  async generateRecommendations(analysis) {
    const recommendations = [];

    // Critical stockout recommendations
    const criticalItems = analysis.riskAssessment.filter(item =>
      item.risk_level.includes('Critical') || item.risk_level.includes('High Risk')
    );

    if (criticalItems.length > 0) {
      recommendations.push({
        type: 'URGENT',
        category: 'Stockout Prevention',
        title: 'Critical Stockout Risk Detected',
        description: `${criticalItems.length} parts are at critical risk of stockout`,
        items: criticalItems.slice(0, 5).map(item => ({
          part_name: item.part_name,
          current_stock: item.stock_quantity,
          risk_level: item.risk_level,
          recommendation: item.recommendation_priority
        })),
        action: 'Reorder immediately to prevent stockouts',
        priority: 'HIGH'
      });
    }

    // Cost optimization recommendations
    const highValueItems = analysis.costOptimization.filter(item =>
      item.cost_category.includes('High Value') || item.cost_category.includes('Medium Value')
    );

    if (highValueItems.length > 0) {
      recommendations.push({
        type: 'COST_OPTIMIZATION',
        category: 'Inventory Cost Reduction',
        title: 'High-Value Inventory Optimization Opportunities',
        description: `${highValueItems.length} high-value items need cost optimization`,
        items: highValueItems.slice(0, 5).map(item => ({
          part_name: item.part_name,
          inventory_value: item.inventory_value,
          annual_carrying_cost: item.annual_carrying_cost,
          recommendation: item.cost_optimization_recommendation
        })),
        action: 'Review and optimize high-value inventory levels',
        priority: 'MEDIUM'
      });
    }

    // Seasonal preparation recommendations
    const seasonalItems = analysis.seasonalAnalysis.filter(item =>
      item.seasonal_pattern.includes('High Variability') || item.seasonal_pattern.includes('Medium Variability')
    );

    if (seasonalItems.length > 0) {
      recommendations.push({
        type: 'SEASONAL',
        category: 'Seasonal Demand Preparation',
        title: 'Seasonal Demand Patterns Detected',
        description: `${seasonalItems.length} parts show significant seasonal variation`,
        items: seasonalItems.slice(0, 5).map(item => ({
          part_name: item.part_name,
          seasonal_pattern: item.seasonal_pattern,
          predicted_usage: item.predicted_next_month_usage,
          month: item.month
        })),
        action: 'Prepare for seasonal demand fluctuations',
        priority: 'LOW'
      });
    }

    return recommendations;
  }

  /**
   * Get AI recommendations for a specific part
   */
  async getPartRecommendations(partId) {
    try {
      const analysis = await this.analyzeInventoryOptimization();

      const partRecommendations = {
        demandForecast: analysis.demandForecast.find(item => item.part_id === partId),
        reorderOptimization: analysis.reorderOptimization.find(item => item.part_id === partId),
        riskAssessment: analysis.riskAssessment.find(item => item.part_id === partId),
        costOptimization: analysis.costOptimization.find(item => item.part_id === partId),
        seasonalAnalysis: analysis.seasonalAnalysis.filter(item => item.part_id === partId)
      };

      return partRecommendations;
    } catch (error) {
      console.error('Error getting part recommendations:', error);
      throw error;
    }
  }

  /**
   * Get AI dashboard summary
   */
  async getDashboardSummary() {
    try {
      const analysis = await this.analyzeInventoryOptimization();

      const summary = {
        totalParts: analysis.demandForecast.length,
        criticalRiskItems: analysis.riskAssessment.filter(item =>
          item.risk_level.includes('Critical') || item.risk_level.includes('High Risk')
        ).length,
        highValueItems: analysis.costOptimization.filter(item =>
          item.cost_category.includes('High Value')
        ).length,
        seasonalItems: analysis.seasonalAnalysis.filter(item =>
          item.seasonal_pattern.includes('High Variability')
        ).length,
        totalInventoryValue: analysis.costOptimization.reduce((sum, item) =>
          sum + (item.inventory_value || 0), 0
        ),
        totalCarryingCost: analysis.costOptimization.reduce((sum, item) =>
          sum + (item.annual_carrying_cost || 0), 0
        ),
        recommendations: analysis.recommendations.length,
        lastUpdated: analysis.timestamp
      };

      return summary;
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }
}

module.exports = new InventoryOptimizationAI();
