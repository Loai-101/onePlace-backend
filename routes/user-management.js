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
  updateSalesmanForecast,
  getPasswordResetRequests,
  completePasswordResetRequest,
  rejectPasswordResetRequest
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

// Password reset request routes
router.get('/password-reset-requests', getPasswordResetRequests);
router.put('/password-reset-requests/:id/complete', completePasswordResetRequest);
router.put('/password-reset-requests/:id/reject', rejectPasswordResetRequest);

module.exports = router;

