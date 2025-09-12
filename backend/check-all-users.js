const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgt');
    console.log('Connected to MongoDB');
    console.log('Database URI:', process.env.MONGO_URI || 'mongodb://localhost:27017/sgt');

    // Find all users
    const users = await User.find({}).sort({ createdAt: -1 });

    console.log(`\nFound ${users.length} total users:`);
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Role: ${user.role}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      if (user.role === 'student' && user.regNo) {
        console.log(`   RegNo: ${user.regNo}`);
      }
      if (user.role === 'teacher' && user.teacherId) {
        console.log(`   TeacherID: ${user.teacherId}`);
      }
      console.log(`   Created: ${user.createdAt || 'Unknown'}`);
      console.log('-'.repeat(40));
    });

    // Check database name
    console.log(`\nConnected to database: ${mongoose.connection.db.databaseName}`);
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkAllUsers();
