const express = require('express');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrdersByCompany,
  getOrderStatistics
} = require('../controllers/orderController');
const { protect, authorize, hasPermission } = require('../middleware/auth');
const { enforceCompanyContext } = require('../middleware/companyIsolation');
const { validateOrder, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// General order routes - STRICT COMPANY ISOLATION
router.get('/', enforceCompanyContext, validatePagination, getOrders);
router.get('/statistics', enforceCompanyContext, authorize('owner', 'admin', 'accountant'), getOrderStatistics);
router.get('/company/:companyId', enforceCompanyContext, validateObjectId('companyId'), getOrdersByCompany);
router.get('/:id', enforceCompanyContext, validateObjectId('id'), getOrder);
router.post('/', enforceCompanyContext, validateOrder, createOrder);
router.put('/:id', enforceCompanyContext, validateObjectId('id'), updateOrder);
router.patch('/:id/status', enforceCompanyContext, validateObjectId('id'), updateOrderStatus);

// Owner/Admin only routes - STRICT COMPANY ISOLATION
router.delete('/:id', enforceCompanyContext, authorize('owner', 'admin'), validateObjectId('id'), deleteOrder);

module.exports = router;
