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
    const skillCount = await Skill.countDocuments();
    if (userCount === 0 || skillCount < 10) {
      console.log('Database seems underpopulated. Seeding demo users and skills...');

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
        { name: 'Spanish', description: 'Conversational Spanish lessons.' },
        { name: 'Python Development', description: 'Scripting, Data Science, and Backend with Python.' },
        { name: 'JavaScript', description: 'Core JS concepts, ES6+, and DOM manipulation.' },
        { name: 'TypeScript', description: 'Type-safe JavaScript development.' },
        { name: 'HTML/CSS', description: 'Modern semantic HTML and advanced CSS layout techniques.' },
        { name: 'Figma Design', description: 'Prototyping and design systems in Figma.' },
        { name: 'Adobe Photoshop', description: 'Professional image editing and manipulation.' },
        { name: 'Video Editing', description: 'Editing cinematic videos using Premiere Pro or DaVinci.' },
        { name: 'Digital Marketing', description: 'Social media growth and online advertising strategies.' },
        { name: 'Content Writing', description: 'SEO-friendly writing and storytelling.' },
        { name: 'Public Speaking', description: 'Confident presentation and communication skills.' },
        { name: 'Data Analysis', description: 'Extracting insights from data using Excel or SQL.' },
        { name: 'Machine Learning', description: 'Basic AI concepts and model training.' },
        { name: 'DevOps', description: 'CI/CD pipelines, Docker, and Cloud infrastructure.' },
        { name: 'Guitar Lessons', description: 'Basic to advanced guitar techniques.' },
        { name: 'Piano Lessons', description: 'Classical and contemporary piano playing.' },
        { name: 'Vocal Training', description: 'Voice control, pitch, and performance.' },
        { name: 'French Language', description: 'Learning conversational French.' },
        { name: 'German Language', description: 'Mastering German grammar and speech.' },
        { name: 'Japanese Language', description: 'Introduction to Kanji and spoken Japanese.' },
        { name: 'Financial Planning', description: 'Budgeting, investing, and wealth management.' },
        { name: 'Project Management', description: 'Leading teams and managing workflows using Agile/Scrum.' },
        { name: 'SEO Optimization', description: 'Boosting website rankings on search engines.' },
        { name: 'Photography', description: 'Capturing high-quality images and lighting techniques.' },
        { name: 'Cooking (Italian)', description: 'Mastering pasta, pizza, and classic Italian dishes.' },
        { name: 'Yoga & Wellness', description: 'Improving flexibility and mindfulness through Yoga.' },
        { name: 'Personal Training', description: 'Fitness coaching and workout planning.' }
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
