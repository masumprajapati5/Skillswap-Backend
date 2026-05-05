const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Skill = require('../models/Skill');
const Session = require('../models/Session');
const Review = require('../models/Review');
const { protect, admin } = require('../middleware/auth');

// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Private/Admin
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSkills = await Skill.countDocuments();
    const activeSessions = await Session.countDocuments({ status: 'scheduled' });
    const pendingSessions = await Session.countDocuments({ status: 'pending' });
    const completedSessions = await Session.countDocuments({ status: 'completed' });

    // Sum only non-admin user credits for platform total
    const creditAgg = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: null, total: { $sum: '$credits' } } }
    ]);
    const totalCredits = creditAgg.length > 0 ? creditAgg[0].total : 0;

    res.json({
      totalUsers,
      totalSkills,
      activeSessions,
      pendingSessions,
      completedSessions,
      totalCredits
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-passwordHash')
      .populate('skillsOffered', 'name')
      .populate('skillsWanted', 'name')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/admin/users/:id/role
// @desc    Update user role
// @access  Private/Admin
router.patch('/users/:id/role', protect, admin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ message: `User role updated to ${role}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PATCH /api/admin/users/:id/block
// @desc    Block or unblock a user
// @access  Private/Admin
router.patch('/users/:id/block', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot block an admin' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/admin/skills
// @desc    Get all skills for admin
// @access  Private/Admin
router.get('/skills', protect, admin, async (req, res) => {
  try {
    const skills = await Skill.find({}).sort({ name: 1 });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/admin/skills
// @desc    Add a new skill
// @access  Private/Admin
router.post('/skills', protect, admin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const skillExists = await Skill.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (skillExists) {
      return res.status(400).json({ message: 'Skill already exists' });
    }

    const skill = new Skill({
      name,
      description
    });

    await skill.save();
    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/admin/skills/:id
// @desc    Update a skill
// @access  Private/Admin
router.put('/skills/:id', protect, admin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    if (name) {
      const skillExists = await Skill.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: skill._id } });
      if (skillExists) {
        return res.status(400).json({ message: 'Skill with this name already exists' });
      }
      skill.name = name;
    }
    
    if (description !== undefined) skill.description = description;

    await skill.save();
    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/admin/skills/:id
// @desc    Delete a skill
// @access  Private/Admin
router.delete('/skills/:id', protect, admin, async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Remove from all users
    await User.updateMany(
      { skillsOffered: skill._id },
      { $pull: { skillsOffered: skill._id } }
    );
    await User.updateMany(
      { skillsWanted: skill._id },
      { $pull: { skillsWanted: skill._id } }
    );

    await Skill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/admin/sessions
// @desc    Get all sessions for admin
// @access  Private/Admin
router.get('/sessions', protect, admin, async (req, res) => {
  try {
    const sessions = await Session.find({})
      .populate('requester', 'name email')
      .populate('provider', 'name email')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/admin/reviews
// @desc    Get all reviews
// @access  Private/Admin
router.get('/reviews', protect, admin, async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('reviewer', 'name email')
      .populate('reviewee', 'name email')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/admin/reviews/:id
// @desc    Delete a review
// @access  Private/Admin
router.delete('/reviews/:id', protect, admin, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
