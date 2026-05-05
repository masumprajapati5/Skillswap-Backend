const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: { type: String },
  icon: { type: String },
  usageCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Skill', skillSchema);
