const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');

// @desc    Get all pending proposals
// @route   GET /api/admin/proposals
// @access  Private (Admin)
exports.getPendingProposals = async (req, res) => {
  try {
    const [proposals] = await promisePool.query(
      `SELECT * FROM v_pending_proposals ORDER BY submitted_at DESC`
    );

    res.json({
      success: true,
      count: proposals.length,
      data: proposals
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

// @desc    Approve a proposal
// @route   PUT /api/admin/proposals/:id/approve
// @access  Private (Admin)
exports.approveProposal = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();

    const proposalId = req.params.id;

    // Get proposal details
    const [proposals] = await connection.query(
      `SELECT * FROM proposals WHERE proposal_id = ? AND status = 'pending'`,
      [proposalId]
    );

    if (proposals.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Proposal not found or already processed' 
      });
    }

    const proposal = proposals[0];

    // Get society name
    const [societyRows] = await connection.query(
      'SELECT society_name FROM users WHERE user_id = ?',
      [proposal.society_id]
    );
    const societyName = societyRows.length ? societyRows[0].society_name : null;

    // Update proposal status
    await connection.query(
      `UPDATE proposals 
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = ? 
       WHERE proposal_id = ?`,
      [req.user.user_id, proposalId]
    );

    // Create event from approved proposal
    const [eventResult] = await connection.query(
      `INSERT INTO events (proposal_id, society_id, event_name, society_name, venue, event_date, time_slot, budget, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proposalId,
        proposal.society_id,
        proposal.event_name,
        societyName,
        proposal.venue,
        proposal.requested_date,
        proposal.time_slot,
        proposal.budget,
        proposal.proposal_details
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Proposal approved and event created successfully',
      data: {
        proposalId: proposalId,
        eventId: eventResult.insertId
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Approve Proposal Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error approving proposal',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// @desc    Reject a proposal
// @route   PUT /api/admin/proposals/:id/reject
// @access  Private (Admin)
exports.rejectProposal = async (req, res) => {
  try {
    const proposalId = req.params.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required' 
      });
    }

    const [result] = await promisePool.query(
      `UPDATE proposals 
       SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW(), reviewed_by = ? 
       WHERE proposal_id = ? AND status = 'pending'`,
      [rejectionReason, req.user.user_id, proposalId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proposal not found or already processed' 
      });
    }

    res.json({
      success: true,
      message: 'Proposal rejected successfully'
    });
  } catch (error) {
    console.error('Reject Proposal Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error rejecting proposal',
      error: error.message 
    });
  }
};

// @desc    Get all events
// @route   GET /api/admin/events
// @access  Private (Admin)
exports.getAllEvents = async (req, res) => {
  try {
    const [events] = await promisePool.query(
      `SELECT 
        e.*,
        COUNT(r.registration_id) as total_registrations
       FROM events e
       LEFT JOIN registrations r ON e.event_id = r.event_id
       GROUP BY e.event_id
       ORDER BY e.event_date DESC`
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

// @desc    Get budget information
// @route   GET /api/admin/budget
// @access  Private (Admin)
exports.getBudgetInfo = async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    const [budget] = await promisePool.query(
      `SELECT total_budget, allocated_budget, remaining_budget 
       FROM budget_settings 
       WHERE month_year = ?`,
      [currentMonth]
    );

    if (budget.length === 0) {
      // Create default budget for current month
      await promisePool.query(
        `INSERT INTO budget_settings (total_budget, allocated_budget, budget_pin, month_year, updated_by)
         VALUES (50000.00, 0.00, ?, ?, ?)`,
        [await bcrypt.hash(process.env.DEFAULT_BUDGET_PIN, 10), currentMonth, req.user.user_id]
      );

      return res.json({
        success: true,
        data: {
          total_budget: 50000.00,
          allocated_budget: 0.00,
          remaining_budget: 50000.00
        }
      });
    }
    res.json({
      success: true,
      data: budget[0],
    });
    });
  } catch (error) {
    console.error('Get Budget Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching budget information',
      error: error.message 
    });
  }
};

// @desc    Update total budget
// @route   PUT /api/admin/budget
// @access  Private (Admin)
exports.updateBudget = async (req, res) => {
  try {
    const { newBudget, pin } = req.body;

    if (!newBudget || !pin) {
      return res.status(400).json({ 
        success: false, 
        message: 'New budget amount and PIN are required' 
      });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    const [settings] = await promisePool.query(
      'SELECT budget_pin FROM budget_settings WHERE month_year = ?',
      [currentMonth]
    );

    if (settings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Budget settings not found' 
      });
    }

    const isValidPin = await bcrypt.compare(pin, settings[0].budget_pin);
    const isValidPin = await bcrypt.compare(pin, settings,[object Object],budget_pin);

    if (!isValidPin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid PIN' 
      });
    }

    // Update budget
    await promisePool.query(
      `UPDATE budget_settings 
       SET total_budget = ?, updated_by = ? 
       WHERE month_year = ?`,
      [newBudget, req.user.user_id, currentMonth]
    );

    res.json({
      success: true,
      message: 'Budget updated successfully'
    });
  } catch (error) {
    console.error('Update Budget Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating budget',
      error: error.message 
    });
  }
};