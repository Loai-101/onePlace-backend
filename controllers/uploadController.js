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
    // Whitelist allowed image MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
    }
    
    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Invalid file extension'), false);
    }
    
    cb(null, true);
  }
});

// Configure multer for PDF uploads
const uploadPdfMulter = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'), false);
    }
    
    // Check file extension
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (fileExtension !== '.pdf') {
      return cb(new Error('Invalid file extension. Only PDF files are allowed'), false);
    }
    
    // Sanitize filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    file.originalname = sanitizedFilename;
    
    cb(null, true);
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

