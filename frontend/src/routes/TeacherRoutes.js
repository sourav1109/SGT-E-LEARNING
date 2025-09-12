import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import TeacherDashboard from '../components/teacher/TeacherDashboard';
import CourseList from '../components/teacher/CourseList';
import NotFound from '../components/common/NotFound';
import ContentUpload from '../components/teacher/ContentUpload';
import CourseVideos from '../components/teacher/CourseVideos';
import CourseStudents from '../components/teacher/CourseStudents';
import VideoRemovalRequest from '../components/teacher/VideoRemovalRequest';
// ...existing code...
import TeacherStudents from '../pages/teacher/TeacherStudents';
import TeacherEnhancedAnalytics from '../pages/teacher/TeacherEnhancedAnalytics';
import TeacherAnalyticsFixed from '../components/teacher/TeacherAnalyticsFixed';

const TeacherRoutes = ({ user, token }) => {
  if (!user || user.role !== 'teacher') {
    return <Navigate to="/login" replace />;
  }

  // Check if route is accessible based on user permissions
  const hasAccess = (requiredPermission) => {
    if (!requiredPermission) return true; // No permission required
    return user.permissions && user.permissions.includes(requiredPermission);
  };

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      <Routes>
        <Route path="/" element={<TeacherDashboard user={user} />} />
        <Route path="/courses" element={<CourseList token={token} />} />
        
        {/* Content management routes */}
        <Route 
          path="/videos/upload" 
          element={
            hasAccess('Manage Videos') 
              ? <ContentUpload token={token} user={user} /> 
              : <Navigate to="/teacher" replace />
          } 
        />
        <Route path="/course/:courseId/videos" element={<CourseVideos token={token} user={user} />} />
        <Route path="/video/:videoId/remove-request" element={<VideoRemovalRequest token={token} user={user} />} />
        
        {/* Student management routes */}
        <Route [eslint] Plugin "react-hooks" was conflicted between ".eslintrc.json" and ".eslintrc.json » eslint-config-react-app".
          path="/course/:courseId/students" 
          element={
            hasAccess('Manage Students') 
              ? <CourseStudents token={token} user={user} /> 
              : <Navigate to="/teacher" replace />
          }
        />
        <Route path="/students" element={<TeacherStudents token={token} user={user} />} />
        
  {/* Forum routes removed */}
        
        {/* Analytics route - Using fixed analytics as the main analytics page */}
        <Route 
          path="/analytics" 
          element={
            hasAccess('View Analytics') 
              ? <TeacherAnalyticsFixed token={token} user={user} /> 
              : <Navigate to="/teacher" replace />
          } 
        />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Box>
  );
};

export default TeacherRoutes;
