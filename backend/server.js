const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();
require('dotenv').config();

app.use(cors());

app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const roleRoutes = require('./routes/role');
const notificationRoutes = require('./routes/notification');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const discussionRoutes = require('./routes/discussion');
const centralizedDiscussionRoutes = require('./routes/discussionRoutes');
const quizRoutes = require('./routes/quiz');
const quizPoolRoutes = require('./routes/quizPool');
const unitRoutes = require('./routes/unit');
// const readingMaterialRoutes = require('./routes/readingMaterial');
const teacherRequestRoutes = require('./routes/teacherRequest');
const studentQuizAttemptRoutes = require('./routes/studentQuizAttempt');
const unitQuizRoutes = require('./routes/unitQuiz');
const announcementRoutes = require('./routes/announcement');
const schoolRoutes = require('./routes/school');
const departmentRoutes = require('./routes/department');

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', roleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/discussions', discussionRoutes); // Legacy discussion route
app.use('/api/forums', centralizedDiscussionRoutes); // New centralized forum system
app.use('/api/quizzes', quizRoutes); // Quiz routes
app.use('/api/quiz-pools', quizPoolRoutes); // Quiz pool routes
app.use('/api/unit', unitRoutes); // Unit routes (mounted at /api/unit)
app.use('/api/units', unitRoutes); // Unit routes (also mounted at /api/units for backwards compatibility)
// app.use('/api/reading-materials', readingMaterialRoutes); // Reading material routes
app.use('/api/teacher-requests', teacherRequestRoutes);
app.use('/api/student', studentQuizAttemptRoutes); // Student quiz attempt routes (delete incomplete)
app.use('/api/student', unitQuizRoutes); // Unit quiz routes for students
app.use('/api/announcement', announcementRoutes); // Generic announcement route
app.use('/api/schools', schoolRoutes); // School management routes
app.use('/api/departments', departmentRoutes); // Department management routes

// Connect to MongoDB using only the .env file configuration
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    
    // Run migrations after successful connection
    const generateTeacherIds = require('./migrations/generateTeacherIds');
    generateTeacherIds();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    console.log('Please check your MONGO_URI in .env file and ensure MongoDB is running');
    process.exit(1); // Exit with error code
  });

const db = mongoose.connection;
db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  console.log('Please check your MONGO_URI in .env file and ensure MongoDB is running');
});
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.get('/', (req, res) => {
  res.send('SGT Project Backend Running');
});

// Add a database status check endpoint for debugging
app.get('/api/db-status', (req, res) => {
  const status = {
    isConnected: mongoose.connection.readyState === 1,
    connectionState: mongoose.connection.readyState,
    stateDescription: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
  };
  res.json(status);
});


// Auto-create single admin if not exists
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Admin';
    if (!email || !password) {
      console.warn('Admin credentials not set in .env');
      return;
    }
    let user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      const hashed = await bcrypt.hash(password, 10);
      user = new User({
        name,
        email,
        password: hashed,
        role: 'admin',
        permissions: ['*'],
        isActive: true,
        emailVerified: true
      });
      await user.save();
      console.log('Admin created:', email);
    } else {
      console.log('Admin already exists:', email);
    }
  } catch (err) {
    console.error('Error creating admin:', err.message);
  }
}

const PORT = process.env.PORT || 5000;

// Error handling middleware for multer and file uploads
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    // Multer error handling
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 100MB.' 
      });
    }
    return res.status(400).json({ message: err.message });
  } else if (err.message === 'Only video files are allowed') {
    return res.status(400).json({ message: err.message });
  }
  // For any other errors
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, async () => {
  await createAdmin();
  
  // Run migrations
  const generateTeacherIds = require('./migrations/generateTeacherIds');
  await generateTeacherIds();
  
  console.log(`Server running on port ${PORT}`);
});
