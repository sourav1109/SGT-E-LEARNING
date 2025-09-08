// Authentication service for handling login/logout and token management
import axios from 'axios';

// Helper function to parse JWT token
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Login user and set token in localStorage
export const loginUser = async (email, password) => {
  try {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || 'Login failed. Please try again.' 
    };
  }
};

// Logout user and clear localStorage
export const logoutUser = async () => {
  try {
    // Optional: Call the backend to invalidate the token if you implement token blacklisting
    // await axios.post('/api/auth/logout', {}, { 
    //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
    // });
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear any other app-specific storage
    localStorage.removeItem('dashboardMetrics');
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear localStorage even if the API call fails
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true };
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Check if token is expired
    const decoded = parseJwt(token);
    if (!decoded) return false;
    
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch (error) {
    return false;
  }
};

// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Get auth token
export const getToken = () => {
  return localStorage.getItem('token');
};

// Setup axios interceptors for authentication
export const setupAxiosInterceptors = () => {
  // Request interceptor to add token to all requests
  axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Response interceptor to handle authentication errors
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // If we get a 401 Unauthorized, clear auth data and redirect to login
        logoutUser();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};
