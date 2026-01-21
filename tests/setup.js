/**
 * Jest setup file for integration tests
 * Handles database connection and test environment setup
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Set test timeout
jest.setTimeout(30000);

// Suppress console errors during tests (optional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

beforeAll(async () => {
  // Ensure we're using test database
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/oneplace-test';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }
});

afterAll(async () => {
  // Clean up: close database connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
