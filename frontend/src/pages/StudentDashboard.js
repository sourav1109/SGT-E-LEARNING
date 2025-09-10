import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Paper, Typography, Box, Button, List, ListItem, ListItemText, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { parseJwt } from '../utils/jwt';
import { logoutUser } from '../utils/authService';
import Sidebar from '../components/Sidebar';

// Import student pages
import StudentHomeDashboard from './student/StudentHomeDashboard';
import StudentCoursesPage from './student/StudentCoursesPage';
import StudentCourseVideos from './student/StudentCourseVideos';
import StudentCourseProgress from './student/StudentCourseProgress';
import StudentForumPage from './student/StudentForumPage';
import StudentForumDetailPage from './student/StudentForumDetailPage';
import StudentUnansweredForumsPage from './student/StudentUnansweredForumsPage';
import StudentQuizPage from './student/StudentQuizPage';

const StudentDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  if (!currentUser || currentUser.role !== 'student') {
    return <Navigate to="/login" />;
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar currentUser={currentUser} />
      <Box sx={{ position: 'absolute', top: 16, right: 24, zIndex: 1201 }}>
        <Tooltip title="Account">
          <IconButton 
            onClick={handleUserMenuOpen}
            size="medium"
            sx={{ 
              bgcolor: 'info.main', 
              color: 'white',
              '&:hover': { bgcolor: 'info.dark' } 
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
        <Routes>
          <Route path="/" element={<StudentHomeDashboard />} />
          <Route path="/dashboard" element={<StudentHomeDashboard />} />
          <Route path="/courses" element={<StudentCoursesPage />} />
          <Route path="/course/:courseId/videos" element={<StudentCourseVideos />} />
          <Route path="/course/:courseId/video/:videoId" element={<StudentCourseVideos />} />
          <Route path="/course/:courseId/progress" element={<StudentCourseProgress />} />
          <Route path="/course/:courseId/quiz/:attemptId" element={<StudentQuizPage user={currentUser} token={token} />} />
          <Route path="/forums" element={<StudentForumPage />} />
          <Route path="/forum/:forumId" element={<StudentForumDetailPage />} />
          <Route path="/unanswered-forums" element={<StudentUnansweredForumsPage />} />
          <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default StudentDashboard;
