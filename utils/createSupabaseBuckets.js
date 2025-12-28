const { ensureBucketExists } = require('./supabase');
require('dotenv').config();

/**
 * Script to create Supabase storage buckets
 * Run this with: node utils/createSupabaseBuckets.js
 */
async function createBuckets() {
  console.log('🚀 Starting Supabase bucket creation...\n');
  
  // Check environment variables
  if (!process.env.SUPABASE_URL) {
    console.error('❌ Error: SUPABASE_URL is not set in .env file');
    process.exit(1);
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE is not set in .env file');
    process.exit(1);
  }
  
  console.log('✅ Environment variables found');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL.substring(0, 30)}...\n`);
  
  const buckets = [
    { name: 'images', public: true },
    { name: 'invoices', public: true }
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const bucket of buckets) {
    console.log(`📦 Creating bucket "${bucket.name}"...`);
    try {
      const result = await ensureBucketExists(bucket.name, bucket.public);
      if (result) {
        console.log(`✅ Bucket "${bucket.name}" is ready\n`);
        successCount++;
      } else {
        console.log(`❌ Failed to create bucket "${bucket.name}"\n`);
        failCount++;
      }
    } catch (error) {
      console.error(`❌ Error with bucket "${bucket.name}":`, error.message);
      failCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}\n`);
  
  if (failCount > 0) {
    console.log('💡 If buckets failed to create automatically:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Navigate to Storage');
    console.log('   4. Click "New bucket"');
    console.log('   5. Create buckets manually:');
    buckets.forEach(b => {
      console.log(`      - Name: "${b.name}", Public: ${b.public ? 'Yes' : 'No'}`);
    });
    console.log('\n');
    process.exit(1);
  } else {
    console.log('🎉 All buckets created successfully!\n');
    process.exit(0);
  }
}

// Run the script
createBuckets().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

