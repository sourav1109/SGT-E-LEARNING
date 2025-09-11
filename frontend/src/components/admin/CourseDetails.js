import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  VideoLibrary as VideoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  BarChart as BarChartIcon,
  OndemandVideo as OndemandVideoIcon,
  Forum as ForumIcon
} from '@mui/icons-material';
import AdminCourseChatTab from './AdminCourseChatTab';

import { getCourseDetails, getCourseVideos, getCourseStudents } from '../../api/courseApi';
import { getVideoAnalytics } from '../../api/videoApi';

// Helper function to format duration in seconds to readable format
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Helper function to calculate progress percentage
const calculateProgress = (completedCount, totalCount) => {
  if (!totalCount) return 0;
  return Math.round((completedCount / totalCount) * 100);
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`course-tabpanel-${index}`}
      aria-labelledby={`course-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const VideoAnalyticsDialog = ({ open, onClose, videoId, token }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && videoId) {
      const fetchAnalytics = async () => {
        try {
          setLoading(true);
          const data = await getVideoAnalytics(videoId, token);
          setAnalytics(data);
        } catch (error) {
          console.error('Error fetching video analytics:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchAnalytics();
    }
  }, [open, videoId, token]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center' }}>
        <BarChartIcon sx={{ mr: 1 }} />
        Video Analytics
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : analytics ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              {analytics.videoTitle}
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Overall Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Total Views</Typography>
                      <Typography variant="h4">{analytics.totalViews}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Average Watch Time</Typography>
                      <Typography variant="h4">{formatDuration(analytics.averageWatchTime)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                      <Typography variant="h4">{analytics.completionRate}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Total Watch Time</Typography>
                      <Typography variant="h4">{formatDuration(analytics.totalViews * analytics.averageWatchTime)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
            
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
              Student Viewing Data
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reg. No.</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Watch Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Progress</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Sessions</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Last Watched</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.studentData?.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.regNo}</TableCell>
                      <TableCell>{formatDuration(student.watchTime)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={student.progress} 
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {student.progress}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {student.sessionCount || 0} sessions
                        {student.averageSessionLength > 0 && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Avg: {formatDuration(student.averageSessionLength)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{student.lastWatched ? new Date(student.lastWatched).toLocaleString() : 'Never'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Typography color="error">Failed to load analytics data</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const CourseDetails = ({ courseId, onBack, token }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [courseDetails, setCourseDetails] = useState(null);
  const [videos, setVideos] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoAnalyticsOpen, setVideoAnalyticsOpen] = useState(false);

  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true);
      try {
        // Fetch course details, videos, and students in parallel
        const [details, videosData, studentsData] = await Promise.all([
          getCourseDetails(courseId, token),
          getCourseVideos(courseId, token),
          getCourseStudents(courseId, token)
        ]);
        
        setCourseDetails(details);
        setVideos(videosData);
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, token]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleViewAnalytics = (videoId) => {
    setSelectedVideo(videoId);
    setVideoAnalyticsOpen(true);
  };

  const closeVideoAnalytics = () => {
    setVideoAnalyticsOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!courseDetails) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Failed to load course details
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mt: 2 }}>
          Back to Course List
        </Button>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {/* Course Header */}
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'primary.main', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton color="inherit" onClick={onBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {courseDetails.courseCode}: {courseDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
              {courseDetails.description}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Chip 
            label={`${students.length} Students`} 
            color="secondary" 
            sx={{ mr: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} 
          />
          <Chip 
            label={`${videos.length} Videos`} 
            color="secondary" 
            sx={{ backgroundColor: 'rgba(255,255,255,0.15)' }} 
          />
        </Box>
      </Box>

      {/* Course Summary */}
      <Box sx={{ p: 3, backgroundColor: 'rgba(0,0,0,0.02)' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Overall Progress
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Typography variant="h4" component="div">
                    {courseDetails.overallProgress || 0}%
                  </Typography>
                  <Typography sx={{ mb: 1, ml: 1 }} color="text.secondary">
                    completed
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={courseDetails.overallProgress || 0}
                  sx={{ height: 10, borderRadius: 5, mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Teachers Assigned
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {courseDetails.teachers && courseDetails.teachers.length > 0 ? (
                    courseDetails.teachers.map((teacher, index) => (
                      <Chip 
                        key={index}
                        avatar={<Avatar>{teacher.name.charAt(0)}</Avatar>}
                        label={teacher.name}
                        sx={{ m: 0.5 }}
                      />
                    ))
                  ) : (
                    <Typography color="text.secondary">No teachers assigned</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Course Statistics
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Total Students:</strong> {students.length}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Total Videos:</strong> {videos.length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Created On:</strong> {new Date(courseDetails.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs for different sections */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="course details tabs">
          <Tab icon={<PersonIcon />} iconPosition="start" label="Students" />
          <Tab icon={<VideoIcon />} iconPosition="start" label="Videos" />
          <Tab icon={<SchoolIcon />} iconPosition="start" label="Content" />
          <Tab icon={<ForumIcon />} iconPosition="start" label="Chat" />
        </Tabs>
      {/* Chat Tab */}
      <TabPanel value={tabValue} index={3}>
        <AdminCourseChatTab courseId={courseId} />
      </TabPanel>
      </Box>

      {/* Students Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          Enrolled Students ({students.length})
        </Typography>
        
        {students.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Reg No</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {student.name.charAt(0)}
                        </Avatar>
                        {student.name}
                      </Box>
                    </TableCell>
                    <TableCell>{student.regNo}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={student.progress || 0}
                            sx={{ height: 10, borderRadius: 5 }}
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="body2" color="text.secondary">
                            {student.progress || 0}%
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={student.isActive ? 'Active' : 'Inactive'}
                        color={student.isActive ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">
            No students enrolled in this course yet.
          </Typography>
        )}
      </TabPanel>

      {/* Videos Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Course Videos ({videos.length})
        </Typography>
        
        {videos.length > 0 ? (
          <Grid container spacing={3}>
            {videos.map((video) => (
              <Grid item xs={12} md={6} lg={4} key={video._id}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ position: 'relative' }}>
                    <Box 
                      component="video"
                      src={video.url}
                      controls
                      poster={video.thumbnail}
                      sx={{ 
                        width: '100%', 
                        height: 180, 
                        objectFit: 'cover',
                        backgroundColor: '#000'
                      }}
                    />
                    {video.warned && (
                      <Chip
                        icon={<WarningIcon />}
                        label="Flagged Content"
                        color="warning"
                        size="small"
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                      />
                    )}
                    <Chip
                      label={formatDuration(video.duration)}
                      size="small"
                      sx={{ 
                        position: 'absolute', 
                        bottom: 8, 
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white'
                      }}
                    />
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" component="div" noWrap title={video.title}>
                      {video.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {video.teacherName || 'Unknown Teacher'}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {video.views || 0} views
                      </Typography>
                      <Chip 
                        label={`${video.completionRate || 0}% completion`}
                        size="small"
                        color={video.completionRate > 75 ? 'success' : video.completionRate > 40 ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                  
                  <Divider />
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      size="small" 
                      startIcon={<BarChartIcon />}
                      onClick={() => handleViewAnalytics(video._id)}
                    >
                      View Analytics
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography color="text.secondary">
            No videos have been uploaded for this course yet.
          </Typography>
        )}
      </TabPanel>

      {/* Content Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          Course Content
        </Typography>
        
        {courseDetails.modules && courseDetails.modules.length > 0 ? (
          <Box>
            {courseDetails.modules.map((module, index) => (
              <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Module {index + 1}: {module.title}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {module.description}
                  </Typography>
                  
                  <List>
                    {module.lessons && module.lessons.map((lesson, lessonIndex) => (
                      <ListItem key={lessonIndex} alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <OndemandVideoIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography component="span">
                                {lesson.title}
                              </Typography>
                              {lesson.completed && (
                                <Tooltip title="Completed">
                                  <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />
                                </Tooltip>
                              )}
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.primary">
                                Duration: {formatDuration(lesson.duration)}
                              </Typography>
                              {" — "}{lesson.description}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary">
            No structured content has been added to this course yet.
          </Typography>
        )}
      </TabPanel>

      {/* Video Analytics Dialog */}
      <VideoAnalyticsDialog
        open={videoAnalyticsOpen}
        onClose={closeVideoAnalytics}
        videoId={selectedVideo}
        token={token}
      />
    </Paper>
  );
};

export default CourseDetails;
