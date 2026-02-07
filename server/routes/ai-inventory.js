/**
 * AI Inventory Optimization API Routes
 *
 * Provides REST API endpoints for AI-powered inventory management
 */

const express = require('express');
const router = express.Router();
const inventoryAI = require('../ai/inventory-optimization');

/**
 * GET /api/ai/inventory/analysis
 * Get complete AI inventory optimization analysis
 */
router.get('/analysis', async(req, res) => {
  try {
    console.log('🧠 Fetching AI Inventory Analysis...');
    const analysis = await inventoryAI.analyzeInventoryOptimization();

    res.json({
      success: true,
      data: analysis,
      message: 'AI inventory analysis completed successfully'
    });
  } catch (error) {
    console.error('Error fetching AI inventory analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI inventory analysis',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/inventory/dashboard
 * Get AI dashboard summary
 */
router.get('/dashboard', async(req, res) => {
  try {
    console.log('📊 Fetching AI Inventory Dashboard...');
    const summary = await inventoryAI.getDashboardSummary();

    res.json({
      success: true,
      data: summary,
      message: 'AI inventory dashboard summary retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching AI inventory dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI inventory dashboard',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/inventory/demand-forecast
 * Get AI demand forecasting analysis
 */
router.get('/demand-forecast', async(req, res) => {
  try {
    console.log('📈 Fetching AI Demand Forecast...');
    const analysis = await inventoryAI.analyzeInventoryOptimization();

    res.json({
      success: true,
      data: {
        demandForecast: analysis.demandForecast,
        timestamp: analysis.timestamp
      },
      message: 'AI demand forecast retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching AI demand forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI demand forecast',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/inventory/reorder-optimization
 * Get AI reorder point optimization
 */
router.get('/reorder-optimization', async(req, res) => {
  try {
    console.log('🔄 Fetching AI Reorder Optimization...');
    const analysis = await inventoryAI.analyzeInventoryOptimization();

    res.json({
      success: true,
      data: {
        reorderOptimization: analysis.reorderOptimization,
        timestamp: analysis.timestamp
      },
      message: 'AI reorder optimization retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching AI reorder optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI reorder optimization',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/inventory/risk-assessment
 * Get AI risk assessment
 */
router.get('/risk-assessment', async(req, res) => {
  try {
    console.log('⚠️ Fetching AI Risk Assessment...');
    const analysis = await inventoryAI.analyzeInventoryOptimization();

    res.json({
      success: true,
      data: {
        riskAssessment: analysis.riskAssessment,
        timestamp: analysis.timestamp
      },
      message: 'AI risk assessment retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching AI risk assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI risk assessment',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/inventory/cost-optimization
 * Get AI cost optimization analysis
 */
router.get('/cost-optimization', async(req, res) => {
  try {
    console.log('💰 Fetching AI Cost Optimization...');
    const analysis = await inventoryAI.analyzeInventoryOptimization();

    res.json({
      success: true,
      data: {
        costOptimization: analysis.costOptimization,
        timestamp: analysis.timestamp
      },
      message: 'AI cost optimization retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching AI cost optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI cost optimization',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/inventory/seasonal-analysis
 * Get AI seasonal pattern analysis
 */
router.get('/seasonal-analysis', async(req, res) => {
  try {
    console.log('📅 Fetching AI Seasonal Analysis...');
    const analysis = await inventoryAI.analyzeInventoryOptimization();

    res.json({
      success: true,
      data: {
        seasonalAnalysis: analysis.seasonalAnalysis,
        timestamp: analysis.timestamp
      },
      message: 'AI seasonal analysis retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching AI seasonal analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI seasonal analysis',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/inventory/recommendations
 * Get AI recommendations
 */
router.get('/recommendations', async(req, res) => {
  try {
    console.log('💡 Fetching AI Recommendations...');
    const analysis = await inventoryAI.analyzeInventoryOptimization();

    res.json({
      success: true,
      data: {
        recommendations: analysis.recommendations,
        timestamp: analysis.timestamp
      },
      message: 'AI recommendations retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI recommendations',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/inventory/part/:partId/recommendations
 * Get AI recommendations for a specific part
 */
router.get('/part/:partId/recommendations', async(req, res) => {
  try {
    const { partId } = req.params;
    console.log(`🎯 Fetching AI recommendations for part ${partId}...`);

    const recommendations = await inventoryAI.getPartRecommendations(parseInt(partId));

    res.json({
      success: true,
      data: recommendations,
      message: `AI recommendations for part ${partId} retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching part recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch part recommendations',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/inventory/refresh
 * Force refresh AI analysis (clears cache)
 */
router.post('/refresh', async(req, res) => {
  try {
    console.log('🔄 Refreshing AI Inventory Analysis...');

    // Clear cache
    inventoryAI.analysisCache.clear();

    // Run fresh analysis
    const analysis = await inventoryAI.analyzeInventoryOptimization();

    res.json({
      success: true,
      data: analysis,
      message: 'AI inventory analysis refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing AI inventory analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh AI inventory analysis',
      details: error.message
    });
  }
});

module.exports = router;
