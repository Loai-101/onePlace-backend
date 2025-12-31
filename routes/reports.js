const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  uploadReport,
  createPdfReport,
  getReports,
  getReport,
  deleteReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

// Configure multer for file uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF and common document types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/rtf'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only PDF, Word, and text files are allowed'), false);
    }
    
    cb(null, true);
  }
});

// All routes require authentication
router.use(protect);

// Upload report file - Salesman only
router.post('/upload', authorize('salesman'), upload.single('file'), uploadReport);

// Create PDF report - Salesman only
router.post('/pdf', authorize('salesman'), createPdfReport);

// Get all reports - Owner and Admin
router.get('/', authorize('owner', 'admin'), getReports);

// Get single report - Owner, Admin, or Salesman who created it
router.get('/:id', validateObjectId('id'), getReport);

// Delete report - Owner and Admin
router.delete('/:id', validateObjectId('id'), authorize('owner', 'admin'), deleteReport);

module.exports = router;

