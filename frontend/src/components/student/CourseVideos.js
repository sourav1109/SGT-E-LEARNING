import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Button,
  Divider,
  LinearProgress,
  Alert
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ForumIcon from '@mui/icons-material/Forum';
import { getCourseVideos } from '../../api/studentVideoApi';

const CourseVideos = ({ token }) => {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourseVideos = async () => {
      try {
        setLoading(true);
        const data = await getCourseVideos(courseId, token);
        setCourse(data.course);
        setVideos(data.videos);
        setError(null);
      } catch (err) {
        console.error('Error fetching course videos:', err);
        setError('Failed to load course videos');
      } finally {
        setLoading(false);
      }
    };

    if (token && courseId) {
      fetchCourseVideos();
    }
  }, [courseId, token]);

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
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!course) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Course not found</Typography>
      </Box>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No videos available for this course</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5">{course.title}</Typography>
          {course.courseCode && (
            <Typography variant="body2" color="text.secondary">
              Course Code: {course.courseCode}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          color="info"
          component={Link}
          to={`/student/course/${courseId}/discussions`}
          startIcon={<ForumIcon />}
        >
          Discussion Forum
        </Button>
      </Box>

      {course.progress !== undefined && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">Overall Progress</Typography>
            <Typography variant="body2">{course.progress}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={course.progress}
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {course.videosCompleted} of {course.totalVideos} videos completed
          </Typography>
        </Box>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Note: Fast-forwarding is disabled to ensure you get the most out of this content.
        </Typography>
      </Alert>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" gutterBottom>
        Course Videos
      </Typography>

      <Grid container spacing={3}>
        {videos.map((video) => (
          <Grid item xs={12} md={6} key={video._id}>
            <Card sx={{ height: '100%', position: 'relative' }}>
              {video.completed && (
                <CheckCircleIcon
                  color="success"
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    fontSize: 28,
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    zIndex: 1
                  }}
                />
              )}
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {video.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {video.description}
                </Typography>

                {video.watchProgress !== undefined && (
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Watch Progress
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {video.watchProgress}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={video.watchProgress}
                      sx={{ height: 5, borderRadius: 1 }}
                    />
                  </Box>
                )}

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to={`/student/course/${courseId}/video/${video._id}`}
                    startIcon={<PlayCircleOutlineIcon />}
                    fullWidth
                  >
                    {video.watched ? 'Resume Video' : 'Start Video'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default CourseVideos;
