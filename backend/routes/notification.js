const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// All notifications for current admin
router.get('/', auth, authorizeRoles('admin'), notificationController.getNotifications);
// Mark as read
router.patch('/:id/read', auth, authorizeRoles('admin'), notificationController.markAsRead);

module.exports = router;
