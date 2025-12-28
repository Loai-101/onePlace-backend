const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // Basic Company Information
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  email: {
    type: String,
    required: [true, 'Company email is required'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Company phone is required'],
    trim: true
  },
  logo: {
    url: {
      type: String,
      trim: true
    },
    public_id: {
      type: String,
      trim: true
    }
  },
  
  // Banking Information
  ibanNumber: {
    type: String,
    required: [true, 'IBAN number is required'],
    trim: true,
    uppercase: true
  },
  bankName: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true
  },
  vatNumber: {
    type: String,
    required: [true, 'VAT number is required'],
    trim: true
  },
  crNumber: {
    type: String,
    required: [true, 'CR number is required'],
    trim: true
  },
  
  // Company Details
  companyType: {
    type: String,
    required: [true, 'Company type is required'],
    enum: ['llc', 'corporation', 'partnership', 'sole-proprietorship', 'non-profit', 'other']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  companySize: {
    type: String,
    required: [true, 'Company size is required'],
    enum: ['startup', 'small', 'medium', 'large', 'enterprise']
  },
  businessTarget: {
    type: String,
    required: [true, 'Business target is required'],
    enum: ['medical-items', 'pharmacy', 'collecting-orders', 'other']
  },
  numberOfUsers: {
    type: Number,
    required: [true, 'Number of users is required'],
    min: [1, 'Number of users must be at least 1']
  },
  
  // Address Information
  address: {
    type: String,
    required: [true, 'Company address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'Company city is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Company country is required'],
    trim: true,
    default: 'Bahrain'
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true
  },
  
  // Owner Information
  ownerName: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true
  },
  ownerEmail: {
    type: String,
    required: [true, 'Owner email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  ownerUsername: {
    type: String,
    required: [true, 'Owner username is required'],
    trim: true,
    unique: true
  },
  ownerPassword: {
    type: String,
    required: [true, 'Owner password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  // Approval system fields
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hold'],
    default: 'pending'
  },
  approvalNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  heldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  heldAt: {
    type: Date,
    default: null
  },
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  activatedAt: {
    type: Date,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'Bahrain'
    }
  },
  paymentInfo: {
    creditLimit: {
      type: Number,
      default: 5000,
      min: [0, 'Credit limit cannot be negative']
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: [0, 'Current balance cannot be negative']
    },
    paymentTerms: {
      type: String,
      enum: ['cash', 'credit_30', 'credit_60', 'credit_90'],
      default: 'cash'
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'over_limit', 'warning'],
      default: 'active'
    }
  },
  employees: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  salesHistory: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    brand: String,
    category: String,
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative']
    },
    paymentType: {
      type: String,
      enum: ['cash', 'cards', 'BenefitPay'],
      required: true
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Index for better performance
companySchema.index({ name: 1 });
companySchema.index({ 'contactInfo.email': 1 });
companySchema.index({ 'paymentInfo.status': 1 });

// Virtual for payment status
companySchema.virtual('paymentStatus').get(function() {
  const { creditLimit, currentBalance } = this.paymentInfo;
  const utilization = (currentBalance / creditLimit) * 100;
  
  if (currentBalance > creditLimit) {
    return { status: 'over_limit', utilization: utilization.toFixed(2) };
  } else if (utilization >= 80) {
    return { status: 'warning', utilization: utilization.toFixed(2) };
  } else {
    return { status: 'active', utilization: utilization.toFixed(2) };
  }
});

// Method to add sales history
companySchema.methods.addSalesHistory = function(saleData) {
  this.salesHistory.push(saleData);
  this.paymentInfo.currentBalance += saleData.totalPrice;
  
  // Update payment status based on new balance
  const { creditLimit, currentBalance } = this.paymentInfo;
  if (currentBalance > creditLimit) {
    this.paymentInfo.status = 'over_limit';
  } else if ((currentBalance / creditLimit) >= 0.8) {
    this.paymentInfo.status = 'warning';
  } else {
    this.paymentInfo.status = 'active';
  }
  
  return this.save();
};

module.exports = mongoose.model('Company', companySchema);
