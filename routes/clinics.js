const express = require('express');
const {
  getClinics,
  getClinic,
  createClinic,
  updateClinic,
  deleteClinic,
  getClinicStatistics
} = require('../controllers/clinicController');
const { protect, authorize } = require('../middleware/auth');
const { validateCompany, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// General clinic routes
router.get('/', validatePagination, getClinics);
router.get('/statistics', authorize('owner', 'admin', 'accountant'), getClinicStatistics);
router.get('/:id', validateObjectId('id'), getClinic);

// Owner/Admin only routes
router.post('/', authorize('owner', 'admin'), validateCompany, createClinic);
router.put('/:id', authorize('owner', 'admin'), validateObjectId('id'), updateClinic);
router.delete('/:id', authorize('owner', 'admin'), validateObjectId('id'), deleteClinic);

module.exports = router;
