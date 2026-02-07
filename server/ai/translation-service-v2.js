/**
 * Enhanced Translation Service
 * 
 * Uses LibreTranslate as primary service with OpenAI as fallback
 * No rate limits, no API keys required for LibreTranslate
 */

const axios = require('axios');
const libreTranslate = require('./libre-translate-service');

class TranslationService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    this.model = 'gpt-3.5-turbo';
    this.cache = new Map();
    this.useLibreTranslate = true; // Use LibreTranslate as primary
    this.rateLimitDelayMs = 2000;
    this.lastRequestTime = 0;
    
    console.log('🌐 Enhanced Translation Service initialized');
    console.log('🔑 OpenAI API Key configured:', !!this.apiKey);
    console.log('🌐 Using LibreTranslate as primary service:', this.useLibreTranslate);
  }

  /**
   * Add delay to respect rate limits (for OpenAI only)
   */
  async addRateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelayMs) {
      const delay = this.rateLimitDelayMs - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Translate text using LibreTranslate (primary) or OpenAI (fallback)
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code (en, et, ru, fi)
   * @param {string} context - Context for better translation (tool, part, safety, etc.)
   * @returns {Promise<string>} Translated text
   */
  async translateText(text, targetLanguage, context = 'general') {
    if (!text || !text.trim()) return '';

    // Check cache first
    const cacheKey = `${text}-${targetLanguage}-${context}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Try LibreTranslate first (no rate limits, no API key required)
    if (this.useLibreTranslate) {
      try {
        console.log(`🌐 LibreTranslate: "${text}" to ${targetLanguage} (${context})`);
        const translatedText = await libreTranslate.translateText(text, targetLanguage);
        
        if (translatedText && translatedText !== text) {
          this.cache.set(cacheKey, translatedText);
          return translatedText;
        } else {
          console.warn(`LibreTranslate returned unchanged text: "${text}" → "${translatedText}", forcing fallback`);
          throw new Error('LibreTranslate returned unchanged text');
        }
      } catch (error) {
        console.warn('LibreTranslate failed, trying OpenAI fallback:', error.message);
      }
    }

    // Fallback to OpenAI if LibreTranslate fails or is disabled
    if (this.apiKey && this.apiKey !== 'your-openai-api-key-here') {
      try {
        await this.addRateLimitDelay();
        
        const languageNames = {
          'en': 'English',
          'et': 'Estonian', 
          'ru': 'Russian',
          'fi': 'Finnish'
        };

        const response = await axios.post(`${this.baseURL}/chat/completions`, {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator specializing in technical and workshop terminology. Provide accurate, natural translations.`
            },
            {
              role: 'user',
              content: `This is a ${context} name or description for maker/workshop components. Translate accurately while maintaining technical terms.

Original text: "${text}"
Target language: ${languageNames[targetLanguage] || targetLanguage}

Please provide only the translated text, nothing else.`
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        }, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        const translatedText = response.data.choices[0]?.message?.content?.trim();
        if (translatedText) {
          this.cache.set(cacheKey, translatedText);
          return translatedText;
        }
      } catch (error) {
        console.error('OpenAI translation failed:', error.message);
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          console.log('🚫 Rate limit exceeded, increasing delay');
          this.rateLimitDelayMs = Math.min(this.rateLimitDelayMs * 2, 10000);
        }
      }
    }

    // Final fallback to static translations
    console.log(`🔄 Using static fallback for "${text}" to ${targetLanguage}`);
    const fallbackResult = this.fallbackTranslation(text, targetLanguage);
    this.cache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  /**
   * Fallback translation for common workshop/tool terms
   */
  fallbackTranslation(text, targetLanguage) {
    const translations = {
      'en': {
        'screwdriver': 'screwdriver',
        'drill': 'drill',
        'hammer': 'hammer',
        'saw': 'saw',
        'knife': 'knife',
        'hot glue gun': 'hot glue gun',
        'measuring tape': 'measuring tape',
        'safety glasses': 'safety glasses',
        'work gloves': 'work gloves',
        'wrench': 'wrench',
        'pliers': 'pliers',
        'level': 'level',
        'clamp': 'clamp',
        'file': 'file',
        'chisel': 'chisel',
        'sander': 'sander',
        'grinder': 'grinder',
        'multimeter': 'multimeter',
        'soldering iron': 'soldering iron',
        'dog': 'dog',
        'cat': 'cat',
        'bird': 'bird',
        'fish': 'fish',
        'car': 'car',
        'house': 'house',
        'tree': 'tree',
        'flower': 'flower',
        'book': 'book',
        'chair': 'chair',
        'table': 'table',
        'door': 'door',
        'window': 'window',
        'phone': 'phone',
        'computer': 'computer',
        'bike': 'bike',
        'ball': 'ball',
        'toy': 'toy',
        'game': 'game'
      },
      'et': {
        'screwdriver': 'kruvikeeraja',
        'drill': 'puur',
        'hammer': 'haamer',
        'saw': 'saag',
        'knife': 'nuga',
        'hot glue gun': 'kuumliimipüss',
        'measuring tape': 'mõõdulint',
        'safety glasses': 'kaitseprillid',
        'work gloves': 'töökinnas',
        'wrench': 'mutrivõti',
        'pliers': 'tangid',
        'level': 'tasakaal',
        'clamp': 'kruvi',
        'file': 'viil',
        'chisel': 'peitel',
        'sander': 'lihvija',
        'grinder': 'veski',
        'multimeter': 'multimeeter',
        'soldering iron': 'juotuskolb',
        'dog': 'koer',
        'cat': 'kass',
        'bird': 'lind',
        'fish': 'kala',
        'car': 'auto',
        'house': 'maja',
        'tree': 'puu',
        'flower': 'lill',
        'book': 'raamat',
        'chair': 'tool',
        'table': 'laud',
        'door': 'uks',
        'window': 'aken',
        'phone': 'telefon',
        'computer': 'arvuti',
        'bike': 'jalgratas',
        'ball': 'pall',
        'toy': 'mänguasi',
        'game': 'mäng',
        'building block': 'ehitusplokk',
        'battery': 'patarei',
        'alkaline': 'alkaalne',
        'power supply': 'toiteallikas',
        '9v': '9v',
        '9v battery': '9v patarei',
        '9v alkaline battery': '9v alkaalpatarei',
        '9v alkaline battery for power supply': '9v alkaalpatarei toiteallikaks',
        'led': 'led',
        'circuit': 'ahel',
        'kit': 'komplekt',
        'led circuit kit': 'led ahela komplekt',
        'circuit kit': 'ahela komplekt',
        'led circuit': 'led ahel',
        'resistor': 'takisti',
        'ohm': 'oom',
        'current': 'vool',
        'limiting': 'piiramine',
        'resistor for current limiting': 'takisti voolu piiramiseks',
        'ohm resistor': 'oom takisti',
        '220 ohm': '220 oom',
        '220 ohm resistor': '220 oom takisti',
        'capacitor': 'kondensaator',
        'transistor': 'transistor',
        'diode': 'diood',
        'wire': 'juhe',
        'cable': 'kaabel',
        'connector': 'ühendaja',
        'switch': 'lüliti',
        'button': 'nupp',
        'sensor': 'andur',
        'motor': 'mootor',
        'servo': 'servo',
        'arduino': 'arduino',
        'raspberry pi': 'raspberry pi',
        'breadboard': 'leivaplaat',
        'jumper wire': 'hüppaja juhe',
        'alligator clip': 'krokodill klambrid',
        'powerful': 'võimas',
        'beginner': 'algaja',
        'advanced': 'täpsem',
        'professional': 'professionaalne',
        'high quality': 'kõrge kvaliteediga',
        'durable': 'vastupidav',
        'reliable': 'usaldusväärne',
        'easy to use': 'lihtne kasutada',
        'user friendly': 'kasutajasõbralik',
        'compact': 'kompaktne',
        'portable': 'kantav',
        'versatile': 'mitmekülgne',
        'essential': 'oluline',
        'complete': 'täielik',
        'comprehensive': 'põhjalik',
        'detailed': 'üksikasjalik',
        'step by step': 'samm-sammult',
        'instruction': 'juhend',
        'manual': 'käsiraamat',
        'guide': 'juhend',
        'tutorial': 'õpetus',
        'project': 'projekt',
        'experiment': 'eksperiment',
        'learning': 'õppimine',
        'education': 'haridus',
        'educational': 'hariduslik',
        'stem': 'stem',
        'science': 'teadus',
        'technology': 'tehnoloogia',
        'engineering': 'inseneriteadus',
        'mathematics': 'matemaatika',
        'electronics': 'elektroonika',
        'electronic': 'elektrooniline',
        'component': 'komponent',
        'components': 'komponendid',
        'part': 'osa',
        'parts': 'osad',
        'tool': 'tööriist',
        'tools': 'tööriistad',
        'set': 'komplekt',
        'sets': 'komplektid',
        'for': 'jaoks',
        'with': 'koos',
        'and': 'ja',
        'or': 'või',
        'the': '',
        'a': '',
        'an': '',
        'to': '',
        'of': '',
        'in': 'sees',
        'on': 'peal',
        'at': 'juures',
        'by': 'poolt',
        'from': 'alates',
        'test': 'test',
        'description': 'kirjeldus'
      },
      'ru': {
        'screwdriver': 'отвертка',
        'drill': 'дрель',
        'hammer': 'молоток',
        'saw': 'пила',
        'knife': 'нож',
        'hot glue gun': 'термоклеевой пистолет',
        'measuring tape': 'рулетка',
        'safety glasses': 'защитные очки',
        'work gloves': 'рабочие перчатки',
        'wrench': 'гаечный ключ',
        'pliers': 'плоскогубцы',
        'level': 'уровень',
        'clamp': 'зажим',
        'file': 'напильник',
        'chisel': 'долото',
        'sander': 'шлифовальная машина',
        'grinder': 'шлифовальный станок',
        'multimeter': 'мультиметр',
        'soldering iron': 'паяльник',
        'dog': 'собака',
        'cat': 'кот',
        'bird': 'птица',
        'fish': 'рыба',
        'car': 'машина',
        'house': 'дом',
        'tree': 'дерево',
        'flower': 'цветок',
        'book': 'книга',
        'chair': 'стул',
        'table': 'стол',
        'door': 'дверь',
        'window': 'окно',
        'phone': 'телефон',
        'computer': 'компьютер',
        'bike': 'велосипед',
        'ball': 'мяч',
        'toy': 'игрушка',
        'game': 'игра',
        'building block': 'строительный блок',
        'battery': 'батарея',
        'alkaline': 'щелочная',
        'power supply': 'источник питания',
        '9v': '9в',
        '9v battery': '9в батарея',
        '9v alkaline battery': '9в щелочная батарея',
        '9v alkaline battery for power supply': '9в щелочная батарея для источника питания',
        'led': 'светодиод',
        'circuit': 'схема',
        'kit': 'набор',
        'led circuit kit': 'набор светодиодной схемы',
        'circuit kit': 'набор схемы',
        'led circuit': 'светодиодная схема',
        'resistor': 'резистор',
        'ohm': 'ом',
        'current': 'ток',
        'limiting': 'ограничение',
        'resistor for current limiting': 'резистор для ограничения тока',
        'ohm resistor': 'ом резистор',
        '220 ohm': '220 ом',
        '220 ohm resistor': '220 ом резистор',
        'capacitor': 'конденсатор',
        'transistor': 'транзистор',
        'diode': 'диод',
        'wire': 'провод',
        'cable': 'кабель',
        'connector': 'разъем',
        'switch': 'переключатель',
        'button': 'кнопка',
        'sensor': 'датчик',
        'motor': 'мотор',
        'servo': 'серво',
        'arduino': 'ардуино',
        'raspberry pi': 'малина пи',
        'breadboard': 'макетная плата',
        'jumper wire': 'перемычка',
        'alligator clip': 'крокодил зажимы',
        'powerful': 'мощный',
        'beginner': 'новичок',
        'advanced': 'продвинутый',
        'professional': 'профессиональный',
        'high quality': 'высокого качества',
        'durable': 'прочный',
        'reliable': 'надежный',
        'easy to use': 'легко использовать',
        'user friendly': 'удобный для пользователя',
        'compact': 'компактный',
        'portable': 'портативный',
        'versatile': 'универсальный',
        'essential': 'необходимый',
        'complete': 'полный',
        'comprehensive': 'всесторонний',
        'detailed': 'подробный',
        'step by step': 'пошагово',
        'instruction': 'инструкция',
        'manual': 'руководство',
        'guide': 'руководство',
        'tutorial': 'учебник',
        'project': 'проект',
        'experiment': 'эксперимент',
        'learning': 'обучение',
        'education': 'образование',
        'educational': 'образовательный',
        'stem': 'stem',
        'science': 'наука',
        'technology': 'технология',
        'engineering': 'инженерия',
        'mathematics': 'математика',
        'electronics': 'электроника',
        'electronic': 'электронный',
        'component': 'компонент',
        'components': 'компоненты',
        'part': 'часть',
        'parts': 'части',
        'tool': 'инструмент',
        'tools': 'инструменты',
        'set': 'набор',
        'sets': 'наборы',
        'for': 'для',
        'with': 'с',
        'and': 'и',
        'or': 'или',
        'the': '',
        'a': '',
        'an': '',
        'to': '',
        'of': '',
        'in': 'в',
        'on': 'на',
        'at': 'в',
        'by': 'по',
        'from': 'от',
        'test': 'тест',
        'description': 'описание'
      },
      'fi': {
        'screwdriver': 'ruuvimeisseli',
        'drill': 'porakone',
        'hammer': 'vasara',
        'saw': 'saha',
        'knife': 'veitsi',
        'hot glue gun': 'kuumaliimapyssy',
        'measuring tape': 'mittanauha',
        'safety glasses': 'suojalasit',
        'work gloves': 'tyohanskat',
        'wrench': 'avain',
        'pliers': 'pihdit',
        'level': 'taso',
        'clamp': 'puristin',
        'file': 'viila',
        'chisel': 'taltta',
        'sander': 'hiomakone',
        'grinder': 'hiomakone',
        'multimeter': 'multimetri',
        'soldering iron': 'juotoskolvi',
        'dog': 'koira',
        'cat': 'kissa',
        'bird': 'lintu',
        'fish': 'kala',
        'car': 'auto',
        'house': 'talo',
        'tree': 'puu',
        'flower': 'kukka',
        'book': 'kirja',
        'chair': 'tuoli',
        'table': 'poyta',
        'door': 'ovi',
        'window': 'ikkuna',
        'phone': 'puhelin',
        'computer': 'tietokone',
        'bike': 'polkupyora',
        'ball': 'pallo',
        'toy': 'lelu',
        'game': 'peli',
        'building block': 'rakennuspalikka',
        'battery': 'paristo',
        'alkaline': 'alkalinen',
        'power supply': 'virtalähde',
        '9v': '9v',
        '9v battery': '9v paristo',
        '9v alkaline battery': '9v alkaliparisto',
        '9v alkaline battery for power supply': '9v alkaliparisto virtalähteeksi',
        'led': 'led',
        'circuit': 'piiri',
        'kit': 'sarja',
        'led circuit kit': 'led-piiri sarja',
        'circuit kit': 'piiri sarja',
        'led circuit': 'led-piiri',
        'resistor': 'vastus',
        'ohm': 'ohmi',
        'current': 'virta',
        'limiting': 'rajoitus',
        'resistor for current limiting': 'vastus virran rajoittamiseen',
        'ohm resistor': 'ohmi vastus',
        '220 ohm': '220 ohmi',
        '220 ohm resistor': '220 ohmi vastus',
        'capacitor': 'kondensaattori',
        'transistor': 'transistori',
        'diode': 'diodi',
        'wire': 'johto',
        'cable': 'kaapeli',
        'connector': 'liitin',
        'switch': 'kytkin',
        'button': 'painike',
        'sensor': 'anturi',
        'motor': 'moottori',
        'servo': 'servo',
        'arduino': 'arduino',
        'raspberry pi': 'vadelma pi',
        'breadboard': 'leipälauta',
        'jumper wire': 'hyppijä johto',
        'alligator clip': 'krokotiili klipsit',
        'powerful': 'tehokas',
        'beginner': 'aloittelija',
        'advanced': 'edistynyt',
        'professional': 'ammattimainen',
        'high quality': 'korkealaatuinen',
        'durable': 'kestävä',
        'reliable': 'luotettava',
        'easy to use': 'helppo käyttää',
        'user friendly': 'käyttäjäystävällinen',
        'compact': 'kompakti',
        'portable': 'kannettava',
        'versatile': 'monipuolinen',
        'essential': 'välttämätön',
        'complete': 'täydellinen',
        'comprehensive': 'kattava',
        'detailed': 'yksityiskohtainen',
        'step by step': 'askel askeleelta',
        'instruction': 'ohje',
        'manual': 'käsikirja',
        'guide': 'opas',
        'tutorial': 'opetusohjelma',
        'project': 'projekti',
        'experiment': 'kokeilu',
        'learning': 'oppiminen',
        'education': 'koulutus',
        'educational': 'koulutuksellinen',
        'stem': 'stem',
        'science': 'tiede',
        'technology': 'teknologia',
        'engineering': 'insinööritiede',
        'mathematics': 'matematiikka',
        'electronics': 'elektroniikka',
        'electronic': 'elektroninen',
        'component': 'komponentti',
        'components': 'komponentit',
        'part': 'osa',
        'parts': 'osat',
        'tool': 'työkalu',
        'tools': 'työkalut',
        'set': 'sarja',
        'sets': 'sarjat',
        'for': 'varten',
        'with': 'kanssa',
        'and': 'ja',
        'or': 'tai',
        'the': '',
        'a': '',
        'an': '',
        'to': '',
        'of': '',
        'in': 'sisällä',
        'on': 'päällä',
        'at': 'luona',
        'by': 'toimesta',
        'from': 'alkaen',
        'test': 'testi',
        'description': 'kuvaus'
      }
    };

    if (!translations[targetLanguage]) {
      return text;
    }

    const lowerText = text.toLowerCase().trim();
    
    // First try exact match
    if (translations[targetLanguage][lowerText]) {
      const translatedText = translations[targetLanguage][lowerText];
      console.log(`🌐 Fallback (exact): "${text}" → "${translatedText}" for ${targetLanguage}`);
      return translatedText;
    }
    
    // If no exact match, try to translate word by word
    const words = lowerText.split(/\s+/);
    const translatedWords = words.map(word => {
      // Remove punctuation for lookup
      const cleanWord = word.replace(/[^\w]/g, '');
      return translations[targetLanguage][cleanWord] || word;
    });
    
    const translatedText = translatedWords.join(' ');
    
    // Only return translated text if at least one word was translated
    const hasTranslation = translatedWords.some((word, index) => word !== words[index]);
    
    if (hasTranslation) {
      console.log(`🌐 Fallback (word-by-word): "${text}" → "${translatedText}" for ${targetLanguage}`);
      return translatedText;
    }
    
    console.log(`🌐 Fallback: No translation found for "${text}" in ${targetLanguage}`);
    return text;
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.cache.clear();
    libreTranslate.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      libreTranslate: libreTranslate.getCacheStats()
    };
  }

  /**
   * Test all translation services
   */
  async testServices() {
    console.log('🔍 Testing translation services...');
    
    // Test LibreTranslate
    await libreTranslate.testConnectivity();
    
    // Test with a simple translation
    try {
      const result = await this.translateText('car', 'et', 'test');
      console.log(`✅ Translation test: "car" → "${result}"`);
    } catch (error) {
      console.error('❌ Translation test failed:', error.message);
    }
  }
}

module.exports = new TranslationService();
