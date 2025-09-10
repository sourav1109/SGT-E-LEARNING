const mongoose = require('mongoose');
const User = require('./models/User');
const Video = require('./models/Video');
require('dotenv').config();

// Connect to MongoDB using environment config
mongoose.connect(process.env.MONGODB_URI);

async function fixInflatedWatchTimes() {
  try {
    console.log('🔧 Starting to fix inflated watch times...');
    
    // Get all students with watch history
    const students = await User.find({ 
      role: 'student',
      'watchHistory.0': { $exists: true }
    });
    
    console.log(`📊 Found ${students.length} students with watch history`);
    
    let totalFixed = 0;
    let totalProcessed = 0;
    
    for (const student of students) {
      console.log(`\n👤 Processing ${student.email || student._id}`);
      let studentFixed = 0;
      
      for (const watchRecord of student.watchHistory) {
        totalProcessed++;
        
        // Check for clearly inflated values
        const isSuspicious = watchRecord.timeSpent > 7200 || // More than 2 hours
                           watchRecord.timeSpent >= 9999;   // Fallback value
        
        if (isSuspicious) {
          console.log(`  ⚠️  Found suspicious timeSpent: ${watchRecord.timeSpent}s (${Math.floor(watchRecord.timeSpent/60)}m)`);
          
          // Get the video to check its actual duration
          const video = await Video.findById(watchRecord.video);
          if (video && video.duration > 0) {
            const originalTime = watchRecord.timeSpent;
            
            // Cap timeSpent to video duration if it's unreasonably high
            if (watchRecord.timeSpent > video.duration * 1.2) { // 20% buffer for seeking
              watchRecord.timeSpent = video.duration;
              console.log(`    🔧 Fixed: ${Math.floor(originalTime/60)}m -> ${Math.floor(watchRecord.timeSpent/60)}m (video: ${Math.floor(video.duration/60)}m)`);
              studentFixed++;
              totalFixed++;
            }
          } else if (watchRecord.timeSpent >= 9999) {
            // Handle fallback values where video duration is unknown
            watchRecord.timeSpent = 600; // Set to 10 minutes as reasonable default
            console.log(`    🔧 Fixed fallback value: 9999 -> 600s (10m)`);
            studentFixed++;
            totalFixed++;
          } else if (watchRecord.timeSpent > 3600) {
            // Cap unknown videos to 1 hour maximum
            watchRecord.timeSpent = 3600;
            console.log(`    🔧 Capped unknown video to 1 hour`);
            studentFixed++;
            totalFixed++;
          }
        }
      }
      
      if (studentFixed > 0) {
        await student.save();
        console.log(`  ✅ Saved ${studentFixed} fixes for this student`);
      } else {
        console.log(`  ✅ No issues found`);
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total records processed: ${totalProcessed}`);
    console.log(`   - Records fixed: ${totalFixed}`);
    console.log(`   - Students processed: ${students.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing inflated watch times:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run the fix
fixInflatedWatchTimes();
