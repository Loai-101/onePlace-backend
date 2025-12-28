/**
 * Verify all API endpoints are properly configured
 * This script checks that all routes are registered and controllers exist
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying API endpoints configuration...\n');

// Routes that should be registered in server.js
const expectedRoutes = [
  '/api/auth',
  '/api/products',
  '/api/categories',
  '/api/brands',
  '/api/orders',
  '/api/users',
  '/api/companies',
  '/api/clinics',
  '/api/admin',
  '/api/user-management',
  '/api/upload',
  '/api/accounts',
  '/api/calendar'
];

// Check server.js for route registrations
const serverPath = path.join(__dirname, '../server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

console.log('📋 Checking route registrations in server.js:\n');
let allRoutesFound = true;

expectedRoutes.forEach(route => {
  const routePattern = `app.use('${route}'`;
  if (serverContent.includes(routePattern)) {
    console.log(`  ✅ ${route} - Registered`);
  } else {
    console.log(`  ❌ ${route} - NOT FOUND`);
    allRoutesFound = false;
  }
});

// Check route files exist
console.log('\n📁 Checking route files:\n');
const routesDir = path.join(__dirname, '../routes');
const routeFiles = fs.readdirSync(routesDir);

expectedRoutes.forEach(route => {
  const routeName = route.replace('/api/', '');
  const routeFile = `${routeName}.js`;
  const routePath = path.join(routesDir, routeFile);
  
  if (fs.existsSync(routePath)) {
    console.log(`  ✅ ${routeFile} - Exists`);
  } else {
    console.log(`  ❌ ${routeFile} - MISSING`);
    allRoutesFound = false;
  }
});

// Check controllers exist
console.log('\n🎮 Checking controller files:\n');
const controllersDir = path.join(__dirname, '../controllers');
const controllerFiles = fs.readdirSync(controllersDir);

const expectedControllers = [
  'authController.js',
  'productController.js',
  'categoryController.js',
  'brandController.js',
  'orderController.js',
  'userController.js',
  'companyController.js',
  'clinicController.js',
  'adminController.js',
  'userManagementController.js',
  'uploadController.js',
  'accountController.js',
  'calendarController.js'
];

expectedControllers.forEach(controller => {
  const controllerPath = path.join(controllersDir, controller);
  if (fs.existsSync(controllerPath)) {
    console.log(`  ✅ ${controller} - Exists`);
  } else {
    console.log(`  ❌ ${controller} - MISSING`);
    allRoutesFound = false;
  }
});

// Check models exist
console.log('\n📦 Checking model files:\n');
const modelsDir = path.join(__dirname, '../models');
const modelFiles = fs.readdirSync(modelsDir);

const expectedModels = [
  'User.js',
  'Company.js',
  'Product.js',
  'Order.js',
  'Category.js',
  'Brand.js',
  'Account.js',
  'Calendar.js'
];

expectedModels.forEach(model => {
  const modelPath = path.join(modelsDir, model);
  if (fs.existsSync(modelPath)) {
    console.log(`  ✅ ${model} - Exists`);
  } else {
    console.log(`  ⚠️  ${model} - Optional (may not be required)`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
if (allRoutesFound) {
  console.log('✅ All API endpoints are properly configured!');
  console.log('🚀 Server should be ready to handle requests.\n');
} else {
  console.log('❌ Some API endpoints are missing or misconfigured!');
  console.log('⚠️  Please check the errors above.\n');
}
console.log('='.repeat(50) + '\n');

process.exit(allRoutesFound ? 0 : 1);
