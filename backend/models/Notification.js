const mongoose = require('mongoose');


const NotificationSchema = new mongoose.Schema({
  type: { type: String }, // e.g., 'inactivity', 'flagged_video', 'registration', 'deadline', 'bulk'
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for bulk messaging
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // for legacy
  message: { type: String, required: true },
  data: { type: Object }, // extra info (e.g., videoId, studentId)
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);
