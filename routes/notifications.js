const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get all notifications for user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    res.json({
      notifications,
      unreadCount,
      page,
      pages: Math.ceil(await Notification.countDocuments({ user: req.user._id }) / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // If it's a message notification, also mark messages in that conversation as read
    if (notification.type === 'message' && notification.reference) {
      const Message = require('../models/Message');
      await Message.updateMany(
        { conversation: notification.reference, sender: { $ne: req.user._id }, isRead: false },
        { isRead: true }
      );
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/notifications/mark-category-read/:type
// @desc    Mark all notifications of a specific type as read
// @access  Private
router.patch('/mark-category-read/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    let query = { user: req.user._id, isRead: false };
    
    if (type === 'system') {
      query.type = 'system';
      query.content = { $regex: /credits/i };
    } else {
      query.type = type;
    }

    await Notification.updateMany(query, { $set: { isRead: true } });

    // If marking message category as read, also mark all relevant messages as read
    if (type === 'message') {
      const Message = require('../models/Message');
      // Get all unread message notifications to find the conversation IDs
      const messageNotifs = await Notification.find({ user: req.user._id, type: 'message' });
      const convIds = messageNotifs.map(n => n.reference);
      await Message.updateMany(
        { conversation: { $in: convIds }, sender: { $ne: req.user._id }, isRead: false },
        { isRead: true }
      );
    }

    res.json({ message: `All ${type} notifications marked as read` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.patch('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
