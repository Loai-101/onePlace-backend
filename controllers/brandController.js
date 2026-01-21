const Brand = require('../models/Brand');
const { 
  validateCompanyOwnership, 
  buildCompanyQuery 
} = require('../middleware/companyIsolation');

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const { includeInactive = false, featured = false, mainCategory } = req.query;

    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    let query = buildCompanyQuery({}, companyId);
    if (!includeInactive) {
      query.isActive = true;
    }
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // If mainCategory filter is provided, filter brands that have products with this mainCategory
    if (mainCategory && mainCategory !== 'all' && mainCategory !== 'All') {
      const Product = require('../models/Product');
      const products = await Product.find({ 
        mainCategory: mainCategory, 
        status: 'active',
        company: req.user.company
      }).select('brand');
      const brandIds = [...new Set(products.map(p => p.brand?.toString()).filter(Boolean))];
      if (brandIds.length === 0) {
        // No brands found for this mainCategory
        return res.status(200).json({
          success: true,
          count: 0,
          data: []
        });
      }
      query._id = { $in: brandIds };
    }

    const brands = await Brand.find(query)
      .sort({ sortOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brands'
    });
  }
};

// @desc    Get featured brands
// @route   GET /api/brands/featured
// @access  Public
const getFeaturedBrands = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    const brands = await Brand.find(
      buildCompanyQuery({ 
        isActive: true, 
        isFeatured: true
      }, companyId)
    ).sort({ sortOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    console.error('Get featured brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured brands'
    });
  }
};

// @desc    Get brands with product counts
// @route   GET /api/brands/with-counts
// @access  Public
const getBrandsWithCounts = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    const brands = await Brand.find(
      buildCompanyQuery({ isActive: true }, companyId)
    ).sort({ sortOrder: 1, name: 1 });
    const Product = require('../models/Product');
    const brandsWithCounts = await Promise.all(
      brands.map(async (brand) => {
        const productCount = await Product.countDocuments(
          buildCompanyQuery({ brand: brand._id, status: 'active' }, companyId)
        );
        return {
          ...brand.toObject(),
          productCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    console.error('Get brands with counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brands with counts'
    });
  }
};

// @desc    Get single brand
// @route   GET /api/brands/:id
// @access  Public
const getBrand = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const brand = await Brand.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(brand, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This brand belongs to a different company.'
      });
    }

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Get brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brand'
    });
  }
};

