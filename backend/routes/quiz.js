const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const quizPoolController = require('../controllers/quizPoolController');
const { auth, authorizeRoles } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
const upload = uploadMiddleware('quizzes'); // Create a quizzes folder for uploads

// Quiz template
router.get('/template', auth, authorizeRoles('teacher', 'admin'), quizController.createQuizTemplate);

// Quiz routes
router.post('/upload', auth, authorizeRoles('teacher', 'admin'), upload.single('file'), quizController.uploadQuiz);
router.get('/course/:courseId', auth, quizController.getCourseQuizzes);
router.get('/analytics/:quizId', auth, authorizeRoles('teacher', 'admin'), quizController.getQuizAnalytics);
router.get('/details/:quizId', auth, authorizeRoles('teacher', 'admin'), quizController.getQuizDetails);
router.get('/teacher/pools', auth, authorizeRoles('teacher'), quizController.getTeacherQuizPools);

// Student quiz routes
router.get('/unit/:unitId/student', auth, authorizeRoles('student'), quizController.getUnitQuizForStudent);
router.post('/pool/:quizPoolId/submit', auth, authorizeRoles('student'), quizController.submitQuizPoolAttempt);
router.get('/student/:studentId/results', auth, quizController.getStudentQuizResults);

// Quiz pool routes
router.post('/pool/create', auth, authorizeRoles('teacher', 'admin'), quizPoolController.createQuizPool);
router.post('/pool/:quizPoolId/add-quiz', auth, authorizeRoles('teacher', 'admin'), quizPoolController.addQuizToPool);
router.delete('/pool/:quizPoolId/quiz/:quizId', auth, authorizeRoles('teacher', 'admin'), quizPoolController.removeQuizFromPool);
router.get('/pool/course/:courseId', auth, quizPoolController.getCourseQuizPools);
router.get('/pool/:quizPoolId', auth, quizPoolController.getQuizPoolDetails);
router.get('/pool/:quizPoolId/analytics', auth, authorizeRoles('teacher', 'admin'), quizPoolController.getQuizPoolAnalytics);

module.exports = router;
