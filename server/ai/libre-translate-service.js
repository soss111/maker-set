/**
 * LibreTranslate Service
 * 
 * Free, open-source translation service with no API keys or rate limits
 * Supports multiple languages including Estonian, Russian, and Finnish
 */

const axios = require('axios');

class LibreTranslateService {
  constructor() {
    // Public LibreTranslate instances (no API key required)
    this.endpoints = [
      'https://libretranslate.de/translate',
      'https://translate.argosopentech.com/translate',
      'https://translate.fortytwo-it.com/translate'
    ];
    this.currentEndpointIndex = 0;
    this.cache = new Map();
    
    console.log('🌐 LibreTranslate service initialized');
  }

  /**
   * Get the current working endpoint
   */
  getCurrentEndpoint() {
    return this.endpoints[this.currentEndpointIndex];
  }

  /**
   * Switch to the next endpoint if current one fails
   */
  switchEndpoint() {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
    console.log(`🔄 Switched to LibreTranslate endpoint: ${this.getCurrentEndpoint()}`);
  }

  /**
   * Translate text using LibreTranslate
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code (et, ru, fi)
   * @param {string} sourceLanguage - Source language code (default: en)
   * @returns {Promise<string>} Translated text
   */
  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    if (!text || !text.trim()) return '';

    // Check cache first
    const cacheKey = `${text}-${sourceLanguage}-${targetLanguage}`;
    if (this.cache.has(cacheKey)) {
      console.log(`📋 Using cached translation for "${text}"`);
      return this.cache.get(cacheKey);
    }

    // Map language codes to LibreTranslate format
    const languageMap = {
      'en': 'en',
      'et': 'et', 
      'ru': 'ru',
      'fi': 'fi'
    };

    const sourceLang = languageMap[sourceLanguage] || 'en';
    const targetLang = languageMap[targetLanguage];

    if (!targetLang) {
      console.warn(`⚠️ Unsupported target language: ${targetLanguage}`);
      return text; // Return original text if language not supported
    }

    const maxRetries = this.endpoints.length;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const endpoint = this.getCurrentEndpoint();
        console.log(`🌐 LibreTranslate: "${text}" ${sourceLang} → ${targetLang} (attempt ${attempt + 1})`);

        const response = await axios.post(endpoint, {
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text'
        }, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.translatedText) {
          const translatedText = response.data.translatedText;
          
          // If the translated text is the same as the original, treat it as a failure
          if (translatedText === text) {
            throw new Error('LibreTranslate returned original text unchanged');
          }
          
          console.log(`✅ LibreTranslate: "${text}" → "${translatedText}"`);
          
          // Cache the result
          this.cache.set(cacheKey, translatedText);
          return translatedText;
        } else {
          throw new Error('Invalid response format from LibreTranslate');
        }

      } catch (error) {
        lastError = error;
        console.warn(`❌ LibreTranslate endpoint failed (attempt ${attempt + 1}):`, error.message);
        
        // Switch to next endpoint for retry
        this.switchEndpoint();
        
        // Add delay between retries
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // If all endpoints failed, throw an error instead of returning original text
    console.error(`🚫 All LibreTranslate endpoints failed for "${text}":`, lastError?.message);
    throw new Error(`LibreTranslate failed to translate "${text}" to ${targetLanguage}`);
  }

  /**
   * Translate multiple texts in batch
   * @param {string[]} texts - Array of texts to translate
   * @param {string} targetLanguage - Target language code
   * @param {string} sourceLanguage - Source language code (default: en)
   * @returns {Promise<string[]>} Array of translated texts
   */
  async translateBatch(texts, targetLanguage, sourceLanguage = 'en') {
    const results = [];
    
    for (const text of texts) {
      try {
        const translated = await this.translateText(text, targetLanguage, sourceLanguage);
        results.push(translated);
        
        // Add small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(`Failed to translate "${text}":`, error.message);
        results.push(text); // Fallback to original text
      }
    }
    
    return results;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return {
      'en': 'English',
      'et': 'Estonian',
      'ru': 'Russian', 
      'fi': 'Finnish'
    };
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ LibreTranslate cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Test connectivity to LibreTranslate endpoints
   */
  async testConnectivity() {
    console.log('🔍 Testing LibreTranslate connectivity...');
    
    for (let i = 0; i < this.endpoints.length; i++) {
      try {
        const endpoint = this.endpoints[i];
        const response = await axios.post(endpoint, {
          q: 'test',
          source: 'en',
          target: 'et',
          format: 'text'
        }, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Endpoint ${i + 1} (${endpoint}): Working`);
      } catch (error) {
        console.log(`❌ Endpoint ${i + 1} (${this.endpoints[i]}): Failed - ${error.message}`);
      }
    }
  }
}

module.exports = new LibreTranslateService();
