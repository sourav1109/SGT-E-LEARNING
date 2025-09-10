import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import StudentDashboard from '../components/student/StudentDashboard';
import WatchHistory from '../components/student/WatchHistory';
import RecentVideos from '../components/student/RecentVideos';
import CourseProgress from '../components/student/CourseProgress';
import VideoPlayer from '../components/student/VideoPlayer';
import CourseList from '../components/student/CourseList';
import CourseVideos from '../components/student/CourseVideos';
import DiscussionList from '../components/student/DiscussionList';
import DiscussionDetail from '../components/student/DiscussionDetail';
import StudentCourseUnits from '../pages/student/StudentCourseUnits';
import StudentUnitVideo from '../pages/student/StudentUnitVideo';
import StudentQuizPage from '../pages/student/StudentQuizPage';
import NotFound from '../components/common/NotFound';

const StudentRoutes = ({ user, token }) => {
  if (!user || user.role !== 'student') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
      <Routes>
        <Route path="/" element={<StudentDashboard user={user} />} />
        <Route path="/watch-history" element={<WatchHistory token={token} />} />
        <Route path="/recent-videos" element={<RecentVideos token={token} />} />
        <Route path="/courses" element={<CourseList token={token} />} />
        <Route path="/course/:courseId/progress" element={<CourseProgress token={token} />} />
        
  {/* Units and videos routes */}
  <Route path="/course/:courseId/units" element={<StudentCourseUnits />} />
  <Route path="/course/:courseId/unit/:unitId/video/:videoId" element={<StudentUnitVideo />} />

  {/* Quiz route for student quiz attempts */}
  <Route 
    path="/course/:courseId/quiz/:attemptId" 
    element={
      <StudentQuizPage 
        user={user} 
        token={token} 
      />
    } 
  />

  {/* Legacy non-unit video routes (maintained for backward compatibility) */}
        <Route path="/course/:courseId/videos" element={<CourseVideos token={token} />} />
        <Route path="/course/:courseId/video/:videoId" element={<VideoPlayer token={token} />} />
        
        <Route path="/course/:courseId/discussions" element={<DiscussionList token={token} />} />
        <Route path="/discussion/:discussionId" element={<DiscussionDetail token={token} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Box>
  );
};

export default StudentRoutes;
