const Unit = require('../models/Unit');
const Course = require('../models/Course');
const Video = require('../models/Video');
const ReadingMaterial = require('../models/ReadingMaterial');
const StudentProgress = require('../models/StudentProgress');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Create a new unit
exports.createUnit = async (req, res) => {
  try {
    const { title, description, courseId, order } = req.body;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get the maximum order value for units in this course
    const maxOrderUnit = await Unit.findOne({ course: courseId })
      .sort('-order')
      .limit(1);
    
    const nextOrder = maxOrderUnit ? maxOrderUnit.order + 1 : 0;

    // Create the unit with a unique order
    const unit = await Unit.create({
      title,
      description,
      course: courseId,
      order: order !== undefined ? order : nextOrder
    });

    // Update course to include the unit and set hasUnits flag
    await Course.findByIdAndUpdate(courseId, {
      $push: { units: unit._id },
      $set: { hasUnits: true }
    });

    // Check if any students should have access to this new unit
    await unlockUnitForEligibleStudents(unit._id, courseId, unit.order);

    res.status(201).json(unit);
  } catch (err) {
    console.error('Error creating unit:', err);
    
    // Specific error message for duplicate order
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'A unit with this order already exists in the course. Please use a different order.' 
      });
    }
    
    res.status(500).json({ message: err.message });
  }
};

// Get all units for a course
exports.getCourseUnits = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get all units for the course, sorted by order
    const units = await Unit.find({ course: courseId })
      .sort('order')
      .populate('videos', 'title description videoUrl duration sequence')
      .populate('readingMaterials', 'title description contentType order')
      .populate('quizzes', 'title description')
      .populate('quizPool', 'title description quizzes questionsPerAttempt');

    res.json(units);
  } catch (err) {
    console.error('Error getting course units:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get a specific unit with its content
exports.getUnitById = async (req, res) => {
  try {
    const { unitId } = req.params;

    const unit = await Unit.findById(unitId)
      .populate({
        path: 'videos',
        select: 'title description videoUrl duration sequence hasQuizAfter',
        options: { sort: { sequence: 1 } }
      })
      .populate({
        path: 'readingMaterials',
        select: 'title description contentType content fileUrl order',
        options: { sort: { order: 1 } }
      })
      .populate({
        path: 'quizzes',
        select: 'title description video afterVideo'
      })
      .populate({
        path: 'quizPool',
        select: 'title description quizzes questionsPerAttempt timeLimit passingScore'
      });

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json(unit);
  } catch (err) {
    console.error('Error getting unit:', err);
    res.status(500).json({ message: err.message });
  }
};

// Update a unit
exports.updateUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { title, description, order } = req.body;

    const unit = await Unit.findByIdAndUpdate(
      unitId,
      {
        $set: {
          title,
          description,
          order,
          updatedAt: Date.now()
        }
      },
      { new: true }
    );

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json(unit);
  } catch (err) {
    console.error('Error updating unit:', err);
    res.status(500).json({ message: err.message });
  }
};

// Delete a unit
exports.deleteUnit = async (req, res) => {
  try {
    const { unitId } = req.params;

    const unit = await Unit.findById(unitId);
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    // Remove reference from course
    await Course.findByIdAndUpdate(unit.course, {
      $pull: { units: unitId }
    });

    // Check if course still has other units
    const otherUnits = await Unit.countDocuments({ course: unit.course, _id: { $ne: unitId } });
    if (otherUnits === 0) {
      await Course.findByIdAndUpdate(unit.course, {
        $set: { hasUnits: false }
      });
    }

    // Remove unit
    await Unit.findByIdAndDelete(unitId);

    res.json({ message: 'Unit deleted successfully' });
  } catch (err) {
    console.error('Error deleting unit:', err);
    res.status(500).json({ message: err.message });
  }
};

// Add a video to a unit
exports.addVideoToUnit = async (req, res) => {
  try {
    const { unitId } = req.params;
    const { videoId, sequence } = req.body;

    // Validate video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Update video with unit reference and sequence
    await Video.findByIdAndUpdate(videoId, {
      $set: {
        unit: unitId,
        sequence: sequence || 1
      }
    });

    // Add video to unit
    const unit = await Unit.findByIdAndUpdate(
      unitId,
      {
        $addToSet: { videos: videoId }
      },
      { new: true }
    );

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json(unit);
  } catch (err) {
    console.error('Error adding video to unit:', err);
    res.status(500).json({ message: err.message });
  }
};

