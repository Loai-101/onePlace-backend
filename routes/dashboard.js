const express = require('express')
const { protect, authorize } = require('../middleware/auth')
const { getSalesmanDashboard } = require('../controllers/salesmanDashboardController')

const router = express.Router()

// All routes require authentication
router.use(protect)

// Salesman dashboard
router.get('/salesman', authorize('salesman'), getSalesmanDashboard)

module.exports = router

