const mongoose = require('mongoose');
const Video = require('./models/Video');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    fetchVideos();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  });

async function fetchVideos() {
  try {
    // Get all videos and their URLs
    const videos = await Video.find().select('title videoUrl course');
    
    console.log('Total videos found:', videos.length);
    
    videos.forEach(video => {
      console.log('Video ID:', video._id);
      console.log('Title:', video.title);
      console.log('URL:', video.videoUrl);
      console.log('Course:', video.course);
      console.log('-------------------');
    });
    
    // Disconnect from MongoDB
    mongoose.connection.close();
    console.log('Test complete');
  } catch (err) {
    console.error('Error fetching videos:', err);
    mongoose.connection.close();
  }
}
