const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');
require('dotenv').config();

const debugCount = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skillswap');
  
  const totalUnread = await Notification.countDocuments({ isRead: false });
  console.log('Total Unread Notifications in System:', totalUnread);
  
  const allUnread = await Notification.find({ isRead: false }).populate('user', 'name');
  for (const n of allUnread) {
    console.log(`- For User: ${n.user ? n.user.name : 'Unknown'}, Type: ${n.type}`);
  }
  
  process.exit(0);
};

debugCount();
