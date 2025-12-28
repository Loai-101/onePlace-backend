const Brand = require('../models/Brand');

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const { includeInactive = false, featured = false } = req.query;

    let query = {};
    if (!includeInactive) {
      query.isActive = true;
    }
    if (featured === 'true') {
      query.isFeatured = true;
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
    const brands = await Brand.getFeatured();

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
    const brands = await Brand.getWithProductCounts();

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
    const brand = await Brand.findById(req.params.id);

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
    console.log('Creating brand with data:', req.body);
    const brand = await Brand.create(req.body);

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error('Create brand error:', error);
    console.error('Error details:', error.message);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Brand name already exists'
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
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

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
const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if brand has products
    const Product = require('../models/Product');
    const productCount = await Product.countDocuments({ brand: brand._id });

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
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    const Product = require('../models/Product');
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({ brand: id, status: 'active' })
      .populate('category', 'name slug')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({ brand: id, status: 'active' });

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
