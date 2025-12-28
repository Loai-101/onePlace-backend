const express = require('express');
const {
  getCompanies,
  getCompany,
  getMyCompany,
  updateMyCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanySalesHistory,
  updateCompanyPayment,
  addEmployee,
  updateEmployee,
  removeEmployee,
  registerCompany,
  getDatabaseStatus
} = require('../controllers/companyController');
const { protect, authorize, hasPermission } = require('../middleware/auth');
const { validateCompany, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Public routes (no authentication required)
router.get('/status', getDatabaseStatus);
router.post('/register', registerCompany);

// All other routes are protected
router.use(protect);

// Current user's company routes (must be before /:id route)
router.get('/me', getMyCompany);
router.put('/me', authorize('owner', 'admin'), updateMyCompany);

// General company routes
router.get('/', validatePagination, getCompanies);
router.get('/:id', validateObjectId('id'), getCompany);
router.get('/:id/sales-history', validateObjectId('id'), validatePagination, getCompanySalesHistory);

// Owner/Admin only routes
router.post('/', authorize('owner', 'admin'), validateCompany, createCompany);
router.put('/:id', authorize('owner', 'admin'), validateObjectId('id'), updateCompany);
router.delete('/:id', authorize('owner', 'admin'), validateObjectId('id'), deleteCompany);

// Payment management (Owner/Admin/Accountant)
router.patch('/:id/payment', hasPermission('write_orders'), validateObjectId('id'), updateCompanyPayment);

// Employee management (Owner/Admin)
router.post('/:id/employees', authorize('owner', 'admin'), validateObjectId('id'), addEmployee);
router.put('/:id/employees/:employeeId', authorize('owner', 'admin'), validateObjectId('id'), updateEmployee);
router.delete('/:id/employees/:employeeId', authorize('owner', 'admin'), validateObjectId('id'), removeEmployee);

module.exports = router;
