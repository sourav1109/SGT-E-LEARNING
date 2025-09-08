const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  videoUrl: { type: String, required: true },
  duration: { type: Number }, // Duration in seconds
  resourceFiles: [{ type: String }],
  warned: { type: Boolean, default: false },
  watchRecords: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timeSpent: { type: Number, default: 0 },
    lastWatched: { type: Date }
  }],
  analytics: {
    totalViews: { type: Number, default: 0 },
    totalWatchTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    lastUpdated: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
