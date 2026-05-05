const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// @route   GET /api/sessions
// @desc    Get all sessions for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const sessions = await Session.find({
      $or: [{ requester: req.user._id }, { provider: req.user._id }]
    })
    .populate('requester', 'name avatar rating')
    .populate('provider', 'name avatar rating')
    .populate('skillOffered', 'name category')
    .populate('skillWanted', 'name category')
    .sort({ scheduledAt: 1, createdAt: -1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/sessions/pending-count
// @desc    Get total pending swap requests for provider
// @access  Private
router.get('/pending-count', protect, async (req, res) => {
  try {
    const count = await Session.countDocuments({
      provider: req.user._id,
      status: 'pending'
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/sessions
// @desc    Create swap request
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { recipient, title, skillOffered, skillWanted, scheduledDate, scheduledTime, duration, notes, meetingType, location } = req.body;

    // Credit Check
    const requester = await User.findById(req.user._id);
    if (requester.credits < 10) {
      return res.status(400).json({ message: 'Insufficient credits. You need at least 10 credits to request a swap.' });
    }

    const session = await Session.create({
      requester: req.user._id,
      provider: recipient,
      skillOffered,
      skillWanted,
      title,
      scheduledDate,
      scheduledTime,
      duration,
      notes,
      meetingType: meetingType || 'online',
      location: location || '',
      status: 'pending'
    });

    // Reuse existing conversation or create new one
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipient] }
    });

    if (conversation) {
      conversation.session = session._id;
      conversation.updatedAt = Date.now();
      await conversation.save();
    } else {
      await Conversation.create({
        participants: [req.user._id, recipient],
        session: session._id
      });
    }

    // Persistent Notification
    const notification = await Notification.create({
      user: recipient,
      type: 'session_request',
      content: `${req.user.name} sent you a skill swap request!`,
      reference: session._id,
      referenceModel: 'Session'
    });

    const io = req.app.get('io');
    io.to(`user_${recipient}`).emit('notification_received', notification);

    // Live Notification to recipient
    io.to(`user_${recipient}`).emit('session_update', {
      type: 'new_request',
      sessionId: session._id
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get session detail
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('requester', 'name avatar bio rating')
      .populate('provider', 'name avatar bio rating')
      .populate('skillOffered', 'name category icon')
      .populate('skillWanted', 'name category icon');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Verify user is part of session
    if (session.requester._id.toString() !== req.user._id.toString() && 
        session.provider._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/sessions/:id/accept
// @desc    Accept session request
// @access  Private
router.patch('/:id/accept', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only provider can accept' });
    }

    session.status = 'scheduled';
    session.videoRoomId = `room_${Math.random().toString(36).substring(2, 9)}`; // Mocking 100ms room ID
    
    await session.save();
    
    const populatedSession = await Session.findById(session._id)
      .populate('requester', 'name avatar bio rating')
      .populate('provider', 'name avatar bio rating')
      .populate('skillOffered', 'name category icon')
      .populate('skillWanted', 'name category icon');

    // Persistent Notification
    const notification = await Notification.create({
      user: session.requester,
      type: 'session_request',
      content: `${req.user.name} accepted your skill swap request!`,
      reference: session._id,
      referenceModel: 'Session'
    });

    const io = req.app.get('io');
    io.to(`user_${session.requester}`).emit('notification_received', notification);

    // Live Notification to requester
    io.to(`user_${session.requester}`).emit('session_update', {
      type: 'request_accepted',
      sessionId: session._id
    });

    res.json(populatedSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/sessions/:id/decline
// @desc    Decline session request
// @access  Private
router.patch('/:id/decline', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only provider can decline' });
    }

    session.status = 'declined';
    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('requester', 'name avatar bio rating')
      .populate('provider', 'name avatar bio rating')
      .populate('skillOffered', 'name category icon')
      .populate('skillWanted', 'name category icon');

    // Persistent Notification
    const notification = await Notification.create({
      user: session.requester,
      type: 'session_request',
      content: `${req.user.name} declined your skill swap request.`,
      reference: session._id,
      referenceModel: 'Session'
    });

    const io = req.app.get('io');
    io.to(`user_${session.requester}`).emit('notification_received', notification);

    // Live Notification to requester
    io.to(`user_${session.requester}`).emit('session_update', {
      type: 'request_declined',
      sessionId: session._id
    });

    res.json(populatedSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/sessions/:id/complete
// @desc    Mark session complete
// @access  Private
router.patch('/:id/complete', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session already completed' });
    }

    // Transfer credits (10 credits per session)
    const SESSION_COST = 10;
    
    // Deduct from requester
    await User.findByIdAndUpdate(session.requester, {
      $inc: { credits: -SESSION_COST }
    });
    
    // Add to provider
    await User.findByIdAndUpdate(session.provider, {
      $inc: { credits: SESSION_COST }
    });

    session.status = 'completed';
    await session.save();
    
    const populatedSession = await Session.findById(session._id)
      .populate('requester', 'name avatar bio rating')
      .populate('provider', 'name avatar bio rating')
      .populate('skillOffered', 'name category icon')
      .populate('skillWanted', 'name category icon');

    const otherUser = session.requester.toString() === req.user._id.toString() ? session.provider : session.requester;
    // Persistent Notification
    const notification = await Notification.create({
      user: otherUser,
      type: 'session_request',
      content: `Your session with ${req.user.name} has been marked as completed!`,
      reference: session._id,
      referenceModel: 'Session'
    });

    const io = req.app.get('io');
    io.to(`user_${otherUser}`).emit('notification_received', notification);

    // Notify other participant
    io.to(`user_${otherUser}`).emit('session_update', {
      type: 'session_completed',
      sessionId: session._id
    });

    res.json(populatedSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/sessions/:id/cancel
// @desc    Cancel session
// @access  Private
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'cancelled';
    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('requester', 'name avatar bio rating')
      .populate('provider', 'name avatar bio rating')
      .populate('skillOffered', 'name category icon')
      .populate('skillWanted', 'name category icon');

    const otherUser = session.requester.toString() === req.user._id.toString() ? session.provider : session.requester;
    // Persistent Notification
    const notification = await Notification.create({
      user: otherUser,
      type: 'session_request',
      content: `${req.user.name} cancelled the session.`,
      reference: session._id,
      referenceModel: 'Session'
    });

    const io = req.app.get('io');
    io.to(`user_${otherUser}`).emit('notification_received', notification);

    // Notify other participant
    io.to(`user_${otherUser}`).emit('session_update', {
      type: 'session_cancelled',
      sessionId: session._id
    });

    res.json(populatedSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update session details
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Only allow edit if not completed
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Cannot edit a completed session' });
    }

    // Verify user is part of session
    if (session.requester.toString() !== req.user._id.toString() && 
        session.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    session.title = req.body.title || session.title;
    session.scheduledDate = req.body.scheduledDate || session.scheduledDate;
    session.scheduledTime = req.body.scheduledTime || session.scheduledTime;
    session.duration = req.body.duration || session.duration;
    session.notes = req.body.notes !== undefined ? req.body.notes : session.notes;
    session.meetingType = req.body.meetingType || session.meetingType;
    session.location = req.body.location !== undefined ? req.body.location : session.location;
    session.skillOffered = req.body.skillOffered || session.skillOffered;
    session.skillWanted = req.body.skillWanted || session.skillWanted;

    const updatedSession = await session.save();
    
    const populatedSession = await Session.findById(updatedSession._id)
      .populate('requester', 'name avatar bio rating')
      .populate('provider', 'name avatar bio rating')
      .populate('skillOffered', 'name category icon')
      .populate('skillWanted', 'name category icon');

    // Notify other participant
    const otherUser = session.requester.toString() === req.user._id.toString() ? session.provider : session.requester;
    const io = req.app.get('io');
    io.to(`user_${otherUser}`).emit('session_update', {
      type: 'session_updated',
      sessionId: updatedSession._id
    });

    res.json(populatedSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
