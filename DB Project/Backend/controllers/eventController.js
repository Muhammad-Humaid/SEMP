const { promisePool } = require('../config/database');

// @desc    Get all upcoming events
// @route   GET /api/events/upcoming
// @access  Public
exports.getUpcomingEvents = async (req, res, next) => {
  try {
    const [events] = await promisePool.query(`
      SELECT 
        e.*,
        (e.max_participants - e.current_participants) as available_seats,
        COUNT(r.registration_id) as total_registrations
      FROM events e
      LEFT JOIN registrations r ON e.event_id = r.event_id
      WHERE e.status = 'upcoming' AND e.event_date >= CURDATE()
      GROUP BY e.event_id
      ORDER BY e.event_date ASC, e.time_slot ASC
    `);

    res.json({
      success: true,
      count: events.length,
      data: events
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    next(error);
  }
};

// @desc    Get all events (with filters)
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res, next) => {
  try {
    const { status, societyId, search } = req.query;

    let query = `
      SELECT 
        e.*,
        (e.max_participants - e.current_participants) as available_seats,
        COUNT(r.registration_id) as total_registrations
      FROM events e
      LEFT JOIN registrations r ON e.event_id = r.event_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }

    if (societyId) {
      query += ' AND e.society_id = ?';
      params.push(societyId);
    }

    if (search) {
      query += ' AND (e.event_name LIKE ? OR e.society_name LIKE ? OR e.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' GROUP BY e.event_id ORDER BY e.event_date DESC';

    const [events] = await promisePool.query(query, params);

    res.json({
      success: true,
      count: events.length,
      data: events
    });

  } catch (error) {
    console.error('Get events error:', error);
    next(error);
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res, next) => {
  try {
    const [events] = await promisePool.query(`
      SELECT 
        e.*,
        (e.max_participants - e.current_participants) as available_seats,
        u.email as society_email,
        u.phone_number as society_phone
      FROM events e
      LEFT JOIN users u ON e.society_id = u.user_id
      WHERE e.event_id = ?
    `, [req.params.id]);

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get registrations count by status
    const [stats] = await promisePool.query(`
      SELECT 
        registration_status,
        COUNT(*) as count
      FROM registrations
      WHERE event_id = ?
      GROUP BY registration_status
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...events[0],
        registrationStats: stats
      }
    });

  } catch (error) {
    console.error('Get event error:', error);
    next(error);
  }
};

// @desc    Get events by society
// @route   GET /api/events/society/:societyId
// @access  Private
exports.getEventsBySociety = async (req, res, next) => {
  try {
    const [events] = await promisePool.query(`
      SELECT 
        e.*,
        (e.max_participants - e.current_participants) as available_seats,
        COUNT(r.registration_id) as total_registrations
      FROM events e
      LEFT JOIN registrations r ON e.event_id = r.event_id
      WHERE e.society_id = ?
      GROUP BY e.event_id
      ORDER BY e.event_date DESC
    `, [req.params.societyId]);

    res.json({
      success: true,
      count: events.length,
      data: events
    });

  } catch (error) {
    console.error('Get society events error:', error);
    next(error);
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Admin or Society)
exports.updateEvent = async (req, res, next) => {
  try {
    const { eventName, venue, eventDate, timeSlot, description, maxParticipants, status } = req.body;

    // Get event
    const [events] = await promisePool.query(
      'SELECT society_id FROM events WHERE event_id = ?',
      [req.params.id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && events[0].society_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (eventName) {
      updates.push('event_name = ?');
      params.push(eventName);
    }
    if (venue) {
      updates.push('venue = ?');
      params.push(venue);
    }
    if (eventDate) {
      updates.push('event_date = ?');
      params.push(eventDate);
    }
    if (timeSlot) {
      updates.push('time_slot = ?');
      params.push(timeSlot);
    }
    if (description) {
      updates.push('description = ?');
      params.push(description);
    }
    if (maxParticipants) {
      updates.push('max_participants = ?');
      params.push(maxParticipants);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(req.params.id);

    await promisePool.query(
      `UPDATE events SET ${updates.join(', ')} WHERE event_id = ?`,
      params
    );

    res.json({
      success: true,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Update event error:', error);
    next(error);
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Admin)
exports.deleteEvent = async (req, res, next) => {
  try {
    const [events] = await promisePool.query(
      'SELECT event_id FROM events WHERE event_id = ?',
      [req.params.id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await promisePool.query('DELETE FROM events WHERE event_id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    next(error);
  }
};

// @desc    Get event statistics
// @route   GET /api/events/:id/stats
// @access  Private (Admin or Society)
exports.getEventStats = async (req, res, next) => {
  try {
    const [event] = await promisePool.query(
      'SELECT event_id, society_id, max_participants, current_participants FROM events WHERE event_id = ?',
      [req.params.id]
    );

    if (event.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && event[0].society_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Get detailed stats
    const [stats] = await promisePool.query(`
      SELECT 
        COUNT(*) as total_registrations,
        SUM(CASE WHEN registration_status = 'registered' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN registration_status = 'attended' THEN 1 ELSE 0 END) as attended,
        SUM(CASE WHEN registration_status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN registration_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM registrations
      WHERE event_id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        eventId: event[0].event_id,
        maxParticipants: event[0].max_participants,
        currentParticipants: event[0].current_participants,
        availableSeats: event[0].max_participants - event[0].current_participants,
        ...stats[0]
      }
    });

  } catch (error) {
    console.error('Get event stats error:', error);
    next(error);
  }
};