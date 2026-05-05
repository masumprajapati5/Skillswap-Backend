const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String },
  bio: { type: String },
  location: {
    city: String,
    country: String
  },
  skillsOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  skillsWanted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  credits: { type: Number, default: 25 },
  rating: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  portfolio: [{
    name: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  availability: [String],
  resetToken: String,
  resetTokenExpiry: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
