const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const courseChatController = require('../controllers/courseChatController');

// All routes protected
router.use(auth);

// Get all chat messages for a course
router.get('/course/:courseId/chat', courseChatController.getCourseChat);
// Post a new chat message to a course
router.post('/course/:courseId/chat', courseChatController.postCourseChat);

module.exports = router;
