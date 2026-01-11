const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from .env file in the backend directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Script to fix brand indexes in MongoDB
 * This script checks for old unique indexes and ensures the correct compound index exists
 */

async function fixBrandIndexes() {
  try {
    // Check if MONGO_URI or MONGODB_URI is set
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGO_URI or MONGODB_URI environment variable is not set.');
      console.error('   Please make sure you have a .env file with MONGO_URI or MONGODB_URI defined.');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('brands');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes on brands collection:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${JSON.stringify(index.key)} - unique: ${index.unique || false}`);
    });

    // Check for old unique index on just 'name'
    const oldNameIndex = indexes.find(
      index => index.key && index.key.name === 1 && !index.key.company && index.unique
    );

    if (oldNameIndex) {
      console.log('\n⚠️  Found old unique index on "name" field only!');
      console.log('   This prevents different companies from using the same brand name.');
      console.log('   Dropping old index...');
      
      try {
        await collection.dropIndex(oldNameIndex.name);
        console.log(`✅ Dropped old index: ${oldNameIndex.name}`);
      } catch (error) {
        console.error('❌ Error dropping index:', error.message);
      }
    } else {
      console.log('\n✅ No old unique index on "name" field found.');
    }

    // Check for compound unique index
    const compoundIndex = indexes.find(
      index => index.key && index.key.name === 1 && index.key.company === 1 && index.unique
    );

    if (!compoundIndex) {
      console.log('\n⚠️  Compound unique index (name + company) not found!');
      console.log('   Creating compound unique index...');
      
      try {
        await collection.createIndex(
          { name: 1, company: 1 },
          { unique: true, name: 'name_1_company_1' }
        );
        console.log('✅ Created compound unique index: name_1_company_1');
      } catch (error) {
        console.error('❌ Error creating compound index:', error.message);
      }
    } else {
      console.log('\n✅ Compound unique index (name + company) exists.');
    }

    // Final index list
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${JSON.stringify(index.key)} - unique: ${index.unique || false}`);
    });

    console.log('\n✅ Index fix completed!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
fixBrandIndexes();

