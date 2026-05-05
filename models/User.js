const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
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

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password') && !this.isModified('passwordHash')) {
    return;
  }

  // If password is provided, hash it into passwordHash
  if (this.password) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.password, salt);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Virtual for password to handle it during creation/updates
userSchema.virtual('password').set(function(password) {
  this._password = password;
}).get(function() {
  return this._password;
});

module.exports = mongoose.model('User', userSchema);
