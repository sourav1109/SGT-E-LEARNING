import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HistoryIcon from '@mui/icons-material/History';
import ForumIcon from '@mui/icons-material/Forum';

const StudentDashboard = ({ user }) => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name || 'Student'}!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Track your progress and continue learning where you left off.
        </Typography>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          {/* Watch History Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <HistoryIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Watch History
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  View your complete watch history across all courses, including time spent on each video.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to="/student/watch-history"
                    startIcon={<AccessTimeIcon />}
                  >
                    View Watch History
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Course Progress Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssessmentIcon color="secondary" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Course Progress
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Check your progress in each course, including completion percentages and remaining videos.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    component={Link}
                    to="/student/courses"
                    startIcon={<VideoLibraryIcon />}
                  >
                    View Courses
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Discussion Forum Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ForumIcon color="info" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Discussion Forums
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Participate in course discussions, ask questions, and share your insights with peers and instructors.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="info"
                    component={Link}
                    to="/student/courses"
                    startIcon={<ForumIcon />}
                  >
                    View Discussion Forums
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Resume Learning Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PlayCircleOutlineIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Continue Learning
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Pick up right where you left off with your most recently watched videos.
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    component={Link}
                    to="/student/recent-videos"
                    startIcon={<PlayCircleOutlineIcon />}
                  >
                    Resume Learning
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default StudentDashboard;
