/**
 * Jest Test Setup
 *
 * This file configures Jest for testing the MakerLab Management System
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'makerset_db';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'password';
process.env.DB_PORT = '5432';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async() => {
  console.log('🧪 Starting MakerLab Management System Tests');
  console.log('📊 Test Environment:', process.env.NODE_ENV);
  console.log('🗄️ Test Database:', process.env.DB_NAME);
});

// Global test teardown
afterAll(async() => {
  console.log('✅ All tests completed');
});

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};