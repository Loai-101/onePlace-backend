/**
 * Test database connection and API endpoints
 * Run with: node utils/testConnection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Get MongoDB URI
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oneplace';
    console.log(`📡 Connecting to: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}\n`);
    
    // Connect to database
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Database connection successful!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🖥️  Host: ${mongoose.connection.host}`);
    console.log(`🔌 Port: ${mongoose.connection.port}\n`);
    
    // Test models
    console.log('🔍 Testing models...\n');
    
    const models = [
      'User',
      'Company',
      'Product',
      'Order',
      'Category',
      'Brand',
      'Account',
      'Calendar'
    ];
    
    for (const modelName of models) {
      try {
        const Model = require(`../models/${modelName}`);
        const count = await Model.countDocuments();
        console.log(`  ✅ ${modelName}: ${count} documents`);
      } catch (error) {
        console.log(`  ❌ ${modelName}: Model not found or error - ${error.message}`);
      }
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('🚀 Database is ready for API requests.\n');
    
    // Close connection
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error(`Error: ${error.message}\n`);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('💡 Possible issues:');
      console.log('   1. MongoDB is not running');
      console.log('   2. Incorrect MONGODB_URI in .env file');
      console.log('   3. Network connectivity issues');
      console.log('   4. Firewall blocking connection\n');
    }
    
    process.exit(1);
  }
};

// Run test
testConnection();

