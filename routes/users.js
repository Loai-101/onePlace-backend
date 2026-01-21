const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserPermissions,
  getUsersByCompany,
  getUserStatistics
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { enforceCompanyContext } = require('../middleware/companyIsolation');
const { validateUser, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Owner/Admin only routes - STRICT COMPANY ISOLATION
router.get('/', enforceCompanyContext, authorize('owner', 'admin'), validatePagination, getUsers);
router.get('/statistics', enforceCompanyContext, authorize('owner', 'admin'), getUserStatistics);
router.get('/company/:companyId', enforceCompanyContext, authorize('owner', 'admin', 'accountant', 'salesman'), validateObjectId('companyId'), getUsersByCompany);
router.get('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), getUser);
router.post('/', enforceCompanyContext, authorize('owner', 'admin'), validateUser, createUser);
router.put('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), updateUser);
router.delete('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), deleteUser);
router.patch('/:id/permissions', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), updateUserPermissions);

module.exports = router;
