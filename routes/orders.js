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
const { validateOrder, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// General order routes
router.get('/', validatePagination, getOrders);
router.get('/statistics', authorize('owner', 'admin', 'accountant'), getOrderStatistics);
router.get('/company/:companyId', validateObjectId('companyId'), getOrdersByCompany);
router.get('/:id', validateObjectId('id'), getOrder);
router.post('/', validateOrder, createOrder);
router.put('/:id', validateObjectId('id'), updateOrder);
router.patch('/:id/status', validateObjectId('id'), updateOrderStatus);

// Owner/Admin only routes
router.delete('/:id', authorize('owner', 'admin'), validateObjectId('id'), deleteOrder);

module.exports = router;
