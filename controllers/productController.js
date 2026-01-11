const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const XLSX = require('xlsx');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      mainCategory,
      search,
      minPrice,
      maxPrice,
      sort = 'name',
      order = 'asc',
      status
    } = req.query;

    // Build query
    let query = {};

    // Filter by company - CRITICAL for data isolation
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }
    query.company = req.user.company;

    // Status filter - only apply if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    // Main category filter
    if (mainCategory && mainCategory !== 'all' && mainCategory !== 'All') {
      query.mainCategory = mainCategory;
    }

    // Category filter
    if (category && category !== 'all' && category !== 'All') {
      query.category = category;
    }

    // Brand filter
    if (brand && brand !== 'all' && brand !== 'All') {
      query.brand = brand;
    }

    // Search filter - use regex for partial matching
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Sort options
    const sortOptions = {};
    if (sort === 'name') {
      sortOptions.name = order === 'desc' ? -1 : 1;
    } else if (sort === 'price') {
      sortOptions.price = order === 'desc' ? -1 : 1;
    } else if (sort === 'createdAt') {
      sortOptions.createdAt = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const products = await Product.find(query)
      .populate('brand', 'name logo brandColor')
      .populate('category', 'name slug brand')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Get unique categories and brands for filters (filtered by company)
    const categories = await Category.find({ isActive: true, company: req.user.company }).select('name _id brand');
    const brands = await Brand.find({ isActive: true, company: req.user.company }).select('name _id');

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: products,
      filters: {
        categories: [{ _id: 'all', name: 'All' }, ...categories],
        brands: [{ _id: 'all', name: 'All' }, ...brands]
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products: ' + error.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('brand', 'name logo website brandColor')
      .populate('category', 'name description slug brand');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify product belongs to user's company
    if (req.user && req.user.company && product.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Product does not belong to your company.'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching product: ' + error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Owner/Admin)
const createProduct = async (req, res) => {
  try {
    console.log('Create product request received:', {
      body: req.body,
      user: req.user
    });

    // Validate brand and category exist
    if (!req.body.brand) {
      return res.status(400).json({
        success: false,
        message: 'Brand is required'
      });
    }

    if (!req.body.category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const brand = await Brand.findById(req.body.brand);
    if (!brand) {
      return res.status(400).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Verify brand belongs to user's company
    if (brand.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Brand does not belong to your company.'
      });
    }

    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Verify category belongs to user's company
    if (category.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Category does not belong to your company.'
      });
    }

    // Set mainCategory from category if not provided
    if (!req.body.mainCategory && category.mainCategory) {
      req.body.mainCategory = category.mainCategory;
    }

    // Check if SKU already exists in this company
    const existingProduct = await Product.findOne({ 
      sku: req.body.sku?.toUpperCase(),
      company: req.user.company
    });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists in your company'
      });
    }

    // Ensure SKU is uppercase
    if (req.body.sku) {
      req.body.sku = req.body.sku.toUpperCase();
    }

    // Set default values
    if (!req.body.currency) {
      req.body.currency = 'BD';
    }
    if (!req.body.status) {
      req.body.status = 'active';
    }
    if (!req.body.stock) {
      req.body.stock = {
        current: 0,
        minimum: 5,
        maximum: 1000
      };
    }

    // Set company field
    req.body.company = req.user.company;

    const product = await Product.create(req.body);

    // Populate before returning
    await product.populate('brand', 'name logo brandColor');
    await product.populate('category', 'name slug brand');

    // Update category and brand product counts (if field exists)
    try {
      await Category.findByIdAndUpdate(product.category, { $inc: { productCount: 1 } });
    } catch (err) {
      // Category might not have productCount field, that's okay
    }
    
    try {
      await Brand.findByIdAndUpdate(product.brand, { $inc: { productCount: 1 } });
    } catch (err) {
      // Brand might not have productCount field, that's okay
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle custom validation errors (like price > cost)
    if (error.message && error.message.includes('Selling price must be greater than cost price')) {
      return res.status(400).json({
        success: false,
        message: 'Selling price must be greater than cost price'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    // Handle duplicate key error (SKU)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating product: ' + error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Owner/Admin)
const updateProduct = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    // Check if product exists
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify product belongs to user's company
    if (existingProduct.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Product does not belong to your company.'
      });
    }

    // Validate brand if provided
    if (req.body.brand) {
      const brand = await Brand.findById(req.body.brand);
      if (!brand) {
        return res.status(400).json({
          success: false,
          message: 'Brand not found'
        });
      }
      // Verify brand belongs to user's company
      if (brand.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Brand does not belong to your company.'
        });
      }
    }

    // Validate category if provided
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }
      // Verify category belongs to user's company
      if (category.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Category does not belong to your company.'
        });
      }
      // Set mainCategory from category if not provided
      if (!req.body.mainCategory && category.mainCategory) {
        req.body.mainCategory = category.mainCategory;
      }
    }

    // Check SKU uniqueness if SKU is being updated (within same company)
    if (req.body.sku && req.body.sku.toUpperCase() !== existingProduct.sku) {
      const skuExists = await Product.findOne({ 
        sku: req.body.sku.toUpperCase(),
        _id: { $ne: req.params.id },
        company: req.user.company
      });
      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists in your company'
        });
      }
      req.body.sku = req.body.sku.toUpperCase();
    }

    // Prevent company from being changed
    delete req.body.company;

    // Update product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('brand', 'name logo brandColor')
      .populate('category', 'name slug brand');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    // Handle custom validation errors (like price > cost)
    if (error.message && error.message.includes('Selling price must be greater than cost price')) {
      return res.status(400).json({
        success: false,
        message: 'Selling price must be greater than cost price'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    // Handle duplicate key error (SKU)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating product: ' + error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Owner/Admin)
const deleteProduct = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Verify product belongs to user's company
    if (product.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Product does not belong to your company.'
      });
    }

    // Delete the product
    await product.deleteOne();

    // Update category and brand product counts (if field exists)
    try {
      await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
    } catch (err) {
      // Category might not have productCount field, that's okay
    }
    
    try {
      await Brand.findByIdAndUpdate(product.brand, { $inc: { productCount: -1 } });
    } catch (err) {
      // Brand might not have productCount field, that's okay
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting product: ' + error.message
    });
  }
};

