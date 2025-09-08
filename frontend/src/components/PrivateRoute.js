import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '../utils/authService';

/**
 * PrivateRoute component to protect routes that require authentication
 * @param {Object} props - Component props
 * @param {JSX.Element} props.children - Child components to render if authenticated
 * @param {string[]} [props.allowedRoles] - Optional array of roles allowed to access this route
 * @returns {JSX.Element} - The protected route component or redirect
 */
const PrivateRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const authenticated = isAuthenticated();
  const currentUser = getCurrentUser();
  
  // Check if user is authenticated
  if (!authenticated) {
    // Redirect to login page, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If roles are specified, check if the user has the required role
  if (allowedRoles && allowedRoles.length > 0) {
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      // User doesn't have the required role, redirect to appropriate dashboard
      if (currentUser.role === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (currentUser.role === 'teacher') {
        return <Navigate to="/teacher" replace />;
      } else if (currentUser.role === 'student') {
        return <Navigate to="/student" replace />;
      } else {
        // Fallback to login if role is unknown
        return <Navigate to="/login" replace />;
      }
    }
  }
  
  // User is authenticated and has the required role (if specified)
  return children;
};

export default PrivateRoute;
