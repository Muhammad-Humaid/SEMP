const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  submitProposal,
  getProposals,
  getProposal,
  approveProposal,
  rejectProposal,
  deleteProposal
} = require('../controllers/proporsalController');

router.route('/')
  .get(protect, authorize('admin', 'society'), getProposals)
  .post(protect, authorize('society'), submitProposal);

router.route('/:id')
  .get(protect, getProposal)
  .delete(protect, authorize('society'), deleteProposal);

router.put('/:id/approve', protect, authorize('admin'), approveProposal);
router.put('/:id/reject', protect, authorize('admin'), rejectProposal);

module.exports = router;