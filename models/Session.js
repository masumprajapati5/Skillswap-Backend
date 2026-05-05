const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillOffered: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  skillWanted: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  title: { type: String },
  scheduledDate: { type: String },
  scheduledTime: { type: String },
  type: { type: String, enum: ['1:1', 'group', 'async'], default: '1:1' },
  meetingType: { type: String, enum: ['online', 'offline'], default: 'online' },
  location: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'scheduled', 'completed', 'cancelled', 'declined', 'in-progress'],
    default: 'pending' 
  },
  scheduledAt: { type: Date },
  duration: { type: Number }, // in minutes
  creditsCharged: { type: Number, default: 10 },
  videoRoomId: { type: String },
  notes: { type: String },
  reminderSent: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
