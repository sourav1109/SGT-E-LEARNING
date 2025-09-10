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
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getCourseUnits } from '../../api/studentVideoApi';
import { formatDuration } from '../../utils/videoUtils';

// Icons
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';

const StudentCourseUnits = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [course, setCourse] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchCourseAndUnits = async () => {
      try {
        setLoading(true);
        
        // Fetch units for this course
        const unitsResponse = await getCourseUnits(courseId, token);
        
        // Set course data if available from the response
        if (unitsResponse && unitsResponse.length > 0) {
          // Fetch course information from the first unit's course reference
          const firstUnit = unitsResponse[0];
          setCourse({
            _id: firstUnit.course._id,
            title: firstUnit.course.title,
            courseCode: firstUnit.course.courseCode,
            description: firstUnit.course.description
          });
        }
        
        setUnits(unitsResponse);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course units:', err);
        setError('Failed to load course units. Please try again.');
        setLoading(false);
      }
    };
    
    if (token && courseId) {
      fetchCourseAndUnits();
    }
  }, [token, courseId]);
  
  const handleWatchVideo = (unitId, videoId) => {
    navigate(`/student/course/${courseId}/unit/${unitId}/video/${videoId}`);
  };
  
  // Calculate unit progress percentage
  const calculateUnitProgress = (unit) => {
    if (!unit.progress) return 0;
    
    const { videosCompleted, totalVideos } = unit.progress;
    if (totalVideos === 0) return 0;
    
    return Math.round((videosCompleted / totalVideos) * 100);
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
        <Typography color="text.primary">Course Units</Typography>
      </Breadcrumbs>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : units.length === 0 ? (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            This course doesn't have any units yet. Please check back later or contact your instructor.
          </Alert>
          <Button 
            component={RouterLink} 
            to={`/student/course/${courseId}/videos`}
            variant="contained"
            color="primary"
          >
            View Course Videos
          </Button>
        </Box>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            {course?.title || 'Course Units'}
          </Typography>
          
          {course?.courseCode && (
            <Typography variant="subtitle1" color="text.secondary" paragraph>
              Course Code: {course.courseCode}
            </Typography>
          )}
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Each unit contains videos and other learning materials. Complete units in order to unlock subsequent units.
          </Alert>
          
          {units.map((unit, index) => (
            <Accordion 
              key={unit._id}
              defaultExpanded={index === 0}
              disabled={!unit.unlocked}
              sx={{
                mb: 2,
                opacity: unit.unlocked ? 1 : 0.7,
                '& .MuiAccordionSummary-root': {
                  bgcolor: unit.unlocked 
                    ? (calculateUnitProgress(unit) === 100 ? 'success.light' : 'primary.light') 
                    : 'action.disabledBackground'
                }
              }}
            >
              <AccordionSummary
                expandIcon={unit.unlocked ? <ExpandMoreIcon /> : <LockIcon />}
                aria-controls={`unit-${unit._id}-content`}
                id={`unit-${unit._id}-header`}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="h6">
                      Unit {index + 1}: {unit.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {unit.unlocked && unit.progress && (
                        <Chip 
                          label={`${calculateUnitProgress(unit)}% Complete`}
                          color={calculateUnitProgress(unit) === 100 ? 'success' : 'primary'}
                          size="small"
                        />
                      )}
                      {!unit.unlocked && (
                        <Chip 
                          icon={<LockIcon />}
                          label="Locked" 
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  
                  {unit.unlocked && (
                    <LinearProgress 
                      variant="determinate" 
                      value={calculateUnitProgress(unit)} 
                      sx={{ mt: 1, mb: 1, height: 8, borderRadius: 1 }}
                    />
                  )}
                  
                  <Typography variant="body2" color="text.secondary">
                    {unit.description}
                  </Typography>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                {unit.videos && unit.videos.length > 0 ? (
                  <List>
                    {unit.videos.map((video, videoIndex) => (
                      <React.Fragment key={video._id}>
                        <ListItem 
                          alignItems="flex-start"
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                          onClick={() => handleWatchVideo(unit._id, video._id)}
                        >
                          <ListItemIcon>
                            {video.watched ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <PlayCircleOutlineIcon color="primary" />
                            )}
                          </ListItemIcon>
                          
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1">
                                {videoIndex + 1}. {video.title}
                                {video.watched && (
                                  <Chip 
                                    size="small" 
                                    label="Watched" 
                                    color="success" 
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
                                {video.duration > 0 && (
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWatchVideo(unit._id, video._id);
                            }}
                          >
                            {video.watched ? 'Rewatch' : 'Watch'}
                          </Button>
                        </ListItem>
                        
                        {videoIndex < unit.videos.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body1" color="text.secondary">
                    No videos available in this unit yet.
                  </Typography>
                )}
                
                {/* Add other unit content types like reading materials and quizzes here */}
                {unit.readingMaterials && unit.readingMaterials.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Reading Materials
                    </Typography>
                    <List>
                      {unit.readingMaterials.map((material, index) => (
                        <ListItem key={material._id}>
                          <ListItemIcon>
                            <MenuBookIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={material.title}
                            secondary={material.description}
                          />
                          {material.completed && (
                            <Chip 
                              size="small" 
                              label="Completed" 
                              color="success" 
                            />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                
                {/* Display Quiz Pool if available */}
                {unit.quizPool && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Quiz
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <SchoolIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={unit.quizPool.title || `${unit.title} Quiz`}
                          secondary={unit.quizPool.description || `Complete this quiz to progress in the course`}
                        />
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small"
                          onClick={() => navigate(`/student/quiz/${unit.quizPool._id}`)}
                        >
                          Start Quiz
                        </Button>
                      </ListItem>
                    </List>
                  </Box>
                )}

                {/* Legacy: Show individual quizzes if no quiz pool */}
                {!unit.quizPool && unit.quizzes && unit.quizzes.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Quizzes
                    </Typography>
                    <List>
                      {unit.quizzes.map((quiz, index) => (
                        <ListItem key={quiz._id}>
                          <ListItemIcon>
                            <SchoolIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={quiz.title}
                            secondary={quiz.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
    </Container>
  );
};

export default StudentCourseUnits;
