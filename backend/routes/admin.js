
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { auth, authorizeRoles } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const videoController = require('../controllers/videoController');
const analyticsController = require('../controllers/analyticsController');
const discussionController = require('../controllers/discussionController');
const forumController = require('../controllers/forumController');
const settingController = require('../controllers/settingController');
const { authorizePermissions } = require('../middleware/auth');

// All routes protected by admin role
router.use(auth, authorizeRoles('admin'));

// Bulk messaging (email or notification)
router.post('/bulk-message', authorizeRoles('admin'), adminController.bulkMessage);

// Dashboard activity feed
router.get('/audit-logs/recent', adminController.getRecentAuditLogs);
// Student & Teacher analytics
router.get('/analytics/student/:studentId/heatmap', analyticsController.studentHeatmap);
router.get('/analytics/teacher/:teacherId/performance', analyticsController.teacherPerformance);
router.get('/analytics/export', analyticsController.exportAnalyticsCSV);
// Super Admin: Add admin
router.post('/add-admin', authorizeRoles('admin'), adminController.addAdmin);
// Global settings
router.get('/settings', settingController.getSettings);
router.post('/settings', settingController.updateSetting);
// Change own password
router.post('/change-password', adminController.changeOwnPassword);
// Bulk assign courses via CSV
router.post('/course/bulk-assign', upload.single('file'), adminController.bulkAssignCourses);
// Bulk upload courses via CSV
router.post('/course/bulk', upload.single('file'), adminController.bulkUploadCourses);
// Get all courses
router.get('/courses', adminController.getAllCourses);
// Get all students
router.get('/students', adminController.getAllStudents);
// Get all teachers
router.get('/teachers', adminController.getAllTeachers);
// Search teachers (for dropdown)
router.get('/teachers/search', adminController.searchTeachers);

// Teacher management
router.post('/teacher', authorizePermissions('manage_teachers'), adminController.addTeacher);
router.post('/teacher/bulk', authorizePermissions('manage_teachers'), upload.single('file'), adminController.bulkUploadTeachers);
router.post('/teacher/reset-password', authorizePermissions('manage_teachers'), adminController.resetTeacherPassword);
router.patch('/teacher/:id/deactivate', authorizePermissions('manage_teachers'), adminController.deactivateTeacher);
router.get('/teachers', authorizePermissions('manage_teachers'), adminController.getAllTeachers);

// Student management
router.post('/student', adminController.createStudent);
router.post('/student/bulk', upload.single('file'), adminController.bulkUploadStudents);
router.post('/student/assign-courses', adminController.assignCourses); // batch assign
router.get('/student/:studentId/assignment-history', adminController.getAssignmentHistory);
router.patch('/student/:id', adminController.editStudent);
router.delete('/student/:id', adminController.removeStudent);

// Course management
router.post('/course', adminController.createCourse);
router.patch('/course/:id', adminController.editCourse);
router.delete('/course/:id', adminController.deleteCourse);

// Course details, videos, and students - new endpoints
router.get('/course/:id/details', adminController.getCourseDetails);
router.get('/course/:id/videos', adminController.getCourseVideos);
router.get('/course/:id/students', adminController.getCourseStudents);
router.get('/video/:id/analytics', videoController.getVideoAnalytics);

// Assign course to teacher
router.post('/course/:id/assign-teacher', async (req, res) => {
	try {
		const { teacherId } = req.body;
		// Find the teacher's User ID from teacherId
		const teacher = await require('../models/User').findOne({ teacherId, role: 'teacher' });
		if (!teacher) {
			return res.status(400).json({ message: `Teacher with ID ${teacherId} not found` });
		}
		
		// Add the teacher to the course's teachers array
		await require('../models/Course').findByIdAndUpdate(req.params.id, { 
			$addToSet: { teachers: teacher._id } 
		});
		
		// Also add the course to the teacher's coursesAssigned array for two-way relationship
		await require('../models/User').findByIdAndUpdate(teacher._id, {
			$addToSet: { coursesAssigned: req.params.id }
		});
		
		// Log the action
		await require('../models/AuditLog').create({
			action: 'assign_teacher_to_course',
			performedBy: req.user._id,
			targetUser: teacher._id,
			details: { courseId: req.params.id, teacherId }
		});
		
		res.json({ message: 'Teacher assigned to course' });
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
});

// Video management
router.post('/video/upload', upload.single('file'), videoController.uploadVideo);
router.delete('/video/:id', videoController.removeVideo);
router.patch('/video/:id/warn', videoController.warnVideo);

// Analytics
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/trends', analyticsController.getEnrollmentTrends);
router.get('/analytics/heatmap', analyticsController.getActivityHeatmap);
router.get('/analytics/top-courses', analyticsController.getTopCourses);

// Enhanced/detailed analytics endpoints
router.get('/analytics/detailed/overview', analyticsController.getDetailedOverview);
router.get('/analytics/detailed/trends', analyticsController.getDetailedEnrollmentTrends);
router.get('/analytics/detailed/heatmap', analyticsController.getDetailedActivityHeatmap);
router.get('/analytics/course/:courseId', analyticsController.getCourseAnalytics);
router.get('/analytics/student/:studentId', analyticsController.studentAnalytics); // Legacy endpoint
router.get('/analytics/student/:studentId/detailed', analyticsController.getStudentDetailedAnalytics); // New detailed endpoint
router.get('/analytics/student', analyticsController.searchStudent); // ?regNo=...
router.get('/analytics/teacher/:teacherId', analyticsController.getTeacherAnalytics);

// Discussion forum moderation
router.get('/discussions', discussionController.getAllDiscussions);
router.delete('/discussion/:id', discussionController.removeDiscussion);

// Admin Forum Routes (new endpoints)
router.get('/forums', forumController.getAdminForums);
router.get('/forums/flagged', forumController.getFlaggedContent);
router.get('/forums/statistics', forumController.getForumStatistics);
router.get('/forums/recent-activity', forumController.getRecentActivity);
router.get('/forum-categories', forumController.getForumCategories);
router.post('/forum-category', (req, res) => {
  // Simple placeholder for the API call
  const { name, description } = req.body;
  res.status(201).json({
    _id: Date.now().toString(),
    name,
    description,
    forumsCount: 0,
    createdAt: new Date()
  });
});
router.get('/forum/:forumId', forumController.getForumWithReplies);
router.patch('/forum/:forumId/status', forumController.updateForumStatus);
router.post('/forum/:forumId/reply', forumController.postForumReply);
router.delete('/forum/:forumId', forumController.deleteForum);
router.delete('/forum/reply/:replyId', forumController.deleteForumReply);
router.post('/forums/dismiss-flags', (req, res) => {
  // Simple placeholder to match the frontend API call
  res.json({ message: 'Flags dismissed successfully' });
});

// Link to centralized discussion system
router.use('/discussions', require('../routes/discussionRoutes'));

module.exports = router;