// @desc    Update product stock
// @route   PATCH /api/products/:id/stock
// @access  Private (Owner/Admin)
const updateStock = async (req, res) => {
  try {
    const { quantity, operation = 'subtract' } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.updateStock(quantity, operation);

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product stock'
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const { limit = 8 } = req.query;

    const products = await Product.find({ 
      isFeatured: true, 
      status: 'active',
      company: req.user.company
    })
      .populate('brand', 'name logo')
      .populate('category', 'name slug')
      .sort({ 'salesData.totalSold': -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products'
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private (Owner/Admin)
const getLowStockProducts = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const products = await Product.find({
      $expr: {
        $lte: ['$stock.current', '$stock.minimum']
      },
      status: 'active',
      company: req.user.company
    })
      .populate('brand', 'name')
      .populate('category', 'name')
      .sort({ 'stock.current': 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock products'
    });
  }
};

// @desc    Bulk import products from Excel
// @route   POST /api/products/bulk-import
// @access  Private (Owner/Admin)
const bulkImportProducts = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or invalid'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Get all brands and categories for validation (filtered by company)
    const brands = await Brand.find({ 
      isActive: true,
      company: req.user.company
    }).select('_id name');
    const categories = await Category.find({ 
      isActive: true,
      company: req.user.company
    }).select('_id name brand');
    
    const brandMap = new Map(brands.map(b => [b.name.toLowerCase(), b._id.toString()]));
    const categoryMap = new Map();
    categories.forEach(cat => {
      const key = `${cat.name.toLowerCase()}_${cat.brand?.toString() || ''}`;
      categoryMap.set(key, cat._id.toString());
    });

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Validate required fields (SKU is optional, will be auto-generated)
        if (!row['Product Name'] || !row['Brand Name'] || !row['Category Name'] || !row['Price'] || !row['Cost Price']) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            sku: row['SKU'] || 'N/A',
            error: 'Missing required field: Product Name, Brand Name, Category Name, Price, or Cost Price'
          });
          continue;
        }

        // Get mainCategory from row or use default from request
        let mainCategory = row['Main Category'] ? row['Main Category'].toString().trim().toLowerCase() : null;
        // Also check if it was sent as a form field (multer allows other fields in req.body)
        if (!mainCategory) {
          mainCategory = req.body.defaultMainCategory || req.body.mainCategory;
        }
        
        // Validate mainCategory
        const validMainCategories = ['medical', 'it-solutions', 'pharmacy', 'salon'];
        if (!mainCategory || !validMainCategories.includes(mainCategory)) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            sku: row['SKU'] || 'N/A',
            error: `Main Category is required and must be one of: ${validMainCategories.join(', ')}`
          });
          continue;
        }

        // Validate that selling price is greater than cost price
        const sellingPrice = parseFloat(row['Price']) || 0;
        const costPrice = parseFloat(row['Cost Price']) || 0;
        if (sellingPrice <= costPrice) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            sku: row['SKU'] || 'N/A',
            error: 'Selling price must be greater than cost price'
          });
          continue;
        }

        // Find brand by name
        const brandName = row['Brand Name'].toString().trim();
        const brandId = brandMap.get(brandName.toLowerCase());
        
        if (!brandId) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            sku: row['SKU'],
            error: `Brand "${brandName}" not found`
          });
          continue;
        }

        // Find category by name and brand
        const categoryName = row['Category Name'].toString().trim();
        const categoryKey = `${categoryName.toLowerCase()}_${brandId}`;
        let categoryId = categoryMap.get(categoryKey);
        
        // If not found, try to find by name only (fallback)
        if (!categoryId) {
          const category = categories.find(c => 
            c.name.toLowerCase() === categoryName.toLowerCase() && 
            c.brand?.toString() === brandId
          );
          if (category) {
            categoryId = category._id.toString();
          }
        }

        if (!categoryId) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            sku: row['SKU'],
            error: `Category "${categoryName}" not found for brand "${brandName}"`
          });
          continue;
        }

        // Generate SKU if not provided
        let sku = row['SKU'] ? row['SKU'].toString().trim().toUpperCase() : null;
        
        if (!sku) {
          // Auto-generate SKU: PROD-{timestamp}-{random}
          const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          sku = `PROD-${timestamp}-${random}`;
        }

        // Check if SKU already exists in this company (only if SKU was provided)
        if (row['SKU']) {
          const existingProduct = await Product.findOne({ 
            sku: sku,
            company: req.user.company
          });
          if (existingProduct) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              sku: row['SKU'],
              error: 'SKU already exists in your company'
            });
            continue;
          }
        } else {
          // If auto-generating, make sure it's unique within company
          let isUnique = false;
          let attempts = 0;
          while (!isUnique && attempts < 10) {
            const existing = await Product.findOne({ 
              sku: sku,
              company: req.user.company
            });
            if (!existing) {
              isUnique = true;
            } else {
              // Regenerate if duplicate
              const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
              const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
              sku = `PROD-${timestamp}-${random}`;
              attempts++;
            }
          }
        }

        // Parse images (comma-separated URLs)
        const imageUrls = row['Image URLs'] ? row['Image URLs'].toString().split(',').map(url => url.trim()).filter(url => url) : [];
        const images = imageUrls.map((url, index) => ({
          url: url,
          alt: row['Product Name'].toString().trim(),
          isPrimary: index === 0
        }));

        // Parse tags (comma-separated)
        const tagsString = row['Tags'] ? row['Tags'].toString().trim() : ''
        const tagsArray = tagsString ? tagsString.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean) : []
        
        // Parse discount percentage
        const discountPercent = row['Discount Percent'] ? parseFloat(row['Discount Percent']) || 0 : 0

        // Create product
        const productData = {
          sku: sku,
          name: row['Product Name'].toString().trim(),
          brand: brandId,
          category: categoryId,
          mainCategory: mainCategory,
          description: row['Description'] ? row['Description'].toString().trim() : '',
          price: parseFloat(row['Price']) || 0,
          pricing: {
            cost: parseFloat(row['Cost Price']) || 0,
            discount: discountPercent
          },
          currency: row['Currency'] ? row['Currency'].toString().trim().toUpperCase() : 'BD',
          stock: {
            current: parseInt(row['Stock Current']) || 0,
            minimum: parseInt(row['Stock Minimum']) || 5,
            maximum: parseInt(row['Stock Maximum']) || 1000
          },
          status: row['Status'] ? row['Status'].toString().trim().toLowerCase() : 'active',
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          images: images.length > 0 ? images : undefined,
          company: req.user.company
        };

        await Product.create(productData);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          sku: row['SKU'] || 'N/A',
          error: error.message || 'Unknown error'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk import completed. ${results.success} products imported successfully, ${results.failed} failed.`,
      results
    });
  } catch (error) {
    console.error('Bulk import products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing Excel file: ' + error.message
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getFeaturedProducts,
  getLowStockProducts,
  bulkImportProducts
};
