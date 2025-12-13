const { promisePool } = require('../config/database');

// @desc    Submit new proposal
// @route   POST /api/proposals
// @access  Private (Society)
exports.submitProposal = async (req, res, next) => {
  try {
    const { eventName, venue, requestedDate, timeSlot, budget, proposalDetails } = req.body;

    // Validation
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
    console.error('Submit proposal error:', error);
    next(error);
  }
};

// @desc    Get all proposals (Admin) or my proposals (Society)
// @route   GET /api/proposals
// @access  Private
exports.getProposals = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      // Admin sees all proposals
      query = `
        SELECT p.*, u.society_name, u.email as society_email, u.phone_number 
        FROM proposals p
        INNER JOIN users u ON p.society_id = u.user_id
      `;

      if (status) {
        query += ' WHERE p.status = ?';
        params.push(status);
      }

      query += ' ORDER BY p.submitted_at DESC';
    } else if (req.user.role === 'society') {
      // Society sees only their proposals
      query = `
        SELECT * FROM proposals 
        WHERE society_id = ?
      `;
      params.push(req.user.user_id);

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY submitted_at DESC';
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const [proposals] = await promisePool.query(query, params);

    res.json({
      success: true,
      count: proposals.length,
      data: proposals
    });

  } catch (error) {
    console.error('Get proposals error:', error);
    next(error);
  }
};

// @desc    Get single proposal
// @route   GET /api/proposals/:id
// @access  Private
exports.getProposal = async (req, res, next) => {
  try {
    const [proposals] = await promisePool.query(
      `SELECT p.*, u.society_name, u.email as society_email, u.phone_number
       FROM proposals p
       INNER JOIN users u ON p.society_id = u.user_id
       WHERE p.proposal_id = ?`,
      [req.params.id]
    );

    if (proposals.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    const proposal = proposals[0];

    // Check authorization
    if (req.user.role !== 'admin' && proposal.society_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this proposal'
      });
    }

    res.json({
      success: true,
      data: proposal
    });

  } catch (error) {
    console.error('Get proposal error:', error);
    next(error);
  }
};

// @desc    Approve proposal
// @route   PUT /api/proposals/:id/approve
// @access  Private (Admin)
exports.approveProposal = async (req, res, next) => {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    // Get proposal
    const [proposals] = await connection.query(
      'SELECT * FROM proposals WHERE proposal_id = ?',
      [req.params.id]
    );

    if (proposals.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    const proposal = proposals[0];

    if (proposal.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Proposal already processed'
      });
    }

    // Update proposal
    await connection.query(
      `UPDATE proposals 
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = ?
       WHERE proposal_id = ?`,
      [req.user.user_id, req.params.id]
    );

    // Get society info
    const [society] = await connection.query(
      'SELECT society_name FROM users WHERE user_id = ?',
      [proposal.society_id]
    );

    // Create event
    await connection.query(
      `INSERT INTO events 
       (proposal_id, society_id, event_name, society_name, venue, event_date, time_slot, budget, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proposal.proposal_id,
        proposal.society_id,
        proposal.event_name,
        society[0].society_name,
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
      message: 'Proposal approved and event created successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Approve proposal error:', error);
    next(error);
  } finally {
    connection.release();
  }
};

// @desc    Reject proposal
// @route   PUT /api/proposals/:id/reject
// @access  Private (Admin)
exports.rejectProposal = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Check if proposal exists
    const [proposals] = await promisePool.query(
      'SELECT status FROM proposals WHERE proposal_id = ?',
      [req.params.id]
    );

    if (proposals.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    if (proposals[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Proposal already processed'
      });
    }

    // Update proposal
    await promisePool.query(
      `UPDATE proposals 
       SET status = 'rejected', rejection_reason = ?, reviewed_at = NOW(), reviewed_by = ?
       WHERE proposal_id = ?`,
      [rejectionReason, req.user.user_id, req.params.id]
    );

    res.json({
      success: true,
      message: 'Proposal rejected successfully'
    });

  } catch (error) {
    console.error('Reject proposal error:', error);
    next(error);
  }
};

// @desc    Delete proposal
// @route   DELETE /api/proposals/:id
// @access  Private (Society - own proposals only)
exports.deleteProposal = async (req, res, next) => {
  try {
    const [proposals] = await promisePool.query(
      'SELECT society_id, status FROM proposals WHERE proposal_id = ?',
      [req.params.id]
    );

    if (proposals.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    const proposal = proposals[0];

    // Check authorization
    if (proposal.society_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this proposal'
      });
    }

    // Can only delete pending proposals
    if (proposal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete processed proposals'
      });
    }

    await promisePool.query('DELETE FROM proposals WHERE proposal_id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Proposal deleted successfully'
    });

  } catch (error) {
    console.error('Delete proposal error:', error);
    next(error);
  }
};