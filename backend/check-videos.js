const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Import Video model
const Video = require('./models/Video');

// Check video records in database
async function checkVideos() {
  try {
    const videos = await Video.find();
    console.log(`\nFound ${videos.length} videos in database:`);
    
    videos.forEach(video => {
      console.log(`- ID: ${video._id}`);
      console.log(`  Title: ${video.title}`);
      console.log(`  VideoUrl: ${video.videoUrl}`);
      console.log('---');
    });
    
    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error checking videos in database:', err);
    mongoose.connection.close();
  }
}

checkVideos();
