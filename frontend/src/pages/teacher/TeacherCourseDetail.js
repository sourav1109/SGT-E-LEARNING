import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Grid,
  Card,
  CardContent,
  CardMedia
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ForumIcon from '@mui/icons-material/Forum';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
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

const TeacherCourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [videos, setVideos] = useState([]);
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch course details
        const courseResponse = await axios.get(`/api/teacher/courses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const foundCourse = courseResponse.data.find(c => c._id === courseId);
        
        if (!foundCourse) {
          setError('Course not found');
          setLoading(false);
          return;
        }
        
        setCourse(foundCourse);
        
        // Fetch students enrolled in this course
        const studentsResponse = await axios.get(`/api/teacher/course/${courseId}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(studentsResponse.data);
        
        // Fetch videos for this course
        const videosResponse = await axios.get(`/api/teacher/course/${courseId}/videos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVideos(videosResponse.data);
        
        // Fetch forums for this course
        const forumsResponse = await axios.get(`/api/teacher/course/${courseId}/forums`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForums(forumsResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course details:', err);
        setError('Failed to load course details. Please try again later.');
        setLoading(false);
      }
    };
    
    if (token && courseId) {
      fetchCourseDetails();
    }
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
          onClick={() => navigate('/teacher/courses')}
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
          <Tab label="Students" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="Videos" icon={<VideoLibraryIcon />} iconPosition="start" />
          <Tab label="Forums" icon={<ForumIcon />} iconPosition="start" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Enrolled Students ({students.length})
          </Typography>
          
          {students.length === 0 ? (
            <Typography variant="body1">No students enrolled in this course yet.</Typography>
          ) : (
            <List>
              {students.map((student) => (
                <React.Fragment key={student._id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>{student.name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={student.name}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {student.email}
                          </Typography>
                          {student.regNo && (
                            <Typography component="span" variant="body2" display="block">
                              Registration No: {student.regNo}
                            </Typography>
                          )}
                        </>
                      }
                    />
                    <Button 
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/teacher/analytics/student/${student._id}`)}
                    >
                      View Progress
                    </Button>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Course Videos ({videos.length})
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate('/teacher/videos/upload')}
            >
              Upload New Video
            </Button>
          </Box>
          
          {videos.length === 0 ? (
            <Typography variant="body1">No videos available for this course yet.</Typography>
          ) : (
            <Grid container spacing={3}>
              {videos.map((video) => (
                <Grid item xs={12} md={6} lg={4} key={video._id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia
                      component="div"
                      sx={{
                        pt: '56.25%', // 16:9 aspect ratio
                        position: 'relative',
                        cursor: 'pointer',
                        bgcolor: 'black'
                      }}
                      onClick={() => navigate(`/teacher/video/${video._id}`)}
                    >
                      {video.thumbnailUrl ? (
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title}
                          style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'rgba(0,0,0,0.4)'
                        }}>
                          <VideoLibraryIcon sx={{ fontSize: 60, opacity: 0.7, color: 'white' }} />
                        </Box>
                      )}
                    </CardMedia>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {video.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {video.description || 'No description'}
                      </Typography>
                      {video.duration && (
                        <Typography variant="body2" color="text.secondary">
                          Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                        </Typography>
                      )}
                    </CardContent>
                    <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                      <Button 
                        variant="contained" 
                        size="small" 
                        color="primary"
                        onClick={() => navigate(`/teacher/video/${video._id}`)}
                        startIcon={<PlayCircleOutlineIcon />}
                      >
                        Watch
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Discussion Forums ({forums.length})
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => alert('Create forum functionality not implemented yet')}
            >
              Create New Forum
            </Button>
          </Box>
          
          {forums.length === 0 ? (
            <Typography variant="body1">No forums available for this course yet.</Typography>
          ) : (
            <List>
              {forums.map((forum) => (
                <React.Fragment key={forum._id}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={forum.title}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.secondary">
                            {forum.description || 'No description'}
                          </Typography>
                          <Typography component="span" variant="body2" display="block" color="text.secondary">
                            Posts: {forum.postCount || 0} | Last activity: {new Date(forum.lastActivity).toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                    <Button 
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/teacher/forum/${forum._id}`)}
                    >
                      View Forum
                    </Button>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </TabPanel>
      </Paper>
    </div>
  );
};

export default TeacherCourseDetail;
