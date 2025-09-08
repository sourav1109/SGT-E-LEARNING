import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Grid, 
  Paper, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  CircularProgress, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  LinearProgress 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

// Icons
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ForumIcon from '@mui/icons-material/Forum';
import * as forumApi from '../../api/forumApi';

const StudentHomeDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  
  const [courses, setCourses] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentForums, setRecentForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get student courses with progress info
        const coursesResponse = await axios.get('/api/student/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCourses(coursesResponse.data);
        
        // Get recent activity (watch history)
        const activityResponse = await axios.get('/api/student/watch-history?limit=5', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setRecentActivity(activityResponse.data || []);
        
        // Get recent forum discussions
        try {
          // Get discussions for each course
          const forumPromises = coursesResponse.data.map(course => 
            forumApi.getCourseDiscussions(course._id).catch(() => ({ discussions: [] }))
          );
          
          const forumsResults = await Promise.all(forumPromises);
          
          // Combine all discussions
          let allDiscussions = [];
          forumsResults.forEach(result => {
            if (result && result.discussions) {
              allDiscussions = [...allDiscussions, ...result.discussions];
            }
          });
          
          // Sort by most recent and limit to 5
          allDiscussions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setRecentForums(allDiscussions.slice(0, 5));
        } catch (forumErr) {
          console.error('Error fetching forums:', forumErr);
          setRecentForums([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to load your dashboard data');
        setLoading(false);
      }
    };
    
    if (token) {
      fetchData();
    }
  }, [token]);
  
  const calculateOverallProgress = () => {
    if (courses.length === 0) return 0;
    
    const totalProgress = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
    return Math.round(totalProgress / courses.length);
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
      </Typography>
      
      <Typography variant="subtitle1" gutterBottom>
        Welcome, {currentUser?.name || 'Student'}!
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid container spacing={3}>
          {/* Progress Overview */}
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 240,
              }}
            >
              <Typography component="h2" variant="h6" color="primary" gutterBottom>
                Your Progress
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={calculateOverallProgress()} 
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {`${calculateOverallProgress()}%`}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <List sx={{ overflow: 'auto', maxHeight: 150 }}>
                {courses.slice(0, 5).map((course) => (
                  <ListItem key={course._id}>
                    <ListItemText 
                      primary={course.title} 
                      secondary={`${course.progress || 0}% Complete`} 
                    />
                    <Box sx={{ width: '40%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={course.progress || 0} 
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>
              
              {courses.length > 5 && (
                <Box sx={{ mt: 1, textAlign: 'center' }}>
                  <Button size="small" onClick={() => navigate('/student/courses')}>
                    View All Courses
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Stats Summary */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 240,
              }}
            >
              <Typography component="h2" variant="h6" color="primary" gutterBottom>
                Statistics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <VideoLibraryIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5">{courses.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Courses</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <OndemandVideoIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5">
                      {recentActivity.reduce((total, item) => total + (item.videoCount || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Videos Watched</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <AccessTimeIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5">
                      {formatDuration(recentActivity.reduce((total, item) => total + (item.totalWatchTime || 0), 0))}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Watch Time</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <ForumIcon color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h5">{recentForums.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Forum Posts</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Recent Forums */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography component="h2" variant="h6" color="primary" gutterBottom>
                Recent Forum Discussions
              </Typography>
              
              {recentForums.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  No recent forum activity. Join the discussion by posting a question!
                </Typography>
              ) : (
                <List sx={{ overflow: 'auto', maxHeight: 300 }}>
                  {recentForums.map((forum) => (
                    <ListItem key={forum._id} divider>
                      <ListItemAvatar>
                        <Avatar>
                          <ForumIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={forum.title}
                        secondary={
                          <>
                            {forum.course?.title || 'Course'} • 
                            {forum.isResolved ? ' Resolved • ' : ' Open • '}
                            {formatDate(forum.createdAt)}
                          </>
                        }
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/student/forum/${forum._id}`)}
                      >
                        View
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/student/forums')}
                >
                  Go to Forums
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Recent Activity */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography component="h2" variant="h6" color="primary" gutterBottom>
                Recent Activity
              </Typography>
              
              {recentActivity.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  No recent activity. Start watching videos to track your progress!
                </Typography>
              ) : (
                <List sx={{ overflow: 'auto', maxHeight: 300 }}>
                  {recentActivity.map((activity) => (
                    <ListItem key={activity._id} divider>
                      <ListItemAvatar>
                        <Avatar>
                          <OndemandVideoIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.videoTitle || 'Video'}
                        secondary={
                          <>
                            {activity.courseName || 'Course'} • 
                            Watched: {formatDuration(activity.watchTime)} • 
                            {formatDate(activity.lastWatched)}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/student/courses')}
                >
                  View All Courses
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Course Cards */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Your Courses
            </Typography>
            
            <Grid container spacing={3}>
              {courses.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body1">
                      You don't have any courses assigned yet.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                courses.map((course) => (
                  <Grid item xs={12} sm={6} md={4} key={course._id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" noWrap>
                          {course.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {course.courseCode}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={course.progress || 0} 
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {`${course.progress || 0}%`}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {course.videoCount || 0} videos • 
                          {formatDuration(course.totalDuration || 0)} total length
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          onClick={() => navigate(`/student/course/${course._id}/videos`)}
                        >
                          View Videos
                        </Button>
                        <Button 
                          size="small" 
                          onClick={() => navigate(`/student/course/${course._id}/progress`)}
                        >
                          View Progress
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default StudentHomeDashboard;
