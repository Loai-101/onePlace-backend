const multer = require('multer');
const { uploadImage, uploadPdf } = require('../utils/supabase');

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Configure multer for PDF uploads
const uploadPdfMulter = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Middleware for single file upload
const uploadSingle = upload.single('image');
const uploadPdfSingle = uploadPdfMulter.single('file');

/**
 * Upload image to Supabase Storage
 * @route POST /api/upload/image
 * @access Private (Owner/Admin)
 */
const uploadImageToSupabase = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Supabase Storage
    const folder = req.body.folder || 'brands';
    const result = await uploadImage(req.file.buffer, req.file.originalname, folder);

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
        public_id: result.path, // Use path as public_id equivalent
        width: null, // Supabase doesn't provide dimensions directly
        height: null
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
};

/**
 * Upload PDF to Supabase Storage
 * @route POST /api/upload/pdf
 * @access Private (Accountant/Owner/Admin)
 */
const uploadPdfToSupabase = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file provided'
      });
    }

    // Get folder from body (sent via FormData)
    const folder = req.body?.folder || 'invoices';
    
    console.log('Uploading PDF:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      folder: folder
    });

    // Upload to Supabase Storage
    const result = await uploadPdf(req.file.buffer, req.file.originalname, folder);

    console.log('PDF uploaded successfully:', result.url);

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
        public_id: result.path // Use path as public_id equivalent
      }
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload PDF',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  uploadImageToSupabase,
  uploadPdfToSupabase,
  uploadImageToCloudinary: uploadImageToSupabase, // Keep old name for backward compatibility
  uploadPdfToCloudinary: uploadPdfToSupabase, // Keep old name for backward compatibility
  uploadSingle,
  uploadPdfSingle
};

