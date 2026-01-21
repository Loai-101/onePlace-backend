const express = require('express');
const multer = require('multer');
const {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  bulkImportCategories
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { enforceCompanyContext } = require('../middleware/companyIsolation');
const { validateCategory, validateObjectId, validatePagination } = require('../middleware/validation');

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

// All routes require authentication (categories are company-specific)
router.use(protect);

// Public authenticated routes (all users with company can access) - STRICT COMPANY ISOLATION
router.get('/', enforceCompanyContext, getCategories);
router.get('/tree', enforceCompanyContext, getCategoryTree);
router.get('/:id', enforceCompanyContext, validateObjectId('id'), getCategory);
router.get('/:id/products', enforceCompanyContext, validateObjectId('id'), validatePagination, getCategoryProducts);

// Owner/Admin only routes - STRICT COMPANY ISOLATION
router.post('/', enforceCompanyContext, authorize('owner', 'admin'), validateCategory, createCategory);
router.post('/bulk-import', enforceCompanyContext, authorize('owner', 'admin'), uploadExcel, bulkImportCategories);
router.put('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), updateCategory);
router.delete('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), deleteCategory);

module.exports = router;
