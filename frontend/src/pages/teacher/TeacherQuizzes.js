import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Analytics as AnalyticsIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  QuestionAnswer as QuestionIcon,
  Check as CheckIcon,
  School as SchoolIcon,
  ContentCopy as ContentCopyIcon,
  LibraryBooks as LibraryBooksIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { parseJwt } from '../../utils/jwt';
import QuizUploadForm from '../../components/teacher/QuizUploadForm';

const TeacherQuizzes = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [quizPools, setQuizPools] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, quiz: null });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [expandedQuizPool, setExpandedQuizPool] = useState(null);
  const [quizPoolQuestions, setQuizPoolQuestions] = useState({});
  const [poolDetailsDialog, setPoolDetailsDialog] = useState({ open: false, pool: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch teacher's courses
      const coursesResponse = await axios.get('/api/teacher/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(coursesResponse.data);

      // If teacher has courses, fetch quizzes for the first course
      if (coursesResponse.data.length > 0) {
        const firstCourseId = coursesResponse.data[0]._id;
        setSelectedCourse(firstCourseId);
        await Promise.all([
          fetchQuizzes(firstCourseId),
          fetchQuizPools(firstCourseId),
          fetchUnits(firstCourseId)
        ]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load quiz data. Please try again later.');
      setLoading(false);
    }
  };

  const fetchQuizzes = async (courseId) => {
    try {
      console.log(`Fetching quizzes for course: ${courseId}`);
      const response = await axios.get(`/api/quizzes/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Quizzes API response:", response.data);
      
      // The API returns { quizzes, quizPools } object, extract the quizzes array
      if (response.data && Array.isArray(response.data.quizzes)) {
        setQuizzes(response.data.quizzes);
      } else if (Array.isArray(response.data)) {
        setQuizzes(response.data);
      } else {
        setQuizzes([]);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setQuizzes([]);
    }
  };

  const fetchQuizPools = async (courseId) => {
    try {
      const response = await axios.get(`/api/quiz-pools/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure quizPools is always an array
      setQuizPools(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching quiz pools:', err);
      setQuizPools([]);
    }
  };

  const fetchUnits = async (courseId) => {
    try {
      const response = await axios.get(`/api/units/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure units is always an array
      setUnits(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching units:', err);
      setUnits([]);
    }
  };

  const handleCourseChange = async (courseId) => {
    setSelectedCourse(courseId);
    setTabValue(0); // Reset to quizzes tab
    await Promise.all([
      fetchQuizzes(courseId),
      fetchQuizPools(courseId),
      fetchUnits(courseId)
    ]);
  };

  const handleDeleteQuiz = async (quiz) => {
    try {
      await axios.delete(`/api/quizzes/${quiz._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh quizzes list
      await fetchQuizzes(selectedCourse);
      setDeleteDialog({ open: false, quiz: null });
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Failed to delete quiz. Please try again.');
    }
  };

  const handleViewAnalytics = (quizId) => {
    navigate(`/teacher/quiz-analytics/${quizId}`);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchQuizPoolQuestions = async (poolId) => {
    if (quizPoolQuestions[poolId]) {
      return; // Already fetched
    }
    
    try {
      console.log(`Fetching questions for quiz pool: ${poolId}`);
      const response = await axios.get(`/api/quiz-pools/${poolId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`Received ${response.data.length} questions for quiz pool ${poolId}`);
      
      setQuizPoolQuestions(prev => ({
        ...prev,
        [poolId]: response.data
      }));
    } catch (err) {
      console.error('Error fetching quiz pool questions:', err);
      // Initialize with empty array on error
      setQuizPoolQuestions(prev => ({
        ...prev,
        [poolId]: []
      }));
    }
  };

  const handleExpandPool = (poolId) => {
    if (expandedQuizPool === poolId) {
      setExpandedQuizPool(null);
    } else {
      setExpandedQuizPool(poolId);
      fetchQuizPoolQuestions(poolId);
    }
  };

  const getUnitName = (unitId) => {
    const unit = units.find(u => u._id === unitId);
    return unit ? unit.title : 'Unknown Unit';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {showUploadForm ? (
        <QuizUploadForm onCancel={() => setShowUploadForm(false)} />
      ) : (
        <>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">Quiz Management</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowUploadForm(true)}
            >
              Create Quiz
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Course Selection */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Course
            </Typography>
            <TextField
              select
              fullWidth
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              variant="outlined"
            >
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.title} ({course.courseCode})
                </MenuItem>
              ))}
            </TextField>
          </Paper>

          {/* Tabs for Quizzes and Quiz Pools */}
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                icon={<QuestionIcon />} 
                label="Quizzes" 
                iconPosition="start"
              />
              <Tab 
                icon={<LibraryBooksIcon />} 
                label="Quiz Pools" 
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* Quiz Statistics (Only shown on Quizzes tab) */}
          {tabValue === 0 && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Total Quizzes
                    </Typography>
                    <Typography variant="h3">
                      {quizzes.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Active Quizzes
                    </Typography>
                    <Typography variant="h3">
                      {quizzes.filter(q => q.isActive).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Total Questions
                    </Typography>
                    <Typography variant="h3">
                      {quizzes.reduce((total, quiz) => total + (quiz.questionCount || 0), 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Quizzes Tab Content */}
          {tabValue === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quizzes
              </Typography>

              {quizzes.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Video</TableCell>
                        <TableCell align="right">Questions</TableCell>
                        <TableCell align="right">Points</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quizzes.map((quiz) => (
                        <TableRow key={quiz._id} hover>
                          <TableCell>
                            <Typography variant="body1" fontWeight="medium">
                              {quiz.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {quiz.description || 'No description'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {quiz.video?.title || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {quiz.questionCount || 0}
                          </TableCell>
                          <TableCell align="right">
                            {quiz.totalPoints || 0}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={quiz.isActive ? 'Active' : 'Inactive'}
                              color={quiz.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Analytics">
                              <IconButton
                                size="small"
                                onClick={() => handleViewAnalytics(quiz._id)}
                                color="primary"
                              >
                                <AnalyticsIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Quiz">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/teacher/edit-quiz/${quiz._id}`)}
                                color="secondary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Quiz">
                              <IconButton
                                size="small"
                                onClick={() => setDeleteDialog({ open: true, quiz })}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No quizzes found for this course. Create your first quiz to get started.
                </Alert>
              )}
            </Paper>
          )}

          {/* Quiz Pools Tab Content */}
          {tabValue === 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quiz Pools with Answers
              </Typography>

              {quizPools.length > 0 ? (
                <Box>
                  {units.map((unit) => {
                    const unitPools = quizPools.filter(pool => pool.unit === unit._id);
                    if (unitPools.length === 0) return null;
                    
                    return (
                      <Box key={unit._id} sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                          <SchoolIcon sx={{ mr: 1 }} color="primary" />
                          {unit.title}
                        </Typography>
                        
                        {unitPools.map((pool) => (
                          <Accordion 
                            key={pool._id}
                            expanded={expandedQuizPool === pool._id}
                            onChange={() => handleExpandPool(pool._id)}
                            sx={{ mb: 1 }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography sx={{ width: '40%', flexShrink: 0 }}>
                                <strong>{pool.title}</strong>
                              </Typography>
                              <Typography sx={{ color: 'text.secondary' }}>
                                {pool.questions?.length || 0} questions
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              {quizPoolQuestions[pool._id] ? (
                                quizPoolQuestions[pool._id].length > 0 ? (
                                  <List>
                                    {quizPoolQuestions[pool._id].map((question, index) => (
                                      <React.Fragment key={question._id || index}>
                                        <ListItem alignItems="flex-start">
                                          <ListItemText
                                            primary={
                                              <Typography variant="subtitle1">
                                                Q{index + 1}: {question.text}
                                              </Typography>
                                            }
                                            secondary={
                                              <Box sx={{ mt: 1 }}>
                                                {question.options?.map((option, optIndex) => (
                                                  <Box key={optIndex} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                    {option.isCorrect && <CheckIcon color="success" fontSize="small" sx={{ mr: 1 }} />}
                                                    <Typography
                                                      variant="body2"
                                                      color={option.isCorrect ? 'success.main' : 'text.primary'}
                                                      sx={{ fontWeight: option.isCorrect ? 'bold' : 'regular' }}
                                                    >
                                                      {String.fromCharCode(65 + optIndex)}. {option.text}
                                                    </Typography>
                                                  </Box>
                                                ))}
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                  <strong>Explanation:</strong> {question.explanation || 'No explanation provided'}
                                                </Typography>
                                              </Box>
                                            }
                                          />
                                        </ListItem>
                                        {index < quizPoolQuestions[pool._id].length - 1 && <Divider component="li" />}
                                      </React.Fragment>
                                    ))}
                                  </List>
                                ) : (
                                  <Alert severity="info" sx={{ mt: 2 }}>
                                    No questions found in this quiz pool. Add quizzes to this pool to see questions.
                                  </Alert>
                                )
                              ) : (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                  <CircularProgress size={24} />
                                </Box>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Alert severity="info">
                  No quiz pools found for this course.
                </Alert>
              )}
            </Paper>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialog.open}
            onClose={() => setDeleteDialog({ open: false, quiz: null })}
          >
            <DialogTitle>Delete Quiz</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete the quiz "{deleteDialog.quiz?.title}"?
                This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialog({ open: false, quiz: null })}>
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteQuiz(deleteDialog.quiz)}
                color="error"
                variant="contained"
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default TeacherQuizzes;
