const { promisePool } = require('../config/database');

// @desc    Submit new proposal
// @route   POST /api/society/proposals
// @access  Private (Society)
exports.submitProposal = async (req, res) => {
  try {
    const { eventName, venue, requestedDate, timeSlot, budget, proposalDetails } = req.body;

    // Validate required fields
    if (!eventName || !venue || !requestedDate || !timeSlot || !budget || !proposalDetails) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Insert proposal
    const [result] = await promisePool.query(
      `INSERT INTO proposals (society_id, event_name, venue, requested_date, time_slot, budget, proposal_details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, eventName, venue, requestedDate, timeSlot, budget, proposalDetails]
    );

    res.status(201).json({
      success: true,
      message: 'Proposal submitted successfully',
      data: {
        proposalId: result.insertId
      }
    });
  } catch (error) {
    console.error('Submit Proposal Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting proposal',
      error: error.message 
    });
  }
};

// @desc    Get society's proposals
// @route   GET /api/society/proposals
// @access  Private (Society)
exports.getMyProposals = async (req, res) => {
  try {
    const [proposals] = await promisePool.query(
      `SELECT * FROM proposals 
       WHERE society_id = ? 
       ORDER BY submitted_at DESC`,
      [req.user.user_id]
    );

    // Separate by status
    const pending = proposals.filter(p => p.status === 'pending');
    const approved = proposals.filter(p => p.status === 'approved');
    const rejected = proposals.filter(p => p.status === 'rejected');

    res.json({
      success: true,
      data: {
        all: proposals,
        pending,
        approved,
        rejected
      }
    });
  } catch (error) {
    console.error('Get Proposals Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching proposals',
      error: error.message 
    });
  }
};

// @desc    Get society's approved events
// @route   GET /api/society/events
// @access  Private (Society)
exports.getMyEvents = async (req, res) => {
  try {
    const [events] = await promisePool.query(
      `SELECT 
        e.*,
        COUNT(r.registration_id) as total_registrations
       FROM events e
       LEFT JOIN registrations r ON e.event_id = r.event_id
       WHERE e.society_id = ?
       GROUP BY e.event_id
       ORDER BY e.event_date DESC`,
      [req.user.user_id]
    );

    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Get Events Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching events',
      error: error.message 
    });
  }
};

// @desc    Get registrations for society's event
// @route   GET /api/society/events/:eventId/registrations
// @access  Private (Society)
exports.getEventRegistrations = async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Verify event belongs to this society
    const [event] = await promisePool.query(
      'SELECT event_id FROM events WHERE event_id = ? AND society_id = ?',
      [eventId, req.user.user_id]
    );

    if (event.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found or unauthorized' 
      });
    }

    // Get registrations
    const [registrations] = await promisePool.query(
      `SELECT * FROM v_student_registrations 
       WHERE event_id = ?
       ORDER BY registered_at DESC`,
      [eventId]
    );

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('Get Registrations Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching registrations',
      error: error.message 
    });
  }
};