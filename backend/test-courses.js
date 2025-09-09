const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');

async function testCourses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Check if C000001 exists
    const course = await Course.findOne({ courseCode: 'C000001' });
    console.log('Course C000001:', course);
    
    // List all courses
    const allCourses = await Course.find({}, 'courseCode title');
    console.log('All courses:');
    allCourses.forEach(c => console.log(`  ${c.courseCode}: ${c.title}`));
    
    if (!course) {
      console.log('\nCreating test course C000001...');
      const newCourse = new Course({
        courseCode: 'C000001',
        title: 'Test Course 1',
        description: 'A test course for bulk upload testing'
      });
      await newCourse.save();
      console.log('Test course created successfully');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testCourses();
