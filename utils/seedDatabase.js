const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Skill = require('../models/Skill');

const SKILLS = [
  { name: 'React', description: 'Modern frontend library for building user interfaces' },
  { name: 'Node.js', description: 'Server-side JavaScript runtime' },
  { name: 'Python', description: 'General-purpose programming language' },
  { name: 'TypeScript', description: 'Typed superset of JavaScript' },
  { name: 'Machine Learning', description: 'AI and data science techniques' },
  { name: 'Flutter', description: 'Cross-platform mobile framework' },
  { name: 'Rust', description: 'Systems programming language' },
  { name: 'Go', description: 'Fast, compiled server language' },
  { name: 'Figma', description: 'UI/UX design and prototyping tool' },
  { name: 'UI/UX Design', description: 'User interface and experience design' },
  { name: 'Illustration', description: 'Digital and traditional illustration' },
  { name: 'Motion Graphics', description: 'Animated visual content' },
  { name: '3D Modeling', description: 'Blender, Maya, Cinema 4D' },
  { name: 'SEO', description: 'Search engine optimization' },
  { name: 'Copywriting', description: 'Persuasive and engaging writing' },
  { name: 'Social Media', description: 'Social platform strategy' },
  { name: 'Content Strategy', description: 'Content planning and execution' },
  { name: 'Spanish', description: 'Spanish language tutoring' },
  { name: 'French', description: 'French language tutoring' },
  { name: 'Japanese', description: 'Japanese language tutoring' },
  { name: 'Mandarin', description: 'Mandarin Chinese tutoring' },
  { name: 'Guitar', description: 'Acoustic and electric guitar' },
  { name: 'Piano', description: 'Piano and keyboard lessons' },
  { name: 'Music Production', description: 'DAW, mixing, and mastering' },
  { name: 'Photography', description: 'Digital photography techniques' },
  { name: 'Video Editing', description: 'Premiere Pro, DaVinci Resolve' },
  { name: 'Yoga', description: 'Yoga instruction and practice' },
  { name: 'Cooking', description: 'Culinary skills and recipes' },
  { name: 'Public Speaking', description: 'Presentation and speaking skills' },
  { name: 'Data Science', description: 'Data analysis and visualization' },
];

const SAMPLE_USERS = [
  { name: 'Arjun Krishnamurthy', email: 'arjun@skillswap.dev', password: 'password123', bio: 'Senior developer. 6+ years React. Passionate about teaching.', offered: ['React', 'Node.js', 'TypeScript'], wanted: ['Video Editing', 'Photography', 'Guitar'] },
  { name: 'Priya Malhotra', email: 'priya@skillswap.dev', password: 'password123', bio: 'Design student turned developer. Trading design for code.', offered: ['Figma', 'UI/UX Design', 'Illustration'], wanted: ['React', 'Python', 'Node.js'] },
  { name: 'Meera Sharma', email: 'meera@skillswap.dev', password: 'password123', bio: 'Illustrator wanting to learn digital marketing.', offered: ['Illustration', 'Figma'], wanted: ['SEO', 'Social Media', 'Copywriting'] },
  { name: 'Dev Thakur', email: 'dev@skillswap.dev', password: 'password123', bio: 'ML engineer. Building the future with data.', offered: ['Python', 'Machine Learning', 'Data Science'], wanted: ['Figma', 'UI/UX Design'] },
  { name: 'Karan Patel', email: 'karan@skillswap.dev', password: 'password123', bio: 'Music teacher and part-time developer.', offered: ['Guitar', 'Piano', 'Music Production'], wanted: ['React', 'Flutter'] },
];

const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    const skillCount = await Skill.countDocuments();

    // If database already has data, don't seed (to prevent duplicates)
    if (userCount > 0 && skillCount > 10) {
      console.log('Database already populated. Skipping auto-seed.');
      return;
    }

    console.log('Running auto-seeder...');

    // Seed skills if needed
    if (skillCount < 30) {
      await Skill.deleteMany({});
      await Skill.insertMany(SKILLS);
      console.log(`Seeded ${SKILLS.length} skills`);
    }

    const allSkills = await Skill.find({});
    const skillMap = {};
    allSkills.forEach(s => { skillMap[s.name] = s._id; });

    // Seed users if needed
    if (userCount === 0) {
      for (const u of SAMPLE_USERS) {
        await User.create({
          name: u.name,
          email: u.email,
          password: u.password, // Assuming User model has pre-save hook for hashing
          bio: u.bio,
          location: { city: 'Bangalore', country: 'India' },
          skillsOffered: u.offered.map(name => skillMap[name]).filter(Boolean),
          skillsWanted: u.wanted.map(name => skillMap[name]).filter(Boolean),
          credits: 25,
          rating: (4 + Math.random()).toFixed(1),
          isVerified: true,
        });
      }
      console.log(`Seeded ${SAMPLE_USERS.length} sample users`);

      // Create admin user
      await User.create({
        name: 'Admin',
        email: 'admin@skillswap.com',
        password: 'admin@123',
        bio: 'Platform administrator',
        role: 'admin',
        credits: 9999,
        isVerified: true,
      });
      console.log('Created admin user (admin@skillswap.com / admin@123)');
    }

    console.log('Auto-seeding complete.');
  } catch (error) {
    console.error('Error during auto-seeding:', error);
  }
};

module.exports = seedDatabase;
