const User = require('../models/User');
const Video = require('../models/Video');
const Course = require('../models/Course');
const mongoose = require('mongoose');

// Get all courses assigned to student with progress info
exports.getStudentCourses = async (req, res) => {
  try {
    // Get student with courses assigned
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

// Get videos for a course
exports.getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId)
      .populate({
        path: 'videos',
        select: 'title description videoUrl teacher duration',
        populate: {
          path: 'teacher',
          select: 'name'
        }
      });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if this student is assigned to this course
    const student = await User.findById(req.user._id);
    if (!student.coursesAssigned.includes(courseId)) {
      return res.status(403).json({ message: 'You are not assigned to this course' });
    }
    
    // Add watch history info to each video
    const videosWithWatchInfo = course.videos.map(video => {
      const watchRecord = student.watchHistory.find(
        record => record.video && record.video.toString() === video._id.toString()
      );
      
      // Calculate if video is "watched" (viewed more than 90% of duration)
      const timeSpent = watchRecord ? watchRecord.timeSpent : 0;
      const lastWatched = watchRecord ? watchRecord.lastWatched : null;
      
      // Consider a video watched if:
      // 1. It has a duration and the user watched 90% or more of it
      // 2. OR the video has no duration (or very small) but user watched at least 5 seconds
      const watched = (video.duration && video.duration > 0 && timeSpent >= video.duration * 0.9) || 
                      ((!video.duration || video.duration < 1) && timeSpent >= 5);
      
      return {
        _id: video._id,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        duration: video.duration,
        teacher: video.teacher,
        timeSpent,
        lastWatched,
        watched
      };
    });
    
    res.json({
      course: {
        _id: course._id,
        title: course.title,
        courseCode: course.courseCode,
        description: course.description
      },
      videos: videosWithWatchInfo
    });
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
      timeSpent = 0, 
      currentTime = 0, 
      duration = 0, 
      playbackRate = 1, 
      isCompleted = false, 
      timestamp, 
      isFinal = false 
    } = req.body;
    
    // Validate timeSpent (must be a number greater than 0)
    if (typeof timeSpent !== 'number' || timeSpent <= 0) {
      return res.status(400).json({ 
        message: 'Valid timeSpent is required (must be a number greater than 0)',
        receivedValue: timeSpent,
        receivedType: typeof timeSpent
      });
    }
    
    // Find the video to make sure it exists and get course info
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Check if student is assigned to the course
    const student = await User.findById(req.user._id);
    if (!student.coursesAssigned.includes(video.course.toString())) {
      return res.status(403).json({ message: 'You are not assigned to this course' });
    }
    
    // Update or create watch history record
    const watchRecordIndex = student.watchHistory.findIndex(
      record => record.video && record.video.toString() === videoId
    );
    
    const now = new Date();
    
    if (watchRecordIndex !== -1) {
      // Update existing record
      student.watchHistory[watchRecordIndex].timeSpent += timeSpent;
      student.watchHistory[watchRecordIndex].lastWatched = now;
      
      // Update current position if provided
      if (currentTime !== undefined) {
        student.watchHistory[watchRecordIndex].currentPosition = currentTime;
      }
    } else {
      // Create new record
      student.watchHistory.push({
        video: videoId,
        timeSpent: timeSpent,
        lastWatched: now,
        currentPosition: currentTime || 0
      });
    }
    
    await student.save();
    
    // Also update the video's watchRecords
    const videoWatchRecordIndex = video.watchRecords ? 
      video.watchRecords.findIndex(record => record.student.toString() === req.user._id.toString()) : -1;
    
    if (videoWatchRecordIndex !== -1) {
      // Update existing record
      video.watchRecords[videoWatchRecordIndex].timeSpent += timeSpent;
      video.watchRecords[videoWatchRecordIndex].lastWatched = now;
    } else {
      // Create new record
      if (!video.watchRecords) video.watchRecords = [];
      video.watchRecords.push({
        student: req.user._id,
        timeSpent: timeSpent,
        lastWatched: now
      });
    }
    
    // Update video analytics
    if (!video.analytics) {
      video.analytics = {
        totalViews: 0,
        totalWatchTime: 0,
        completionRate: 0,
        lastUpdated: now
      };
    }
    
    // Increment total watch time
    video.analytics.totalWatchTime += timeSpent;
    
    // Update total views counter (only count as a view if this is a new session)
    const isNewSession = !video.watchRecords || videoWatchRecordIndex === -1;
    if (isNewSession) {
      video.analytics.totalViews = (video.analytics.totalViews || 0) + 1;
    }
    
    video.analytics.lastUpdated = now;
    
    // Calculate completion rate (percentage of students who completed the video)
    if (isCompleted || (currentTime && duration && (currentTime / duration) >= 0.9)) {
      // Get all students with access to this course
      const studentsWithAccess = await User.countDocuments({
        coursesAssigned: video.course,
        role: 'student'
      });
      
      // Count students who have completed the video (watched at least 90% of it)
      const studentsCompleted = await User.countDocuments({
        coursesAssigned: video.course,
        role: 'student',
        'watchHistory': {
          $elemMatch: {
            'video': video._id,
            $or: [
              { 'timeSpent': { $gte: video.duration * 0.9 } },
              { 'currentPosition': { $gte: video.duration * 0.9 } }
            ]
          }
        }
      });
      
      if (studentsWithAccess > 0) {
        video.analytics.completionRate = (studentsCompleted / studentsWithAccess) * 100;
      }
    }
    
    await video.save();
    
    // Return updated watch history for this video
    const updatedWatchRecord = student.watchHistory.find(
      record => record.video && record.video.toString() === videoId
    );
    
    // Calculate percentage completed
    let percentageCompleted = 0;
    if (duration && duration > 0) {
      percentageCompleted = Math.min(100, Math.round((updatedWatchRecord.timeSpent / duration) * 100));
    }
    
    // Create an audit log for analytics with enhanced data
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      action: 'video_watch',
      performedBy: req.user._id,
      details: {
        videoId,
        videoTitle: video.title,
        courseId: video.course,
        timeSpent,
        currentTime,
        duration,
        totalTimeSpent: updatedWatchRecord.timeSpent,
        percentageCompleted,
        percentagePosition: duration > 0 ? (currentTime / duration) * 100 : 0,
        playbackRate: playbackRate || 1,
        isCompleted: isCompleted || percentageCompleted >= 90,
        isFinal: isFinal || false,
        timestamp: timestamp || now,
        sessionType: isFinal ? 'final' : 'progress'
      }
    });
    
    res.json({
      timeSpent: updatedWatchRecord.timeSpent,
      lastWatched: updatedWatchRecord.lastWatched,
      percentageCompleted,
      currentPosition: updatedWatchRecord.currentPosition || 0
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
