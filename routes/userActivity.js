const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const {
  trackLogin,
  trackPageVisit,
  trackLogout,
  getUserActivity,
  getCompanyActivities
} = require('../controllers/userActivityController')

// All routes require authentication
router.use(protect)

// Track login (called after successful login)
router.post('/track-login', trackLogin)

// Track page visit
router.post('/track-page', trackPageVisit)

// Track logout
router.post('/track-logout', trackLogout)

// Get user activity history
router.get('/user/:userId', getUserActivity)

// Get all company activities (owner/admin only)
router.get('/company', getCompanyActivities)

module.exports = router

