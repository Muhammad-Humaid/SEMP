const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createRegistration,
  getMyRegistrations,
  getEventRegistrations,
  updateRegistrationStatus,
  cancelRegistration
} = require('../controllers/registrationController');

router.post('/', protect, authorize('student'), createRegistration);
router.get('/my', protect, authorize('student'), getMyRegistrations);
router.get('/event/:eventId', protect, authorize('admin', 'society'), getEventRegistrations);
router.put('/:id/status', protect, authorize('admin', 'society'), updateRegistrationStatus);
router.delete('/:id', protect, cancelRegistration);

module.exports = router;