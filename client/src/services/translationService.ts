/**
 * Unified Translation Service for Frontend
 * 
 * Provides a consistent, robust translation system across all pages
 * Handles caching, error recovery, and user experience
 */

import React from 'react';
import { aiTranslationApi } from './api';

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  context?: 'tool' | 'part' | 'set' | 'safety' | 'general';
}

export interface TranslationResult {
  success: boolean;
  translatedText: string;
  originalText: string;
  targetLanguage: string;
  context?: string;
  error?: string;
  fromCache?: boolean;
  service?: 'external' | 'dictionary_fallback';
  fallbackReason?: string;
}

export interface BatchTranslationRequest {
  texts: string[];
  targetLanguage: string;
  context?: string;
}

export interface BatchTranslationResult {
  success: boolean;
  results: TranslationResult[];
  errors: string[];
}

class UnifiedTranslationService {
  private cache = new Map<string, TranslationResult>();
  private pendingRequests = new Map<string, Promise<TranslationResult>>();
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff
  private maxRetries = 3;

  /**
   * Translate a single text with caching and error handling
   */
  async translateText(request: TranslationRequest): Promise<TranslationResult> {
    const cacheKey = this.getCacheKey(request);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return { ...cached, fromCache: true };
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request
    const requestPromise = this.executeTranslation(request, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Translate multiple texts efficiently
   */
  async translateBatch(request: BatchTranslationRequest): Promise<BatchTranslationResult> {
    const results: TranslationResult[] = [];
    const errors: string[] = [];

    // Process texts in parallel with rate limiting
    const promises = request.texts.map(async (text, index) => {
      try {
        const result = await this.translateText({
          text,
          targetLanguage: request.targetLanguage,
          context: request.context as 'tool' | 'part' | 'set' | 'safety' | 'general'
        });
        results[index] = result;
      } catch (error) {
        const errorMsg = `Failed to translate "${text}": ${error}`;
        errors.push(errorMsg);
        results[index] = {
          success: false,
          translatedText: text, // Fallback to original
          originalText: text,
          targetLanguage: request.targetLanguage,
          context: request.context,
          error: errorMsg
        };
      }
    });

    await Promise.all(promises);

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  /**
   * Translate all fields for a form (parts, tools, sets)
   */
  async translateFormFields(
    englishData: Record<string, string>,
    targetLanguages: string[],
    context: 'tool' | 'part' | 'set' | 'safety' | 'general' = 'general'
  ): Promise<Record<string, Record<string, string>>> {
    // Clear cache to ensure fresh translations
    this.cache.clear();
    console.log('🗑️ Translation cache cleared for fresh translations');
    
    const translations: Record<string, Record<string, string>> = {};

    for (const language of targetLanguages) {
      translations[language] = {};
      
      // Translate each field individually with rate limiting
      for (const [field, text] of Object.entries(englishData)) {
        if (text && text.trim()) {
          try {
            // Add delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const result = await this.translateText({
              text,
              targetLanguage: language,
              context
            });
            console.log(`🔍 Frontend translation result:`, { field, language, original: text, translated: result.translatedText, success: result.success });
            translations[language][field] = result.translatedText;
          } catch (error) {
            console.warn(`Failed to translate ${field} to ${language}:`, error);
            translations[language][field] = ''; // Fallback to empty string
          }
        }
      }
    }

    return translations;
  }

  /**
   * Execute the actual translation with retry logic
   */
  private async executeTranslation(
    request: TranslationRequest, 
    cacheKey: string
  ): Promise<TranslationResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await aiTranslationApi.translateText(
          request.text,
          request.targetLanguage,
          request.context
        );

        console.log(`🔍 Full API response:`, response);
        console.log(`🔍 Response data:`, response.data);
        console.log(`🔍 Response data.data:`, response.data?.data);
        console.log(`🔍 Response data.data.data:`, response.data?.data?.data);
        console.log(`🔍 API response:`, { 
          text: request.text, 
          targetLanguage: request.targetLanguage,
          response: response.data,
          translated: response.data?.data?.data?.translated 
        });

        const translatedText = response.data?.data?.translated || request.text;

        return {
          success: true,
          translatedText,
          originalText: request.text,
          targetLanguage: request.targetLanguage,
          context: request.context,
          service: response.data?.data?.service,
          fallbackReason: response.data?.data?.fallbackReason
        };
      } catch (error: any) {
        lastError = error;
        console.warn(`Translation attempt ${attempt + 1} failed:`, error);

        // Don't retry on certain errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          break;
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelays[attempt] || 4000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed, return fallback
    return {
      success: false,
      translatedText: '', // Fallback to empty string
      originalText: request.text,
      targetLanguage: request.targetLanguage,
      context: request.context,
      error: lastError?.message || 'Translation failed'
    };
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(request: TranslationRequest): string {
    return `${request.text}|${request.targetLanguage}|${request.context || 'general'}`;
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Preload common translations
   */
  async preloadCommonTranslations(): Promise<void> {
    const commonTerms = [
      'screwdriver', 'drill', 'hammer', 'saw', 'knife',
      'hot glue gun', 'measuring tape', 'safety glasses',
      'work gloves', 'wrench', 'pliers', 'level', 'clamp'
    ];

    const languages = ['et', 'ru', 'fi'];
    const contexts: Array<'tool' | 'part' | 'set'> = ['tool', 'part', 'set'];

    const preloadPromises: Promise<void>[] = [];

    for (const term of commonTerms) {
      for (const language of languages) {
        for (const context of contexts) {
          preloadPromises.push(
            this.translateText({
              text: term,
              targetLanguage: language,
              context
            }).then(() => {}) // Ignore results, just cache them
          );
        }
      }
    }

    await Promise.allSettled(preloadPromises);
  }
}

// Export singleton instance
export const translationService = new UnifiedTranslationService();

// Export hook for React components
export const useTranslation = () => {
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationError, setTranslationError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [progressStep, setProgressStep] = React.useState(0);
  const [totalSteps, setTotalSteps] = React.useState(0);
  const [currentText, setCurrentText] = React.useState<string | undefined>(undefined);
  const [currentLanguage, setCurrentLanguage] = React.useState<string | undefined>(undefined);

  const translateText = async (request: TranslationRequest): Promise<TranslationResult> => {
    setIsTranslating(true);
    setTranslationError(null);
    setSuccessMessage(null);

    try {
      const result = await translationService.translateText(request);
      
      if (result.success) {
        setSuccessMessage(`Translated to ${request.targetLanguage.toUpperCase()} successfully!`);
      } else {
        setTranslationError(result.error || 'Translation failed');
      }
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || 'Translation failed';
      setTranslationError(errorMsg);
      return {
        success: false,
        translatedText: request.text,
        originalText: request.text,
        targetLanguage: request.targetLanguage,
        context: request.context,
        error: errorMsg
      };
    } finally {
      setIsTranslating(false);
    }
  };

  const translateBatch = async (request: BatchTranslationRequest): Promise<BatchTranslationResult> => {
    setIsTranslating(true);
    setTranslationError(null);
    setSuccessMessage(null);

    try {
      const result = await translationService.translateBatch(request);
      
      if (result.success) {
        setSuccessMessage(`Translated ${request.texts.length} texts successfully!`);
      } else {
        setTranslationError(`Some translations failed: ${result.errors.join(', ')}`);
      }
      
      return result;
    } catch (error: any) {
      const errorMsg = error?.message || 'Batch translation failed';
      setTranslationError(errorMsg);
      return {
        success: false,
        results: [],
        errors: [errorMsg]
      };
    } finally {
      setIsTranslating(false);
    }
  };

  const translateFormFields = async (
    englishData: Record<string, string>,
    targetLanguages: string[],
    context: 'tool' | 'part' | 'set' | 'safety' | 'general' = 'general'
  ): Promise<Record<string, Record<string, string>>> => {
    setIsTranslating(true);
    setTranslationError(null);
    setSuccessMessage(null);
    
    const fields = Object.keys(englishData);
    const totalTranslations = fields.length * targetLanguages.length;
    setTotalSteps(totalTranslations);
    setProgressStep(0);

    try {
      const translations: Record<string, Record<string, string>> = {};

      for (const language of targetLanguages) {
        translations[language] = {};
        
        // Translate each field individually with rate limiting
        for (const [field, text] of Object.entries(englishData)) {
          if (text && text.trim()) {
            setCurrentText(text);
            setCurrentLanguage(language);
            
            try {
              // Add delay between requests to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const result = await translationService.translateText({
                text,
                targetLanguage: language,
                context
              });
              
              console.log(`🔍 Frontend translation result:`, { field, language, original: text, translated: result.translatedText, success: result.success });
              translations[language][field] = result.translatedText;
              
              setProgressStep(prev => prev + 1);
            } catch (error) {
              console.warn(`Failed to translate ${field} to ${language}:`, error);
              translations[language][field] = ''; // Fallback to empty string
              setProgressStep(prev => prev + 1);
            }
          }
        }
      }
      
      setSuccessMessage(`Form fields translated successfully!`);
      return translations;
    } catch (error: any) {
      const errorMsg = error?.message || 'Form translation failed';
      setTranslationError(errorMsg);
      return {};
    } finally {
      setIsTranslating(false);
      setProgressStep(0);
      setTotalSteps(0);
      setCurrentText(undefined);
      setCurrentLanguage(undefined);
    }
  };

  const clearMessages = () => {
    setTranslationError(null);
    setSuccessMessage(null);
  };

  return {
    translateText,
    translateBatch,
    translateFormFields,
    isTranslating,
    translationError,
    successMessage,
    clearMessages,
    progressStep,
    totalSteps,
    currentText,
    currentLanguage
  };
};
