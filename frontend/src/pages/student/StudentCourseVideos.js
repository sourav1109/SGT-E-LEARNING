import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress, 
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Breadcrumbs,
  Link,
  Paper,
  Chip,
  Alert
} from '@mui/material';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { formatVideoUrl, formatDuration } from '../../utils/videoUtils';
import CustomVideoPlayer from '../../components/student/CustomVideoPlayer';
import { getCourseVideos, updateWatchHistory } from '../../api/studentVideoApi';

// Icons
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';

const StudentCourseVideos = () => {
  const { courseId, videoId } = useParams();
  const token = localStorage.getItem('token');
  
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [isUpdatingVideoState, setIsUpdatingVideoState] = useState(false);
  
  useEffect(() => {
    const fetchCourseAndVideos = async () => {
      try {
        setLoading(true);
        
        // Fetch videos for this course (this API returns both course and videos)
        const videosResponse = await getCourseVideos(courseId, token);
        
        setCourse(videosResponse.course);
        
        // Process videos to ensure watch data is correctly formatted
        const processedVideos = videosResponse.videos.map(video => ({
          ...video,
          // Ensure we have a valid watched status
          watched: video.watched === true,
          // Format any additional data like timeSpent
          timeSpent: video.timeSpent || 0,
          // Ensure we have a valid duration
          duration: video.duration || 0
        }));
        
        setVideos(processedVideos);
        
        // If videoId is provided in URL, open that video
        if (videoId && processedVideos) {
          const videoToPlay = processedVideos.find(v => v._id === videoId);
          if (videoToPlay) {
            setCurrentVideo(videoToPlay);
            setVideoOpen(true);
            
            // Record initial video watch
            updateWatchHistory(videoId, {
              timeSpent: 0.1, // Use 0.1 instead of 0 to pass backend validation
              currentTime: 0,
              duration: videoToPlay.duration
            }, token).catch(err => {
              console.error('Error recording initial video watch:', err);
            });
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course videos:', err);
        setError('Failed to load course videos. Please try again.');
        setLoading(false);
      }
    };
    
    if (token && courseId) {
      fetchCourseAndVideos();
    }
  }, [token, courseId, videoId, videoCompleted]);
  
  const handlePlayVideo = (video) => {
    setCurrentVideo(video);
    setVideoOpen(true);
    
    // Record initial video watch event with a minimal time spent (0.1s to pass validation)
    try {
      if (!token) {
        console.warn('Cannot update watch history: Token is missing');
        return;
      }
      
      updateWatchHistory(video._id, {
        timeSpent: 0.1, // Use 0.1 instead of 0 to pass backend validation
        currentTime: 0,
        duration: video.duration
      }, token);
    } catch (err) {
      console.error('Error recording video watch:', err);
    }
  };
  
  // Check if a video is locked (based on completion of previous videos)
  const isVideoLocked = (index) => {
    if (index === 0) return false; // First video is always unlocked
    
    // For sequential videos, only the video after the last watched video is unlocked
    // or videos that have already been watched completely
    const video = videos[index];
    
    // If this video has already been watched completely, it should remain unlocked
    if (video.watched === true) {
      console.log(`Video at index ${index} was previously watched, keeping it unlocked`);
      return false;
    }
    
    // Find the last watched video
    let lastWatchedIndex = -1;
    for (let i = 0; i < videos.length; i++) {
      // Only count videos that have been fully watched
      if (videos[i].watched === true) {
        lastWatchedIndex = i;
      } else {
        // Found the first unwatched video
        break;
      }
    }
    
    // Only unlock the video right after the last watched video
    // or the first video if none are watched yet
    if (index === lastWatchedIndex + 1 || index === 0) {
      console.log(`Video at index ${index} is unlocked (next in sequence)`);
      return false;
    }
    
    console.log(`Video at index ${index} is locked. Last watched index: ${lastWatchedIndex}`);
    return true;
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
        <Typography color="text.primary">Course Videos</Typography>
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
            {course.title}
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Course Code: {course.courseCode}
          </Typography>
          
          <Grid container spacing={4}>
            {/* Current/Selected Video Player */}
            {videoOpen && currentVideo && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    {currentVideo.title}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <CustomVideoPlayer 
                      videoId={currentVideo._id}
                      videoUrl={formatVideoUrl(currentVideo.videoUrl)}
                      title={currentVideo.title}
                      token={token}
                      onTimeUpdate={(currentTime, duration) => {
                        // Update the local duration if different from what's stored
                        if (duration > 0 && Math.abs(currentVideo.duration - duration) > 1) {
                          console.log(`Updating video duration in parent: ${duration}s`);
                          setCurrentVideo(prev => ({
                            ...prev,
                            duration: duration
                          }));
                        }
                      }}
                      onVideoComplete={(videoId) => {
                        console.log(`Video ${videoId} completed - refreshing videos list`);
                        
                        // Prevent multiple state updates by checking if we're already updating
                        if (isUpdatingVideoState) {
                          console.log('Already updating video state, ignoring duplicate completion event');
                          return;
                        }
                        
                        // Set flag to prevent duplicate updates
                        setIsUpdatingVideoState(true);
                        
                        // Force update of completed video state to trigger list refresh
                        setCurrentVideo(prev => ({
                          ...prev,
                          watched: true
                        }));
                        
                        // Update the videos list to mark this video as watched
                        setVideos(prevVideos => {
                          return prevVideos.map(video => {
                            if (video._id === videoId) {
                              // Mark this specific video as watched
                              return { 
                                ...video, 
                                watched: true,
                                // Store the completion time for analytics
                                completedAt: new Date().toISOString()
                              };
                            }
                            return video;
                          });
                        });
                        
                        // This will trigger a refresh of the videos list
                        // Use a timeout to prevent rapid state changes that could cause shivering
                        setTimeout(() => {
                          setVideoCompleted(prev => !prev);
                          // Reset the update flag after a delay to allow for future updates
                          setTimeout(() => {
                            setIsUpdatingVideoState(false);
                          }, 1000);
                        }, 300);
                      }}
                    />
                  </Box>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Your progress is automatically tracked while watching. You cannot skip ahead in the video, but you can adjust the playback speed and use full-screen mode.
                  </Alert>
                  
                  <Typography variant="body1" paragraph>
                    {currentVideo.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      icon={<AccessTimeIcon />} 
                      label={`Duration: ${formatDuration(currentVideo.duration)}`} 
                    />
                    
                    {currentVideo.watched && (
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        color="success" 
                        label="Watched" 
                      />
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}
            
            {/* Video List */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Videos ({videos.length})
              </Typography>
              
              {videos.length === 0 ? (
                <Typography variant="body1">
                  No videos available for this course yet.
                </Typography>
              ) : (
                <List sx={{ bgcolor: 'background.paper' }}>
                  {videos.map((video, index) => {
                    const locked = isVideoLocked(index);
                    
                    return (
                      <React.Fragment key={video._id}>
                        <ListItem 
                          alignItems="flex-start"
                          sx={{ 
                            cursor: locked ? 'not-allowed' : 'pointer',
                            opacity: locked ? 0.7 : 1,
                            '&:hover': {
                              bgcolor: locked ? 'inherit' : 'action.hover'
                            }
                          }}
                          onClick={() => !locked && handlePlayVideo(video)}
                        >
                          <ListItemIcon>
                            {locked ? (
                              <LockIcon color="action" />
                            ) : video.watched ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <PlayCircleOutlineIcon color="primary" />
                            )}
                          </ListItemIcon>
                          
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1">
                                {index + 1}. {video.title}
                                {video.watched && (
                                  <Chip 
                                    size="small" 
                                    label="Watched" 
                                    color="success" 
                                    sx={{ ml: 1 }} 
                                  />
                                )}
                                {locked && (
                                  <Chip 
                                    size="small" 
                                    label="Locked" 
                                    color="default" 
                                    sx={{ ml: 1 }} 
                                  />
                                )}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography component="span" variant="body2" color="text.primary">
                                  Duration: {formatDuration(video.duration || 0)}
                                </Typography>
                                
                                {/* Add progress bar for each video */}
                                {!locked && video.duration > 0 && (
                                  <Box sx={{ mt: 1, mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                      Progress: {Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%
                                    </Typography>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                      <Box
                                        sx={{
                                          width: '100%',
                                          height: 8,
                                          bgcolor: 'grey.300',
                                          borderRadius: 5,
                                          position: 'relative'
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            height: '100%',
                                            borderRadius: 5,
                                            bgcolor: video.watched ? 'success.main' : 'primary.main',
                                            width: `${Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%`,
                                            transition: 'width 0.5s ease-in-out'
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  </Box>
                                )}
                                
                                {video.timeSpent > 0 && (
                                  <Typography variant="body2" color="text.secondary">
                                    Watched: {formatDuration(video.timeSpent || 0)}
                                    {video.duration > 0 && video.timeSpent > 0 && (
                                      <> ({Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%)</>
                                    )}
                                  </Typography>
                                )}
                                {video.completedAt && (
                                  <Typography variant="body2" color="text.secondary">
                                    Completed: {new Date(video.completedAt).toLocaleDateString()}
                                  </Typography>
                                )}
                                {video.description && (
                                  <Typography variant="body2" color="text.secondary">
                                    {video.description.substring(0, 100)}
                                    {video.description.length > 100 ? '...' : ''}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                          
                          <Button 
                            variant="outlined" 
                            color="primary" 
                            size="small"
                            sx={{ mt: 1 }}
                            disabled={locked}
                            onClick={(e) => {
                              e.stopPropagation();
                              !locked && handlePlayVideo(video);
                            }}
                          >
                            {video.watched ? 'Rewatch' : 'Watch'}
                          </Button>
                        </ListItem>
                        
                        {index < videos.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default StudentCourseVideos;
