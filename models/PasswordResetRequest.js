const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending'
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  newPassword: {
    type: String,
    default: null,
    select: false // Don't include password in queries by default
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Index for better performance
passwordResetRequestSchema.index({ user: 1, status: 1 });
passwordResetRequestSchema.index({ email: 1 });
passwordResetRequestSchema.index({ status: 1 });

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);

