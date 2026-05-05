const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('skillsOffered', 'name category')
      .populate('skillsWanted', 'name category');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/me
// @desc    Update user profile
// @access  Private
router.put('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.bio = req.body.bio || user.bio;
      user.avatar = req.body.avatar || user.avatar;
      
      if (req.body.location) {
        user.location = {
          city: req.body.location.city || user.location?.city,
          country: req.body.location.country || user.location?.country
        };
      }
      
      if (req.body.skillsOffered) {
        user.skillsOffered = req.body.skillsOffered;
      }
      
      if (req.body.skillsWanted) {
        user.skillsWanted = req.body.skillsWanted;
      }
      
      if (req.body.availability) {
        user.availability = req.body.availability;
      }
      
      if (req.body.portfolio) {
        user.portfolio = req.body.portfolio;
      }

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ 
      message: 'Failed to update profile', 
      error: error.message 
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users by name or skill
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    let query = { role: { $ne: 'admin' } };

    if (keyword) {
      // Find skill IDs that match the keyword
      const Skill = require('../models/Skill');
      const matchingSkills = await Skill.find({
        name: { $regex: keyword, $options: 'i' }
      }).select('_id');
      const skillIds = matchingSkills.map(s => s._id);

      query = {
        ...query,
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { skillsOffered: { $in: skillIds } },
          { skillsWanted: { $in: skillIds } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .populate('skillsOffered', 'name')
      .populate('skillsWanted', 'name')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('skillsOffered', 'name category icon')
      .populate('skillsWanted', 'name category icon');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/users/me/skills
// @desc    Add a skill to profile (offered or wanted)
// @access  Private
router.post('/me/skills', protect, async (req, res) => {
  try {
    const { skillId, type } = req.body; // type: 'offered' or 'wanted'
    
    if (!skillId || !type) {
      return res.status(400).json({ message: 'Please provide skillId and type' });
    }

    const user = await User.findById(req.user._id);

    if (type === 'offered') {
      if (!user.skillsOffered.includes(skillId)) {
        user.skillsOffered.push(skillId);
      }
    } else if (type === 'wanted') {
      if (!user.skillsWanted.includes(skillId)) {
        user.skillsWanted.push(skillId);
      }
    }

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/users/me/skills/:skillId
// @desc    Remove skill from profile
// @access  Private
router.delete('/me/skills/:skillId', protect, async (req, res) => {
  try {
    const { type } = req.body; // type: 'offered' or 'wanted'
    const user = await User.findById(req.user._id);

    if (type === 'offered') {
      user.skillsOffered = user.skillsOffered.filter(
        id => id.toString() !== req.params.skillId
      );
    } else if (type === 'wanted') {
      user.skillsWanted = user.skillsWanted.filter(
        id => id.toString() !== req.params.skillId
      );
    }

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
