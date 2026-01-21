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
const { enforceCompanyContext } = require('../middleware/companyIsolation');
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

// All routes require authentication (products are company-specific)
router.use(protect);

// Public authenticated routes (all users with company can access) - STRICT COMPANY ISOLATION
router.get('/featured', enforceCompanyContext, getFeaturedProducts);
router.get('/', enforceCompanyContext, validatePagination, validateSearch, getProducts);
router.get('/:id', enforceCompanyContext, validateObjectId('id'), getProduct);

// Owner/Admin only routes - STRICT COMPANY ISOLATION
router.get('/low-stock', enforceCompanyContext, authorize('owner', 'admin'), getLowStockProducts);
router.post('/', enforceCompanyContext, authorize('owner', 'admin'), validateProduct, createProduct);
router.post('/bulk-import', enforceCompanyContext, authorize('owner', 'admin'), uploadExcel, bulkImportProducts);
router.put('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), updateProduct);
router.patch('/:id/stock', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), updateStock);
router.delete('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), deleteProduct);

module.exports = router;
