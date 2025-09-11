import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Grid
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ForumIcon from '@mui/icons-material/Forum';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CourseChat from '../../components/CourseChat';
import axios from 'axios';

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const StudentCourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Set tab to Chat if ?tab=chat is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'chat') setTabValue(1);
  }, [location.search]);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/student/courses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const foundCourse = response.data.find(c => c._id === courseId);
        if (!foundCourse) {
          setError('Course not found');
          setLoading(false);
          return;
        }
        setCourse(foundCourse);
        // Fetch videos for this course
        const videosResponse = await axios.get(`/api/student/course/${courseId}/videos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVideos(videosResponse.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load course details. Please try again later.');
        setLoading(false);
      }
    };
    if (token && courseId) fetchCourseDetails();
  }, [token, courseId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }
  if (!course) {
    return <Alert severity="warning">Course not found</Alert>;
  }

  return (
    <div>
      <Box sx={{ mb: 4 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/student/courses')}
          sx={{ mb: 2 }}
        >
          Back to Courses
        </Button>
        <Typography variant="h4" gutterBottom>
          {course.title}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Course Code: {course.courseCode}
        </Typography>
        <Typography variant="body1" paragraph>
          {course.description || 'No description available.'}
        </Typography>
      </Box>
      <Paper sx={{ width: '100%' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Videos" icon={<VideoLibraryIcon />} iconPosition="start" />
          <Tab label="Chat" icon={<ForumIcon />} iconPosition="start" />
        </Tabs>
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Course Videos ({videos.length})
          </Typography>
          {videos.length === 0 ? (
            <Typography variant="body1">No videos available for this course yet.</Typography>
          ) : (
            <Grid container spacing={3}>
              {videos.map((video) => (
                <Grid item xs={12} md={6} lg={4} key={video._id}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {video.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {video.description || 'No description'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button variant="outlined" size="small">
                        View
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <CourseChat courseId={courseId} user={{ name: localStorage.getItem('name') || 'Student' }} />
        </TabPanel>
      </Paper>
    </div>
  );
};

export default StudentCourseDetail;
