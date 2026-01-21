const express = require('express');
const multer = require('multer');
const {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  toggleAccountStatus,
  getMedicalBranches,
  getSpecializations,
  bulkImportAccounts
} = require('../controllers/accountController');
const { protect, authorize } = require('../middleware/auth');
const { enforceCompanyContext } = require('../middleware/companyIsolation');

// Configure multer for Excel file uploads
const storage = multer.memoryStorage();
const uploadExcel = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    
    const isValidType = allowedTypes.includes(file.mimetype) ||
      allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
    
    if (isValidType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) or CSV files are allowed.'), false);
    }
  }
});

const router = express.Router();

// Public routes for getting branches and specializations
router.get('/branches', protect, getMedicalBranches);
router.get('/specializations/:branch', protect, getSpecializations);

// Account CRUD routes - STRICT COMPANY ISOLATION
// enforceCompanyContext ensures all operations are scoped to user's company
router.route('/')
  .get(protect, enforceCompanyContext, authorize('owner', 'admin', 'salesman', 'accountant'), getAccounts)
  .post(protect, enforceCompanyContext, authorize('owner', 'admin'), createAccount);

router.route('/:id')
  .get(protect, enforceCompanyContext, authorize('owner', 'admin', 'salesman', 'accountant'), getAccount)
  .put(protect, enforceCompanyContext, authorize('owner', 'admin'), updateAccount)
  .delete(protect, enforceCompanyContext, authorize('owner', 'admin'), deleteAccount);

router.patch('/:id/toggle-status', protect, enforceCompanyContext, authorize('owner', 'admin'), toggleAccountStatus);

// Bulk import route (must be before /:id route)
router.post('/bulk-import', protect, enforceCompanyContext, authorize('owner', 'admin'), uploadExcel.single('file'), bulkImportAccounts);

module.exports = router;

