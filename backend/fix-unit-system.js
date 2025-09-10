// Fix for video loading errors across components
// This script diagnoses and fixes errors related to the unit-based video system

console.log('Starting diagnostic check for unit-based video system...');

// 1. Check if required models exist
console.log('Checking required models...');
const requiredModels = [
  './models/Course.js',
  './models/Unit.js',
  './models/Video.js',
  './models/StudentProgress.js'
];

const fs = require('fs');
let allModelsExist = true;

for (const model of requiredModels) {
  if (!fs.existsSync(model)) {
    console.error(`Missing model: ${model}`);
    allModelsExist = false;
  }
}

if (!allModelsExist) {
  console.error('Please ensure all required models exist before proceeding.');
  process.exit(1);
}

console.log('All required models exist.');

// 2. Verify API endpoints
const express = require('express');
const app = express();

// Load routes to verify they exist
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const unitRoutes = require('./routes/unit');

// Check for unit routes
if (!unitRoutes) {
  console.error('Unit routes not found.');
  process.exit(1);
}

console.log('API routes verified.');

// 3. Check for required fields in StudentProgress model
const mongoose = require('mongoose');
const StudentProgress = require('./models/StudentProgress');

const sampleProgress = new StudentProgress({
  student: new mongoose.Types.ObjectId(),
  course: new mongoose.Types.ObjectId(),
  unlockedVideos: [],
  units: []
});

// Verify units field exists
if (!sampleProgress.units) {
  console.error('StudentProgress model missing units field.');
  process.exit(1);
}

console.log('StudentProgress model verified.');

// 4. Check Course model for hasUnits field
const Course = require('./models/Course');

const sampleCourse = new Course({
  title: 'Test Course',
  courseCode: 'TEST123'
});

if (sampleCourse.hasUnits === undefined) {
  console.error('Course model missing hasUnits field.');
  process.exit(1);
}

console.log('Course model verified.');

// 5. Create a fix script that updates all courses to have the correct hasUnits flag
console.log('Generating fix script for courses...');

const fixScript = `
const mongoose = require('mongoose');
const config = require('./config/database');
const Course = require('./models/Course');
const Unit = require('./models/Unit');

// Connect to MongoDB
mongoose.connect(config.database, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function fixCourseUnitsFlag() {
  try {
    console.log('Starting to fix course hasUnits flags...');
    
    // Get all courses
    const courses = await Course.find();
    console.log(\`Found \${courses.length} courses\`);
    
    let updated = 0;
    
    for (const course of courses) {
      // Check if course has units
      const units = await Unit.find({ course: course._id });
      
      const shouldHaveUnitsFlag = units.length > 0;
      
      if (course.hasUnits !== shouldHaveUnitsFlag) {
        console.log(\`Updating course \${course.title} (\${course._id}): hasUnits = \${shouldHaveUnitsFlag}\`);
        
        course.hasUnits = shouldHaveUnitsFlag;
        await course.save();
        
        updated++;
      }
    }
    
    console.log(\`Updated hasUnits flag for \${updated} courses\`);
  } catch (err) {
    console.error('Error fixing course hasUnits flags:', err);
  } finally {
    mongoose.disconnect();
  }
}

fixCourseUnitsFlag();
`;

// Write the fix script to file
fs.writeFileSync('./fix-course-units.js', fixScript);
console.log('Fix script created: fix-course-units.js');

// 6. Create a test script to validate the frontend components
console.log('Creating frontend test instructions...');

const testInstructions = `
# Testing Unit-Based Video System in Frontend

Follow these steps to verify the unit-based video system is working correctly:

## 1. Login as Admin
- Create a new course or use an existing one
- Add at least 2 units to the course
- Add videos to each unit
- Assign students to the course

## 2. Login as Student
- Navigate to the course
- Verify you can see the units view
- Verify the first unit is unlocked
- Watch videos in the first unit
- Complete all videos in the first unit to unlock the next unit

## 3. Test Legacy Interface
- Navigate to the course videos page (not units)
- Verify you can see all unlocked videos
- Verify videos show their unit information
- Click on a video to watch it
- Verify progress is tracked correctly

## 4. Test Error Scenarios
- Attempt to access a locked unit directly by URL
- Attempt to access a video in a locked unit directly by URL
- Verify appropriate error messages are shown

## 5. Test Completion
- Complete all videos in all units
- Verify the course shows as completed
- Check if completion is reflected in the student dashboard

## Troubleshooting
If videos fail to load, check:
1. Browser console for errors
2. Network tab for API responses
3. Server logs for backend errors
4. Verify the video URLs are correct and accessible
5. Check if StudentProgress records exist for the student
`;

fs.writeFileSync('./frontend-test-instructions.md', testInstructions);
console.log('Frontend test instructions created: frontend-test-instructions.md');

// 7. Final diagnostics
console.log('\nDiagnostic check completed.');
console.log('To fix any issues:');
console.log('1. Run the fix script: node fix-course-units.js');
console.log('2. Run the unit test script: node test-unit-system.js');
console.log('3. Follow the frontend test instructions');
console.log('\nIf you continue to experience issues, please check the server logs for detailed error messages.');
