const { promisePool } = require('../config/database');

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Private (Student)
exports.createRegistration = async (req, res, next) => {
  try {
    const { eventId, fullName, email, phoneNumber, paymentScreenshot } = req.body;

    // Validation
    if (!eventId || !fullName || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if already registered
    const [existing] = await promisePool.query(
      'SELECT registration_id FROM registrations WHERE student_id = ? AND event_id = ?',
      [req.user.user_id, eventId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // Check event capacity
    const [events] = await promisePool.query(
      'SELECT max_participants, current_participants, event_date, status FROM events WHERE event_id = ?',
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = events[0];

    if (event.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Event is not open for registration'
      });
    }

    if (event.current_participants >= event.max_participants) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Create registration
    const [result] = await promisePool.query(`
      INSERT INTO registrations 
      (student_id, event_id, full_name, student_email, phone_number, payment_screenshot)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.user_id, eventId, fullName, email, phoneNumber, paymentScreenshot || null]);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        registrationId: result.insertId
      }
    });

  } catch (error) {
    console.error('Create registration error:', error);
    next(error);
  }
};

// @desc    Get my registrations
// @route   GET /api/registrations/my
// @access  Private (Student)
exports.getMyRegistrations = async (req, res, next) => {
  try {
    const [registrations] = await promisePool.query(`
      SELECT 
        r.*,
        e.event_name,
        e.society_name,
        e.venue,
        e.event_date,
        e.time_slot,
        e.description,
        e.status as event_status
      FROM registrations r
      INNER JOIN events e ON r.event_id = e.event_id
      WHERE r.student_id = ?
      ORDER BY e.event_date DESC, r.registered_at DESC
    `, [req.user.user_id]);

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });

  } catch (error) {
    console.error('Get my registrations error:', error);
    next(error);
  }
};

// @desc    Get registrations for an event
// @route   GET /api/registrations/event/:eventId
// @access  Private (Admin or Society)
exports.getEventRegistrations = async (req, res, next) => {
  try {
    // Check if user is authorized
    if (req.user.role === 'society') {
      const [events] = await promisePool.query(
        'SELECT society_id FROM events WHERE event_id = ?',
        [req.params.eventId]
      );

      if (events.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      if (events[0].society_id !== req.user.user_id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view registrations for this event'
        });
      }
    }

    const [registrations] = await promisePool.query(`
      SELECT 
        r.*,
        u.roll_number,
        u.email as user_email
      FROM registrations r
      LEFT JOIN users u ON r.student_id = u.user_id
      WHERE r.event_id = ?
      ORDER BY r.registered_at DESC
    `, [req.params.eventId]);

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });

  } catch (error) {
    console.error('Get event registrations error:', error);
    next(error);
  }
};

// @desc    Update registration status
// @route   PUT /api/registrations/:id/status
// @access  Private (Admin or Society)
exports.updateRegistrationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['registered', 'attended', 'missed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get registration
    const [registrations] = await promisePool.query(`
      SELECT r.registration_id, r.event_id, e.society_id
      FROM registrations r
      INNER JOIN events e ON r.event_id = e.event_id
      WHERE r.registration_id = ?
    `, [req.params.id]);

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check authorization
    if (req.user.role === 'society' && registrations[0].society_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this registration'
      });
    }

    await promisePool.query(
      'UPDATE registrations SET registration_status = ? WHERE registration_id = ?',
      [status, req.params.id]
    );

    res.json({
      success: true,
      message: `Registration status updated to ${status}`
    });

  } catch (error) {
    console.error('Update registration status error:', error);
    next(error);
  }
};

// @desc    Cancel registration
// @route   DELETE /api/registrations/:id
// @access  Private (Student - own registration or Admin)
exports.cancelRegistration = async (req, res, next) => {
  try {
    const [registrations] = await promisePool.query(
      'SELECT student_id, event_id FROM registrations WHERE registration_id = ?',
      [req.params.id]
    );

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && registrations[0].student_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this registration'
      });
    }

    // Check if event has already started
    const [events] = await promisePool.query(
      'SELECT event_date FROM events WHERE event_id = ?',
      [registrations[0].event_id]
    );

    if (new Date(events[0].event_date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel registration for past events'
      });
    }

    await promisePool.query(
      'DELETE FROM registrations WHERE registration_id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Registration cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel registration error:', error);
    next(error);
  }
};