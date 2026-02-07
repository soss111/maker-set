// Simple test script to verify API connectivity
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

async function testAPI() {
  console.log('Testing API connectivity...');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health endpoint working:', healthResponse.data.status);
    
    // Test AI translation endpoint
    console.log('2. Testing AI translation endpoint...');
    const translationResponse = await axios.post(`${API_BASE_URL}/ai/translate/text`, {
      text: 'car',
      targetLanguage: 'et',
      context: 'part'
    });
    console.log('✅ Translation endpoint working:', translationResponse.data);
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running on port 5001');
    } else if (error.response) {
      console.error('Server responded with error:', error.response.status, error.response.data);
    }
  }
}

testAPI();
