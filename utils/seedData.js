const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Company = require('../models/Company');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Product = require('../models/Product');

// Seed data
const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Category.deleteMany({});
    await Brand.deleteMany({});
    await Product.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create categories
    const categories = await Category.insertMany([
      {
        name: 'Drill Bits',
        description: 'Various dental drill bits and accessories',
        slug: 'drill-bits',
        sortOrder: 1
      },
      {
        name: 'Composite Materials',
        description: 'Composite resins and bonding materials',
        slug: 'composite-materials',
        sortOrder: 2
      },
      {
        name: 'Orthodontic',
        description: 'Orthodontic wires, brackets, and accessories',
        slug: 'orthodontic',
        sortOrder: 3
      },
      {
        name: 'Impression Materials',
        description: 'Dental impression materials and trays',
        slug: 'impression-materials',
        sortOrder: 4
      },
      {
        name: 'Cement',
        description: 'Dental cements and adhesives',
        slug: 'cement',
        sortOrder: 5
      },
      {
        name: 'Endodontic',
        description: 'Endodontic files and instruments',
        slug: 'endodontic',
        sortOrder: 6
      },
      {
        name: 'Imaging',
        description: 'Dental imaging materials and equipment',
        slug: 'imaging',
        sortOrder: 7
      },
      {
        name: 'Anesthetics',
        description: 'Local anesthetics and pain management',
        slug: 'anesthetics',
        sortOrder: 8
      },
      {
        name: 'Crown Materials',
        description: 'Crown and bridge materials',
        slug: 'crown-materials',
        sortOrder: 9
      },
      {
        name: 'Oral Care',
        description: 'Oral hygiene products',
        slug: 'oral-care',
        sortOrder: 10
      },
      {
        name: 'Instruments',
        description: 'Dental instruments and tools',
        slug: 'instruments',
        sortOrder: 11
      },
      {
        name: 'Preventive',
        description: 'Preventive dental materials',
        slug: 'preventive',
        sortOrder: 12
      }
    ]);

    console.log('📁 Created categories');

    // Create brands
    const brands = await Brand.insertMany([
      {
        name: 'Dentsply',
        description: 'Leading manufacturer of dental products',
        isFeatured: true,
        sortOrder: 1
      },
      {
        name: '3M',
        description: 'Innovative dental solutions',
        isFeatured: true,
        sortOrder: 2
      },
      {
        name: 'Ormco',
        description: 'Orthodontic solutions',
        isFeatured: true,
        sortOrder: 3
      },
      {
        name: 'Kerr',
        description: 'Dental restorative materials',
        isFeatured: true,
        sortOrder: 4
      },
      {
        name: 'Ivoclar',
        description: 'Dental materials and equipment',
        sortOrder: 5
      },
      {
        name: 'Carestream',
        description: 'Dental imaging solutions',
        sortOrder: 6
      },
      {
        name: 'Oral-B',
        description: 'Oral hygiene products',
        sortOrder: 7
      },
      {
        name: 'Colgate',
        description: 'Oral care products',
        sortOrder: 8
      },
      {
        name: 'Listerine',
        description: 'Mouthwash and oral care',
        sortOrder: 9
      },
      {
        name: 'Hu-Friedy',
        description: 'Dental instruments',
        sortOrder: 10
      }
    ]);

    console.log('🏷️  Created brands');

    // Create companies
    const companies = await Company.insertMany([
      {
        name: 'Dr. Smith Dental Clinic',
        location: 'New York, NY',
        contactInfo: {
          email: 'info@smithdental.com',
          phone: '+1-555-0123',
          address: '123 Main Street',
          city: 'New York',
          country: 'USA'
        },
        paymentInfo: {
          creditLimit: 10000,
          currentBalance: 2500,
          paymentTerms: 'credit_30',
          status: 'active'
        },
        employees: [
          { name: 'Dr. John Smith', role: 'Owner', email: 'john@smithdental.com', isActive: true },
          { name: 'Dr. Sarah Johnson', role: 'Dentist', email: 'sarah@smithdental.com', isActive: true },
          { name: 'Mike Wilson', role: 'Office Manager', email: 'mike@smithdental.com', isActive: true }
        ]
      },
      {
        name: 'Bright Smile Dentistry',
        location: 'Los Angeles, CA',
        contactInfo: {
          email: 'info@brightsmile.com',
          phone: '+1-555-0456',
          address: '456 Oak Avenue',
          city: 'Los Angeles',
          country: 'USA'
        },
        paymentInfo: {
          creditLimit: 8000,
          currentBalance: 1200,
          paymentTerms: 'credit_30',
          status: 'active'
        },
        employees: [
          { name: 'Dr. Emily Davis', role: 'Owner', email: 'emily@brightsmile.com', isActive: true },
          { name: 'Dr. Robert Brown', role: 'Orthodontist', email: 'robert@brightsmile.com', isActive: true },
          { name: 'Lisa Garcia', role: 'Practice Manager', email: 'lisa@brightsmile.com', isActive: true }
        ]
      },
      {
        name: 'Family Dental Care',
        location: 'Chicago, IL',
        contactInfo: {
          email: 'info@familydental.com',
          phone: '+1-555-0789',
          address: '789 Pine Street',
          city: 'Chicago',
          country: 'USA'
        },
        paymentInfo: {
          creditLimit: 12000,
          currentBalance: 3200,
          paymentTerms: 'credit_30',
          status: 'active'
        },
        employees: [
          { name: 'Dr. Michael Chen', role: 'Owner', email: 'michael@familydental.com', isActive: true },
          { name: 'Dr. Jennifer Lee', role: 'Pediatric Dentist', email: 'jennifer@familydental.com', isActive: true },
          { name: 'Tom Anderson', role: 'Office Coordinator', email: 'tom@familydental.com', isActive: true }
        ]
      },
      {
        name: 'Modern Orthodontics',
        location: 'Houston, TX',
        contactInfo: {
          email: 'info@modernortho.com',
          phone: '+1-555-0321',
          address: '321 Elm Street',
          city: 'Houston',
          country: 'USA'
        },
        paymentInfo: {
          creditLimit: 6000,
          currentBalance: 4200,
          paymentTerms: 'credit_30',
          status: 'over_limit'
        },
        employees: [
          { name: 'Dr. David Martinez', role: 'Owner', email: 'david@modernortho.com', isActive: true },
          { name: 'Dr. Amanda Taylor', role: 'Orthodontist', email: 'amanda@modernortho.com', isActive: true }
        ]
      },
      {
        name: 'Coastal Dental Group',
        location: 'Miami, FL',
        contactInfo: {
          email: 'info@coastaldental.com',
          phone: '+1-555-0654',
          address: '654 Beach Boulevard',
          city: 'Miami',
          country: 'USA'
        },
        paymentInfo: {
          creditLimit: 15000,
          currentBalance: 1800,
          paymentTerms: 'credit_30',
          status: 'active'
        },
        employees: [
          { name: 'Dr. Maria Rodriguez', role: 'Owner', email: 'maria@coastaldental.com', isActive: true },
          { name: 'Dr. James Wilson', role: 'Periodontist', email: 'james@coastaldental.com', isActive: true },
          { name: 'Sarah Thompson', role: 'Office Manager', email: 'sarah@coastaldental.com', isActive: true }
        ]
      }
    ]);

    console.log('🏢 Created companies');

    // Create owner first
    const owner = await User.create({
      name: 'Business Owner',
      email: 'owner@oneplace.com',
      username: 'owner',
      password: 'owner123',
      role: 'owner'
    });

    // Create other users under the owner
    const users = await User.insertMany([
      {
        name: 'System Administrator',
        email: 'admin@oneplace.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        owner: owner._id,
        createdBy: owner._id,
        company: companies[0]._id
      },
      {
        name: 'Account Manager',
        email: 'accountant@oneplace.com',
        username: 'accountant',
        password: 'accountant123',
        role: 'accountant',
        owner: owner._id,
        createdBy: owner._id,
        company: companies[1]._id
      },
      {
        name: 'Sales Representative',
        email: 'sales@oneplace.com',
        username: 'salesman',
        password: 'sales123',
        role: 'salesman',
        owner: owner._id,
        createdBy: owner._id,
        company: companies[0]._id
      }
    ]);

    // Add owner to the users array for counting
    users.unshift(owner);

    console.log('👥 Created users');

    // Create products
    const products = await Product.insertMany([
      {
        name: 'Professional Drill Bit Set',
        sku: 'DD001',
        brand: brands[0]._id, // Dentsply
        category: categories[0]._id, // Drill Bits
        description: 'High-quality drill bit set for professional dental work',
        price: 45.99,
        stock: { current: 12, minimum: 5, maximum: 50 },
        isFeatured: true,
        tags: ['professional', 'drill', 'bits']
      },
      {
        name: 'Composite Resin Kit',
        sku: 'CR002',
        brand: brands[1]._id, // 3M
        category: categories[1]._id, // Composite Materials
        description: 'Complete composite resin restoration kit',
        price: 89.50,
        stock: { current: 8, minimum: 3, maximum: 25 },
        isFeatured: true,
        tags: ['composite', 'resin', 'restoration']
      },
      {
        name: 'Orthodontic Wire',
        sku: 'OW003',
        brand: brands[2]._id, // Ormco
        category: categories[2]._id, // Orthodontic
        description: 'Premium orthodontic wire for braces',
        price: 23.75,
        stock: { current: 25, minimum: 10, maximum: 100 },
        tags: ['orthodontic', 'wire', 'braces']
      },
      {
        name: 'Impression Material',
        sku: 'IM004',
        brand: brands[3]._id, // Kerr
        category: categories[3]._id, // Impression Materials
        description: 'High-precision dental impression material',
        price: 67.20,
        stock: { current: 15, minimum: 5, maximum: 50 },
        tags: ['impression', 'material', 'precision']
      },
      {
        name: 'Crown Cement',
        sku: 'CC005',
        brand: brands[4]._id, // Ivoclar
        category: categories[4]._id, // Cement
        description: 'Strong dental crown cement',
        price: 34.90,
        stock: { current: 20, minimum: 8, maximum: 75 },
        tags: ['crown', 'cement', 'strong']
      },
      {
        name: 'Endodontic Files',
        sku: 'EF006',
        brand: brands[0]._id, // Dentsply
        category: categories[5]._id, // Endodontic
        description: 'Professional endodontic file set',
        price: 78.40,
        stock: { current: 6, minimum: 3, maximum: 30 },
        tags: ['endodontic', 'files', 'professional']
      },
      {
        name: 'Dental X-Ray Film',
        sku: 'DX007',
        brand: brands[5]._id, // Carestream
        category: categories[6]._id, // Imaging
        description: 'High-quality dental X-ray film',
        price: 12.50,
        stock: { current: 50, minimum: 20, maximum: 200 },
        tags: ['x-ray', 'film', 'imaging']
      },
      {
        name: 'Local Anesthetic',
        sku: 'LA008',
        brand: brands[0]._id, // Dentsply
        category: categories[7]._id, // Anesthetics
        description: 'Professional local anesthetic solution',
        price: 28.75,
        stock: { current: 18, minimum: 5, maximum: 50 },
        tags: ['anesthetic', 'local', 'professional']
      },
      {
        name: 'Crown Material Kit',
        sku: 'CM009',
        brand: brands[4]._id, // Ivoclar
        category: categories[8]._id, // Crown Materials
        description: 'Complete crown material kit',
        price: 156.48,
        stock: { current: 4, minimum: 2, maximum: 15 },
        isFeatured: true,
        tags: ['crown', 'material', 'kit']
      },
      {
        name: 'Dental Floss',
        sku: 'DF010',
        brand: brands[6]._id, // Oral-B
        category: categories[9]._id, // Oral Care
        description: 'Professional dental floss',
        price: 4.88,
        stock: { current: 50, minimum: 20, maximum: 200 },
        tags: ['floss', 'oral', 'care']
      },
      {
        name: 'Toothpaste',
        sku: 'TP011',
        brand: brands[7]._id, // Colgate
        category: categories[9]._id, // Oral Care
        description: 'Professional toothpaste',
        price: 3.29,
        stock: { current: 35, minimum: 15, maximum: 150 },
        tags: ['toothpaste', 'oral', 'care']
      },
      {
        name: 'Mouthwash',
        sku: 'MW012',
        brand: brands[8]._id, // Listerine
        category: categories[9]._id, // Oral Care
        description: 'Antiseptic mouthwash',
        price: 5.83,
        stock: { current: 28, minimum: 10, maximum: 100 },
        tags: ['mouthwash', 'antiseptic', 'oral']
      },
      {
        name: 'Dental Mirror',
        sku: 'DM013',
        brand: brands[9]._id, // Hu-Friedy
        category: categories[10]._id, // Instruments
        description: 'Professional dental mirror',
        price: 7.11,
        stock: { current: 40, minimum: 15, maximum: 100 },
        tags: ['mirror', 'dental', 'instrument']
      },
      {
        name: 'Scaler Set',
        sku: 'SS014',
        brand: brands[9]._id, // Hu-Friedy
        category: categories[10]._id, // Instruments
        description: 'Professional scaler set',
        price: 31.95,
        stock: { current: 12, minimum: 5, maximum: 50 },
        tags: ['scaler', 'set', 'professional']
      },
      {
        name: 'Prophy Paste',
        sku: 'PP015',
        brand: brands[1]._id, // 3M
        category: categories[11]._id, // Preventive
        description: 'Professional prophylaxis paste',
        price: 12.18,
        stock: { current: 25, minimum: 10, maximum: 75 },
        tags: ['prophy', 'paste', 'preventive']
      },
      {
        name: 'Fluoride Varnish',
        sku: 'FV016',
        brand: brands[0]._id, // Dentsply
        category: categories[11]._id, // Preventive
        description: 'Professional fluoride varnish',
        price: 17.15,
        stock: { current: 18, minimum: 5, maximum: 50 },
        tags: ['fluoride', 'varnish', 'preventive']
      },
      {
        name: 'Sealant Material',
        sku: 'SM017',
        brand: brands[3]._id, // Kerr
        category: categories[11]._id, // Preventive
        description: 'Dental sealant material',
        price: 14.57,
        stock: { current: 22, minimum: 8, maximum: 60 },
        tags: ['sealant', 'material', 'preventive']
      },
      {
        name: 'Bonding Agent',
        sku: 'BA018',
        brand: brands[1]._id, // 3M
        category: categories[1]._id, // Composite Materials
        description: 'Dental bonding agent',
        price: 42.30,
        stock: { current: 14, minimum: 5, maximum: 40 },
        tags: ['bonding', 'agent', 'composite']
      },
      {
        name: 'Orthodontic Bracket',
        sku: 'OB019',
        brand: brands[2]._id, // Ormco
        category: categories[2]._id, // Orthodontic
        description: 'Metal orthodontic bracket',
        price: 8.75,
        stock: { current: 100, minimum: 50, maximum: 500 },
        tags: ['bracket', 'orthodontic', 'metal']
      },
      {
        name: 'Root Canal Sealer',
        sku: 'RCS020',
        brand: brands[0]._id, // Dentsply
        category: categories[5]._id, // Endodontic
        description: 'Professional root canal sealer',
        price: 52.80,
        stock: { current: 8, minimum: 3, maximum: 25 },
        tags: ['root', 'canal', 'sealer']
      }
    ]);

    console.log('🛍️  Created products');

    // Update category and brand product counts
    for (const product of products) {
      await Category.findByIdAndUpdate(product.category, { $inc: { productCount: 1 } });
      await Brand.findByIdAndUpdate(product.brand, { $inc: { productCount: 1 } });
    }

    console.log('📊 Updated product counts');

    console.log('✅ Database seeding completed successfully!');
    console.log(`📁 Created ${categories.length} categories`);
    console.log(`🏷️  Created ${brands.length} brands`);
    console.log(`🏢 Created ${companies.length} companies`);
    console.log(`👥 Created ${users.length} users`);
    console.log(`🛍️  Created ${products.length} products`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

module.exports = seedData;
