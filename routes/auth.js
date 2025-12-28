const express = require('express');
const {
  register,
  registerCompany,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  createUser,
  getMyUsers,
  updateUserPassword,
  forgotPassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { validateUser, validateCreateUser, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateUser, register);
router.post('/register-company', registerCompany);
router.post('/login', validateLogin, login);
router.post('/forgotpassword', forgotPassword);

// Protected routes
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

// Owner-only routes
router.post('/create-user', protect, authorize('owner'), validateCreateUser, createUser);
router.get('/my-users', protect, authorize('owner'), getMyUsers);
router.put('/update-user-password/:userId', protect, updateUserPassword);

module.exports = router;
