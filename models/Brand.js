const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  mainCategory: {
    type: String,
    enum: ['medical', 'it-solutions', 'pharmacy', 'salon'],
    required: [true, 'Main category is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  logo: {
    url: {
      type: String,
      default: null
    },
    alt: {
      type: String,
      default: ''
    }
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Please enter a valid website URL starting with http:// or https://'
    }
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'Bahrain'
    }
  },
  brandColor: {
    type: String,
    default: '#667eea',
    trim: true
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
  isFeatured: {
    type: Boolean,
    default: false
  },
  metadata: {
    founded: Date,
    headquarters: String,
    specialties: [{
      type: String,
      trim: true
    }],
    certifications: [{
      type: String,
      trim: true
    }],
    keywords: [{
      type: String,
      trim: true
    }]
  }
}, {
  timestamps: true
});

// Index for better performance
brandSchema.index({ name: 1 });
brandSchema.index({ mainCategory: 1 }); // Index for main category filtering
brandSchema.index({ isActive: 1 });
brandSchema.index({ isFeatured: 1 });
brandSchema.index({ sortOrder: 1 });

// Virtual for brand statistics
brandSchema.virtual('stats').get(function() {
  return {
    productCount: this.productCount,
    isActive: this.isActive,
    isFeatured: this.isFeatured
  };
});

// Method to update product count
brandSchema.methods.updateProductCount = async function() {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ brand: this._id, status: 'active' });
  this.productCount = count;
  return this.save();
};

// Static method to get featured brands
brandSchema.statics.getFeatured = function() {
  return this.find({ isActive: true, isFeatured: true }).sort({ sortOrder: 1, name: 1 });
};

// Static method to get brands with product counts
brandSchema.statics.getWithProductCounts = async function() {
  const brands = await this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  
  const Product = mongoose.model('Product');
  const brandsWithCounts = await Promise.all(
    brands.map(async (brand) => {
      const productCount = await Product.countDocuments({ brand: brand._id, status: 'active' });
      return {
        ...brand.toObject(),
        productCount
      };
    })
  );
  
  return brandsWithCounts;
};

module.exports = mongoose.model('Brand', brandSchema);
