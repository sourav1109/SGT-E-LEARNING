import axios from 'axios';

export const getStudents = async (token) => {
  const res = await axios.get('/api/admin/students', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const createStudent = async (studentData, token) => {
  const res = await axios.post('/api/admin/student', studentData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const bulkUploadStudents = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post('/api/admin/student/bulk', formData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const assignCourseToStudent = async (regNo, courseId, token) => {
  // Find the student ID from regNo first
  const studentsRes = await axios.get('/api/admin/students', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const student = studentsRes.data.find(s => s.regNo === regNo);
  if (!student) {
    throw new Error(`Student with registration number ${regNo} not found`);
  }
  
  // Now assign the course using the student ID
  const res = await axios.post('/api/admin/student/assign-courses', { 
    studentIds: [student._id], 
    courseIds: [courseId]
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return res.data;
};

export const editStudent = async (id, updates, token) => {
  const res = await axios.patch(`/api/admin/student/${id}`, updates, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const removeStudent = async (id, token) => {
  const res = await axios.delete(`/api/admin/student/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

// Student quiz pool API functions
export const getQuizPoolForStudent = async (quizPoolId, token) => {
  const res = await axios.get(`/api/quiz-pools/${quizPoolId}/student`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const submitQuizPoolAttempt = async (quizPoolId, attemptData, token) => {
  const res = await axios.post(`/api/quiz-pools/${quizPoolId}/submit`, attemptData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getStudentQuizPoolAttempts = async (courseId, token) => {
  const res = await axios.get(`/api/student/course/${courseId}/quiz-pool-attempts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
