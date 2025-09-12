const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-elearning');
    console.log('Connected to MongoDB');

    // Find all students
    const students = await User.find({ role: 'student' })
      .populate('school', 'name code')
      .populate('coursesAssigned', 'title courseCode')
      .sort({ regNo: 1 });

    console.log(`\nFound ${students.length} students:`);
    console.log('='.repeat(80));
    
    const regNoCount = {};
    
    students.forEach((student, index) => {
      console.log(`${index + 1}. RegNo: ${student.regNo || 'NO REGNO'}`);
      console.log(`   Name: ${student.name}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   School: ${student.school ? `${student.school.name} (${student.school.code})` : 'NO SCHOOL'}`);
      console.log(`   Courses: ${student.coursesAssigned.length > 0 ? 
        student.coursesAssigned.map(c => `${c.courseCode}: ${c.title}`).join(', ') : 
        'No courses assigned'}`);
      console.log(`   Active: ${student.isActive}`);
      console.log('-'.repeat(40));
      
      // Count regNo occurrences
      if (student.regNo) {
        regNoCount[student.regNo] = (regNoCount[student.regNo] || 0) + 1;
      }
    });

    // Check for duplicates
    const duplicateRegNos = Object.entries(regNoCount).filter(([regNo, count]) => count > 1);
    
    if (duplicateRegNos.length > 0) {
      console.log('\n🚨 DUPLICATE REGISTRATION NUMBERS FOUND:');
      duplicateRegNos.forEach(([regNo, count]) => {
        console.log(`   ${regNo}: appears ${count} times`);
      });
    } else {
      console.log('\n✅ No duplicate registration numbers found');
    }
    
  } catch (error) {
    console.error('Error checking students:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkStudents();
