const Category = require('../models/Category');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const XLSX = require('xlsx');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const { includeInactive = false, mainCategory } = req.query;

    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    let query = { company: req.user.company };
    if (!includeInactive) {
      query.isActive = true;
    }

    // Main category filter
    if (mainCategory && mainCategory !== 'all' && mainCategory !== 'All') {
      query.mainCategory = mainCategory;
    }

    const categories = await Category.find(query)
      .populate('brand', 'name logo brandColor')
      .populate('brands', 'name logo brandColor')
      .populate('parent', 'name slug')
      .sort({ sortOrder: 1, name: 1 });

    // Get all products grouped by category and brand (filtered by company)
    const categoryIds = categories.map(cat => cat._id);
    const products = await Product.find({ 
      category: { $in: categoryIds },
      company: req.user.company
    })
      .populate('brand', 'name logo brandColor')
      .select('category brand');
    
    // Group products by category and brand
    const categoryBrandCounts = {};
    products.forEach(product => {
      const catId = product.category.toString();
      const brandId = product.brand?._id?.toString();
      
      if (!categoryBrandCounts[catId]) {
        categoryBrandCounts[catId] = {};
      }
      
      if (brandId) {
        if (!categoryBrandCounts[catId][brandId]) {
          categoryBrandCounts[catId][brandId] = {
            brand: product.brand,
            count: 0
          };
        }
        categoryBrandCounts[catId][brandId].count++;
      }
    });
    
    // Attach counts to categories
    const categoriesWithCounts = categories.map(category => {
      const categoryObj = category.toObject();
      const catId = category._id.toString();
      const brandCounts = categoryBrandCounts[catId] || {};
      
      // Start with brands from products
      const brandProductCountsMap = new Map();
      Object.values(brandCounts).forEach(item => {
        const brandId = item.brand._id.toString();
        brandProductCountsMap.set(brandId, {
          brandId: item.brand._id,
          brandName: item.brand.name,
          brandLogo: item.brand.logo,
          brandColor: item.brand.brandColor,
          productCount: item.count
        });
      });
      
      // Add brands from category's brands array (if they exist and aren't already in the map)
      if (category.brands && Array.isArray(category.brands) && category.brands.length > 0) {
        category.brands.forEach(brand => {
          if (brand && brand._id) {
            const brandId = brand._id.toString();
            if (!brandProductCountsMap.has(brandId)) {
              // Brand is associated with category but has no products yet
              brandProductCountsMap.set(brandId, {
                brandId: brand._id,
                brandName: brand.name,
                brandLogo: brand.logo,
                brandColor: brand.brandColor,
                productCount: 0 // No products yet, but brand is associated
              });
            }
          }
        });
      }
      
      // Also check single brand field for backward compatibility
      if (category.brand && category.brand._id) {
        const brandId = category.brand._id.toString();
        if (!brandProductCountsMap.has(brandId)) {
          brandProductCountsMap.set(brandId, {
            brandId: category.brand._id,
            brandName: category.brand.name,
            brandLogo: category.brand.logo,
            brandColor: category.brand.brandColor,
            productCount: 0
          });
        }
      }
      
      const brandProductCounts = Array.from(brandProductCountsMap.values());
      
      categoryObj.brandProductCounts = brandProductCounts;
      categoryObj.totalProductCount = brandProductCounts.reduce((sum, item) => sum + item.productCount, 0);
      
      return categoryObj;
    });

    res.status(200).json({
      success: true,
      count: categoriesWithCounts.length,
      data: categoriesWithCounts
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
};

// @desc    Get category tree
// @route   GET /api/categories/tree
// @access  Public
const getCategoryTree = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    // Get categories filtered by company
    const categories = await Category.find({ 
      isActive: true,
      company: req.user.company
    }).sort({ sortOrder: 1, name: 1 });
    
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => {
          const catParentId = cat.parent ? cat.parent.toString() : null;
          return catParentId === (parentId ? parentId.toString() : null);
        })
        .map(cat => ({
          ...cat.toObject(),
          children: buildTree(cat._id)
        }));
    };
    
    const tree = buildTree();

    res.status(200).json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category tree'
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const category = await Category.findById(req.params.id)
      .populate('brand', 'name logo brandColor')
      .populate('brands', 'name logo brandColor')
      .populate('parent', 'name slug')
      .populate('children', 'name slug productCount');

    if (!category) {
      return res.status(404).json({
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
    
    // Get product counts by brand for this category (filtered by company)
    const products = await Product.find({ 
      category: category._id,
      company: req.user.company
    });
    const brandCounts = {};
    products.forEach(product => {
      const brandId = product.brand.toString();
      brandCounts[brandId] = (brandCounts[brandId] || 0) + 1;
    });
    
    const Brand = require('../models/Brand');
    const brandProductCounts = [];
    for (const [brandId, count] of Object.entries(brandCounts)) {
      const brand = await Brand.findById(brandId).select('name logo brandColor');
      if (brand) {
        brandProductCounts.push({
          brandId: brand._id,
          brandName: brand.name,
          brandLogo: brand.logo,
          brandColor: brand.brandColor,
          productCount: count
        });
      }
    }
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    const categoryObj = category.toObject();
    categoryObj.brandProductCounts = brandProductCounts;
    categoryObj.totalProductCount = products.length;

    res.status(200).json({
      success: true,
      data: categoryObj
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category'
    });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Owner/Admin)
const createCategory = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    // Handle brands array - if brands array is provided, use it; otherwise use single brand
    const categoryData = { ...req.body };
    
    // Set company field
    categoryData.company = req.user.company;
    
    if (categoryData.brands && Array.isArray(categoryData.brands) && categoryData.brands.length > 0) {
      // If brands array is provided, set brand to first brand for backward compatibility
      if (!categoryData.brand) {
        categoryData.brand = categoryData.brands[0];
      }
      // Verify all brands belong to user's company
      const Brand = require('../models/Brand');
      for (const brandId of categoryData.brands) {
        const brand = await Brand.findById(brandId);
        if (!brand) {
          return res.status(400).json({
            success: false,
            message: `Brand ${brandId} not found`
          });
        }
        if (brand.company.toString() !== req.user.company.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Brand does not belong to your company.'
          });
        }
      }
    } else if (categoryData.brand && !categoryData.brands) {
      // If only single brand is provided, create brands array
      categoryData.brands = [categoryData.brand];
      // Verify brand belongs to user's company
      const Brand = require('../models/Brand');
      const brand = await Brand.findById(categoryData.brand);
      if (!brand) {
        return res.status(400).json({
          success: false,
          message: 'Brand not found'
        });
      }
      if (brand.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Brand does not belong to your company.'
        });
      }
    }
    
    // Validate that at least one brand is set
    if (!categoryData.brand && (!categoryData.brands || categoryData.brands.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one brand is required'
      });
    }

    // Check if category name already exists for this company
    const existingCategory = await Category.findOne({ 
      name: categoryData.name, 
      company: req.user.company 
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists in your company'
      });
    }

    const category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category'
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Owner/Admin)
const updateCategory = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    // Check if category exists and belongs to user's company
    const existingCategory = await Category.findById(req.params.id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Verify category belongs to user's company
    if (existingCategory.company.toString() !== req.user.company.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Category does not belong to your company.'
      });
    }

    // Handle brands array - if brands array is provided, use it; otherwise use single brand
    const updateData = { ...req.body };
    
    // Prevent company from being changed
    delete updateData.company;
    
    if (updateData.brands && Array.isArray(updateData.brands) && updateData.brands.length > 0) {
      // If brands array is provided, set brand to first brand for backward compatibility
      if (!updateData.brand) {
        updateData.brand = updateData.brands[0];
      }
      // Verify all brands belong to user's company
      const Brand = require('../models/Brand');
      for (const brandId of updateData.brands) {
        const brand = await Brand.findById(brandId);
        if (!brand) {
          return res.status(400).json({
            success: false,
            message: `Brand ${brandId} not found`
          });
        }
        if (brand.company.toString() !== req.user.company.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Brand does not belong to your company.'
          });
        }
      }
    } else if (updateData.brand && !updateData.brands) {
      // If only single brand is provided, create brands array
      updateData.brands = [updateData.brand];
      // Verify brand belongs to user's company
      const Brand = require('../models/Brand');
      const brand = await Brand.findById(updateData.brand);
      if (brand && brand.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Brand does not belong to your company.'
        });
      }
    }
    
    // Validate that at least one brand is set
    if (updateData.brands !== undefined && updateData.brands.length === 0 && !updateData.brand) {
      return res.status(400).json({
        success: false,
        message: 'At least one brand is required'
      });
    }

    // If name is being changed, check for duplicate within company
    if (updateData.name && updateData.name !== existingCategory.name) {
      const duplicateCategory = await Category.findOne({ 
        name: updateData.name, 
        company: req.user.company,
        _id: { $ne: req.params.id } // Exclude current category
      });
      
      if (duplicateCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists in your company'
        });
      }
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('brand', 'name logo brandColor')
      .populate('brands', 'name logo brandColor');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category'
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Owner/Admin)
const deleteCategory = async (req, res) => {
  try {
    // Ensure user has a company
    if (!req.user || !req.user.company) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User must be associated with a company.'
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
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

    // Check if category has products (filtered by company)
    const Product = require('../models/Product');
    const productCount = await Product.countDocuments({ 
      category: category._id,
      company: req.user.company
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${productCount} products associated with it.`
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ parent: category._id });

    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${subcategoryCount} subcategories.`
      });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category'
    });
  }
};

