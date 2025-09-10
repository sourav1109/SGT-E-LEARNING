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
  Grid
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ForumIcon from '@mui/icons-material/Forum';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import { getUnitsByCourse, createUnit } from '../../api/unitApi';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField as MuiTextField
} from '@mui/material';

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
  const [units, setUnits] = useState([]);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitError, setUnitError] = useState('');

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        // Fetch course details directly
        const courseResponse = await axios.get(`/api/teacher/course/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourse(courseResponse.data);
        // Fetch students
        const studentsResponse = await axios.get(`/api/teacher/course/${courseId}/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(studentsResponse.data);
        // Fetch videos
        const videosResponse = await axios.get(`/api/teacher/course/${courseId}/videos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVideos(videosResponse.data);
        // Fetch forums
        const forumsResponse = await axios.get(`/api/teacher/course/${courseId}/forums`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setForums(forumsResponse.data);
        // Fetch units
        const unitsData = await getUnitsByCourse(courseId, token);
        setUnits(unitsData);
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

  const handleOpenUnitDialog = () => {
    setNewUnitTitle('');
    setNewUnitDesc('');
    setUnitError('');
    setUnitDialogOpen(true);
  };
  const handleCloseUnitDialog = () => setUnitDialogOpen(false);
  const handleCreateUnit = async () => {
    if (!newUnitTitle.trim()) {
      setUnitError('Unit title is required');
      return;
    }
    setUnitLoading(true);
    setUnitError('');
    try {
      await createUnit(courseId, { title: newUnitTitle, description: newUnitDesc }, token);
      // Refresh units
      const unitsData = await getUnitsByCourse(courseId, token);
      setUnits(unitsData);
      setUnitDialogOpen(false);
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to create unit');
    } finally {
      setUnitLoading(false);
    }
  };
  
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
          <Tab label="Units" />
        </Tabs>
        {/* Units Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Units ({units.length})</Typography>
            <Button variant="contained" color="primary" onClick={handleOpenUnitDialog}>
              Create Unit
            </Button>
          </Box>
          {units.length === 0 ? (
            <Typography>No units created for this course yet.</Typography>
          ) : (
            <List>
              {units.map(unit => (
                <ListItem key={unit._id}>
                  <ListItemText primary={unit.title} secondary={unit.description} />
                </ListItem>
              ))}
            </List>
          )}
          <Dialog open={unitDialogOpen} onClose={handleCloseUnitDialog}>
            <DialogTitle>Create New Unit</DialogTitle>
            <DialogContent>
              <MuiTextField
                autoFocus
                margin="dense"
                label="Unit Title"
                fullWidth
                value={newUnitTitle}
                onChange={e => setNewUnitTitle(e.target.value)}
                required
              />
              <MuiTextField
                margin="dense"
                label="Description"
                fullWidth
                value={newUnitDesc}
                onChange={e => setNewUnitDesc(e.target.value)}
                multiline
                rows={2}
              />
              {unitError && <Alert severity="error" sx={{ mt: 1 }}>{unitError}</Alert>}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseUnitDialog}>Cancel</Button>
              <Button onClick={handleCreateUnit} disabled={unitLoading} variant="contained">{unitLoading ? 'Creating...' : 'Create'}</Button>
            </DialogActions>
          </Dialog>
        </TabPanel>
        
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
              onClick={() => alert('Upload video functionality not implemented yet')}
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
