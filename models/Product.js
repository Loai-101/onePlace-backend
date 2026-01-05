const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'SKU cannot exceed 50 characters']
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: [true, 'Brand is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  mainCategory: {
    type: String,
    enum: ['medical', 'it-solutions', 'pharmacy', 'salon', 'order-product'],
    required: [true, 'Main category is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'BD',
    enum: ['BD', 'USD', 'EUR']
  },
  stock: {
    current: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    minimum: {
      type: Number,
      default: 5,
      min: [0, 'Minimum stock cannot be negative']
    },
    maximum: {
      type: Number,
      default: 1000,
      min: [0, 'Maximum stock cannot be negative']
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  specifications: {
    weight: String,
    dimensions: String,
    material: String,
    color: String,
    size: String,
    model: String,
    manufacturer: String,
    countryOfOrigin: String,
    warranty: String,
    expiryDate: Date
  },
  pricing: {
    cost: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost cannot be negative']
    },
    margin: {
      type: Number,
      min: [0, 'Margin cannot be negative'],
      max: [100, 'Margin cannot exceed 100%']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%']
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
      default: 0
    }
  },
  vat: {
    rate: {
      type: Number,
      default: 10,
      min: [0, 'VAT rate cannot be negative'],
      max: [100, 'VAT rate cannot exceed 100%']
    },
    isExempt: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  salesData: {
    totalSold: {
      type: Number,
      default: 0,
      min: [0, 'Total sold cannot be negative']
    },
    lastSold: {
      type: Date,
      default: null
    },
    averageRating: {
      type: Number,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative']
    }
  }
}, {
  timestamps: true
});

// Index for better performance
productSchema.index({ name: 'text', description: 'text', sku: 'text' });
productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });
productSchema.index({ mainCategory: 1 }); // Index for main category filtering
productSchema.index({ status: 1 });
productSchema.index({ 'stock.current': 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  const { current, minimum } = this.stock;
  
  if (current === 0) {
    return 'out_of_stock';
  } else if (current <= minimum) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
});

// Virtual for final price with discount
productSchema.virtual('finalPrice').get(function() {
  const { price, discount } = this.pricing;
  if (discount > 0) {
    return price * (1 - discount / 100);
  }
  return price;
});

// Method to update stock
productSchema.methods.updateStock = function(quantity, operation = 'subtract') {
  if (operation === 'subtract') {
    this.stock.current = Math.max(0, this.stock.current - quantity);
  } else if (operation === 'add') {
    this.stock.current += quantity;
  }
  
  // Update status based on stock
  if (this.stock.current === 0) {
    this.status = 'out_of_stock';
  } else if (this.stock.current <= this.stock.minimum) {
    this.status = 'active'; // Keep active but low stock
  } else {
    this.status = 'active';
  }
  
  return this.save();
};

// Method to record sale
productSchema.methods.recordSale = function(quantity, price) {
  this.salesData.totalSold += quantity;
  this.salesData.lastSold = new Date();
  return this.save();
};

// Pre-save validation: Ensure selling price is greater than cost price
productSchema.pre('save', function(next) {
  if (this.price && this.pricing && this.pricing.cost) {
    if (this.price <= this.pricing.cost) {
      return next(new Error('Selling price must be greater than cost price'));
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
