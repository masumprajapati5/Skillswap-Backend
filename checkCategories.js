const mongoose = require('mongoose');
require('dotenv').config();
const Category = require('./models/Category');

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const categories = await Category.find({});
    console.log('Categories in DB:', categories);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
checkDB();
