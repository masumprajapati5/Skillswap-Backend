const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  lastMessage: {
    text: { 
      type: String,
      set: encrypt,
      get: decrypt
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date
  },
  unreadCounts: { type: Map, of: Number, default: {} }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Index for sorting by updatedAt
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
