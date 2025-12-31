const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  salesman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Salesman is required']
  },
  salesmanName: {
    type: String,
    required: [true, 'Salesman name is required'],
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required']
  },
  title: {
    type: String,
    required: [true, 'Report title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [10000, 'Description cannot exceed 10000 characters']
  },
  reportType: {
    type: String,
    enum: ['file', 'pdf'],
    required: [true, 'Report type is required']
  },
  fileUrl: {
    type: String,
    required: function() {
      return this.reportType === 'file'
    },
    trim: true
  },
  fileName: {
    type: String,
    required: function() {
      return this.reportType === 'file'
    },
    trim: true
  },
  fileSize: {
    type: Number,
    required: function() {
      return this.reportType === 'file'
    }
  },
  pdfUrl: {
    type: String,
    required: function() {
      return this.reportType === 'pdf'
    },
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
reportSchema.index({ salesman: 1, createdAt: -1 });
reportSchema.index({ company: 1, createdAt: -1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);

