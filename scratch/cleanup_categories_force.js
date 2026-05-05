const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanup = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillswap';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;

    // 1. Double check the categories collection
    const collections = await db.listCollections({ name: 'categories' }).toArray();
    if (collections.length > 0) {
      await db.collection('categories').drop();
      console.log('Dropped "categories" collection.');
    }

    // 2. FORCE remove category field from all skills using native MongoDB collection
    // This bypasses any Mongoose schema logic that might be interfering
    const result = await db.collection('skills').updateMany(
      { category: { $exists: true } }, 
      { $unset: { category: "" } }
    );
    
    console.log(`Matched ${result.matchedCount} skill documents.`);
    console.log(`Successfully removed "category" field from ${result.modifiedCount} documents.`);

    console.log('Database cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanup();
