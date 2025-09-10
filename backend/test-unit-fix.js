const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import models
const Unit = require('./models/Unit');
const Course = require('./models/Course');
const User = require('./models/User');
const StudentProgress = require('./models/StudentProgress');

async function testUnitFixLogic() {
  try {
    console.log('🧪 Testing unit access fix logic...');
    
    // Find a course with units
    const course = await Course.findOne({ hasUnits: true });
    if (!course) {
      console.log('❌ No course with units found');
      return;
    }
    
    console.log(`📚 Testing with course: ${course.title} (${course._id})`);
    
    // Get units for this course
    const units = await Unit.find({ course: course._id }).sort('order');
    console.log(`📖 Found ${units.length} units in course`);
    
    // Get students in this course
    const students = await User.find({
      role: 'student',
      coursesAssigned: course._id
    });
    console.log(`👥 Found ${students.length} students in course`);
    
    // Check current progress
    for (const student of students) {
      const progress = await StudentProgress.findOne({
        student: student._id,
        course: course._id
      });
      
      if (progress) {
        console.log(`\n👤 Student: ${student.email}`);
        console.log(`   Units in progress: ${progress.units.length}`);
        
        for (const unitProgress of progress.units) {
          const unit = await Unit.findById(unitProgress.unitId);
          if (unit) {
            console.log(`   - Unit ${unit.order}: ${unit.title} - Unlocked: ${unitProgress.unlocked}, Quiz Passed: ${unitProgress.unitQuizPassed}`);
          }
        }
        
        // Check which units should be accessible
        let shouldHaveAccess = [];
        for (let i = 0; i < units.length; i++) {
          if (i === 0) {
            // First unit should always be accessible
            shouldHaveAccess.push(units[i]._id.toString());
          } else {
            // Check if previous unit quiz was passed
            const previousUnit = units[i - 1];
            const previousUnitProgress = progress.units.find(u => 
              u.unitId && u.unitId.toString() === previousUnit._id.toString()
            );
            
            if (previousUnitProgress && previousUnitProgress.unitQuizPassed) {
              shouldHaveAccess.push(units[i]._id.toString());
            }
          }
        }
        
        console.log(`   Should have access to ${shouldHaveAccess.length} units`);
        
        // Check for discrepancies
        const currentlyUnlocked = progress.units.filter(u => u.unlocked).map(u => u.unitId.toString());
        const missingAccess = shouldHaveAccess.filter(unitId => !currentlyUnlocked.includes(unitId));
        
        if (missingAccess.length > 0) {
          console.log(`   ⚠️ Missing access to ${missingAccess.length} units that should be unlocked`);
          for (const missingUnitId of missingAccess) {
            const missingUnit = units.find(u => u._id.toString() === missingUnitId);
            if (missingUnit) {
              console.log(`      - Unit ${missingUnit.order}: ${missingUnit.title}`);
            }
          }
        } else {
          console.log(`   ✅ Unit access is correct`);
        }
      } else {
        console.log(`\n👤 Student: ${student.email} - No progress record found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing unit fix logic:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

testUnitFixLogic();
