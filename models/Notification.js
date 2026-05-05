const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['match', 'session_request', 'message', 'review', 'system'], required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  reference: { type: mongoose.Schema.Types.ObjectId }, // e.g. Session ID or Message ID
  referenceModel: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
