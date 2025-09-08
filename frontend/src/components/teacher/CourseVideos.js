import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardMedia, 
  Grid, 
  CircularProgress, 
  Button, 
  Alert,
  Container,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useParams, Link } from 'react-router-dom';
import { getCourseVideos } from '../../api/teacherApi';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';

const CourseVideos = ({ token, user }) => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const data = await getCourseVideos(courseId, token);
        setVideos(data.videos || []);
        setCourseTitle(data.courseTitle || 'Course');
        setError(null);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos');
      } finally {
        setLoading(false);
      }
    };
    
    if (courseId && token) {
      fetchVideos();
    }
  }, [courseId, token]);
  
  const handleRemoveRequest = (video) => {
    setSelectedVideo(video);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedVideo(null);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  const canManageVideos = user?.permissions?.includes('Manage Videos');
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {courseTitle}: Videos
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          Manage video content for this course
        </Typography>
      </Box>
      
      {canManageVideos && (
        <Box sx={{ mb: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            component={Link}
            to="/teacher/videos/upload"
            startIcon={<VideoLibraryIcon />}
          >
            Upload New Video
          </Button>
        </Box>
      )}
      
      {videos.length === 0 ? (
        <Alert severity="info">
          No videos have been uploaded for this course yet.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {videos.map((video) => (
            <Grid item xs={12} md={6} lg={4} key={video._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 0,
                    paddingTop: '56.25%', // 16:9 aspect ratio
                    position: 'relative',
                    bgcolor: 'rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Video thumbnail or placeholder */}
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
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <VideoLibraryIcon sx={{ fontSize: 60, opacity: 0.7 }} />
                    </Box>
                  )}
                </CardMedia>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {video.title}
                  </Typography>
                  
                  {video.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {video.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      component={Link}
                      to={`/teacher/video/${video._id}`}
                    >
                      Watch
                    </Button>
                    
                    {canManageVideos && (
                      <IconButton 
                        color="error" 
                        size="small" 
                        onClick={() => handleRemoveRequest(video)}
                        title="Request video removal"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Video Removal Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Request Video Removal</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to request removal of "{selectedVideo?.title}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will send a request to the administrator. The video will remain available until approved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            component={Link}
            to={`/teacher/video/${selectedVideo?._id}/remove-request`}
            color="error"
            variant="contained"
            onClick={handleCloseDialog}
          >
            Continue to Request
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CourseVideos;
