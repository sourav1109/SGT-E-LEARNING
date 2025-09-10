const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseCode: { type: String, unique: true, index: true },
  title: { type: String, required: true, index: true },
  description: { type: String },
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  units: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }],
  hasUnits: { type: Boolean, default: false }
});

// Virtual for calculating total video count including those in units
courseSchema.virtual('totalVideos').get(async function() {
  const directVideoCount = this.videos.length;
  let unitVideoCount = 0;
  
  if (this.hasUnits && this.units && this.units.length > 0) {
    const Unit = mongoose.model('Unit');
    const units = await Unit.find({ _id: { $in: this.units } });
    unitVideoCount = units.reduce((total, unit) => total + (unit.videos ? unit.videos.length : 0), 0);
  }
  
  return directVideoCount + unitVideoCount;
});

// Compound index for fast search by teachers and title
courseSchema.index({ teachers: 1, title: 1 });
courseSchema.index({ courseCode: 1 });

module.exports = mongoose.model('Course', courseSchema);
