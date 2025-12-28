const express = require('express');
const {
  adminLogin,
  getPendingCompanies,
  getAllCompanies,
  getCompanyDetails,
  approveCompany,
  rejectCompany,
  getDashboardStats,
  changeCompanyAccountStatus,
  updateCompanyAndAccountStatus,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getCompanyUsers,
  getCompanyUpdateRequests,
  getCompanyUpdateRequest,
  approveCompanyUpdateRequest,
  rejectCompanyUpdateRequest
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', adminLogin);

// Protected routes (require admin authentication)
router.use(protectAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Company management
router.get('/companies', getAllCompanies);
router.get('/companies/pending', getPendingCompanies);
router.get('/companies/:id', getCompanyDetails);
router.get('/companies/:id/users', getCompanyUsers);
router.patch('/companies/:id/approve', approveCompany);
router.patch('/companies/:id/reject', rejectCompany);
router.patch('/companies/:id/status', changeCompanyAccountStatus);
router.patch('/companies/:id/update-status', updateCompanyAndAccountStatus);

// Company update requests routes
router.get('/company-update-requests', getCompanyUpdateRequests);
router.get('/company-update-requests/:id', getCompanyUpdateRequest);
router.patch('/company-update-requests/:id/approve', approveCompanyUpdateRequest);
router.patch('/company-update-requests/:id/reject', rejectCompanyUpdateRequest);

// Admin management routes
router.get('/admins', getAllAdmins);
router.post('/admins', createAdmin);
router.patch('/admins/:id', updateAdmin);
router.delete('/admins/:id', deleteAdmin);

module.exports = router;
