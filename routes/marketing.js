const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { enforceCompanyContext } = require('../middleware/companyIsolation');
const {
  getMarketingDashboard,
  downloadMarketingData
} = require('../controllers/marketingController');

// All routes require authentication and owner/admin role
router.use(protect);
router.use(authorize('owner', 'admin'));

// @route   GET /api/marketing/dashboard
// @desc    Get marketing dashboard data
// @access  Private (Owner/Admin) - STRICT COMPANY ISOLATION
router.get('/dashboard', enforceCompanyContext, getMarketingDashboard);

// @route   GET /api/marketing/download
// @desc    Download marketing staff data as Excel
// @access  Private (Owner/Admin) - STRICT COMPANY ISOLATION
router.get('/download', enforceCompanyContext, downloadMarketingData);

module.exports = router;

