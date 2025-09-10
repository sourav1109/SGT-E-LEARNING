const User = require('../models/User');
const Video = require('../models/Video');
const Course = require('../models/Course');
const QuizAttempt = require('../models/QuizAttempt');
const StudentProgress = require('../models/StudentProgress');
const mongoose = require('mongoose');

// Get all courses assigned to student with progress info
exports.getStudentCourses = async (req, res) => {
  try {
    // Get student with courses
    const student = await User.findById(req.user._id)
      .populate('coursesAssigned', 'title courseCode description')
      .select('coursesAssigned watchHistory');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // For each course, get videos and calculate progress
    const coursesWithProgress = await Promise.all(student.coursesAssigned.map(async (course) => {
      // Get all videos for this course and include teacher information
      const courseWithVideos = await Course.findById(course._id)
        .populate('videos', 'title duration')
        .populate('teachers', 'name');
      
      if (!courseWithVideos || !courseWithVideos.videos) {
        return {
          _id: course._id,
          title: course.title,
          courseCode: course.courseCode,
          description: course.description,
          totalVideos: 0,
          videosCompleted: 0,
          progress: 0,
          totalDuration: 0,
          teacher: courseWithVideos && courseWithVideos.teachers && courseWithVideos.teachers.length > 0 
            ? courseWithVideos.teachers[0].name : 'Not assigned'
        };
      }
      
      // Calculate progress
      const totalVideos = courseWithVideos.videos.length;
      
      // Calculate total duration
      let totalDuration = 0;
      courseWithVideos.videos.forEach(video => {
        if (video.duration && video.duration > 0) {
          totalDuration += video.duration;
        }
      });
      
      let videosCompleted = 0;
      let videosStarted = 0;
      
      courseWithVideos.videos.forEach(video => {
        const watchRecord = student.watchHistory.find(
          record => record.video && record.video.toString() === video._id.toString()
        );
        
        if (watchRecord && watchRecord.timeSpent > 0) {
          videosStarted++;
          
          // If video has duration, check if it's completed (90% watched)
          if (video.duration && video.duration > 0) {
            const percentageWatched = (watchRecord.timeSpent / video.duration) * 100;
            if (percentageWatched >= 90) {
              videosCompleted++;
            }
          }
        }
      });
      
      const progress = totalVideos > 0
        ? Math.round((videosCompleted / totalVideos) * 100)
        : 0;
      
      return {
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode,
        description: course.description,
        totalVideos,
        videosStarted,
        videosCompleted,
        progress,
        totalDuration,
        teacher: courseWithVideos.teachers && courseWithVideos.teachers.length > 0 
          ? courseWithVideos.teachers[0].name : 'Not assigned'
      };
    }));
    
    res.json(coursesWithProgress);
  } catch (err) {
    console.error('Error getting student courses:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get videos for a course (grouped by units if available)
exports.getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log('Student getCourseVideos called for course:', courseId, 'by user:', req.user._id);
    
    const course = await Course.findById(courseId)
      .populate('units');

    if (!course) {
      console.log('Course not found:', courseId);
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get student info for debugging
    const student = await User.findById(req.user._id);
    console.log('Student courses assigned:', student.coursesAssigned);
    console.log('Student accessing course:', courseId);
    
    // For now, allow all students to access all courses
    // TODO: Implement proper enrollment system later

    // Get student progress for this course
    const progress = await StudentProgress.findOne({ student: req.user._id, course: courseId });
    let unlockedVideoIds = progress ? progress.unlockedVideos.map(id => id.toString()) : [];
    
    console.log('Student progress found:', !!progress);
    console.log('Unlocked videos:', unlockedVideoIds.length);

    // If no progress exists, create initial progress with only first video unlocked
    if (!progress) {
      console.log('No progress found, creating initial progress for course');
      
      // Get first video from first unit to unlock it
      const Unit = require('../models/Unit');
      const firstUnit = await Unit.findOne({ course: courseId })
        .sort('order')
        .populate('videos');
      
      let firstVideoId = null;
      if (firstUnit && firstUnit.videos && firstUnit.videos.length > 0) {
        // Sort videos by sequence and get the first one
        const sortedVideos = firstUnit.videos.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        firstVideoId = sortedVideos[0]._id.toString();
      } else {
        // Fallback: get first video from course (non-unit based)
        const Video = require('../models/Video');
        const firstVideo = await Video.findOne({ course: courseId }).sort('createdAt');
        if (firstVideo) {
          firstVideoId = firstVideo._id.toString();
        }
      }
      
      // Create new progress record with only first video unlocked
      const initialUnlockedVideos = firstVideoId ? [firstVideoId] : [];
      
      const initialUnits = [];
      if (firstUnit) {
        initialUnits.push({
          unitId: firstUnit._id,
          status: 'in-progress',
          unlocked: true,
          unlockedAt: new Date(),
          videosWatched: [],
          quizAttempts: [],
          unitQuizCompleted: false,
          unitQuizPassed: false,
          allVideosWatched: false
        });
      }
      
      await StudentProgress.create({
        student: req.user._id,
        course: courseId,
        unlockedVideos: initialUnlockedVideos,
        units: initialUnits,
        overallProgress: 0,
        lastActivity: new Date()
      });
      
      unlockedVideoIds = initialUnlockedVideos;
      console.log('Created initial progress with first video unlocked:', firstVideoId);
    } else if (unlockedVideoIds.length === 0) {
      // If progress exists but no videos unlocked, unlock first video
      const Unit = require('../models/Unit');
      const firstUnit = await Unit.findOne({ course: courseId })
        .sort('order')
        .populate('videos');
      
      let firstVideoId = null;
      if (firstUnit && firstUnit.videos && firstUnit.videos.length > 0) {
        const sortedVideos = firstUnit.videos.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        firstVideoId = sortedVideos[0]._id.toString();
        
        // Also ensure first unit is marked as unlocked
        const firstUnitIndex = progress.units.findIndex(
          u => u.unitId.toString() === firstUnit._id.toString()
        );
        
        if (firstUnitIndex === -1) {
          progress.units.push({
            unitId: firstUnit._id,
            status: 'in-progress',
            unlocked: true,
            unlockedAt: new Date(),
            videosWatched: [],
            quizAttempts: [],
            unitQuizCompleted: false,
            unitQuizPassed: false,
            allVideosWatched: false
          });
        } else {
          progress.units[firstUnitIndex].unlocked = true;
          progress.units[firstUnitIndex].status = 'in-progress';
        }
      }
      
      if (firstVideoId) {
        progress.unlockedVideos = [firstVideoId];
        await progress.save();
        unlockedVideoIds = [firstVideoId];
        console.log('Unlocked first video for existing progress:', firstVideoId);
      }
    }

    // Return unit-based organization if course has units
    if (course.hasUnits && course.units && course.units.length > 0) {
      // Get units with videos and progress info
      const Unit = require('../models/Unit');
      const units = await Unit.find({ course: courseId })
        .sort('order')
        .populate({
          path: 'videos',
          select: 'title description videoUrl teacher duration sequence unit',
          populate: {
            path: 'teacher',
            select: 'name'
          },
          options: { sort: { sequence: 1 } }
        });

      // Process units with video watch history
      const unitsWithProgress = units.map(unit => {
        // Check if unit is unlocked for this student
        const unitProgress = progress?.units?.find(
          u => u.unitId.toString() === unit._id.toString()
        );
        
        const isUnitUnlocked = unitProgress ? unitProgress.unlocked : 
          // First unit is always unlocked by default
          unit.order === 0;
        
        // Only include videos that are unlocked and part of this unit
        const videosWithWatchInfo = unit.videos
          .filter(video => unlockedVideoIds.includes(video._id.toString()))
          .map(video => {
            const watchRecord = student.watchHistory.find(
              record => record.video && record.video.toString() === video._id.toString()
            );
            const timeSpent = watchRecord ? watchRecord.timeSpent : 0;
            const lastWatched = watchRecord ? watchRecord.lastWatched : null;
            const watched = (video.duration && video.duration > 0 && timeSpent >= video.duration * 0.9) ||
                    ((!video.duration || video.duration < 1) && timeSpent >= 5);
            return {
              _id: video._id,
              title: video.title,
              description: video.description,
              videoUrl: video.videoUrl && video.videoUrl.startsWith('http') ? video.videoUrl : `${req.protocol}://${req.get('host')}/${(video.videoUrl || '').replace(/\\/g, '/')}`,
              duration: video.duration || 0,
              teacher: video.teacher,
              sequence: video.sequence,
              timeSpent,
              lastWatched,
              watched
            };
          });
        
        return {
          _id: unit._id,
          title: unit.title,
          description: unit.description,
          order: unit.order,
          unlocked: isUnitUnlocked,
          progress: unitProgress ? {
            status: unitProgress.status,
            videosCompleted: unitProgress.videosWatched.filter(v => v.completed).length,
            totalVideos: unit.videos.length
          } : {
            status: isUnitUnlocked ? 'in-progress' : 'locked',
            videosCompleted: 0,
            totalVideos: unit.videos.length
          },
          videos: videosWithWatchInfo
        };
      });

      return res.json({
        course: {
          _id: course._id,
          title: course.title,
          courseCode: course.courseCode,
          description: course.description,
          hasUnits: true
        },
        units: unitsWithProgress
      });
    } else {
      // Fall back to non-unit behavior for courses without units
      // Fetch all videos for this course
      const videos = await Video.find({ course: courseId })
        .populate('teacher', 'name')
        .sort('createdAt');

      // Add watch history info only for unlocked videos
      const videosWithWatchInfo = videos
        .filter(video => unlockedVideoIds.includes(video._id.toString()))
        .map(video => {
          const watchRecord = student.watchHistory.find(
            record => record.video && record.video.toString() === video._id.toString()
          );
          const timeSpent = watchRecord ? watchRecord.timeSpent : 0;
          const lastWatched = watchRecord ? watchRecord.lastWatched : null;
          const watched = (video.duration && video.duration > 0 && timeSpent >= video.duration * 0.9) ||
                  ((!video.duration || video.duration < 1) && timeSpent >= 5);
          return {
            _id: video._id,
            title: video.title,
            description: video.description,
            videoUrl: video.videoUrl && video.videoUrl.startsWith('http') ? video.videoUrl : `${req.protocol}://${req.get('host')}/${(video.videoUrl || '').replace(/\\/g, '/')}`,
            duration: video.duration || 0,
            teacher: video.teacher,
            timeSpent,
            lastWatched,
            watched
          };
        });

      return res.json({
        course: {
          _id: course._id,
          title: course.title,
          courseCode: course.courseCode,
          description: course.description,
          hasUnits: false
        },
        videos: videosWithWatchInfo
      });
    }
  } catch (err) {
    console.error('Error getting course videos:', err);
    res.status(500).json({ message: err.message });
  }
};

// Update watch history for a video
exports.updateWatchHistory = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { 
      timeSpent, 
      sessionTime, 
      segmentTime, 
      currentTime, 
      duration, 
      isCompleted, 
      sessionCount, 
      segmentsWatched, 
      totalSegments,
      completionPercentage,
      averageSessionLength 
    } = req.body;
    
    // Validate input - accept either timeSpent or segmentTime
    const primaryTimeValue = segmentTime || timeSpent;
    if (!primaryTimeValue || isNaN(primaryTimeValue)) {
      return res.status(400).json({ message: 'Valid timeSpent or segmentTime is required' });
    }
    
    // Find video to get course info and unit info if available
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Check if student is assigned to this course
    const student = await User.findById(req.user._id);
    if (!student.coursesAssigned.includes(video.course.toString())) {
      return res.status(403).json({ message: 'You are not assigned to this course' });
    }
    
    // Check if video is unlocked for this student
    const progress = await StudentProgress.findOne({ 
      student: req.user._id, 
      course: video.course 
    });
    
    if (!progress || !progress.unlockedVideos.includes(videoId)) {
      return res.status(403).json({ message: 'This video is not unlocked for you yet' });
    }
    
    // Find existing watch record for this video
    const existingRecord = student.watchHistory.find(
      record => record.video && record.video.toString() === videoId
    );
    
    let actualTimeSpent;
    const videoDuration = video.duration || duration || 600; // Use video duration, or provided duration, or default
    const maxAllowedTime = Math.max(videoDuration * 1.2, 600); // Allow 20% buffer for seeking/rewatching

    if (existingRecord) {
      // For existing records, use the more accurate tracking method
      // Prefer segmentTime for rewatching scenarios, sessionTime for linear viewing
      let newTimeSpent;
      
      if (segmentTime !== undefined && segmentTime > 0) {
        // Segment-based tracking is more accurate for rewatching
        newTimeSpent = Math.min(segmentTime, videoDuration);
      } else if (sessionTime !== undefined) {
        // Session-based tracking, accumulate carefully
        newTimeSpent = Math.min(existingRecord.timeSpent + (sessionTime * 0.8), maxAllowedTime);
      } else {
        // Fallback to basic timeSpent logic
        newTimeSpent = Math.max(existingRecord.timeSpent, Math.min(timeSpent, maxAllowedTime));
      }
      
      // Only update if the new time is reasonable
      if (newTimeSpent >= existingRecord.timeSpent * 0.9) { // Allow small decreases due to better accuracy
        existingRecord.timeSpent = newTimeSpent;
      }
      
      // Update position and enhanced metadata
      if (currentTime !== undefined) {
        existingRecord.currentTime = currentTime;
      }
      
      // Store enhanced analytics metadata
      if (sessionCount !== undefined) {
        existingRecord.sessionCount = sessionCount;
      }
      if (segmentsWatched !== undefined) {
        existingRecord.segmentsWatched = segmentsWatched;
      }
      if (totalSegments !== undefined) {
        existingRecord.totalSegments = totalSegments;
      }
      if (completionPercentage !== undefined) {
        existingRecord.completionPercentage = Math.min(100, completionPercentage);
      }
      if (averageSessionLength !== undefined) {
        existingRecord.averageSessionLength = averageSessionLength;
      }
      
      existingRecord.lastWatched = new Date();
      actualTimeSpent = existingRecord.timeSpent;
      
      console.log(`📊 Updated watch record for ${videoId}:`);
      console.log(`   Time: ${actualTimeSpent.toFixed(2)}s (${Math.floor(actualTimeSpent/60)}m ${Math.floor(actualTimeSpent%60)}s)`);
      console.log(`   Segments: ${segmentsWatched || 'N/A'}/${totalSegments || 'N/A'}`);
      console.log(`   Completion: ${(completionPercentage || 0).toFixed(1)}%`);
    } else {
      // Add new record with enhanced validation
      const validatedTimeSpent = Math.min(Math.max(primaryTimeValue, 0), maxAllowedTime);
      
      const newRecord = {
        video: videoId,
        timeSpent: validatedTimeSpent,
        currentTime: currentTime || 0,
        lastWatched: new Date()
      };
      
      // Add enhanced analytics metadata
      if (sessionCount !== undefined) {
        newRecord.sessionCount = sessionCount;
      }
      if (segmentsWatched !== undefined) {
        newRecord.segmentsWatched = segmentsWatched;
      }
      if (totalSegments !== undefined) {
        newRecord.totalSegments = totalSegments;
      }
      if (completionPercentage !== undefined) {
        newRecord.completionPercentage = Math.min(100, completionPercentage);
      }
      if (averageSessionLength !== undefined) {
        newRecord.averageSessionLength = averageSessionLength;
      }
      
      student.watchHistory.push(newRecord);
      actualTimeSpent = validatedTimeSpent;
      
      console.log(`📊 Created new watch record for ${videoId}:`);
      console.log(`   Time: ${actualTimeSpent.toFixed(2)}s (${Math.floor(actualTimeSpent/60)}m ${Math.floor(actualTimeSpent%60)}s)`);
      console.log(`   Segments: ${segmentsWatched || 'N/A'}/${totalSegments || 'N/A'}`);
      console.log(`   Completion: ${(completionPercentage || 0).toFixed(1)}%`);
      
      if (validatedTimeSpent !== timeSpent) {
        console.warn(`Adjusted new record timeSpent from ${timeSpent} to ${validatedTimeSpent} for video ${videoId} (duration: ${videoDuration})`);
      }
    }
    
    await student.save();
    
    // Update StudentProgress
    if (progress) {
      // Check if video is completed based on multiple criteria
      const timeBasedCompletion = actualTimeSpent >= videoDuration * 0.9;
      const positionBasedCompletion = currentTime && currentTime >= videoDuration * 0.95;
      const explicitCompletion = isCompleted === true;
      
      const videoIsCompleted = timeBasedCompletion || positionBasedCompletion || explicitCompletion;
        
      console.log(`📊 Completion check for ${videoId}:`);
      console.log(`   Time: ${actualTimeSpent.toFixed(2)}s / ${videoDuration.toFixed(2)}s (${(actualTimeSpent/videoDuration*100).toFixed(1)}%)`);
      console.log(`   Position: ${(currentTime || 0).toFixed(2)}s (${(((currentTime || 0)/videoDuration)*100).toFixed(1)}%)`);
      console.log(`   Completed: ${videoIsCompleted} (time: ${timeBasedCompletion}, position: ${positionBasedCompletion}, explicit: ${explicitCompletion})`);
      
      // Add to completed videos if not already there and it's completed
      if (videoIsCompleted && !progress.completedVideos?.includes(videoId)) {
        // Ensure completedVideos array exists
        if (!progress.completedVideos) {
          progress.completedVideos = [];
        }
        progress.completedVideos.push(videoId);
        console.log(`✅ Video ${videoId} marked as completed`);
        
        // When a video is completed, unlock the next video in sequence
        await unlockNextVideoInSequence(progress, video);
      }
      
      // If video is part of a unit, update unit progress as well
      if (video.unit) {
        // Find the unit in the student's progress
        const unitIndex = progress.units.findIndex(
          u => u.unitId && u.unitId.toString() === video.unit.toString()
        );
        
        if (unitIndex !== -1) {
          // Unit found, check if this video is already tracked
          const videoWatchIndex = progress.units[unitIndex].videosWatched.findIndex(
            v => v.videoId && v.videoId.toString() === videoId
          );
          
          if (videoWatchIndex !== -1) {
            // Update existing record
            progress.units[unitIndex].videosWatched[videoWatchIndex].timeSpent = 
              Math.max(progress.units[unitIndex].videosWatched[videoWatchIndex].timeSpent, timeSpent);
            progress.units[unitIndex].videosWatched[videoWatchIndex].lastWatched = new Date();
            progress.units[unitIndex].videosWatched[videoWatchIndex].completed = isCompleted;
            console.log(`[updateWatchHistory] Updated unit video: ${videoId}, completed: ${isCompleted}`);
          } else {
            // Add new record
            progress.units[unitIndex].videosWatched.push({
              videoId,
              timeSpent,
              lastWatched: new Date(),
              completed: isCompleted
            });
            console.log(`[updateWatchHistory] Added unit video: ${videoId}, completed: ${isCompleted}`);
          }
          
          // Check if all videos in this unit are completed to update unit status
          const Unit = require('../models/Unit');
          const unit = await Unit.findById(video.unit);
          
          if (unit && unit.videos) {
            const unitVideosCompleted = progress.units[unitIndex].videosWatched.filter(v => v.completed).length;
            const totalUnitVideos = unit.videos.length;
            
            console.log(`[updateWatchHistory] Unit ${unit.title}: ${unitVideosCompleted}/${totalUnitVideos} videos completed`);
            
            // If all videos in unit are completed, mark unit videos as completed
            if (unitVideosCompleted === totalUnitVideos && totalUnitVideos > 0) {
              progress.units[unitIndex].allVideosWatched = true;
              
              console.log(`[updateWatchHistory] All videos completed in unit ${unit.title}. Quiz is now available.`);
              
              // Note: We don't automatically unlock the next unit here.
              // The next unit should only be unlocked after passing the unit quiz.
              // If there's no quiz requirement, it will be handled by the quiz system.
            }
          }
        } else {
          // Unit not found in progress, add it
          if (isCompleted) {
            progress.units.push({
              unitId: video.unit,
              status: 'in-progress',
              unlocked: true,
              unlockedAt: new Date(),
              videosWatched: [{
                videoId,
                timeSpent,
                lastWatched: new Date(),
                completed: isCompleted
              }],
              quizAttempts: [],
              unitQuizCompleted: false,
              unitQuizPassed: false,
              allVideosWatched: false
            });
            console.log(`[updateWatchHistory] Added new unit progress for unit: ${video.unit}, video: ${videoId}, completed: ${isCompleted}`);
          }
        }
      }
      
      // Update last activity timestamp
      progress.lastActivity = new Date();
      
      // Calculate overall course progress
      const Course = require('../models/Course');
      const course = await Course.findById(video.course).populate('videos');
      
      if (course) {
        const totalVideos = course.videos.length;
        const completedVideos = progress.completedVideos ? progress.completedVideos.length : 0;
        
        progress.overallProgress = totalVideos > 0
          ? Math.round((completedVideos / totalVideos) * 100)
          : 0;
      }
      
      await progress.save();
    }
    
    // Debug: print unit progress after update
    if (video.unit && progress) {
      const unitIndex = progress.units.findIndex(u => u.unitId && u.unitId.toString() === video.unit.toString());
      if (unitIndex !== -1) {
        console.log('[updateWatchHistory] Unit progress after update:', JSON.stringify(progress.units[unitIndex], null, 2));
      }
    }
    res.json({ 
      message: 'Watch history updated',
      timeSpent,
      lastWatched: new Date()
    });
  } catch (err) {
    console.error('Error updating watch history:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get watch history for a student across all courses
exports.getStudentWatchHistory = async (req, res) => {
  try {
    const student = await User.findById(req.user._id)
      .populate('coursesAssigned', 'title courseCode')
      .populate('watchHistory.video', 'title course');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Group watch history by course
    const watchHistoryByCourse = {};
    
    for (const record of student.watchHistory) {
      if (!record.video) continue;
      
      const courseId = record.video.course ? record.video.course.toString() : 'unknown';
      
      if (!watchHistoryByCourse[courseId]) {
        const course = student.coursesAssigned.find(c => c._id.toString() === courseId);
        watchHistoryByCourse[courseId] = {
          courseId,
          courseTitle: course ? course.title : 'Unknown Course',
          courseCode: course ? course.courseCode : 'N/A',
          totalTimeSpent: 0,
          videos: []
        };
      }
      
      watchHistoryByCourse[courseId].totalTimeSpent += record.timeSpent;
      watchHistoryByCourse[courseId].videos.push({
        videoId: record.video._id,
        videoTitle: record.video.title,
        timeSpent: record.timeSpent,
        lastWatched: record.lastWatched
      });
    }
    
    // Convert to array and sort by most watched
    const sortedWatchHistory = Object.values(watchHistoryByCourse)
      .sort((a, b) => b.totalTimeSpent - a.totalTimeSpent);
    
    res.json(sortedWatchHistory);
  } catch (err) {
    console.error('Error getting student watch history:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get detailed progress for a specific course
exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Find course with videos
    const course = await Course.findById(courseId)
      .populate('videos', 'title duration');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get student with watch history
    const student = await User.findById(req.user._id)
      .select('watchHistory');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Calculate progress for each video
    const videoProgress = course.videos.map(video => {
      const watchRecord = student.watchHistory.find(
        record => record.video && record.video.toString() === video._id.toString()
      );
      
      const timeSpent = watchRecord ? watchRecord.timeSpent : 0;
      const lastWatched = watchRecord ? watchRecord.lastWatched : null;
      
      // Calculate percentage if duration is available
      let percentageCompleted = 0;
      if (video.duration && video.duration > 0) {
        percentageCompleted = Math.min(100, Math.round((timeSpent / video.duration) * 100));
      }
      
      return {
        videoId: video._id,
        title: video.title,
        timeSpent,
        lastWatched,
        percentageCompleted
      };
    });
    
    // Calculate overall course progress
    const totalVideos = course.videos.length;
    const videosStarted = videoProgress.filter(v => v.timeSpent > 0).length;
    const videosCompleted = videoProgress.filter(v => v.percentageCompleted >= 90).length;
    
    const overallPercentage = totalVideos > 0
      ? Math.round((videosCompleted / totalVideos) * 100)
      : 0;
    
    res.json({
      courseId: course._id,
      courseTitle: course.title,
      courseCode: course.courseCode,
      totalVideos,
      videosStarted,
      videosCompleted,
      overallPercentage,
      videoProgress
    });
  } catch (err) {
    console.error('Error getting course progress:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get student's quiz pool attempts for a course
exports.getStudentQuizPoolAttempts = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if student is assigned to this course
    const student = await User.findById(req.user._id);
    if (!student.coursesAssigned.includes(courseId)) {
      return res.status(403).json({ message: 'You are not assigned to this course' });
    }
    
    // Get all quiz pool attempts for this student in this course
    const attempts = await QuizAttempt.find({
      student: req.user._id,
      course: courseId,
      quizPool: { $exists: true }
    })
    .populate('quizPool', 'title description questionsPerAttempt passingScore')
    .populate('unit', 'title sequence')
    .populate('video', 'title')
    .sort({ completedAt: -1 });
    
    // Format the response
    const formattedAttempts = attempts.map(attempt => ({
      _id: attempt._id,
      quizPool: {
        _id: attempt.quizPool._id,
        title: attempt.quizPool.title,
        description: attempt.quizPool.description,
        questionsPerAttempt: attempt.quizPool.questionsPerAttempt,
        passingScore: attempt.quizPool.passingScore
      },
      unit: attempt.unit ? {
        _id: attempt.unit._id,
        title: attempt.unit.title,
        sequence: attempt.unit.sequence
      } : null,
      video: attempt.video ? {
        _id: attempt.video._id,
        title: attempt.video.title
      } : null,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timeSpent: attempt.timeSpent,
      completedAt: attempt.completedAt,
      questionCount: attempt.questions.length
    }));
    
    res.json(formattedAttempts);
  } catch (err) {
    console.error('Error getting student quiz pool attempts:', err);
    res.status(500).json({ message: err.message });
  }
};

// Helper function to unlock next unit after completion
async function unlockNextUnitAfterCompletion(progress, courseId, currentUnitOrder) {
  try {
    const Unit = require('../models/Unit');
    
    // Find next unit by order
    const nextUnit = await Unit.findOne({
      course: courseId,
      order: currentUnitOrder + 1
    });
    
    if (nextUnit) {
      // Check if next unit is already in progress record
      const nextUnitIndex = progress.units.findIndex(
        u => u.unitId && u.unitId.toString() === nextUnit._id.toString()
      );
      
      if (nextUnitIndex !== -1) {
        // Update existing unit record
        progress.units[nextUnitIndex].unlocked = true;
        progress.units[nextUnitIndex].status = 'in-progress';
        progress.units[nextUnitIndex].unlockedAt = new Date();
      } else {
        // Add new unit record
        progress.units.push({
          unitId: nextUnit._id,
          status: 'in-progress',
          unlocked: true,
          unlockedAt: new Date(),
          videosWatched: [],
          quizAttempts: [],
          unitQuizCompleted: false,
          unitQuizPassed: false,
          allVideosWatched: false
        });
      }
      
      // Unlock only the first video in the next unit
      if (nextUnit.videos && nextUnit.videos.length > 0) {
        const firstVideoId = nextUnit.videos[0];
        if (!progress.unlockedVideos.includes(firstVideoId)) {
          progress.unlockedVideos.push(firstVideoId);
        }
      }
    }
  } catch (err) {
    console.error('Error unlocking next unit:', err);
  }
}

// Helper function to unlock next video in sequence within the same unit
async function unlockNextVideoInSequence(progress, currentVideo) {
  try {
    if (!currentVideo.unit) {
      // For non-unit based videos, unlock next video by creation date
      const Video = require('../models/Video');
      const allVideos = await Video.find({ course: currentVideo.course })
        .sort('createdAt');
      
      const currentIndex = allVideos.findIndex(v => v._id.toString() === currentVideo._id.toString());
      if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
        const nextVideo = allVideos[currentIndex + 1];
        if (!progress.unlockedVideos.includes(nextVideo._id.toString())) {
          progress.unlockedVideos.push(nextVideo._id.toString());
          console.log('Unlocked next video in course:', nextVideo.title);
        }
      }
      return;
    }
    
    // For unit-based videos, unlock next video in the same unit
    const Unit = require('../models/Unit');
    const unit = await Unit.findById(currentVideo.unit)
      .populate('videos');
    
    if (unit && unit.videos) {
      // Sort videos by sequence
      const sortedVideos = unit.videos.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      
      // Find current video index
      const currentIndex = sortedVideos.findIndex(v => v._id.toString() === currentVideo._id.toString());
      
      if (currentIndex !== -1 && currentIndex < sortedVideos.length - 1) {
        // Unlock next video in the unit
        const nextVideo = sortedVideos[currentIndex + 1];
        if (!progress.unlockedVideos.includes(nextVideo._id.toString())) {
          progress.unlockedVideos.push(nextVideo._id.toString());
          console.log('Unlocked next video in unit:', nextVideo.title);
        }
      } else if (currentIndex === sortedVideos.length - 1) {
        // This was the last video in the unit
        console.log('Completed last video in unit. All unit videos are now unlocked. Quiz should be available.');
      }
    }
  } catch (err) {
    console.error('Error unlocking next video in sequence:', err);
  }
}