// @desc    Create new brand
// @route   POST /api/brands
// @access  Private (Owner/Admin)
const createBrand = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    // Trim and normalize brand name
    const brandName = req.body.name ? req.body.name.trim() : '';
    if (!brandName) {
      return res.status(400).json({
        success: false,
        message: 'Brand name is required'
      });
    }

    const companyId = req.user.company._id || req.user.company;

    // Check if brand name already exists for this company (case-insensitive, strict company scope)
    const existingBrand = await Brand.findOne(
      buildCompanyQuery({ 
        name: { $regex: new RegExp(`^${brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }, companyId)
    );
    
    if (existingBrand) {
      console.log('Duplicate brand found:', {
        existingBrandId: existingBrand._id,
        existingBrandName: existingBrand.name,
        existingBrandCompany: existingBrand.company,
        userCompany: req.user.company,
        companiesMatch: existingBrand.company.toString() === req.user.company.toString()
      });
      return res.status(400).json({
        success: false,
        message: `Brand name "${existingBrand.name}" already exists in your company`
      });
    }

    console.log('Creating brand with data:', {
      name: brandName,
      company: req.user.company,
      companyId: req.user.company.toString()
    });
    
    // CRITICAL: Force company to user's company (prevent cross-company creation)
    req.body.company = companyId;
    req.body.name = brandName; // Use trimmed name
    
    // Double-check company is set correctly
    if (!req.body.company || req.body.company.toString() !== req.user.company.toString()) {
      console.error('Company mismatch detected!', {
        bodyCompany: req.body.company,
        userCompany: req.user.company
      });
      return res.status(400).json({
        success: false,
        message: 'Company assignment error. Please try again.'
      });
    }
    
    const brand = await Brand.create(req.body);

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Create brand error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Request body:', req.body);
    console.error('User company:', req.user?.company);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Handle duplicate key error (from MongoDB unique index)
    if (error.code === 11000) {
      console.error('Duplicate key error detected. Error message:', error.message);
      console.error('Error keyPattern:', error.keyPattern);
      console.error('Error keyValue:', error.keyValue);
      console.error('User company:', req.user.company?.toString());
      console.error('This might indicate an old unique index exists. Please check database indexes.');
      
      // Check if error is from compound index (name + company) or old single index (name only)
      const isCompoundIndexError = error.keyPattern && error.keyPattern.name && error.keyPattern.company;
      const isOldIndexError = error.keyPattern && error.keyPattern.name && !error.keyPattern.company;
      
      if (isOldIndexError) {
        console.error('⚠️ WARNING: Old unique index detected on "name" field only!');
        console.error('This prevents different companies from using the same brand name.');
        console.error('Please drop the old index: db.brands.dropIndex("name_1")');
        return res.status(400).json({
          success: false,
          message: 'Database configuration error: Old unique index detected. Please contact administrator.'
        });
      }
      
      // Try to find the existing brand to provide better error message
      try {
        const brandNameToCheck = req.body.name?.trim() || '';
        const existingBrand = await Brand.findOne({ 
          name: { $regex: new RegExp(`^${brandNameToCheck.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          company: req.user.company 
        });
        
        if (existingBrand) {
          console.log('Found existing brand in same company:', {
            brandId: existingBrand._id,
            brandName: existingBrand.name,
            brandCompany: existingBrand.company.toString(),
            userCompany: req.user.company.toString()
          });
          return res.status(400).json({
            success: false,
            message: `Brand name "${existingBrand.name}" already exists in your company. Please choose a different name.`
          });
        } else {
          // Brand exists but in different company - this shouldn't happen with compound index
          console.error('⚠️ Brand exists in different company or index issue!');
          const anyBrand = await Brand.findOne({ 
            name: { $regex: new RegExp(`^${brandNameToCheck.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
          });
          if (anyBrand) {
            console.error('Brand found in different company:', {
              brandId: anyBrand._id,
              brandName: anyBrand.name,
              brandCompany: anyBrand.company.toString(),
              userCompany: req.user.company.toString()
            });
          }
        }
      } catch (lookupError) {
        console.error('Error looking up existing brand:', lookupError);
      }
      
      return res.status(400).json({
        success: false,
        message: `Brand name "${req.body.name || ''}" already exists. Please choose a different name.`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating brand'
    });
  }
};

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Private (Owner/Admin)
const updateBrand = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const existingBrand = await Brand.findOne({
      _id: req.params.id,
      company: companyId
    });
    
    if (!existingBrand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(existingBrand, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This brand belongs to a different company.'
      });
    }

    // If name is being changed, check for duplicate within company (case-insensitive)
    if (req.body.name) {
      const newBrandName = req.body.name.trim();
      
      // Normalize existing brand name for comparison
      const existingBrandName = existingBrand.name.trim();
      
      // Only check if the name actually changed (case-insensitive)
      if (newBrandName.toLowerCase() !== existingBrandName.toLowerCase()) {
        const duplicateBrand = await Brand.findOne(
          buildCompanyQuery({ 
            name: { $regex: new RegExp(`^${newBrandName}$`, 'i') },
            _id: { $ne: req.params.id }
          }, companyId)
        );
        
        if (duplicateBrand) {
          return res.status(400).json({
            success: false,
            message: `Brand name "${duplicateBrand.name}" already exists in your company`
          });
        }
      }
      
      // Use trimmed name
      req.body.name = newBrandName;
    }

    // CRITICAL: Prevent company from being changed
    if (req.body.company && req.body.company.toString() !== companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot change brand company.'
      });
    }
    delete req.body.company;

    // Update with company filter to prevent cross-company updates
    const brand = await Brand.findOneAndUpdate(
      {
        _id: req.params.id,
        company: companyId
      },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating brand'
    });
  }
};

// @desc    Delete brand
// @route   DELETE /api/brands/:id
// @access  Private (Owner/Admin)
// @isolation STRICT - Verifies brand belongs to user's company before deletion
const deleteBrand = async (req, res) => {
  try {
    // STRICT ISOLATION: User MUST have a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const companyId = req.user.company._id || req.user.company;
    
    // Query with company filter FIRST - prevents cross-company access
    const brand = await Brand.findOne({
      _id: req.params.id,
      company: companyId
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found or access denied'
      });
    }

    // Double-check ownership (defense in depth)
    const ownershipCheck = validateCompanyOwnership(brand, companyId);
    if (!ownershipCheck.valid) {
      return res.status(403).json({
        success: false,
        message: ownershipCheck.error || 'Access denied. This brand belongs to a different company.'
      });
    }

    // Verify brand belongs to user's company
    if (brand.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Brand does not belong to your company.'
      });
    }

    // Check if brand has products (filtered by company)
    const Product = require('../models/Product');
    const productCount = await Product.countDocuments({ 
      brand: brand._id,
      company: req.user.company
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete brand. It has ${productCount} products associated with it.`
      });
    }

    await brand.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    console.error('Delete brand error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting brand'
    });
  }
};

// @desc    Get brand products
// @route   GET /api/brands/:id/products
// @access  Public
const getBrandProducts = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
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

    const Product = require('../models/Product');
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({ 
      brand: id, 
      status: 'active',
      company: req.user.company
    })
      .populate('category', 'name slug')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({ 
      brand: id, 
      status: 'active',
      company: req.user.company
    });

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: products
    });
  } catch (error) {
    console.error('Get brand products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brand products'
    });
  }
};

// @desc    Update brand product count
// @route   PATCH /api/brands/:id/update-count
// @access  Private (Owner/Admin)
const updateBrandProductCount = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    await brand.updateProductCount();

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Update brand product count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating brand product count'
    });
  }
};

module.exports = {
  getBrands,
  getFeaturedBrands,
  getBrandsWithCounts,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandProducts,
  updateBrandProductCount
};
