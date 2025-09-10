const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');

// Get announcements for the authenticated user (works for all roles)
router.get('/', auth, announcementController.getAnnouncements);

// Get edit history for a specific announcement
router.get('/:id/history', auth, announcementController.getAnnouncementHistory);

module.exports = router;
