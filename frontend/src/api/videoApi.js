import axios from 'axios';

export const uploadVideo = async (data, token, progressCallback) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => formData.append(key, value));
  
  const res = await axios.post('/api/admin/video/upload', formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: progressEvent => {
      if (progressCallback) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        progressCallback(percentCompleted);
      }
    }
  });
  
  return res.data;
};

export const getVideoAnalytics = async (videoId, token) => {
  const res = await axios.get(`/api/admin/video/${videoId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const removeVideo = async (id, token) => {
  const res = await axios.delete(`/api/admin/video/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const warnVideo = async (id, token) => {
  const res = await axios.patch(`/api/admin/video/${id}/warn`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
