import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, Toolbar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { parseJwt } from '../utils/jwt';
import { hasPermission } from '../utils/permissions';
import { logoutUser } from '../utils/authService';
import Sidebar from '../components/Sidebar';

// Import Teacher Dashboard components
import TeacherDashboardHome from './teacher/TeacherDashboardHome';
import TeacherCourses from './teacher/TeacherCourses';
import TeacherCourseDetail from './teacher/TeacherCourseDetail';
import TeacherVideos from './teacher/TeacherVideos';
import TeacherStudents from './teacher/TeacherStudents';
import TeacherForums from './teacher/TeacherForums';
import TeacherForumDetail from './teacher/TeacherForumDetail';
import TeacherAnalytics from './teacher/TeacherAnalytics';
import UnauthorizedPage from './UnauthorizedPage';

const TeacherDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  if (!currentUser || currentUser.role !== 'teacher') {
    return <Navigate to="/login" />;
  }

  // Auto-redirect to dashboard if at the root teacher path
  if (location.pathname === '/teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  // User menu handlers
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };
  
  // Logout handler
  const handleLogout = async () => {
    handleUserMenuClose();
    const result = await logoutUser();
    if (result.success) {
      navigate('/login');
    }
  };

  // Create a protected route component that checks permissions
  const PermissionRoute = ({ element, permission }) => {
    // If no permission is required or user has permission, render the element
    if (!permission || hasPermission(currentUser, permission)) {
      return element;
    }
    // Otherwise, render the unauthorized page
    return <UnauthorizedPage />;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar currentUser={currentUser} />
      <Box sx={{ position: 'absolute', top: 16, right: 24, zIndex: 1201 }}>
        <Tooltip title="Account">
          <IconButton 
            onClick={handleUserMenuOpen}
            size="medium"
            sx={{ 
              bgcolor: 'secondary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'secondary.dark' } 
            }}
          >
            <AccountCircleIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleLogout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* Adds spacing for the AppBar */}
        <Routes>
          <Route path="/dashboard" element={<TeacherDashboardHome />} />
          <Route path="/courses" element={<TeacherCourses />} />
          <Route path="/course/:courseId" element={<TeacherCourseDetail />} />
          <Route path="/videos" element={<PermissionRoute element={<TeacherVideos />} permission="manage_videos" />} />
          <Route path="/students" element={<PermissionRoute element={<TeacherStudents />} permission="manage_students" />} />
          <Route path="/forums" element={<TeacherForums />} />
          <Route path="/forum/:forumId" element={<TeacherForumDetail />} />
          {/* Redirecting student-analytics to the main analytics dashboard */}
          <Route path="/student-analytics" element={<Navigate to="/analytics" replace />} />
          <Route path="/analytics" element={<PermissionRoute element={<TeacherAnalytics viewType="course" />} permission="view_analytics" />} />
          <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default TeacherDashboard;
