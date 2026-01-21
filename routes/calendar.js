const express = require('express');
const router = express.Router();
const {
  getCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  sendReport
} = require('../controllers/calendarController');
const { protect, authorize } = require('../middleware/auth');
const { enforceCompanyContext } = require('../middleware/companyIsolation');
const { validateObjectId } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

// All routes - STRICT COMPANY ISOLATION
router.get('/', enforceCompanyContext, authorize('owner', 'admin', 'salesman'), getCalendarEvents);
router.get('/:id', enforceCompanyContext, validateObjectId('id'), authorize('owner', 'admin', 'salesman'), getCalendarEvent);
router.post('/', enforceCompanyContext, authorize('owner', 'admin', 'salesman'), createCalendarEvent);
router.put('/:id', enforceCompanyContext, validateObjectId('id'), authorize('owner', 'admin', 'salesman'), updateCalendarEvent);
router.delete('/:id', enforceCompanyContext, validateObjectId('id'), authorize('owner', 'admin', 'salesman'), deleteCalendarEvent);
router.post('/report', enforceCompanyContext, authorize('salesman'), sendReport);

module.exports = router;

