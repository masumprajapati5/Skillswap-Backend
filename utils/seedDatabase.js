const mongoose = require('mongoose');
const User = require('../models/User');
const Skill = require('../models/Skill');

const seedDatabase = async () => {
  try {
    console.log('Running auto-seeder checks...');

    // 1. Check and Seed Admin
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('No Admin found. Seeding admin...');
      const adminUser = await User.create({
        name: 'Admin',
        email: 'admin@skillswap.com',
        password: 'admin@123', // Note: User model usually hashes password in pre-save
        role: 'admin',
        credits: 9999,
        bio: 'Platform administrator',
        location: { city: 'Remote', country: 'Global' }
      });
      console.log('Admin user seeded.');
    }

    // 2. Check and Seed Demo Users & Skills
    const userCount = await User.countDocuments({ role: 'user' });
    if (userCount === 0) {
      console.log('No normal users found. Seeding demo users and skills...');

      const demoUser1 = await User.create({
        name: 'Arjun Krishnamurthy',
        email: 'arjun@skillswap.dev',
        password: 'password123',
        role: 'user',
        credits: 45,
        bio: 'Enthusiastic web developer looking to learn design.',
        location: { city: 'Bangalore', country: 'India' },
        rating: 4.8
      });

      const demoUser2 = await User.create({
        name: 'Priya Malhotra',
        email: 'priya@skillswap.dev',
        password: 'password123',
        role: 'user',
        credits: 25,
        bio: 'Graphic designer who loves to teach illustration.',
        location: { city: 'Mumbai', country: 'India' },
        rating: 5.0
      });

      const skillData = [
        { name: 'React Development', description: 'Building modern web apps using React.js.' },
        { name: 'Node.js API', description: 'Creating RESTful APIs with Node and Express.' },
        { name: 'UI/UX Design', description: 'Designing user interfaces using Figma.' },
        { name: 'Spanish', description: 'Conversational Spanish lessons.' }
      ];
      const createdSkills = await Skill.insertMany(skillData);

      if (createdSkills.length >= 4) {
        demoUser1.skillsOffered.push(createdSkills[0]._id);
        demoUser1.skillsWanted.push(createdSkills[2]._id);
        await demoUser1.save();

        demoUser2.skillsOffered.push(createdSkills[2]._id);
        demoUser2.skillsWanted.push(createdSkills[0]._id);
        await demoUser2.save();
      }
      console.log('Demo users and skills seeded.');
    }

    console.log('Auto-seeding checks complete.');
  } catch (error) {
    console.error('Error during database auto-seeding:', error);
  }
};

module.exports = seedDatabase;
