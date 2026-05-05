/**
 * SkillSwap Database Seed Script
 * Run: node seed.js
 * Seeds skills categories and sample data
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Skill = require('./models/Skill');
const User = require('./models/User');

const SKILLS = [
  // Development
  { name: 'React', category: 'Development', icon: '⚛️', description: 'Modern frontend library for building user interfaces' },
  { name: 'Node.js', category: 'Development', icon: '🟢', description: 'Server-side JavaScript runtime' },
  { name: 'Python', category: 'Development', icon: '🐍', description: 'General-purpose programming language' },
  { name: 'TypeScript', category: 'Development', icon: '📘', description: 'Typed superset of JavaScript' },
  { name: 'Machine Learning', category: 'Development', icon: '🤖', description: 'AI and data science techniques' },
  { name: 'Flutter', category: 'Development', icon: '📱', description: 'Cross-platform mobile framework' },
  { name: 'Rust', category: 'Development', icon: '🦀', description: 'Systems programming language' },
  { name: 'Go', category: 'Development', icon: '🔵', description: 'Fast, compiled server language' },
  // Design
  { name: 'Figma', category: 'Design', icon: '🎨', description: 'UI/UX design and prototyping tool' },
  { name: 'UI/UX Design', category: 'Design', icon: '✨', description: 'User interface and experience design' },
  { name: 'Illustration', category: 'Design', icon: '🖌️', description: 'Digital and traditional illustration' },
  { name: 'Motion Graphics', category: 'Design', icon: '🎬', description: 'Animated visual content' },
  { name: '3D Modeling', category: 'Design', icon: '🧊', description: 'Blender, Maya, Cinema 4D' },
  // Marketing
  { name: 'SEO', category: 'Marketing', icon: '🔍', description: 'Search engine optimization' },
  { name: 'Copywriting', category: 'Marketing', icon: '✍️', description: 'Persuasive and engaging writing' },
  { name: 'Social Media', category: 'Marketing', icon: '📣', description: 'Social platform strategy' },
  { name: 'Content Strategy', category: 'Marketing', icon: '📝', description: 'Content planning and execution' },
  // Languages
  { name: 'Spanish', category: 'Languages', icon: '🇪🇸', description: 'Spanish language tutoring' },
  { name: 'French', category: 'Languages', icon: '🇫🇷', description: 'French language tutoring' },
  { name: 'Japanese', category: 'Languages', icon: '🇯🇵', description: 'Japanese language tutoring' },
  { name: 'Mandarin', category: 'Languages', icon: '🇨🇳', description: 'Mandarin Chinese tutoring' },
  // Music
  { name: 'Guitar', category: 'Music', icon: '🎸', description: 'Acoustic and electric guitar' },
  { name: 'Piano', category: 'Music', icon: '🎹', description: 'Piano and keyboard lessons' },
  { name: 'Music Production', category: 'Music', icon: '🎧', description: 'DAW, mixing, and mastering' },
  // Other
  { name: 'Photography', category: 'Photography', icon: '📷', description: 'Digital photography techniques' },
  { name: 'Video Editing', category: 'Photography', icon: '🎞️', description: 'Premiere Pro, DaVinci Resolve' },
  { name: 'Yoga', category: 'Fitness', icon: '🧘', description: 'Yoga instruction and practice' },
  { name: 'Cooking', category: 'Lifestyle', icon: '🍳', description: 'Culinary skills and recipes' },
  { name: 'Public Speaking', category: 'Communication', icon: '🎤', description: 'Presentation and speaking skills' },
  { name: 'Data Science', category: 'Development', icon: '📊', description: 'Data analysis and visualization' },
];

const SAMPLE_USERS = [
  { name: 'Arjun Krishnamurthy', email: 'arjun@skillswap.dev', password: 'password123', bio: 'Senior developer. 6+ years React. Passionate about teaching.', offered: ['React', 'Node.js', 'TypeScript'], wanted: ['Video Editing', 'Photography', 'Guitar'] },
  { name: 'Priya Malhotra', email: 'priya@skillswap.dev', password: 'password123', bio: 'Design student turned developer. Trading design for code.', offered: ['Figma', 'UI/UX Design', 'Illustration'], wanted: ['React', 'Python', 'Node.js'] },
  { name: 'Meera Sharma', email: 'meera@skillswap.dev', password: 'password123', bio: 'Illustrator wanting to learn digital marketing.', offered: ['Illustration', 'Figma'], wanted: ['SEO', 'Social Media', 'Copywriting'] },
  { name: 'Dev Thakur', email: 'dev@skillswap.dev', password: 'password123', bio: 'ML engineer. Building the future with data.', offered: ['Python', 'Machine Learning', 'Data Science'], wanted: ['Figma', 'UI/UX Design'] },
  { name: 'Karan Patel', email: 'karan@skillswap.dev', password: 'password123', bio: 'Music teacher and part-time developer.', offered: ['Guitar', 'Piano', 'Music Production'], wanted: ['React', 'Flutter'] },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillswap');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Skill.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Seed skills
    const skills = await Skill.insertMany(SKILLS);
    console.log(`Seeded ${skills.length} skills`);

    // Create skill name->id map
    const skillMap = {};
    skills.forEach(s => { skillMap[s.name] = s._id; });

    // Seed users
    const salt = await bcrypt.genSalt(10);
    for (const u of SAMPLE_USERS) {
      const hashedPassword = await bcrypt.hash(u.password, salt);
      await User.create({
        name: u.name,
        email: u.email,
        passwordHash: hashedPassword,
        bio: u.bio,
        location: { city: 'Bangalore', country: 'India' },
        skillsOffered: u.offered.map(name => skillMap[name]).filter(Boolean),
        skillsWanted: u.wanted.map(name => skillMap[name]).filter(Boolean),
        credits: 25,
        rating: (4 + Math.random()).toFixed(1),
        isVerified: true,
      });
    }
    console.log(`Seeded ${SAMPLE_USERS.length} users`);

    // Create admin user
    const adminPassword = await bcrypt.hash('admin@123', salt);
    await User.create({
      name: 'Admin',
      email: 'admin@skillswap.com',
      passwordHash: adminPassword,
      bio: 'Platform administrator',
      role: 'admin',
      credits: 9999,
      isVerified: true,
    });
    console.log('Created admin user (admin@skillswap.com / admin@123)');

    console.log('\n✅ Seed complete!');
    console.log('\nSample login credentials:');
    console.log('  User:  arjun@skillswap.dev / password123');
    console.log('  Admin: admin@skillswap.com / admin@123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
