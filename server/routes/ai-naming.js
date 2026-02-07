const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// AI Naming Helper Service
class AINamingHelper {
  constructor() {
    this.namingCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Generate AI-powered naming suggestions
   */
  async generateNamingSuggestions(type, context, currentName = '') {
    try {
      console.log(`🤖 AI Naming Helper generating suggestions for ${type}...`);

      const cacheKey = `${type}-${JSON.stringify(context)}-${currentName}`;
      const cached = this.namingCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('✅ Using cached naming suggestions');
        return cached.suggestions;
      }

      const suggestions = await this.generateSuggestions(type, context, currentName);
      
      // Cache the results
      this.namingCache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });

      console.log('✅ AI Naming Helper suggestions generated');
      return suggestions;
    } catch (error) {
      console.error('❌ Error in AI Naming Helper:', error);
      throw error;
    }
  }

  /**
   * Generate specific suggestions based on type and context
   */
  async generateSuggestions(type, context, currentName) {
    const suggestions = [];

    switch (type) {
      case 'part':
        suggestions.push(...await this.generatePartSuggestions(context, currentName));
        break;
      case 'tool':
        suggestions.push(...await this.generateToolSuggestions(context, currentName));
        break;
      case 'set':
        suggestions.push(...await this.generateSetSuggestions(context, currentName));
        break;
      default:
        suggestions.push(...await this.generateGenericSuggestions(context, currentName));
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Generate part naming suggestions
   */
  async generatePartSuggestions(context, currentName) {
    const { category, description, material, dimensions } = context;
    
    const suggestions = [];

    // Material-based suggestions
    if (material) {
      suggestions.push(`${material.charAt(0).toUpperCase() + material.slice(1)} Component`);
      suggestions.push(`${material.charAt(0).toUpperCase() + material.slice(1)} Part`);
    }

    // Category-based suggestions
    if (category) {
      const categoryMap = {
        'woodwork': ['Wooden Block', 'Timber Piece', 'Wood Component'],
        'electronics': ['Electronic Module', 'Circuit Component', 'Electronic Part'],
        'mechanical': ['Mechanical Part', 'Hardware Component', 'Mechanical Element'],
        'plastic': ['Plastic Component', 'Synthetic Part', 'Plastic Element']
      };
      
      if (categoryMap[category]) {
        suggestions.push(...categoryMap[category]);
      }
    }

    // Dimension-based suggestions
    if (dimensions) {
      suggestions.push(`${dimensions} Component`);
      suggestions.push(`${dimensions} Part`);
    }

    // Description-based suggestions
    if (description) {
      const keywords = description.toLowerCase().split(' ').filter(word => 
        word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
      );
      
      if (keywords.length > 0) {
        const mainKeyword = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
        suggestions.push(`${mainKeyword} Component`);
        suggestions.push(`${mainKeyword} Part`);
      }
    }

    // Generic part suggestions
    suggestions.push('Component A', 'Part Element', 'Hardware Piece', 'Building Block');

    return this.deduplicateSuggestions(suggestions, currentName);
  }

  /**
   * Generate tool naming suggestions
   */
  async generateToolSuggestions(context, currentName) {
    const { category, description, function: toolFunction, brand } = context;
    
    const suggestions = [];

    // Function-based suggestions
    if (toolFunction) {
      suggestions.push(`${toolFunction.charAt(0).toUpperCase() + toolFunction.slice(1)} Tool`);
      suggestions.push(`${toolFunction.charAt(0).toUpperCase() + toolFunction.slice(1)} Device`);
    }

    // Brand-based suggestions
    if (brand) {
      suggestions.push(`${brand} Tool`);
      suggestions.push(`${brand} Device`);
    }

    // Category-based suggestions
    if (category) {
      const categoryMap = {
        'hand_tools': ['Hand Tool', 'Manual Tool', 'Handheld Device'],
        'power_tools': ['Power Tool', 'Electric Tool', 'Motorized Device'],
        'measuring': ['Measuring Tool', 'Measurement Device', 'Gauge Tool'],
        'cutting': ['Cutting Tool', 'Cutting Device', 'Blade Tool'],
        'fastening': ['Fastening Tool', 'Joining Device', 'Connection Tool']
      };
      
      if (categoryMap[category]) {
        suggestions.push(...categoryMap[category]);
      }
    }

    // Description-based suggestions
    if (description) {
      const keywords = description.toLowerCase().split(' ').filter(word => 
        word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
      );
      
      if (keywords.length > 0) {
        const mainKeyword = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
        suggestions.push(`${mainKeyword} Tool`);
        suggestions.push(`${mainKeyword} Device`);
      }
    }

    // Generic tool suggestions
    suggestions.push('Multi-Purpose Tool', 'Utility Device', 'Workshop Tool', 'Professional Tool');

    return this.deduplicateSuggestions(suggestions, currentName);
  }

  /**
   * Generate set naming suggestions
   */
  async generateSetSuggestions(context, currentName) {
    const { category, difficulty_level, recommended_age_min, recommended_age_max, description } = context;
    
    const suggestions = [];

    // Age-based suggestions
    if (recommended_age_min && recommended_age_max) {
      suggestions.push(`Ages ${recommended_age_min}-${recommended_age_max} Set`);
      suggestions.push(`${recommended_age_min}+ Years Set`);
    }

    // Difficulty-based suggestions
    if (difficulty_level) {
      const difficultyMap = {
        'beginner': ['Beginner Set', 'Starter Kit', 'Easy Build Set'],
        'intermediate': ['Intermediate Set', 'Advanced Kit', 'Challenge Set'],
        'expert': ['Expert Set', 'Master Kit', 'Professional Set']
      };
      
      if (difficultyMap[difficulty_level]) {
        suggestions.push(...difficultyMap[difficulty_level]);
      }
    }

    // Category-based suggestions
    if (category) {
      const categoryMap = {
        'woodwork': ['Woodworking Set', 'Timber Kit', 'Wood Craft Set'],
        'electronics': ['Electronics Set', 'Circuit Kit', 'Electronic Project Set'],
        'mechanical': ['Mechanical Set', 'Engineering Kit', 'Mechanism Set'],
        'art': ['Art Set', 'Creative Kit', 'Artistic Project Set'],
        'science': ['Science Set', 'Experiment Kit', 'Discovery Set']
      };
      
      if (categoryMap[category]) {
        suggestions.push(...categoryMap[category]);
      }
    }

    // Description-based suggestions
    if (description) {
      const keywords = description.toLowerCase().split(' ').filter(word => 
        word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
      );
      
      if (keywords.length > 0) {
        const mainKeyword = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
        suggestions.push(`${mainKeyword} Set`);
        suggestions.push(`${mainKeyword} Kit`);
        suggestions.push(`${mainKeyword} Project Set`);
      }
    }

    // Generic set suggestions
    suggestions.push('Maker Set', 'Build Kit', 'Project Set', 'Learning Kit');

    return this.deduplicateSuggestions(suggestions, currentName);
  }

  /**
   * Generate generic naming suggestions
   */
  async generateGenericSuggestions(context, currentName) {
    const suggestions = [];
    
    if (context.description) {
      const keywords = context.description.toLowerCase().split(' ').filter(word => 
        word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
      );
      
      if (keywords.length > 0) {
        const mainKeyword = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
        suggestions.push(`${mainKeyword} Item`);
        suggestions.push(`${mainKeyword} Component`);
        suggestions.push(`${mainKeyword} Element`);
      }
    }

    suggestions.push('Custom Item', 'New Component', 'Updated Element', 'Modified Item');

    return this.deduplicateSuggestions(suggestions, currentName);
  }

  /**
   * Remove duplicates and current name from suggestions
   */
  deduplicateSuggestions(suggestions, currentName) {
    const unique = [...new Set(suggestions)];
    return unique.filter(suggestion => 
      suggestion.toLowerCase() !== currentName.toLowerCase()
    );
  }
}

const aiNamingHelper = new AINamingHelper();

// Generate naming suggestions
router.post('/suggestions', async (req, res) => {
  try {
    const { type, context, currentName } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }

    const validTypes = ['part', 'tool', 'set'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be: part, tool, or set' });
    }

    const suggestions = await aiNamingHelper.generateNamingSuggestions(
      type, 
      context || {}, 
      currentName || ''
    );

    res.json({
      success: true,
      suggestions,
      type,
      context: context || {}
    });
  } catch (error) {
    console.error('Error generating naming suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to generate naming suggestions',
      details: error.message 
    });
  }
});

