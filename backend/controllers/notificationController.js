const Notification = require('../models/Notification');
const User = require('../models/User');

// Fetch notifications for current admin
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create notification (utility)
exports.createNotification = async ({ type, recipient, message, data }) => {
  await Notification.create({ type, recipient, message, data });
};

// Generate inactivity notifications (to be run as a scheduled job)
exports.generateInactivityAlerts = async (days = 7) => {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const inactiveStudents = await User.find({ role: 'student', lastActive: { $lt: cutoff } });
  const admins = await User.find({ role: 'admin' });
  for (const student of inactiveStudents) {
    for (const admin of admins) {
      await Notification.create({
        type: 'inactivity',
        recipient: admin._id,
        message: `Student ${student.name} inactive for ${days} days`,
        data: { studentId: student._id },
      });
    }
  }
};

// Call this utility in relevant places for flagged videos, new registrations, deadlines, etc.
