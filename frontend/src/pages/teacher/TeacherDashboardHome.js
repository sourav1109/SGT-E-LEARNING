import React, { useEffect, useState } from 'react';
import { Grid, Typography, Paper, Card, CardContent, CircularProgress, Alert, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';


import { MdClass } from 'react-icons/md';




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
