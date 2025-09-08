import axios from 'axios';
import { getToken, logoutUser } from './authService';

// Set base URL for all API calls
axios.defaults.baseURL = 'http://localhost:5000';

// Add request interceptor for adding auth token
axios.interceptors.request.use(
  config => {
    // Get token from authService
    const token = getToken();
    
    // If token exists, add it to the request headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Add response interceptor for handling auth errors
axios.interceptors.response.use(
  response => response,
  error => {
    // If unauthorized or token expired, redirect to login
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.log('Authentication error:', error.response.data);
      
      // If token is invalid or expired, logout and redirect
      if (error.response.data.message === 'Token is not valid' || 
          error.response.data.message === 'Token expired') {
        logoutUser();
        window.location = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default axios;
