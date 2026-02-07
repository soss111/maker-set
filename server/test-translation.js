// Simple External Translation Test
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testExternalTranslation() {
  console.log('🌐 Testing External Translation Services...\n');
  
  const testText = "microcontroller";
  const languages = ['et', 'ru', 'fi'];
  
  // LibreTranslate endpoints to try
  const endpoints = [
    'https://libretranslate.de/translate',
    'https://translate.argosopentech.com/translate',
    'https://libretranslate.com/translate'
  ];
  
  for (const lang of languages) {
    console.log(`📝 Testing "${testText}" → ${lang.toUpperCase()}:`);
    
    let translated = false;
    for (const endpoint of endpoints) {
      try {
        console.log(`  🔄 Trying ${endpoint}...`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: testText,
            source: 'en',
            target: lang,
            format: 'text'
          }),
          timeout: 5000
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.translatedText) {
            console.log(`  ✅ Success: "${data.translatedText}"`);
            translated = true;
            break;
          }
        } else {
          console.log(`  ❌ HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    if (!translated) {
      console.log(`  ⚠️  All services failed, using fallback`);
    }
    console.log('');
  }
}

// Run the test
testExternalTranslation().catch(console.error);
