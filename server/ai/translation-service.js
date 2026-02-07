/**
 * Improved fallback translation for common workshop/tool terms
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @returns {string} Translated text
 */
fallbackTranslation(text, targetLanguage) {
  console.log(`🔍 Fallback translation called with:`, { text, targetLanguage, textType: typeof text });
  
  // Handle null/undefined/empty
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const translations = {
    'en': {
      'screwdriver': 'screwdriver',
      'drill': 'drill',
      // ... your existing translations
    },
    'et': {
      'screwdriver': 'kruvikeeraja',
      'drill': 'puur',
      // ... your existing translations
    },
    'ru': {
      'screwdriver': 'отвертка',
      'drill': 'дрель',
      // ... your existing translations
    },
    'fi': {
      'screwdriver': 'ruuvimeisseli',
      'drill': 'porakone',
      // ... your existing translations
    }
  };

  // Return original if target language not found
  if (!translations[targetLanguage]) {
    console.log(`⚠️ Unknown target language: ${targetLanguage}, returning original`);
    return text;
  }

  const lowerText = text.toLowerCase().trim();
  
  // Try exact match first
  if (translations[targetLanguage][lowerText]) {
    console.log(`✅ Exact match found: "${text}" -> "${translations[targetLanguage][lowerText]}"`);
    return translations[targetLanguage][lowerText];
  }
  
  // Try to translate word by word for compound phrases
  const words = text.split(/\s+/);
  let hasTranslation = false;
  
  const translatedWords = words.map(word => {
    const lowerWord = word.toLowerCase();
    if (translations[targetLanguage][lowerWord]) {
      hasTranslation = true;
      return translations[targetLanguage][lowerWord];
    }
    return word; // Keep original if no translation
  });
  
  if (hasTranslation) {
    const result = translatedWords.join(' ');
    console.log(`🌐 Partial translation: "${text}" -> "${result}"`);
    return result;
  }
  
  // No translation found - return original text instead of empty string
  console.log(`⚠️ No translation found for "${text}" to ${targetLanguage}, returning original`);
  return text;
}