const express = require('express');
const multer = require('multer');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getFeaturedProducts,
  getLowStockProducts,
  bulkImportProducts
} = require('../controllers/productController');
const { protect, authorize, hasPermission } = require('../middleware/auth');
const { validateProduct, validateObjectId, validatePagination, validateSearch } = require('../middleware/validation');

// Configure multer for Excel file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (allowedMimes.includes(file.mimetype) || 
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls') ||
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) or CSV files are allowed'), false);
    }
  }
});

const uploadExcel = upload.single('excelFile');

const router = express.Router();

// Public routes (must be defined before protected routes to avoid route conflicts)
router.get('/featured', getFeaturedProducts);
router.get('/', validatePagination, validateSearch, getProducts);
router.get('/:id', validateObjectId('id'), getProduct);

// Protected routes - all routes below require authentication
router.use(protect);

// Owner/Admin only routes
router.get('/low-stock', authorize('owner', 'admin'), getLowStockProducts);
router.post('/', authorize('owner', 'admin'), validateProduct, createProduct);
router.post('/bulk-import', authorize('owner', 'admin'), uploadExcel, bulkImportProducts);
router.put('/:id', authorize('owner', 'admin'), validateObjectId('id'), updateProduct);
router.patch('/:id/stock', authorize('owner', 'admin'), validateObjectId('id'), updateStock);
router.delete('/:id', authorize('owner', 'admin'), validateObjectId('id'), deleteProduct);

module.exports = router;
