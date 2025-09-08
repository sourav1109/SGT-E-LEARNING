import axios from 'axios';

// Get videos for a course with watch history
export const getCourseVideos = async (courseId, token) => {
  try {
    const response = await axios.get(`/api/student/course/${courseId}/videos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching course videos:', error);
    throw error;
  }
};

// Update watch history for a video
export const updateWatchHistory = async (videoId, timeData, token) => {
  if (!token) {
    console.error('Token is missing for updateWatchHistory call');
    throw new Error('Authentication token is required');
  }
  
  if (!videoId) {
    console.error('Video ID is missing for updateWatchHistory call');
    throw new Error('Video ID is required');
  }
  
  try {
    console.log(`Sending watch history update for video ${videoId}:`, timeData);
    
    // Make sure duration is at least 0.1 to pass validation
    const sanitizedData = {
      ...timeData,
      duration: Math.max(0.1, timeData.duration || 0.1)
    };
    
    const response = await axios.post(`/api/student/video/${videoId}/watch`, sanitizedData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Watch history update response for video ${videoId}:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error updating watch history for video ${videoId}:`, error);
    console.error('Request data was:', timeData);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    throw error;
  }
};

// Get student's watch history across all courses
export const getWatchHistory = async (token) => {
  try {
    const response = await axios.get('/api/student/watch-history', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching watch history:', error);
    throw error;
  }
};

// Get detailed progress for a specific course
export const getCourseProgress = async (courseId, token) => {
  try {
    const response = await axios.get(`/api/student/course/${courseId}/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching course progress:', error);
    throw error;
  }
};

// Get all courses assigned to the student with progress information
export const getStudentCourses = async (token) => {
  try {
    const response = await axios.get('/api/student/courses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching student courses:', error);
    throw error;
  }
};
