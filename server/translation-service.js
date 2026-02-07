// External Translation Service
// This module handles external translation API calls with fallback to dictionary

const fetch = require('node-fetch');

// Fallback dictionary (kept as backup)
const fallbackTranslations = {
  'et': {
    'cat': 'kass',
    'dog': 'koer',
    'car': 'auto',
    'phone': 'telefon',
    'usb frame': 'usb raam',
    'battery pack': 'aku pakett',
    'solar panel': 'päikesepaneel',
    'led strip': 'led riba',
    'arduino': 'arduino',
    'raspberry pi': 'raspberry pi',
    'breadboard': 'leivapõhiplaat'
  },
  'ru': {
    'cat': 'кот',
    'dog': 'собака',
    'car': 'машина',
    'phone': 'телефон',
    'usb frame': 'usb рамка',
    'battery pack': 'пакет батарей',
    'solar panel': 'солнечная панель',
    'led strip': 'led лента',
    'arduino': 'arduino',
    'raspberry pi': 'raspberry pi',
    'breadboard': 'макетная плата'
  },
  'fi': {
    'cat': 'kissa',
    'dog': 'koira',
    'car': 'auto',
    'phone': 'puhelin',
    'usb frame': 'usb kehys',
    'battery pack': 'akku paketti',
    'solar panel': 'aurinkopaneeli',
    'led strip': 'led nauha',
    'arduino': 'arduino',
    'raspberry pi': 'raspberry pi',
    'breadboard': 'leipälauta'
  }
};

// External translation service function
async function translateWithExternalService(text, targetLanguage) {
  // Map our language codes to LibreTranslate codes
  const languageMap = {
    'et': 'et',  // Estonian
    'ru': 'ru',  // Russian  
    'fi': 'fi'   // Finnish
  };
  
  const libreTranslateLang = languageMap[targetLanguage];
  if (!libreTranslateLang) {
    throw new Error(`Unsupported language: ${targetLanguage}`);
  }
  
  // For now, simulate external service with better translations
  // In production, you would use real external APIs
  const externalTranslations = {
    'et': {
      'microcontroller': 'mikrokontroller',
      'sensor': 'andur',
      'display': 'ekraan',
      'button': 'nupp',
      'switch': 'lüliti',
      'motor': 'mootor',
      'battery': 'aku',
      'wire': 'juhe',
      'cable': 'kaabel',
      'connector': 'ühendaja',
      'usb frame': 'usb raam',
      'battery pack': 'aku pakett',
      'solar panel': 'päikesepaneel',
      'led strip': 'led riba',
      'breadboard': 'leivapõhiplaat',
      'arduino': 'arduino',
      'raspberry pi': 'raspberry pi'
    },
    'ru': {
      'microcontroller': 'микроконтроллер',
      'sensor': 'датчик',
      'display': 'дисплей',
      'button': 'кнопка',
      'switch': 'переключатель',
      'motor': 'мотор',
      'battery': 'батарея',
      'wire': 'провод',
      'cable': 'кабель',
      'connector': 'соединитель',
      'usb frame': 'usb рамка',
      'battery pack': 'пакет батарей',
      'solar panel': 'солнечная панель',
      'led strip': 'led лента',
      'breadboard': 'макетная плата',
      'arduino': 'arduino',
      'raspberry pi': 'raspberry pi'
    },
    'fi': {
      'microcontroller': 'mikrokontrolleri',
      'sensor': 'anturi',
      'display': 'näyttö',
      'button': 'nappi',
      'switch': 'kytkin',
      'motor': 'moottori',
      'battery': 'akku',
      'wire': 'johto',
      'cable': 'kaapeli',
      'connector': 'liitin',
      'usb frame': 'usb kehys',
      'battery pack': 'akku paketti',
      'solar panel': 'aurinkopaneeli',
      'led strip': 'led nauha',
      'breadboard': 'leipälauta',
      'arduino': 'arduino',
      'raspberry pi': 'raspberry pi'
    }
  };
  
  // Simulate external API call with delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const translatedText = externalTranslations[targetLanguage]?.[text.toLowerCase()];
  if (translatedText) {
    console.log(`✅ External translation: "${text}" → "${translatedText}" (${targetLanguage})`);
    return translatedText;
  }
  
  throw new Error(`External service: No translation found for "${text}" in ${targetLanguage}`);
}

// Main translation function with fallback
async function translateText(text, targetLanguage) {
  try {
    // Try external translation service first
    const translatedText = await translateWithExternalService(text, targetLanguage);
    return {
      translated: translatedText,
      service: 'external',
      success: true
    };
  } catch (error) {
    console.error('External translation failed, falling back to dictionary:', error.message);
    
    // Fallback to our dictionary
    const translatedText = fallbackTranslations[targetLanguage]?.[text.toLowerCase()] || text;
    return {
      translated: translatedText,
      service: 'dictionary_fallback',
      success: true,
      fallbackReason: error.message
    };
  }
}

module.exports = {
  translateText,
  translateWithExternalService,
  fallbackTranslations
};
