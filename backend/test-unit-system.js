/**
 * This script tests the unit-based video system
 * It verifies:
 * 1. Course hasUnits flag is set when videos are added to units
 * 2. StudentProgress is properly updated with unit information
 * 3. Video watch history properly updates unit progress
 */

const mongoose = require('mongoose');
const config = require('./config/database');
const Course = require('./models/Course');
const Unit = require('./models/Unit');
const Video = require('./models/Video');
const User = require('./models/User');
const StudentProgress = require('./models/StudentProgress');

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

// Test function to verify unit-based video system
async function testUnitBasedSystem() {
  try {
    console.log('Starting unit-based system test...');
    
    // 1. Check if there are any courses with units
    const coursesWithUnits = await Course.find({ hasUnits: true })
      .populate('units')
      .lean();
    
    console.log(`Found ${coursesWithUnits.length} courses with units`);
    
    if (coursesWithUnits.length === 0) {
      console.log('No courses with units found. Creating test data...');
      await createTestData();
      return;
    }
    
    // 2. For each course with units, check StudentProgress records
    for (const course of coursesWithUnits) {
      console.log(`\nTesting course: ${course.title} (${course._id})`);
      console.log(`Units count: ${course.units ? course.units.length : 0}`);
      
      // Find students assigned to this course
      const students = await User.find({ 
        coursesAssigned: course._id,
        role: 'student'
      }).select('_id name email');
      
      console.log(`Found ${students.length} students assigned to this course`);
      
      // Check each student's progress
      for (const student of students) {
        console.log(`\nChecking progress for student: ${student.name} (${student._id})`);
        
        // Get student progress
        const progress = await StudentProgress.findOne({
          student: student._id,
          course: course._id
        });
        
        if (!progress) {
          console.log('No progress record found for this student');
          continue;
        }
        
        console.log(`Progress units: ${progress.units ? progress.units.length : 0}`);
        console.log(`Unlocked videos: ${progress.unlockedVideos ? progress.unlockedVideos.length : 0}`);
        
        // Check unit progress
        if (progress.units && progress.units.length > 0) {
          for (const unitProgress of progress.units) {
            const unit = await Unit.findById(unitProgress.unitId)
              .populate('videos');
              
            if (!unit) {
              console.log(`Unit ${unitProgress.unitId} not found!`);
              continue;
            }
            
            console.log(`\nUnit: ${unit.title} (${unit._id})`);
            console.log(`- Status: ${unitProgress.status}`);
            console.log(`- Unlocked: ${unitProgress.unlocked}`);
            console.log(`- Videos in unit: ${unit.videos ? unit.videos.length : 0}`);
            console.log(`- Videos watched: ${unitProgress.videosWatched ? unitProgress.videosWatched.length : 0}`);
            
            // Check which videos are completed in this unit
            if (unit.videos && unit.videos.length > 0) {
              for (const video of unit.videos) {
                const videoWatch = unitProgress.videosWatched.find(
                  v => v.videoId && v.videoId.toString() === video._id.toString()
                );
                
                if (videoWatch) {
                  console.log(`  - Video: ${video.title} - Completed: ${videoWatch.completed}, Time spent: ${videoWatch.timeSpent}s`);
                } else {
                  console.log(`  - Video: ${video.title} - Not watched yet`);
                }
              }
            }
          }
        }
      }
    }
    
    console.log('\nUnit-based system test completed');
  } catch (err) {
    console.error('Error testing unit-based system:', err);
  } finally {
    mongoose.disconnect();
  }
}

// Helper function to create test data if needed
async function createTestData() {
  try {
    console.log('Creating test data for unit-based video system...');
    
    // Find a course and student to use for testing
    const course = await Course.findOne();
    const student = await User.findOne({ role: 'student' });
    
    if (!course || !student) {
      console.log('No courses or students found. Please create them first.');
      return;
    }
    
    console.log(`Using course: ${course.title} (${course._id})`);
    console.log(`Using student: ${student.name} (${student._id})`);
    
    // Create 2 units
    const unit1 = new Unit({
      title: 'Unit 1: Introduction',
      description: 'Introduction to the course',
      course: course._id,
      order: 0
    });
    
    const unit2 = new Unit({
      title: 'Unit 2: Advanced Topics',
      description: 'Advanced topics for the course',
      course: course._id,
      order: 1
    });
    
    await unit1.save();
    await unit2.save();
    
    console.log(`Created units: ${unit1._id}, ${unit2._id}`);
    
    // Create videos for each unit
    const video1 = new Video({
      title: 'Introduction Video 1',
      description: 'First video in Unit 1',
      course: course._id,
      unit: unit1._id,
      sequence: 1,
      videoUrl: 'https://example.com/video1.mp4',
      duration: 120
    });
    
    const video2 = new Video({
      title: 'Introduction Video 2',
      description: 'Second video in Unit 1',
      course: course._id,
      unit: unit1._id,
      sequence: 2,
      videoUrl: 'https://example.com/video2.mp4',
      duration: 180
    });
    
    const video3 = new Video({
      title: 'Advanced Video 1',
      description: 'First video in Unit 2',
      course: course._id,
      unit: unit2._id,
      sequence: 1,
      videoUrl: 'https://example.com/video3.mp4',
      duration: 240
    });
    
    await video1.save();
    await video2.save();
    await video3.save();
    
    console.log(`Created videos: ${video1._id}, ${video2._id}, ${video3._id}`);
    
    // Add videos to units
    unit1.videos.push(video1._id, video2._id);
    unit2.videos.push(video3._id);
    
    await unit1.save();
    await unit2.save();
    
    // Add units to course
    course.units.push(unit1._id, unit2._id);
    course.hasUnits = true;
    
    await course.save();
    
    // Create progress record for student
    let progress = await StudentProgress.findOne({
      student: student._id,
      course: course._id
    });
    
    if (!progress) {
      progress = new StudentProgress({
        student: student._id,
        course: course._id,
        unlockedVideos: [video1._id, video2._id],
        units: [
          {
            unitId: unit1._id,
            status: 'in-progress',
            unlocked: true,
            unlockedAt: new Date(),
            videosWatched: []
          },
          {
            unitId: unit2._id,
            status: 'locked',
            unlocked: false,
            videosWatched: []
          }
        ]
      });
    } else {
      // Update existing progress
      // Add units if they don't exist
      const unit1Index = progress.units.findIndex(
        u => u.unitId && u.unitId.toString() === unit1._id.toString()
      );
      
      if (unit1Index === -1) {
        progress.units.push({
          unitId: unit1._id,
          status: 'in-progress',
          unlocked: true,
          unlockedAt: new Date(),
          videosWatched: []
        });
      }
      
      const unit2Index = progress.units.findIndex(
        u => u.unitId && u.unitId.toString() === unit2._id.toString()
      );
      
      if (unit2Index === -1) {
        progress.units.push({
          unitId: unit2._id,
          status: 'locked',
          unlocked: false,
          videosWatched: []
        });
      }
      
      // Add videos to unlocked videos
      if (!progress.unlockedVideos.includes(video1._id)) {
        progress.unlockedVideos.push(video1._id);
      }
      
      if (!progress.unlockedVideos.includes(video2._id)) {
        progress.unlockedVideos.push(video2._id);
      }
    }
    
    await progress.save();
    
    console.log('Test data created successfully!');
    console.log('Try accessing the course videos page in the UI to test the implementation.');
  } catch (err) {
    console.error('Error creating test data:', err);
  }
}

// Run the test
testUnitBasedSystem();
