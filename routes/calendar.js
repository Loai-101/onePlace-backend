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
const { validateObjectId } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

router.get('/', authorize('owner', 'admin', 'salesman'), getCalendarEvents);
router.get('/:id', validateObjectId('id'), authorize('owner', 'admin', 'salesman'), getCalendarEvent);
router.post('/', authorize('owner', 'admin', 'salesman'), createCalendarEvent);
router.put('/:id', validateObjectId('id'), authorize('owner', 'admin', 'salesman'), updateCalendarEvent);
router.delete('/:id', validateObjectId('id'), authorize('owner', 'admin', 'salesman'), deleteCalendarEvent);
router.post('/report', authorize('salesman'), sendReport);

module.exports = router;

