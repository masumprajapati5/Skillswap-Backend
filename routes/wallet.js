const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/wallet
// @desc    Get user balance
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('credits');
    
    res.json({
      balance: user.credits
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/wallet/transfer
// @desc    Manual credit transfer between users (admin or system use mostly)
// @access  Private
router.post('/transfer', protect, async (req, res) => {
  try {
    const { toUserId, amount } = req.body;
    
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const sender = await User.findById(req.user._id);
    const receiver = await User.findById(toUserId);

    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    if (sender.credits < amount) {
      return res.status(400).json({ message: 'Insufficient credits' });
    }

    // Deduct from sender
    sender.credits -= amount;
    await sender.save();

    // Add to receiver
    receiver.credits += amount;
    await receiver.save();

    res.status(200).json({
      message: 'Transfer successful',
      balance: sender.credits
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