// Get naming guidelines
router.get('/guidelines/:type', async (req, res) => {
  try {
    const { type } = req.params;

    const guidelines = {
      part: {
        title: 'Part Naming Guidelines',
        rules: [
          'Use descriptive names that indicate the part\'s function',
          'Include material type when relevant (e.g., "Wooden Block", "Metal Bracket")',
          'Use consistent terminology across similar parts',
          'Avoid generic names like "Part 1" or "Component A"',
          'Include dimensions or specifications when helpful'
        ],
        examples: [
          'Wooden Base Plate 10x10cm',
          'Steel Mounting Bracket',
          'Plastic Connector Piece',
          'Electronic Sensor Module'
        ]
      },
      tool: {
        title: 'Tool Naming Guidelines',
        rules: [
          'Include the tool\'s primary function in the name',
          'Specify the tool type (hand tool, power tool, measuring tool)',
          'Include brand name when relevant',
          'Use professional terminology',
          'Avoid abbreviations unless commonly understood'
        ],
        examples: [
          'Cordless Drill Driver',
          'Digital Caliper',
          'Wood Chisel Set',
          'Precision Screwdriver'
        ]
      },
      set: {
        title: 'Set Naming Guidelines',
        rules: [
          'Include the target age range when appropriate',
          'Indicate difficulty level (Beginner, Intermediate, Expert)',
          'Describe the main activity or learning outcome',
          'Use engaging, educational language',
          'Keep names concise but descriptive'
        ],
        examples: [
          'Beginner Woodworking Set (Ages 8-12)',
          'Electronics Discovery Kit',
          'Advanced Mechanical Engineering Set',
          'Creative Art Project Kit'
        ]
      }
    };

    if (!guidelines[type]) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    res.json({
      success: true,
      guidelines: guidelines[type]
    });
  } catch (error) {
    console.error('Error getting naming guidelines:', error);
    res.status(500).json({ 
      error: 'Failed to get naming guidelines',
      details: error.message 
    });
  }
});

module.exports = router;
