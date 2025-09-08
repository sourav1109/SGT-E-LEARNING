import React, { useEffect, useState } from 'react';
import { Grid, Typography, Paper, Card, CardContent, CircularProgress, Alert, Chip, Box, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';
import { hasPermission } from '../../utils/permissions';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import { MdClass } from 'react-icons/md';
import BarChartIcon from '@mui/icons-material/BarChart';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// Helper function to get permission label
const getPermissionLabel = (permission) => {
  switch(permission) {
    case 'manage_teachers': return 'Manage Teachers';
    case 'manage_students': return 'Manage Students';
    case 'manage_courses': return 'Manage Courses';
    case 'manage_videos': return 'Manage Videos';
    // Analytics label removed
    default: return permission;
  }
};

// Helper function to get permission icon
const getPermissionIcon = (permission) => {
  switch(permission) {
    case 'manage_teachers': return <PeopleIcon />;
    case 'manage_students': return <SchoolIcon />;
    case 'manage_courses': return <MdClass />;
    case 'manage_videos': return <VideoLibraryIcon />;
    // Analytics icon removed
    default: return null;
  }
};

const TeacherDashboardHome = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    courseCount: 0,
    studentCount: 0,
    videoCount: 0,
    forumCount: 0
  });
  const [courses, setCourses] = useState([]);

  // Define available permissions
  const allPermissions = [
    'manage_teachers',
    'manage_students',
    'manage_courses',
    'manage_videos'
    // 'view_analytics' removed from dashboard
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch overview data
        const overviewResponse = await axios.get('/api/teacher/analytics/overview', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Fetch courses
        const coursesResponse = await axios.get('/api/teacher/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setDashboardData(overviewResponse.data);
        setCourses(coursesResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        // Use some default data in case of error
        setDashboardData({
          courseCount: 0,
          studentCount: 0,
          videoCount: 0,
          forumCount: 0
        });
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Teacher Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Welcome, {currentUser?.name || 'Teacher'}!
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Courses
                </Typography>
                <Typography variant="h3">
                  {dashboardData.courseCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  courses assigned
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Students
                </Typography>
                <Typography variant="h3">
                  {dashboardData.studentCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  across all courses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Videos
                </Typography>
                <Typography variant="h3">
                  {dashboardData.videoCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  uploaded
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Forums
                </Typography>
                <Typography variant="h3">
                  {dashboardData.forumCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  active discussions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Your Permissions
              </Typography>
              
              {/* Debug section to show raw permissions */}
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2">Debug - Raw Permissions:</Typography>
                <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(currentUser.permissions || [], null, 2)}
                </pre>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>User Object:</Typography>
                <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(currentUser || {}, null, 2)}
                </pre>
              </Box>
              
              <List>
                {allPermissions.map(permission => (
                  <ListItem key={permission}>
                    <ListItemIcon>
                      {hasPermission(currentUser, permission)
                        ? <CheckCircleIcon color="success" /> 
                        : <CancelIcon color="disabled" />}
                    </ListItemIcon>
                    <ListItemText 
                      primary={getPermissionLabel(permission)}
                      secondary={hasPermission(currentUser, permission)
                        ? "You have access to this feature" 
                        : "You don't have access to this feature"}
                      primaryTypographyProps={{
                        color: hasPermission(currentUser, permission)
                          ? 'text.primary' 
                          : 'text.disabled'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Assigned Courses
              </Typography>
              
              {courses.length === 0 ? (
                <Typography variant="body1">
                  You don't have any courses assigned yet.
                </Typography>
              ) : (
                <List>
                  {courses.map(course => (
                    <React.Fragment key={course._id}>
                      <ListItem>
                        <ListItemIcon>
                          <MdClass />
                        </ListItemIcon>
                        <ListItemText 
                          primary={course.title}
                          secondary={`Course Code: ${course.courseCode}`}
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </div>
  );
};

export default TeacherDashboardHome;
