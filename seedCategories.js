const mongoose = require('mongoose');
require('dotenv').config();
const Category = require('./models/Category');

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('MongoDB Connected');

    const categories = [
      { name: 'Development', description: 'Software engineering, coding, web dev, etc.' },
      { name: 'Design', description: 'UI/UX, Graphic Design, Illustration.' },
      { name: 'Music', description: 'Instruments, production, vocals.' },
      { name: 'Language', description: 'Spoken languages, writing, translation.' },
      { name: 'Business', description: 'Marketing, sales, management, startups.' },
      { name: 'Arts & Crafts', description: 'Painting, pottery, DIY.' },
      { name: 'Lifestyle', description: 'Cooking, fitness, personal growth.' }
    ];

    for (let cat of categories) {
      const exists = await Category.findOne({ name: cat.name });
      if (!exists) {
        await Category.create(cat);
        console.log(`Created category: ${cat.name}`);
      } else {
        console.log(`Category already exists: ${cat.name}`);
      }
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
};

seedCategories();
