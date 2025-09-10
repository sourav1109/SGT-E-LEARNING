const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'teacher'], required: true },
  message: { type: String, required: true },
  recipients: [{ type: String, enum: ['teacher', 'student'] }], // for superadmin or admin or admin
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // for teacher
  createdAt: { type: Date, default: Date.now },
  isEdited: { type: Boolean, default: false },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date },
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date, default: Date.now },
    previousMessage: { type: String },
    previousRecipients: [{ type: String, enum: ['teacher', 'student'] }]
  }]
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
