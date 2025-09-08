import axios from 'axios';

export const getTeachers = async (token) => {
  const res = await axios.get('/api/admin/teachers', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const addTeacher = async (data, token) => {
  const res = await axios.post('/api/admin/teacher', data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const bulkUploadTeachers = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/api/admin/teacher/bulk', formData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const resetTeacherPassword = async (teacherId, newPassword, token) => {
  const res = await axios.post('/api/admin/teacher/reset-password', { teacherId, newPassword }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const deactivateTeacher = async (teacherId, token) => {
  const res = await axios.patch(`/api/admin/teacher/${teacherId}/deactivate`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const assignCourseToTeacher = async (courseId, teacherId, token) => {
  const res = await axios.post(`/api/admin/course/${courseId}/assign-teacher`, { teacherId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Teacher dashboard API functions
export const getTeacherCourses = async (token) => {
  const res = await axios.get('/api/teacher/courses', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseStudents = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/course/${courseId}/students`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseVideos = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/course/${courseId}/videos`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// New API functions for teacher functionality
export const uploadCourseVideo = async (courseId, videoData, token) => {
  const formData = new FormData();
  formData.append('video', videoData.file);
  formData.append('title', videoData.title);
  formData.append('description', videoData.description);
  
  const res = await axios.post(`/api/teacher/course/${courseId}/video`, formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const requestVideoRemoval = async (videoId, reason, token) => {
  const res = await axios.post(`/api/teacher/video/${videoId}/removal-request`, { reason }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getVideoRemovalRequests = async (token) => {
  const res = await axios.get('/api/teacher/video-removal-requests', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Forum related API functions
export const getTeacherForums = async (token) => {
  const res = await axios.get('/api/teacher/forums', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getCourseForums = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/course/${courseId}/forums`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getForumDiscussion = async (forumId, token) => {
  const res = await axios.get(`/api/teacher/forum/${forumId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const postForumReply = async (forumId, content, token) => {
  const res = await axios.post(`/api/teacher/forum/${forumId}/reply`, { content }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Analytics API functions for teachers
export const getTeacherAnalyticsOverview = async (token) => {
  const res = await axios.get('/api/teacher/analytics/overview', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeacherEnrollmentTrends = async (period, token) => {
  const res = await axios.get(`/api/teacher/analytics/trends?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getTeacherCourseAnalytics = async (courseId, token) => {
  const res = await axios.get(`/api/teacher/analytics/course/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getStudentByRegNo = async (regNo, token) => {
  const res = await axios.get(`/api/teacher/analytics/student?regNo=${regNo}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getStudentDetailedAnalytics = async (studentId, token) => {
  const res = await axios.get(`/api/teacher/analytics/student/${studentId}/detailed`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
