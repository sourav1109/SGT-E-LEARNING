const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseCode: { type: String, unique: true, index: true },
  title: { type: String, required: true, index: true },
  description: { type: String },
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }]
});

// Compound index for fast search by teachers and title
courseSchema.index({ teachers: 1, title: 1 });
courseSchema.index({ courseCode: 1 });

module.exports = mongoose.model('Course', courseSchema);
