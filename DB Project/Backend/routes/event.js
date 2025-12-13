const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getUpcomingEvents,
  getEvents,
  getEvent,
  getEventsBySociety,
  updateEvent,
  deleteEvent,
  getEventStats
} = require('../controllers/eventController');

router.get('/upcoming', getUpcomingEvents);
router.get('/', getEvents);
router.get('/:id', getEvent);
router.get('/society/:societyId', protect, getEventsBySociety);
router.get('/:id/stats', protect, authorize('admin', 'society'), getEventStats);
router.put('/:id', protect, authorize('admin', 'society'), updateEvent);
router.delete('/:id', protect, authorize('admin'), deleteEvent);

module.exports = router;