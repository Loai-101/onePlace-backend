const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [200, 'Account name cannot exceed 200 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
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
  address: {
    flatShopNo: {
      type: String,
      trim: true,
      maxlength: [100, 'Flat/Shop No. cannot exceed 100 characters']
    },
    building: {
      type: String,
      trim: true,
      maxlength: [200, 'Building cannot exceed 200 characters']
    },
    road: {
      type: String,
      trim: true,
      maxlength: [200, 'Road cannot exceed 200 characters']
    },
    block: {
      type: String,
      trim: true,
      maxlength: [50, 'Block cannot exceed 50 characters']
    },
    area: {
      type: String,
      required: [true, 'Area is required'],
      trim: true,
      maxlength: [200, 'Area cannot exceed 200 characters']
    }
  },
  staff: [{
    title: {
      type: String,
      required: [true, 'Staff title is required'],
      enum: ['Dr', 'Miss', 'Mr'],
      trim: true
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Staff name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      required: false
    },
    email: {
      type: String,
      trim: true,
      required: false,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    medicalBranch: {
      type: String,
      required: [true, 'Medical branch is required'],
      enum: [
        'dentistry',
        'physiotherapy',
        'orthopedics',
        'dermatology',
        'cardiology',
        'neurology',
        'pediatrics',
        'gynecology',
        'ophthalmology',
        'otolaryngology',
        'psychiatry',
        'radiology',
        'surgery',
        'internal-medicine',
        'emergency-medicine',
        'other'
      ],
      trim: true
    },
    specializations: [{
      type: String,
      trim: true
    }]
  }],
  vat: {
    type: String,
    required: [true, 'VAT number is required'],
    trim: true
  },
  crNumber: {
    type: String,
    required: [true, 'CR number is required'],
    trim: true
  },
  creditLimit: {
    type: Number,
    required: [true, 'Credit limit is required'],
    min: [0, 'Credit limit cannot be negative'],
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0,
    min: [0, 'Current balance cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
accountSchema.index({ company: 1 });
accountSchema.index({ company: 1, isActive: 1 });
accountSchema.index({ name: 1, company: 1 });

module.exports = mongoose.model('Account', accountSchema);