// Remove a video from a unit
exports.removeVideoFromUnit = async (req, res) => {
  try {
    const { unitId, videoId } = req.params;

    // Update video to remove unit reference
    await Video.findByIdAndUpdate(videoId, {
      $unset: { unit: "" }
    });

    // Remove video from unit
    const unit = await Unit.findByIdAndUpdate(
      unitId,
      {
        $pull: { videos: videoId }
      },
      { new: true }
    );

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json(unit);
  } catch (err) {
    console.error('Error removing video from unit:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get units for a student with progress info
exports.getStudentUnits = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    // Get all units for the course, sorted by order
    const units = await Unit.find({ course: courseId })
      .sort('order')
      .populate({
        path: 'videos',
        select: 'title description videoUrl duration sequence hasQuizAfter',
        options: { sort: { sequence: 1 } }
      })
      .populate({
        path: 'readingMaterials',
        select: 'title description contentType order',
        options: { sort: { order: 1 } }
      })
      .populate({
        path: 'quizzes',
        select: 'title description'
      });

    // Get student progress
    const progress = await StudentProgress.findOne({
      student: studentId,
      course: courseId
    });

    if (!progress) {
      return res.status(404).json({ message: 'Student progress not found' });
    }

    // Get unlocked videos
    const unlockedVideoIds = progress.unlockedVideos.map(id => id.toString());
    
    // Get completed reading materials
    const completedReadingMaterialIds = progress.completedReadingMaterials.map(id => id.toString());

    // Map progress info to units
    const unitsWithProgress = units.map(unit => {
      const unitData = unit.toObject();
      
      // Filter videos to only show unlocked ones
      unitData.videos = unit.videos
        .filter(video => unlockedVideoIds.includes(video._id.toString()))
        .map(video => ({
          ...video.toObject(),
          unlocked: true
        }));
      
      // Mark reading materials as completed or not
      unitData.readingMaterials = unit.readingMaterials.map(material => ({
        ...material.toObject(),
        completed: completedReadingMaterialIds.includes(material._id.toString())
      }));
      
      // Find unit progress in student progress
      const unitProgress = progress.units.find(
        u => u.unitId.toString() === unit._id.toString()
      );
      
      unitData.progress = {
        status: unitProgress ? unitProgress.status : 'locked',
        unlocked: unitProgress ? unitProgress.unlocked : false,
        videosCompleted: unitProgress ? 
          unitProgress.videosWatched.filter(v => v.completed).length : 0,
        totalVideos: unit.videos.length,
        readingMaterialsCompleted: unitProgress ? 
          unitProgress.readingMaterialsCompleted.filter(m => m.completed).length : 0,
        totalReadingMaterials: unit.readingMaterials.length,
        quizzesPassed: unitProgress ? 
          unitProgress.quizAttempts.filter(q => q.passed).length : 0,
        totalQuizzes: unit.quizzes.length
      };
      
      return unitData;
    });

    res.json(unitsWithProgress);
  } catch (err) {
    console.error('Error getting student units:', err);
    res.status(500).json({ message: err.message });
  }
};

// Helper to create a new unit based on existing videos
exports.createUnitFromVideos = async (req, res) => {
  try {
    const { title, description, courseId, videoIds } = req.body;
    
    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Count existing units to determine order
    const unitsCount = await Unit.countDocuments({ course: courseId });
    
    // Create the unit
    const unit = await Unit.create({
      title,
      description,
      course: courseId,
      order: unitsCount
    });
    
    // Update course to include the unit and set hasUnits flag
    await Course.findByIdAndUpdate(courseId, {
      $push: { units: unit._id },
      $set: { hasUnits: true }
    });
    
    // If video IDs provided, add them to the unit
    if (videoIds && videoIds.length > 0) {
      // Validate videos exist and belong to the course
      const videos = await Video.find({
        _id: { $in: videoIds },
        course: courseId
      });
      
      const validVideoIds = videos.map(video => video._id);
      
      // Update unit with videos
      await Unit.findByIdAndUpdate(unit._id, {
        $push: { videos: { $each: validVideoIds } }
      });
      
      // Update each video with unit reference
      for (let i = 0; i < videos.length; i++) {
        await Video.findByIdAndUpdate(videos[i]._id, {
          $set: {
            unit: unit._id,
            sequence: i + 1
          }
        });
      }
    }
    
    // Return the created unit with populated videos
    const createdUnit = await Unit.findById(unit._id)
      .populate('videos', 'title description videoUrl duration sequence');
    
    res.status(201).json(createdUnit);
  } catch (err) {
    console.error('Error creating unit from videos:', err);
    res.status(500).json({ message: err.message });
  }
};

// Helper function to unlock newly created units for students who have completed previous units
async function unlockUnitForEligibleStudents(unitId, courseId, unitOrder) {
  try {
    console.log(`🔓 Checking if unit ${unitId} (order: ${unitOrder}) should be unlocked for students...`);
    
    // If this is the first unit (order 0), unlock it for all students in the course
    if (unitOrder === 0) {
      const User = require('../models/User');
      const students = await User.find({
        role: 'student',
        coursesAssigned: courseId
      });

      for (const student of students) {
        let progress = await StudentProgress.findOne({
          student: student._id,
          course: courseId
        });

        if (!progress) {
          // Create new progress record with first unit unlocked
          progress = await StudentProgress.create({
            student: student._id,
            course: courseId,
            units: [{
              unitId: unitId,
              status: 'in-progress',
              unlocked: true,
              unlockedAt: new Date(),
              videosWatched: [],
              quizAttempts: [],
              unitQuizCompleted: false,
              unitQuizPassed: false,
              allVideosWatched: false
            }],
            unlockedVideos: []
          });
        } else {
          // Check if unit already exists in progress
          const unitExists = progress.units.some(u => u.unitId && u.unitId.toString() === unitId.toString());
          
          if (!unitExists) {
            progress.units.push({
              unitId: unitId,
              status: 'in-progress',
              unlocked: true,
              unlockedAt: new Date(),
              videosWatched: [],
              quizAttempts: [],
              unitQuizCompleted: false,
              unitQuizPassed: false,
              allVideosWatched: false
            });
            await progress.save();
          }
        }
      }
      
      console.log(`✅ Unlocked first unit for all students in course ${courseId}`);
      return;
    }

    // For non-first units, check students who have passed the previous unit
    const previousUnitOrder = unitOrder - 1;
    
    // Find the previous unit
    const previousUnit = await Unit.findOne({
      course: courseId,
      order: previousUnitOrder
    });

    if (!previousUnit) {
      console.log(`⚠️ No previous unit found for order ${previousUnitOrder}`);
      return;
    }

    // Find students who have passed the quiz for the previous unit
    const studentsWithProgress = await StudentProgress.find({
      course: courseId,
      'units.unitId': previousUnit._id,
      'units.unitQuizPassed': true
    }).populate('student', '_id email');

    console.log(`📚 Found ${studentsWithProgress.length} students who passed previous unit quiz`);

    for (const progress of studentsWithProgress) {
      // Check if the new unit is already unlocked for this student
      const newUnitProgress = progress.units.find(u => 
        u.unitId && u.unitId.toString() === unitId.toString()
      );

      if (!newUnitProgress) {
        // Add the new unit as unlocked
        progress.units.push({
          unitId: unitId,
          status: 'in-progress',
          unlocked: true,
          unlockedAt: new Date(),
          videosWatched: [],
          quizAttempts: [],
          unitQuizCompleted: false,
          unitQuizPassed: false,
          allVideosWatched: false
        });

        // Unlock the first video in the new unit if it exists
        const newUnit = await Unit.findById(unitId).populate('videos');
        if (newUnit && newUnit.videos && newUnit.videos.length > 0) {
          const firstVideoId = newUnit.videos[0]._id.toString();
          if (!progress.unlockedVideos.includes(firstVideoId)) {
            progress.unlockedVideos.push(firstVideoId);
          }
        }

        await progress.save();
        
        console.log(`🎓 Unlocked unit ${unitId} for student ${progress.student.email || progress.student._id}`);
      } else if (!newUnitProgress.unlocked) {
        // Unit exists but is locked, unlock it
        newUnitProgress.unlocked = true;
        newUnitProgress.unlockedAt = new Date();
        newUnitProgress.status = 'in-progress';

        // Unlock the first video in the unit
        const newUnit = await Unit.findById(unitId).populate('videos');
        if (newUnit && newUnit.videos && newUnit.videos.length > 0) {
          const firstVideoId = newUnit.videos[0]._id.toString();
          if (!progress.unlockedVideos.includes(firstVideoId)) {
            progress.unlockedVideos.push(firstVideoId);
          }
        }

        await progress.save();
        
        console.log(`🔓 Updated unit unlock status for student ${progress.student.email || progress.student._id}`);
      }
    }

    console.log(`✅ Completed unit unlock process for unit ${unitId}`);

  } catch (error) {
    console.error('❌ Error unlocking unit for eligible students:', error);
  }
}

// Manual endpoint to recalculate and unlock units for all students in a course
exports.recalculateUnitAccess = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    console.log(`🔄 Recalculating unit access for course ${courseId}...`);
    
    // Get all units in the course, sorted by order
    const units = await Unit.find({ course: courseId }).sort('order');
    
    if (units.length === 0) {
      return res.status(404).json({ message: 'No units found for this course' });
    }

    // Get all students assigned to this course
    const User = require('../models/User');
    const students = await User.find({
      role: 'student',
      coursesAssigned: courseId
    });

    let updatedStudents = 0;
    let totalUnlockedUnits = 0;

    for (const student of students) {
      let progress = await StudentProgress.findOne({
        student: student._id,
        course: courseId
      });

      if (!progress) {
        // Create new progress record
        progress = await StudentProgress.create({
          student: student._id,
          course: courseId,
          units: [],
          unlockedVideos: []
        });
      }

      let studentUpdated = false;

      // Check each unit in order
      for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        const unitProgress = progress.units.find(u => 
          u.unitId && u.unitId.toString() === unit._id.toString()
        );

        // Determine if this unit should be unlocked
        let shouldUnlock = false;
        
        if (i === 0) {
          // First unit should always be unlocked
          shouldUnlock = true;
        } else {
          // Check if previous unit quiz was passed
          const previousUnit = units[i - 1];
          const previousUnitProgress = progress.units.find(u => 
            u.unitId && u.unitId.toString() === previousUnit._id.toString()
          );
          
          if (previousUnitProgress && previousUnitProgress.unitQuizPassed) {
            shouldUnlock = true;
          }
        }

        if (shouldUnlock) {
          if (!unitProgress) {
            // Add new unit progress
            progress.units.push({
              unitId: unit._id,
              status: 'in-progress',
              unlocked: true,
              unlockedAt: new Date(),
              videosWatched: [],
              quizAttempts: [],
              unitQuizCompleted: false,
              unitQuizPassed: false,
              allVideosWatched: false
            });
            studentUpdated = true;
            totalUnlockedUnits++;

            // Unlock first video in the unit
            const unitWithVideos = await Unit.findById(unit._id).populate('videos');
            if (unitWithVideos && unitWithVideos.videos && unitWithVideos.videos.length > 0) {
              const firstVideoId = unitWithVideos.videos[0]._id.toString();
              if (!progress.unlockedVideos.includes(firstVideoId)) {
                progress.unlockedVideos.push(firstVideoId);
              }
            }
          } else if (!unitProgress.unlocked) {
            // Update existing unit to unlocked
            unitProgress.unlocked = true;
            unitProgress.unlockedAt = new Date();
            unitProgress.status = 'in-progress';
            studentUpdated = true;
            totalUnlockedUnits++;

            // Unlock first video in the unit
            const unitWithVideos = await Unit.findById(unit._id).populate('videos');
            if (unitWithVideos && unitWithVideos.videos && unitWithVideos.videos.length > 0) {
              const firstVideoId = unitWithVideos.videos[0]._id.toString();
              if (!progress.unlockedVideos.includes(firstVideoId)) {
                progress.unlockedVideos.push(firstVideoId);
              }
            }
          }
        }
      }

      if (studentUpdated) {
        await progress.save();
        updatedStudents++;
      }
    }

    console.log(`✅ Recalculation complete: Updated ${updatedStudents} students, unlocked ${totalUnlockedUnits} units`);

    res.json({
      message: 'Unit access recalculated successfully',
      studentsUpdated: updatedStudents,
      unitsUnlocked: totalUnlockedUnits,
      totalStudents: students.length,
      totalUnits: units.length
    });

  } catch (err) {
    console.error('❌ Error recalculating unit access:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = exports;
