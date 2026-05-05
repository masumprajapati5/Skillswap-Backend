const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Session = require('../models/Session');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/reviews
// @desc    Submit a review after session
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { sessionId, rating, comment, tags } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ message: 'Session must be completed to review' });
    }

    // Determine reviewee
    let revieweeId;
    if (session.requester.toString() === req.user._id.toString()) {
      revieweeId = session.provider;
    } else if (session.provider.toString() === req.user._id.toString()) {
      revieweeId = session.requester;
    } else {
      return res.status(403).json({ message: 'Not part of this session' });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      session: sessionId,
      reviewer: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'Already reviewed this session' });
    }

    const review = await Review.create({
      session: sessionId,
      reviewer: req.user._id,
      reviewee: revieweeId,
      rating,
      comment,
      tags
    });

    // Update user average rating
    const reviews = await Review.find({ reviewee: revieweeId });
    const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

    await User.findByIdAndUpdate(revieweeId, { rating: avgRating });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/reviews/user/:userId
// @desc    Get all reviews for a user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name avatar')
      .populate('session', 'skillOffered skillWanted')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/reviews/session/:sessionId
// @desc    Get reviews for a specific session
// @access  Public
router.get('/session/:sessionId', async (req, res) => {
  try {
    const reviews = await Review.find({ session: req.params.sessionId })
      .populate('reviewer', 'name avatar');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