// @desc    Get category products
// @route   GET /api/categories/:id/products
// @access  Public
const getCategoryProducts = async (req, res) => {
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

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
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

    // Get products filtered by company
    const categoryIds = [category._id];
    const getSubcategoryIds = async (categoryId) => {
      const subcategories = await Category.find({ 
        parent: categoryId,
        company: req.user.company
      });
      for (const subcategory of subcategories) {
        categoryIds.push(subcategory._id);
        await getSubcategoryIds(subcategory._id);
      }
    };
    await getSubcategoryIds(category._id);
    
    const products = await Product.find({ 
      category: { $in: categoryIds },
      company: req.user.company
    });

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedProducts = products.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      count: paginatedProducts.length,
      total: products.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(products.length / parseInt(limit))
      },
      data: paginatedProducts
    });
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category products'
    });
  }
};

// @desc    Bulk import categories from Excel
// @route   POST /api/categories/bulk-import
// @access  Private (Owner/Admin)
const bulkImportCategories = async (req, res) => {
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

    // Get all brands for validation (filtered by company)
    const brands = await Brand.find({ 
      isActive: true,
      company: req.user.company
    }).select('_id name');
    const brandMap = new Map(brands.map(b => [b.name.toLowerCase(), b._id.toString()]));

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Validate required fields
        if (!row['Category Name'] || !row['Brand Name']) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            categoryName: row['Category Name'] || 'N/A',
            error: 'Missing required field: Category Name or Brand Name'
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
            categoryName: row['Category Name'],
            error: `Invalid or missing Main Category. Must be one of: ${validMainCategories.join(', ')}`
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
            categoryName: row['Category Name'],
            error: `Brand "${brandName}" not found`
          });
          continue;
        }

        // Verify brand belongs to user's company
        const brand = await Brand.findById(brandId);
        if (!brand || brand.company.toString() !== req.user.company.toString()) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            categoryName: row['Category Name'],
            error: `Brand "${brandName}" does not belong to your company`
          });
          continue;
        }

        // Check if category already exists for this brand (within company)
        const existingCategory = await Category.findOne({
          name: row['Category Name'].toString().trim(),
          brand: brandId,
          company: req.user.company
        });

        if (existingCategory) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            categoryName: row['Category Name'],
            error: 'Category already exists for this brand in your company'
          });
          continue;
        }

        // Create category
        const categoryData = {
          name: row['Category Name'].toString().trim(),
          brand: brandId,
          brands: [brandId],
          mainCategory: mainCategory,
          description: row['Description'] ? row['Description'].toString().trim() : '',
          isActive: row['Is Active'] !== undefined ? (row['Is Active'].toString().toLowerCase() === 'true' || row['Is Active'] === 1) : true,
          image: row['Image URL'] ? {
            url: row['Image URL'].toString().trim(),
            alt: row['Category Name'].toString().trim()
          } : undefined,
          company: req.user.company
        };

        await Category.create(categoryData);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          categoryName: row['Category Name'] || 'N/A',
          error: error.message || 'Unknown error'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk import completed. ${results.success} categories imported successfully, ${results.failed} failed.`,
      results
    });
  } catch (error) {
    console.error('Bulk import categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing Excel file: ' + error.message
    });
  }
};

module.exports = {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  bulkImportCategories
};
