/**
 * AI Translation API Routes
 * 
 * Provides REST API endpoints for AI-powered translation services
 */

const express = require('express');
const router = express.Router();
const translationService = require('../ai/translation-service-v2');

/**
 * POST /api/ai/translate/text
 * Translate a single text string
 */
router.post('/text', async (req, res) => {
  try {
    const { text, targetLanguage, context = 'general' } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: text and targetLanguage'
      });
    }

    console.log(`🌐 AI Translation: "${text}" to ${targetLanguage} (${context})`);

    const translatedText = await translationService.translateText(text, targetLanguage, context);

    res.json({
      success: true,
      data: {
        data: {
          original: text,
          translated: translatedText,
          targetLanguage,
          context
        }
      },
      message: 'Translation completed successfully'
    });
  } catch (error) {
    console.error('Error in AI translation:', error);
    
    // Use fallback translation when API fails
    let fallbackTranslation = text || '';
    try {
      fallbackTranslation = translationService.fallbackTranslation(text, targetLanguage);
    } catch (fallbackError) {
      console.error('Fallback translation also failed:', fallbackError);
    }
    
    // Always return a consistent format even on error
    res.status(500).json({
      success: false,
      data: {
        data: {
          original: text || '',
          translated: fallbackTranslation,
          targetLanguage: targetLanguage || 'en',
          context: context || 'general'
        }
      },
      error: 'Failed to translate text, using fallback',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/translate/tool
 * Translate complete tool data for all languages
 */
router.post('/tool', async (req, res) => {
  try {
    const { toolData } = req.body;

    if (!toolData || !toolData.tool_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: toolData with tool_name'
      });
    }

    console.log(`🌐 AI Translation: Complete tool data for "${toolData.tool_name}"`);

    const translations = await translationService.translateToolData(toolData);

    res.json({
      success: true,
      data: {
        original: toolData,
        translations
      },
      message: 'Tool translation completed successfully'
    });
  } catch (error) {
    console.error('Error in AI tool translation:', error);
    
    // Use fallback translations when API fails
    const fallbackTranslations = {
      et: { 
        tool_name: translationService.fallbackTranslation(toolData?.tool_name || '', 'et'), 
        description: translationService.fallbackTranslation(toolData?.description || '', 'et'), 
        safety_instructions: translationService.fallbackTranslation(toolData?.safety_instructions || '', 'et') 
      },
      ru: { 
        tool_name: translationService.fallbackTranslation(toolData?.tool_name || '', 'ru'), 
        description: translationService.fallbackTranslation(toolData?.description || '', 'ru'), 
        safety_instructions: translationService.fallbackTranslation(toolData?.safety_instructions || '', 'ru') 
      },
      fi: { 
        tool_name: translationService.fallbackTranslation(toolData?.tool_name || '', 'fi'), 
        description: translationService.fallbackTranslation(toolData?.description || '', 'fi'), 
        safety_instructions: translationService.fallbackTranslation(toolData?.safety_instructions || '', 'fi') 
      }
    };
    
    // Always return a consistent format even on error
    res.status(500).json({
      success: false,
      data: {
        original: toolData || {},
        translations: fallbackTranslations
      },
      error: 'Failed to translate tool data, using fallback',
      details: error.message
    });
  }
});

/**
 * POST /api/ai/translate/batch
 * Translate multiple texts at once
 */
router.post('/batch', async (req, res) => {
  try {
    const { texts, targetLanguage, context = 'general' } = req.body;

    if (!texts || !Array.isArray(texts) || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: texts (array) and targetLanguage'
      });
    }

    console.log(`🌐 AI Translation: Batch translation of ${texts.length} texts to ${targetLanguage}`);

    const translations = await Promise.all(
      texts.map(async (text) => ({
        original: text,
        translated: await translationService.translateText(text, targetLanguage, context)
      }))
    );

    res.json({
      success: true,
      data: {
        translations,
        targetLanguage,
        context
      },
      message: 'Batch translation completed successfully'
    });
  } catch (error) {
    console.error('Error in AI batch translation:', error);
    
    // Use fallback translations when API fails
    const fallbackTranslations = texts.map(text => ({
      original: text,
      translated: translationService.fallbackTranslation(text, targetLanguage)
    }));
    
    res.status(500).json({
      success: false,
      data: {
        translations: fallbackTranslations,
        targetLanguage,
        context
      },
      error: 'Failed to translate texts, using fallback',
      details: error.message
    });
  }
});

/**
 * GET /api/ai/translate/cache/stats
 * Get translation cache statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = translationService.getCacheStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
      details: error.message
    });
  }
});

/**
 * DELETE /api/ai/translate/cache
 * Clear translation cache
 */
router.delete('/cache', async (req, res) => {
  try {
    translationService.clearCache();
    
    res.json({
      success: true,
      message: 'Translation cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

module.exports = router;
