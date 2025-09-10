const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

// All routes protected by student role
router.use(auth, authorizeRoles('student'));

// Get all courses assigned to student with progress info
router.get('/courses', studentController.getStudentCourses);

// Get videos for a course
router.get('/course/:courseId/videos', studentController.getCourseVideos);

// Update watch history for a video
router.post('/video/:videoId/watch', studentController.updateWatchHistory);

// Get student's watch history across all courses
router.get('/watch-history', studentController.getStudentWatchHistory);

// Get detailed progress for a specific course
router.get('/course/:courseId/progress', studentController.getCourseProgress);

// Get student's quiz pool attempts for a course
router.get('/course/:courseId/quiz-pool-attempts', studentController.getStudentQuizPoolAttempts);

// Connect to centralized forum system
router.use('/discussions', require('../routes/discussionRoutes'));

module.exports = router;
