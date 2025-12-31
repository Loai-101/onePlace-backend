const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  mainCategory: {
    type: String,
    enum: ['medical', 'it-solutions', 'pharmacy', 'salon'],
    required: [true, 'Main category is required'],
    trim: true
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: false // Made optional to support brands array
  },
  brands: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand'
  }],
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  image: {
    url: {
      type: String,
      default: null
    },
    alt: {
      type: String,
      default: ''
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  productCount: {
    type: Number,
    default: 0,
    min: [0, 'Product count cannot be negative']
  },
  metadata: {
    keywords: [{
      type: String,
      trim: true
    }],
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'SEO title cannot exceed 60 characters']
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'SEO description cannot exceed 160 characters']
    }
  }
}, {
  timestamps: true
});

// Index for better performance
categorySchema.index({ name: 1, brand: 1 }, { unique: false }); // Changed to false to allow multiple brands
categorySchema.index({ mainCategory: 1 }); // Index for main category filtering
categorySchema.index({ brand: 1 });
categorySchema.index({ brands: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for full path (including parent categories)
categorySchema.virtual('fullPath').get(function() {
  if (this.parent) {
    return `${this.parent.fullPath} > ${this.name}`;
  }
  return this.name;
});

// Method to get all products in this category and subcategories
categorySchema.methods.getAllProducts = async function() {
  const Product = mongoose.model('Product');
  const categoryIds = [this._id];
  
  // Get all subcategory IDs
  const getSubcategoryIds = async (categoryId) => {
    const subcategories = await this.constructor.find({ parent: categoryId });
    for (const subcategory of subcategories) {
      categoryIds.push(subcategory._id);
      await getSubcategoryIds(subcategory._id);
    }
  };
  
  await getSubcategoryIds(this._id);
  
  return Product.find({ category: { $in: categoryIds } });
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  
  const buildTree = (parentId = null) => {
    return categories
      .filter(cat => (cat.parent && cat.parent.toString()) === (parentId && parentId.toString()))
      .map(cat => ({
        ...cat.toObject(),
        children: buildTree(cat._id)
      }));
  };
  
  return buildTree();
};

module.exports = mongoose.model('Category', categorySchema);
