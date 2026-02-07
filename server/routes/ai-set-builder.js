/**
 * AI Set Builder Agent API Routes
 *
 * Provides REST API endpoints for AI-powered set building assistance
 */

const express = require('express');
const router = express.Router();
const setBuilderAI = require('../ai/set-builder-agent');

/**
 * POST /api/ai/set-builder/analyze
 * Analyze set design and provide AI recommendations
 */
router.post('/analyze', async(req, res) => {
  try {
    const setData = req.body;
    console.log('🧠 AI Set Builder Agent analyzing set design...');

    const analysis = await setBuilderAI.analyzeSetDesign(setData);

    res.json({
      success: true,
      data: analysis,
      message: 'AI set design analysis completed successfully'
    });
  } catch (error) {
    console.error('Error in AI set builder analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze set design',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/set-builder/part-recommendations
 * Get AI part recommendations based on set requirements
 */
router.get('/part-recommendations', async(req, res) => {
  try {
    const { category, difficulty_level, recommended_age_min, recommended_age_max } = req.query;

    if (!category || !difficulty_level) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: category and difficulty_level'
      });
    }

    console.log('🎯 Fetching AI part recommendations...');

    const setData = {
      category,
      difficulty_level,
      recommended_age_min: recommended_age_min ? parseInt(recommended_age_min) : null,
      recommended_age_max: recommended_age_max ? parseInt(recommended_age_max) : null
    };

    const recommendations = await setBuilderAI.getPartRecommendations(setData);

    res.json({
      success: true,
      data: recommendations,
      message: 'AI part recommendations retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching AI part recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI part recommendations',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/set-builder/cost-analysis
 * Analyze cost optimization for a set
 */
router.post('/cost-analysis', async(req, res) => {
  try {
    const { parts } = req.body;
    console.log('💰 Analyzing set cost optimization...');

    const setData = { parts };
    const analysis = await setBuilderAI.analyzeSetDesign(setData);

    res.json({
      success: true,
      data: analysis.costOptimization,
      message: 'AI cost analysis completed successfully'
    });
  } catch (error) {
    console.error('Error in AI cost analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze set costs',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/set-builder/educational-analysis
 * Analyze educational value of a set
 */
router.post('/educational-analysis', async(req, res) => {
  try {
    const setData = req.body;
    console.log('🎓 Analyzing educational value...');

    const analysis = await setBuilderAI.analyzeSetDesign(setData);

    res.json({
      success: true,
      data: analysis.educationalValue,
      message: 'AI educational analysis completed successfully'
    });
  } catch (error) {
    console.error('Error in AI educational analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze educational value',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/set-builder/safety-analysis
 * Analyze safety aspects of a set
 */
router.post('/safety-analysis', async(req, res) => {
  try {
    const setData = req.body;
    console.log('🛡️ Analyzing safety aspects...');

    const analysis = await setBuilderAI.analyzeSetDesign(setData);

    res.json({
      success: true,
      data: analysis.safetyAnalysis,
      message: 'AI safety analysis completed successfully'
    });
  } catch (error) {
    console.error('Error in AI safety analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze safety aspects',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/set-builder/completeness-check
 * Check completeness of a set
 */
router.post('/completeness-check', async(req, res) => {
  try {
    const setData = req.body;
    console.log('✅ Checking set completeness...');

    const analysis = await setBuilderAI.analyzeSetDesign(setData);

    res.json({
      success: true,
      data: analysis.completenessCheck,
      message: 'AI completeness check completed successfully'
    });
  } catch (error) {
    console.error('Error in AI completeness check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check set completeness',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/set-builder/performance-prediction
 * Predict performance metrics for a set
 */
router.post('/performance-prediction', async(req, res) => {
  try {
    const setData = req.body;
    console.log('📊 Predicting set performance...');

    const analysis = await setBuilderAI.analyzeSetDesign(setData);

    res.json({
      success: true,
      data: analysis.performancePrediction,
      message: 'AI performance prediction completed successfully'
    });
  } catch (error) {
    console.error('Error in AI performance prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict set performance',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/set-builder/set/:setId/improvements
 * Get AI recommendations for improving an existing set
 */
router.get('/set/:setId/improvements', async(req, res) => {
  try {
    const { setId } = req.params;
    console.log(`🔧 Fetching AI improvements for set ${setId}...`);

    const recommendations = await setBuilderAI.getSetImprovementRecommendations(parseInt(setId));

    res.json({
      success: true,
      data: recommendations,
      message: `AI improvement recommendations for set ${setId} retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching set improvement recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch set improvement recommendations',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/set-builder/suggestions
 * Get AI suggestions for a set design
 */
router.post('/suggestions', async(req, res) => {
  try {
    const setData = req.body;
    console.log('💡 Generating AI suggestions...');

    const analysis = await setBuilderAI.analyzeSetDesign(setData);

    res.json({
      success: true,
      data: {
        suggestions: analysis.suggestions,
        timestamp: analysis.timestamp
      },
      message: 'AI suggestions generated successfully'
    });
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI suggestions',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/set-builder/validate
 * Validate set design and return overall assessment
 */
router.post('/validate', async(req, res) => {
  try {
    const setData = req.body;
    console.log('🔍 Validating set design...');

    const analysis = await setBuilderAI.analyzeSetDesign(setData);

    // Calculate overall validation score
    const validationScore = Math.round(
      (analysis.costOptimization.totalCost < 100 ? 100 : 80) * 0.2 +
      analysis.educationalValue.educationalScore * 0.25 +
      analysis.safetyAnalysis.safetyScore * 0.25 +
      analysis.completenessCheck.completenessScore * 0.2 +
      analysis.performancePrediction.predictedSuccessRate * 0.1
    );

    let validationStatus;
    if (validationScore >= 90) {
      validationStatus = 'Excellent';
    } else if (validationScore >= 75) {
      validationStatus = 'Good';
    } else if (validationScore >= 60) {
      validationStatus = 'Fair';
    } else {
      validationStatus = 'Needs Improvement';
    }

    res.json({
      success: true,
      data: {
        validationScore,
        validationStatus,
        analysis,
        timestamp: analysis.timestamp
      },
      message: 'AI set validation completed successfully'
    });
  } catch (error) {
    console.error('Error validating set design:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate set design',
      details: error.message
    });
  }
});

module.exports = router;
