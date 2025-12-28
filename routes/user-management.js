const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCompanyUsers,
  getUserDetails,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
  updateSalesmanForecast
} = require('../controllers/userManagementController');

// All routes require authentication
router.use(protect);

// User management routes
router.route('/')
  .get(getCompanyUsers)
  .post(createUser);

router.route('/:id')
  .get(getUserDetails)
  .patch(updateUser)
  .delete(deleteUser);

router.patch('/:id/toggle-status', toggleUserStatus);
router.post('/:id/reset-password', resetUserPassword);
router.post('/:id/forecast', updateSalesmanForecast);

module.exports = router;

