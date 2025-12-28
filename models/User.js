const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['owner', 'accountant', 'salesman', 'admin'],
    required: true
  },
  // Owner reference - only for non-owner users
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Made optional for public registration
  },
  // Company reference - can be set by owner for their users
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  profile: {
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
    postalCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      default: null
    },
    position: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    }
  },
  // Salesman-specific fields
  salesmanInfo: {
    targetSales: {
      type: Number,
      default: 0
    },
    actualSales: {
      type: Number,
      default: 0
    },
    forecast: [{
      month: {
        type: String,
        required: true
      },
      year: {
        type: Number,
        required: true
      },
      targetAmount: {
        type: Number,
        required: true
      },
      actualAmount: {
        type: Number,
        default: 0
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    totalOrders: {
      type: Number,
      default: 0
    },
    completedOrders: {
      type: Number,
      default: 0
    }
  },
  // Role-specific permissions
  permissions: {
    products: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    orders: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    users: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    reports: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false }
    },
    companies: {
      read: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  },
  // Created by owner
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Made optional for public registration
  }
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ owner: 1 });
userSchema.index({ company: 1 });
userSchema.index({ createdBy: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.setDefaultPermissions();
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Set default permissions based on role
userSchema.methods.setDefaultPermissions = function() {
  switch (this.role) {
    case 'owner':
      this.permissions = {
        products: { read: true, write: true, delete: true },
        orders: { read: true, write: true, delete: true },
        users: { read: true, write: true, delete: true },
        reports: { read: true, write: true },
        companies: { read: true, write: true, delete: true }
      };
      break;
    case 'admin':
      this.permissions = {
        products: { read: true, write: true, delete: true },
        orders: { read: true, write: true, delete: false },
        users: { read: true, write: true, delete: false },
        reports: { read: true, write: true },
        companies: { read: true, write: true, delete: false }
      };
      break;
    case 'accountant':
      this.permissions = {
        products: { read: true, write: false, delete: false },
        orders: { read: true, write: true, delete: false },
        users: { read: false, write: false, delete: false },
        reports: { read: true, write: true },
        companies: { read: true, write: true, delete: false }
      };
      break;
    case 'salesman':
      this.permissions = {
        products: { read: true, write: false, delete: false },
        orders: { read: true, write: true, delete: false },
        users: { read: false, write: false, delete: false },
        reports: { read: false, write: false },
        companies: { read: true, write: false, delete: false }
      };
      break;
  }
};

// Check if user has specific permission
userSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'owner') return true; // Owner has all permissions
  return this.permissions[resource] && this.permissions[resource][action];
};

// Get users created by this owner
userSchema.methods.getCreatedUsers = function() {
  return this.constructor.find({ createdBy: this._id }).populate('company', 'name location');
};

// Get owner of this user
userSchema.methods.getOwner = function() {
  if (this.role === 'owner') return null;
  return this.constructor.findById(this.owner);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Static method to get users by owner
userSchema.statics.getByOwner = function(ownerId) {
  return this.find({ owner: ownerId }).populate('company', 'name location');
};

// Static method to check if owner exists
userSchema.statics.ownerExists = async function() {
  const owner = await this.findOne({ role: 'owner' });
  return !!owner;
};

module.exports = mongoose.model('User', userSchema);
