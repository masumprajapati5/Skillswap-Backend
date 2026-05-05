const mongoose = require('mongoose');
require('dotenv').config();

const dropTransactions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap');
    console.log('Connected to MongoDB...');
    
    const collections = await mongoose.connection.db.listCollections({ name: 'transactions' }).toArray();
    
    if (collections.length > 0) {
      await mongoose.connection.db.dropCollection('transactions');
      console.log('Successfully dropped "transactions" collection.');
    } else {
      console.log('Collection "transactions" does not exist.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error dropping collection:', err);
    process.exit(1);
  }
};

dropTransactions();
