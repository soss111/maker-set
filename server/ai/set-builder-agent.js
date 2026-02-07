/**
 * AI Set Builder Agent
 *
 * This module provides intelligent assistance for creating maker sets including:
 * - Smart part recommendations based on set requirements
 * - Cost optimization suggestions
 * - Educational value analysis
 * - Safety and completeness checks
 * - Performance predictions
 */

const pool = require('../models/database');

class SetBuilderAI {
  constructor() {
    this.recommendationCache = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Main AI analysis function for set building assistance
   */
  async analyzeSetDesign(setData) {
    try {
      console.log('🧠 AI Set Builder Agent analyzing set design...');

      const analysis = {
        timestamp: new Date().toISOString(),
        partRecommendations: await this.getPartRecommendations(setData),
        costOptimization: await this.analyzeCostOptimization(setData),
        educationalValue: await this.analyzeEducationalValue(setData),
        safetyAnalysis: await this.analyzeSafety(setData),
        completenessCheck: await this.checkCompleteness(setData),
        performancePrediction: await this.predictPerformance(setData),
        suggestions: []
      };

      // Generate AI suggestions based on analysis
      analysis.suggestions = await this.generateSuggestions(analysis, setData);

      console.log('✅ AI Set Builder Agent analysis complete');
      return analysis;
    } catch (error) {
      console.error('❌ Error in AI Set Builder Agent:', error);
      throw error;
    }
  }

  /**
   * Get intelligent part recommendations based on set requirements
   */
  async getPartRecommendations(setData) {
    const { category, difficulty_level, recommended_age_min, recommended_age_max } = setData;

    const query = `
      WITH similar_sets AS (
        SELECT DISTINCT s.set_id
        FROM sets s
        WHERE s.category = $1 
        AND s.difficulty_level = $2
        AND s.recommended_age_min <= $4
        AND s.recommended_age_max >= $3
        AND s.active = true
      ),
      popular_parts AS (
        SELECT 
          sp.part_id,
          pt.part_name,
          p.category as part_category,
          p.unit_cost,
          p.stock_quantity,
          p.minimum_stock_level,
          COUNT(DISTINCT sp.set_id) as usage_count,
          AVG(sp.quantity) as avg_quantity_per_set,
          SUM(sp.quantity) as total_usage
        FROM set_parts sp
        INNER JOIN similar_sets ss ON sp.set_id = ss.set_id
        LEFT JOIN parts p ON sp.part_id = p.part_id
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE p.active = true
        GROUP BY sp.part_id, pt.part_name, p.category, p.unit_cost, p.stock_quantity, p.minimum_stock_level
      ),
      essential_parts AS (
        SELECT 
          p.part_id,
          pt.part_name,
          p.category as part_category,
          p.unit_cost,
          p.stock_quantity,
          p.minimum_stock_level,
          'Essential' as recommendation_type,
          'This part is commonly used in similar sets' as reason,
          CASE 
            WHEN p.stock_quantity = 0 THEN 'Out of Stock'
            WHEN p.stock_quantity <= p.minimum_stock_level THEN 'Low Stock'
            ELSE 'Available'
          END as stock_status
        FROM parts p
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE p.active = true
        AND p.part_id IN (SELECT part_id FROM popular_parts WHERE usage_count >= 2)
      ),
      cost_effective_parts AS (
        SELECT 
          p.part_id,
          pt.part_name,
          p.category as part_category,
          p.unit_cost,
          p.stock_quantity,
          p.minimum_stock_level,
          'Cost Effective' as recommendation_type,
          'Good value for money' as reason,
          CASE 
            WHEN p.stock_quantity = 0 THEN 'Out of Stock'
            WHEN p.stock_quantity <= p.minimum_stock_level THEN 'Low Stock'
            ELSE 'Available'
          END as stock_status
        FROM parts p
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE p.active = true
        AND p.unit_cost > 0
        AND p.unit_cost <= (
          SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY unit_cost)
          FROM parts WHERE unit_cost > 0 AND active = true
        )
      )
      SELECT * FROM essential_parts
      UNION ALL
      SELECT * FROM cost_effective_parts
      ORDER BY recommendation_type, unit_cost ASC;
    `;

    const result = await pool.query(query, [category, difficulty_level, recommended_age_min, recommended_age_max]);
    return result.rows;
  }

  /**
   * Analyze cost optimization opportunities for the set
   */
  async analyzeCostOptimization(setData) {
    const { parts = [] } = setData;

    if (!parts || parts.length === 0) {
      return {
        totalCost: 0,
        averagePartCost: 0,
        costCategory: 'No parts selected',
        recommendations: ['Add parts to analyze cost optimization']
      };
    }

    const partIds = parts.map(p => p.part_id).filter(id => id);

    if (partIds.length === 0) {
      return {
        totalCost: 0,
        averagePartCost: 0,
        costCategory: 'No valid parts',
        recommendations: ['Select valid parts to analyze costs']
      };
    }

    const query = `
      WITH set_cost_analysis AS (
        SELECT 
          p.part_id,
          pt.part_name,
          p.unit_cost,
          sp.quantity,
          (p.unit_cost * sp.quantity) as line_total,
          p.stock_quantity,
          p.minimum_stock_level
        FROM parts p
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        LEFT JOIN set_parts sp ON p.part_id = sp.part_id
        WHERE p.part_id = ANY($1)
        AND p.active = true
      ),
      cost_summary AS (
        SELECT 
          SUM(line_total) as total_cost,
          AVG(unit_cost) as average_part_cost,
          COUNT(*) as part_count,
          SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
          SUM(CASE WHEN stock_quantity <= minimum_stock_level THEN 1 ELSE 0 END) as low_stock_count
        FROM set_cost_analysis
      )
      SELECT 
        total_cost,
        average_part_cost,
        part_count,
        out_of_stock_count,
        low_stock_count,
        CASE 
          WHEN total_cost = 0 THEN 'No Cost Data'
          WHEN total_cost < 50 THEN 'Budget Set'
          WHEN total_cost < 100 THEN 'Standard Set'
          WHEN total_cost < 200 THEN 'Premium Set'
          ELSE 'High-End Set'
        END as cost_category
      FROM cost_summary;
    `;

    const result = await pool.query(query, [partIds]);
    const costData = result.rows[0];

    // Generate cost optimization recommendations
    const recommendations = [];

    if (costData.out_of_stock_count > 0) {
      recommendations.push(`${costData.out_of_stock_count} parts are out of stock - consider alternatives`);
    }

    if (costData.low_stock_count > 0) {
      recommendations.push(`${costData.low_stock_count} parts have low stock - plan reorders`);
    }

    if (costData.average_part_cost > 20) {
      recommendations.push('High average part cost - consider more cost-effective alternatives');
    }

    if (costData.total_cost > 150) {
      recommendations.push('Set cost is high - review if all parts are necessary');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cost optimization looks good!');
    }

    return {
      ...costData,
      recommendations
    };
  }

  /**
   * Analyze educational value of the set
   */
  async analyzeEducationalValue(setData) {
    const { category, difficulty_level, recommended_age_min, recommended_age_max, parts = [] } = setData;

    // Educational value scoring based on various factors
    let educationalScore = 0;
    const factors = [];

    // Age appropriateness
    if (recommended_age_min && recommended_age_max) {
      const ageRange = recommended_age_max - recommended_age_min;
      if (ageRange >= 3 && ageRange <= 8) {
        educationalScore += 20;
        factors.push('Good age range targeting');
      } else if (ageRange > 8) {
        educationalScore += 10;
        factors.push('Wide age range');
      }
    }

    // Difficulty progression
    const difficultyScores = {
      'beginner': 15,
      'intermediate': 20,
      'advanced': 25
    };
    educationalScore += difficultyScores[difficulty_level] || 10;
    factors.push(`Appropriate difficulty level: ${difficulty_level}`);

    // Category educational value
    const categoryScores = {
      'electronics': 25,
      'programming': 30,
      'robotics': 30,
      'woodwork': 20,
      'crafts': 15,
      'science': 25,
      'engineering': 25
    };
    educationalScore += categoryScores[category] || 15;
    factors.push(`Educational category: ${category}`);

    // Parts diversity (more diverse parts = higher educational value)
    if (parts && parts.length > 0) {
      const uniqueCategories = new Set(parts.map(p => p.category).filter(Boolean));
      educationalScore += Math.min(uniqueCategories.size * 5, 25);
      factors.push(`Diverse part categories: ${uniqueCategories.size}`);
    }

    // Educational value assessment
    let educationalLevel;
    if (educationalScore >= 80) {
      educationalLevel = 'Excellent';
    } else if (educationalScore >= 60) {
      educationalLevel = 'Good';
    } else if (educationalScore >= 40) {
      educationalLevel = 'Fair';
    } else {
      educationalLevel = 'Needs Improvement';
    }

    // Generate educational recommendations
    const recommendations = [];

    if (educationalScore < 60) {
      recommendations.push('Consider adding more diverse part categories');
      recommendations.push('Review age range targeting');
      recommendations.push('Add more hands-on learning components');
    }

    if (parts && parts.length < 5) {
      recommendations.push('Consider adding more parts for richer learning experience');
    }

    if (recommended_age_max - recommended_age_min > 10) {
      recommendations.push('Age range might be too wide - consider narrowing focus');
    }

    return {
      educationalScore,
      educationalLevel,
      factors,
      recommendations: recommendations.length > 0 ? recommendations : ['Educational value looks good!']
    };
  }

  /**
   * Analyze safety aspects of the set
   */
  async analyzeSafety(setData) {
    const { parts = [], recommended_age_min, recommended_age_max } = setData;

    const safetyConcerns = [];
    const safetyScore = 100; // Start with perfect score

    // Check for age-inappropriate parts
    if (parts && parts.length > 0) {
      const partIds = parts.map(p => p.part_id).filter(id => id);

      if (partIds.length > 0) {
        const query = `
          SELECT 
            p.part_id,
            pt.part_name,
            p.category,
            p.safety_notes
          FROM parts p
          LEFT JOIN part_translations pt ON p.part_id = pt.part_id
          LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
          WHERE p.part_id = ANY($1)
          AND p.active = true
        `;

        const result = await pool.query(query, [partIds]);

        result.rows.forEach(part => {
          // Check for potentially dangerous parts for young children
          if (recommended_age_min && recommended_age_min < 8) {
            const dangerousKeywords = ['sharp', 'hot', 'electrical', 'chemical', 'small parts'];
            const partName = part.part_name.toLowerCase();
            const category = part.category?.toLowerCase() || '';

            dangerousKeywords.forEach(keyword => {
              if (partName.includes(keyword) || category.includes(keyword)) {
                safetyConcerns.push({
                  part: part.part_name,
                  concern: `Contains ${keyword} components - may not be suitable for ages under 8`,
                  severity: 'warning'
                });
              }
            });
          }

          // Check for parts with safety notes
          if (part.safety_notes) {
            safetyConcerns.push({
              part: part.part_name,
              concern: `Has safety notes: ${part.safety_notes}`,
              severity: 'info'
            });
          }
        });
      }
    }

    // Calculate safety score
    const finalSafetyScore = Math.max(0, safetyScore - (safetyConcerns.length * 10));

    let safetyLevel;
    if (finalSafetyScore >= 90) {
      safetyLevel = 'Very Safe';
    } else if (finalSafetyScore >= 70) {
      safetyLevel = 'Safe';
    } else if (finalSafetyScore >= 50) {
      safetyLevel = 'Caution Required';
    } else {
      safetyLevel = 'High Risk';
    }

    // Generate safety recommendations
    const recommendations = [];

    if (safetyConcerns.length > 0) {
      recommendations.push('Review safety concerns for age appropriateness');
      recommendations.push('Consider adding safety instructions');
    }

    if (recommended_age_min && recommended_age_min < 6) {
      recommendations.push('Ensure no small parts that could be choking hazards');
    }

    if (recommendations.length === 0) {
      recommendations.push('Safety assessment looks good!');
    }

    return {
      safetyScore: finalSafetyScore,
      safetyLevel,
      concerns: safetyConcerns,
      recommendations
    };
  }

  /**
   * Check completeness of the set
   */
  async checkCompleteness(setData) {
    const { parts = [], category } = setData;

    const completenessIssues = [];
    let completenessScore = 100;

    // Check if set has parts
    if (!parts || parts.length === 0) {
      completenessIssues.push('No parts added to the set');
      completenessScore -= 50;
    } else {
      // Check for essential part categories based on set category
      const essentialCategories = {
        'electronics': ['electronic', 'connector', 'wire', 'battery'],
        'woodwork': ['wood', 'fastener', 'tool'],
        'crafts': ['material', 'adhesive', 'tool'],
        'robotics': ['electronic', 'motor', 'sensor', 'controller'],
        'programming': ['electronic', 'controller', 'sensor']
      };

      const requiredCategories = essentialCategories[category] || [];
      const partCategories = parts.map(p => p.category?.toLowerCase()).filter(Boolean);

      requiredCategories.forEach(reqCategory => {
        const hasCategory = partCategories.some(cat => cat.includes(reqCategory));
        if (!hasCategory) {
          completenessIssues.push(`Missing essential ${reqCategory} components`);
          completenessScore -= 15;
        }
      });

      // Check for minimum part count
      if (parts.length < 3) {
        completenessIssues.push('Very few parts - consider adding more components');
        completenessScore -= 20;
      }
    }

    // Check for missing basic information
    if (!setData.name) {
      completenessIssues.push('Set name is missing');
      completenessScore -= 10;
    }

    if (!setData.description) {
      completenessIssues.push('Set description is missing');
      completenessScore -= 10;
    }

    if (!setData.category) {
      completenessIssues.push('Set category is missing');
      completenessScore -= 10;
    }

    let completenessLevel;
    if (completenessScore >= 90) {
      completenessLevel = 'Complete';
    } else if (completenessScore >= 70) {
      completenessLevel = 'Mostly Complete';
    } else if (completenessScore >= 50) {
      completenessLevel = 'Partially Complete';
    } else {
      completenessLevel = 'Incomplete';
    }

    // Generate completeness recommendations
    const recommendations = [];

    if (completenessIssues.length > 0) {
      recommendations.push(...completenessIssues.map(issue => `Fix: ${issue}`));
    }

    if (recommendations.length === 0) {
      recommendations.push('Set completeness looks good!');
    }

    return {
      completenessScore,
      completenessLevel,
      issues: completenessIssues,
      recommendations
    };
  }

  /**
   * Predict performance metrics for the set
   */
  async predictPerformance(setData) {
    const { category, difficulty_level, recommended_age_min, recommended_age_max, parts = [] } = setData;

    let successRate = 80; // Base success rate
    let estimatedTime = 60; // Base time in minutes
    let popularityScore = 50; // Base popularity score

    // Adjust success rate based on difficulty
    const difficultyAdjustments = {
      'beginner': 15,
      'intermediate': 0,
      'advanced': -20
    };
    successRate += difficultyAdjustments[difficulty_level] || 0;

    // Adjust based on age range
    if (recommended_age_min && recommended_age_max) {
      const ageRange = recommended_age_max - recommended_age_min;
      if (ageRange <= 3) {
        successRate += 10; // Narrow age range = higher success
      } else if (ageRange > 8) {
        successRate -= 10; // Wide age range = lower success
      }
    }

    // Adjust based on category popularity
    const categoryPopularity = {
      'electronics': 20,
      'robotics': 25,
      'programming': 15,
      'woodwork': 10,
      'crafts': 5,
      'science': 15,
      'engineering': 20
    };
    popularityScore += categoryPopularity[category] || 0;

    // Adjust time based on part count and difficulty
    estimatedTime += (parts.length || 0) * 5; // 5 minutes per part
    estimatedTime += difficultyAdjustments[difficulty_level] || 0;

    // Ensure reasonable bounds
    successRate = Math.max(0, Math.min(100, successRate));
    estimatedTime = Math.max(15, Math.min(300, estimatedTime));
    popularityScore = Math.max(0, Math.min(100, popularityScore));

    return {
      predictedSuccessRate: Math.round(successRate),
      estimatedCompletionTime: Math.round(estimatedTime),
      predictedPopularity: Math.round(popularityScore),
      confidence: 'Medium' // Could be enhanced with historical data
    };
  }

  /**
   * Generate AI suggestions based on all analyses
   */
  async generateSuggestions(analysis, setData) {
    const suggestions = [];

    // Cost optimization suggestions
    if (analysis.costOptimization.totalCost > 100) {
      suggestions.push({
        type: 'COST_OPTIMIZATION',
        priority: 'Medium',
        title: 'High Set Cost Detected',
        description: `Set cost is €${analysis.costOptimization.totalCost.toFixed(2)} - consider cost-effective alternatives`,
        action: 'Review parts for cheaper alternatives without compromising quality'
      });
    }

    // Educational value suggestions
    if (analysis.educationalValue.educationalScore < 60) {
      suggestions.push({
        type: 'EDUCATIONAL_VALUE',
        priority: 'High',
        title: 'Educational Value Needs Improvement',
        description: `Educational score: ${analysis.educationalValue.educationalScore}/100`,
        action: 'Add more diverse parts and learning objectives'
      });
    }

    // Safety suggestions
    if (analysis.safetyAnalysis.safetyScore < 70) {
      suggestions.push({
        type: 'SAFETY',
        priority: 'High',
        title: 'Safety Concerns Identified',
        description: `${analysis.safetyAnalysis.concerns.length} safety concerns found`,
        action: 'Review parts for age appropriateness and add safety instructions'
      });
    }

    // Completeness suggestions
    if (analysis.completenessCheck.completenessScore < 80) {
      suggestions.push({
        type: 'COMPLETENESS',
        priority: 'High',
        title: 'Set Incomplete',
        description: `${analysis.completenessCheck.issues.length} completeness issues found`,
        action: 'Add missing essential components and information'
      });
    }

    // Performance suggestions
    if (analysis.performancePrediction.predictedSuccessRate < 70) {
      suggestions.push({
        type: 'PERFORMANCE',
        priority: 'Medium',
        title: 'Low Success Rate Predicted',
        description: `Predicted success rate: ${analysis.performancePrediction.predictedSuccessRate}%`,
        action: 'Consider simplifying or adding more guidance'
      });
    }

    return suggestions;
  }

  /**
   * Get AI recommendations for improving an existing set
   */
  async getSetImprovementRecommendations(setId) {
    try {
      // Get existing set data
      const setQuery = `
        SELECT s.*, st.name, st.description
        FROM sets s
        LEFT JOIN set_translations st ON s.set_id = st.set_id
        LEFT JOIN languages l ON st.language_id = l.language_id AND l.language_code = 'en'
        WHERE s.set_id = $1
      `;

      const setResult = await pool.query(setQuery, [setId]);
      if (setResult.rows.length === 0) {
        throw new Error('Set not found');
      }

      const setData = setResult.rows[0];

      // Get set parts
      const partsQuery = `
        SELECT sp.*, p.category, p.unit_cost, pt.part_name
        FROM set_parts sp
        LEFT JOIN parts p ON sp.part_id = p.part_id
        LEFT JOIN part_translations pt ON p.part_id = pt.part_id
        LEFT JOIN languages l ON pt.language_id = l.language_id AND l.language_code = 'en'
        WHERE sp.set_id = $1
      `;

      const partsResult = await pool.query(partsQuery, [setId]);
      setData.parts = partsResult.rows;

      // Run AI analysis
      const analysis = await this.analyzeSetDesign(setData);

      return {
        setData,
        analysis,
        improvementScore: this.calculateImprovementScore(analysis)
      };
    } catch (error) {
      console.error('Error getting set improvement recommendations:', error);
      throw error;
    }
  }

  /**
   * Calculate overall improvement score
   */
  calculateImprovementScore(analysis) {
    const weights = {
      costOptimization: 0.2,
      educationalValue: 0.25,
      safety: 0.25,
      completeness: 0.2,
      performance: 0.1
    };

    const scores = {
      costOptimization: analysis.costOptimization.totalCost < 100 ? 100 : 50,
      educationalValue: analysis.educationalValue.educationalScore,
      safety: analysis.safetyAnalysis.safetyScore,
      completeness: analysis.completenessCheck.completenessScore,
      performance: analysis.performancePrediction.predictedSuccessRate
    };

    const weightedScore = Object.keys(weights).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return Math.round(weightedScore);
  }
}

module.exports = new SetBuilderAI();
