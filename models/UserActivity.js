const mongoose = require('mongoose')

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },
  loginTime: {
    type: Date,
    required: [true, 'Login time is required'],
    default: Date.now,
    index: true
  },
  logoutTime: {
    type: Date,
    default: null
  },
  pages: [{
    page: {
      type: String,
      required: true
    },
    visitedAt: {
      type: Date,
      default: Date.now
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0
    }
  }],
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  sessionDuration: {
    type: Number, // Total session duration in seconds
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true // True if user is still logged in
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
userActivitySchema.index({ user: 1, loginTime: -1 })
userActivitySchema.index({ company: 1, loginTime: -1 })
userActivitySchema.index({ loginTime: -1 })

// Calculate session duration before saving
userActivitySchema.pre('save', function(next) {
  if (this.logoutTime && this.loginTime) {
    this.sessionDuration = Math.floor((this.logoutTime - this.loginTime) / 1000) // Convert to seconds
  }
  next()
})

module.exports = mongoose.model('UserActivity', userActivitySchema)

