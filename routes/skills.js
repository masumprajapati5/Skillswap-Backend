const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/skills
// @desc    List all skills
// @access  Public
router.get('/', async (req, res) => {
  try {
    const keyword = req.query.keyword
      ? {
          name: {
            $regex: req.query.keyword,
            $options: 'i',
          },
        }
      : {};

    const skills = await Skill.find({ ...keyword }).sort({ usageCount: -1 });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/skills/matches
// @desc    Get smart matches for authenticated user
// @access  Private
router.get('/matches', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    // Find users who offer skills this user wants
    // AND who want skills this user offers
    const matches = await User.find({
      _id: { $ne: currentUser._id },
      skillsOffered: { $in: currentUser.skillsWanted },
      skillsWanted: { $in: currentUser.skillsOffered }
    })
    .select('-passwordHash')
    .populate('skillsOffered', 'name')
    .populate('skillsWanted', 'name')
    .limit(10);
    
    // Simplistic match engine implementation
    // In a real app we'd score these by overlap percentage
    
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/skills/:id
// @desc    Get skill detail + users who offer it
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    const providers = await User.find({ skillsOffered: skill._id })
      .select('name avatar rating bio')
      .limit(10);

    res.json({
      skill,
      providers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/skills
// @desc    Create a new skill
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, category } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Skill name is required' });
    }

    // Check if exists (case insensitive)
    const existing = await Skill.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.json(existing);
    }

    const skill = await Skill.create({
      name,
      icon: '💡' // Default icon for user-added skills
    });

    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
