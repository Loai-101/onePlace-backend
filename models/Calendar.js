const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: ['visit', 'todo'],
    required: [true, 'Event type is required']
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  startTime: {
    type: String,
    default: null // Format: "HH:MM"
  },
  endTime: {
    type: String,
    default: null // Format: "HH:MM"
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: false // Allow null for "other" accounts
  },
  accountName: {
    type: String,
    required: function() {
      return this.type === 'visit';
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
    default: null
  },
  feedbackDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

// Index for better performance
calendarEventSchema.index({ date: 1 });
calendarEventSchema.index({ createdBy: 1 });
calendarEventSchema.index({ company: 1 });
calendarEventSchema.index({ type: 1 });
calendarEventSchema.index({ account: 1 });
calendarEventSchema.index({ date: 1, createdBy: 1 });

// Virtual for formatted date
calendarEventSchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

module.exports = mongoose.model('Calendar', calendarEventSchema);

