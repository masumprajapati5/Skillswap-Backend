const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// @route   GET /api/conversations
// @desc    All conversations for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'name avatar')
    .populate('session', 'skillOffered skillWanted status')
    .sort({ updatedAt: -1 });

    const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
      const unreadCount = await Message.countDocuments({
        conversation: conv._id,
        sender: { $ne: req.user._id },
        isRead: false
      });
      return { ...conv.toObject(), unreadCount };
    }));

    res.json(conversationsWithUnread);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/conversations
// @desc    Create or get conversation with a user
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { participantId } = req.body;
    
    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] }
    });

    if (conversation) {
      return res.json(conversation);
    }

    // Create new conversation
    conversation = await Conversation.create({
      participants: [req.user._id, participantId]
    });

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/conversations/unread-count
// @desc    Get total unread messages for user
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const unreadConvIds = await Message.distinct('conversation', {
      sender: { $ne: req.user._id },
      isRead: false
    });

    const conversations = await Conversation.find({ 
      _id: { $in: unreadConvIds },
      participants: req.user._id 
    }).populate('participants', '_id');

    // Only count conversations that have at least one other valid participant
    let count = 0;
    for (const conv of conversations) {
      const hasOtherParticipant = conv.participants.some(p => p && p._id && p._id.toString() !== req.user._id.toString());
      if (hasOtherParticipant) {
        count++;
      }
    }

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/conversations/:id/messages
// @desc    Message history with pagination
// @access  Private
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Verify participant
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Mark these messages as read if current user is NOT the sender
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true }
    );

    // Also mark associated notifications as read
    const Notification = require('../models/Notification');
    await Notification.updateMany(
      { user: req.user._id, type: 'message', reference: conversationId, isRead: false },
      { isRead: true }
    );

    res.json(messages.reverse()); // Return chronological
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/conversations/:id/messages
// @desc    Send text or file message
// @access  Private
router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { text, fileUrl, fileType } = req.body;
    const conversationId = req.params.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text,
      fileUrl,
      fileType
    });

    // Update conversation last message
    conversation.lastMessage = {
      text: text || 'Sent an attachment',
      sender: req.user._id,
      createdAt: message.createdAt
    };
    await conversation.save();

    await message.populate('sender', 'name avatar');

    // Broadcast live to all other participants
    const io = req.app.get('io');
    const Notification = require('../models/Notification');
    
    for (const participantId of conversation.participants) {
      if (participantId.toString() !== req.user._id.toString()) {
        // Live Socket
        io.to(`user_${participantId}`).emit('receive_message', {
          ...message.toObject(),
          conversationId: conversation._id
        });

        // Persistent Notification (only if they don't already have an unread notification for this conversation to avoid spam)
        const existingNote = await Notification.findOne({
          user: participantId,
          type: 'message',
          reference: conversation._id,
          isRead: false
        });

        if (!existingNote) {
          const notification = await Notification.create({
            user: participantId,
            type: 'message',
            content: `New message from ${req.user.name}`,
            reference: conversation._id,
            referenceModel: 'Conversation'
          });
          io.to(`user_${participantId}`).emit('notification_received', notification);
        }
      }
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/conversations/:id/messages/:messageId
// @desc    Edit a message
// @access  Private
router.patch('/:id/messages/:messageId', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const io = req.app.get('io');
    io.to(`conversation_${req.params.id}`).emit('message_updated', message);

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/conversations/:id/messages/:messageId
// @desc    Delete a message (soft delete)
// @access  Private
router.delete('/:id/messages/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.isDeleted = true;
    message.text = 'This message was deleted';
    await message.save();

    const io = req.app.get('io');
    io.to(`conversation_${req.params.id}`).emit('message_deleted', {
      _id: message._id,
      conversationId: req.params.id
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/conversations/:id/messages/:messageId/react
// @desc    React to a message
// @access  Private
router.post('/:id/messages/:messageId/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Remove existing reaction from this user if any
    message.reactions = message.reactions.filter(r => r.user.toString() !== req.user._id.toString());
    
    // Add new reaction if emoji is provided
    if (emoji) {
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();
    await message.populate('reactions.user', 'name');

    const io = req.app.get('io');
    io.to(`conversation_${req.params.id}`).emit('message_reacted', {
      messageId: message._id,
      reactions: message.reactions,
      conversationId: req.params.id
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
