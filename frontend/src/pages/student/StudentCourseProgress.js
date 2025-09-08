import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Box, 
  CircularProgress, 
  Paper, 
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BarChartIcon from '@mui/icons-material/BarChart';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

// Tab Panel Component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`progress-tabpanel-${index}`}
      aria-labelledby={`progress-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const StudentCourseProgress = () => {
  const { courseId } = useParams();
  const token = localStorage.getItem('token');
  
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        
        // Fetch course details
        const courseResponse = await axios.get(`/api/student/course/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setCourse(courseResponse.data);
        
        // Fetch videos for this course
        const videosResponse = await axios.get(`/api/student/course/${courseId}/videos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setVideos(videosResponse.data);
        
        // Fetch watch history for this course
        const historyResponse = await axios.get(`/api/student/course/${courseId}/watch-history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setWatchHistory(historyResponse.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course progress:', err);
        setError('Failed to load course progress. Please try again.');
        setLoading(false);
      }
    };
    
    if (token && courseId) {
      fetchCourseData();
    }
  }, [token, courseId]);
  
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const calculateWatchedCount = () => {
    if (!videos || videos.length === 0) return 0;
    return videos.filter(video => video.watched).length;
  };
  
  const calculateProgress = () => {
    if (!videos || videos.length === 0) return 0;
    return Math.round((calculateWatchedCount() / videos.length) * 100);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/courses" color="inherit">
          My Courses
        </Link>
        <Typography color="text.primary">Course Progress</Typography>
      </Breadcrumbs>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : !course ? (
        <Typography variant="body1">
          Course not found or you don't have access to this course.
        </Typography>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            {course.title} - Progress
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Course Code: {course.courseCode}
          </Typography>
          
          {/* Progress Overview Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Progress
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex', mr: 2 }}>
                      <CircularProgress 
                        variant="determinate" 
                        value={calculateProgress()} 
                        size={56} 
                        thickness={4}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" component="div" color="text.secondary">
                          {`${calculateProgress()}%`}
                        </Typography>
                      </Box>
                    </Box>
                    <BarChartIcon color="primary" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Videos Watched
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h5" component="div" sx={{ mr: 2 }}>
                      {calculateWatchedCount()} / {videos.length}
                    </Typography>
                    <OndemandVideoIcon color="primary" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Watch Time
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h5" component="div" sx={{ mr: 2 }}>
                      {formatDuration(watchHistory.reduce((total, item) => total + (item.watchTime || 0), 0))}
                    </Typography>
                    <AccessTimeIcon color="primary" fontSize="large" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Last Activity
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle1" component="div" sx={{ mr: 2 }}>
                      {watchHistory.length > 0 
                        ? formatDate(watchHistory[0].timestamp)
                        : 'No activity yet'
                      }
                    </Typography>
                    <CalendarTodayIcon color="primary" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)} 
              aria-label="course progress tabs"
            >
              <Tab label="Videos Progress" />
              <Tab label="Watch History" />
            </Tabs>
          </Box>
          
          {/* Videos Progress Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Videos Progress
            </Typography>
            
            {videos.length === 0 ? (
              <Typography variant="body1">
                No videos available for this course yet.
              </Typography>
            ) : (
              <List>
                {videos.map((video, index) => (
                  <React.Fragment key={video._id}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        {video.watched ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <PlayArrowIcon color="action" />
                        )}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={`${index + 1}. ${video.title}`}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              Duration: {formatDuration(video.duration)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <Box sx={{ width: '70%', mr: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={video.watchProgress || (video.watched ? 100 : 0)} 
                                />
                              </Box>
                              <Box sx={{ minWidth: 35 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {`${video.watchProgress || (video.watched ? 100 : 0)}%`}
                                </Typography>
                              </Box>
                            </Box>
                          </>
                        }
                      />
                      
                      {video.watched && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Completed on: {formatDate(video.lastWatchedDate)}
                          </Typography>
                        </Box>
                      )}
                    </ListItem>
                    
                    {index < videos.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </TabPanel>
          
          {/* Watch History Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Watch History
            </Typography>
            
            {watchHistory.length === 0 ? (
              <Typography variant="body1">
                No watch history available. Start watching videos to track your progress!
              </Typography>
            ) : (
              <List>
                {watchHistory.map((entry, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <OndemandVideoIcon color="primary" />
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={entry.videoTitle || 'Video'}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              Watched for: {formatDuration(entry.watchTime)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(entry.timestamp)}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    
                    {index < watchHistory.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </TabPanel>
        </>
      )}
    </Container>
  );
};

export default StudentCourseProgress;
