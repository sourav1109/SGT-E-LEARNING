const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimit');

// Apply rate limiting to all auth endpoints
router.post('/signup', authLimiter, authController.signup); // Only for initial admin setup
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/request-password-reset', authLimiter, authController.requestPasswordReset);
router.get('/reset-password/:token', authController.redirectToResetPage); // Redirect to frontend
router.post('/reset-password/:token', authLimiter, authController.resetPassword);

module.exports = router;
