import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  LinearProgress,
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Grid,
  Breadcrumbs,
  Link
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import QuizIcon from '@mui/icons-material/Quiz';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import { restoreUserFromToken, isAuthenticated, getCurrentUser } from '../../utils/authService';

const StudentQuizPage = ({ user: userProp, token: tokenProp }) => {
  const { attemptId, courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get token from various sources in priority order
  const getToken = () => {
    // 1. From props
    if (tokenProp) return tokenProp;
    
    // 2. From localStorage
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    // 3. No token found
    console.error('No authentication token found from any source');
    return null;
  };
  
  // Initialize token state
  const [token, setToken] = useState(getToken());
  // Track user state
  const [user, setUser] = useState(userProp || getCurrentUser());
  // Debug mode
  const [debug] = useState(true);
  
  // Log important information when in debug mode
  useEffect(() => {
    if (debug) {
      console.group('StudentQuizPage Debug Info');
      console.log('Page Load Time:', new Date().toISOString());
      console.log('Attempt ID:', attemptId);
      console.log('Course ID:', courseId);
      console.log('Token present:', !!token);
      console.log('User present:', !!user);
      console.log('Current path:', window.location.pathname);
      console.log('isAuthenticated():', isAuthenticated());
      console.log('localStorage token present:', !!localStorage.getItem('token'));
      console.log('localStorage user present:', !!localStorage.getItem('user'));
      console.groupEnd();
    }
  }, [debug, attemptId, courseId, token, user]);
  
  // Check authentication on mount and restore user from token if needed
  useEffect(() => {
    console.log('StudentQuizPage: Authentication check running');
    
    // If no token, try to restore it
    if (!token) {
      console.warn('StudentQuizPage: No token in state, trying to restore');
      const restoredToken = getToken();
      if (restoredToken) {
        console.log('StudentQuizPage: Token restored from alternate source');
        setToken(restoredToken);
        return; // Exit early as the next effect run will handle user restoration
      } else {
        console.error('StudentQuizPage: Failed to restore token, redirecting to login');
        navigate('/login', { state: { from: location } });
        return;
      }
    }
    
    // Restore user from token if not already available
    if (!user && token) {
      console.log('StudentQuizPage: Attempting to restore user from token');
      const restoredUser = restoreUserFromToken();
      console.log('StudentQuizPage: User restored from token:', !!restoredUser);
      
      if (restoredUser) {
        setUser(restoredUser);
      } else {
        console.error('StudentQuizPage: Failed to restore user from token');
        navigate('/login', { state: { from: location } });
      }
    }
  }, [token, navigate, user, location]);
  
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  // Load quiz attempt data
  useEffect(() => {
    const fetchQuizAttempt = async () => {
      try {
        console.log('Fetching quiz attempt:', attemptId, 'with token:', !!token);
        setLoading(true);
        
        // Early validation of inputs
        if (!attemptId) {
          console.error('Cannot fetch quiz: No attempt ID provided');
          setError('Quiz attempt ID is missing. Please return to the course page and try again.');
          setLoading(false);
          return;
        }
        
        if (!token) {
          console.error('Cannot fetch quiz: No token available');
          setError('Authentication token is missing. Please log in again.');
          setLoading(false);
          
          // Try to restore token one more time
          const restoredToken = localStorage.getItem('token');
          if (restoredToken) {
            console.log('Restored token at last chance, trying again');
            setToken(restoredToken);
            return; // Exit and let the effect run again with the new token
          }
          
          setTimeout(() => navigate('/login', { state: { from: location } }), 2000);
          return;
        }
        
        // Make the API request with exponential backoff retry
        let retries = 0;
        const maxRetries = 2;
        
        const makeRequest = async () => {
          try {
            const response = await axios.get(`/api/student/quiz/attempt/${attemptId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Quiz attempt API response:', response);
            console.log('Quiz attempt data:', response.data);
            
            if (!response.data || !response.data.attemptId) {
              console.error('Quiz API returned no attemptId:', response.data);
              setError('Quiz data is missing or invalid.');
              setLoading(false);
              return false;
            }
            
            // Process quiz data to ensure options are arrays
            const processedQuizData = {
              ...response.data,
              questions: response.data.questions?.map(question => ({
                ...question,
                options: typeof question.options === 'string' 
                  ? question.options.split(' ').filter(opt => opt.trim() !== '')
                  : Array.isArray(question.options) ? question.options : []
              })) || []
            };
            
            setQuiz(processedQuizData);
            // Initialize time if quiz has a time limit
            if (response.data.timeLimit) {
              setTimeLeft(response.data.timeLimit * 60); // Convert minutes to seconds
            }
            setLoading(false);
            return true;
          } catch (err) {
            if (retries < maxRetries) {
              retries++;
              console.log(`Request failed, retrying (${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
              return await makeRequest();
            }
            throw err;
          }
        };
        
        await makeRequest();
      } catch (err) {
        console.error('Error loading quiz after retries:', err.response || err);
        setLoading(false);
        
        if (err.response?.status === 401) {
          console.log('Unauthorized access (401). Redirecting to login...');
          setError('Your session has expired. Please log in again.');
          setTimeout(() => navigate('/login', { state: { from: location } }), 1500);
          return;
        }
        
        if (err.response?.status === 404) {
          console.log('Quiz not found (404).');
          setError('This quiz attempt does not exist or has been deleted.');
          setTimeout(() => navigate('/student'), 3000);
          return;
        }
        
        if (err.response?.data?.completed) {
          // Quiz already completed, show result summary
          console.log('Quiz already completed, showing results');
          setResult(err.response.data.attempt);
          setSubmitted(true);
        } else {
          setError(`Failed to load quiz: ${err.response?.data?.message || err.message}. Please try again.`);
          
          // Add a retry button
          setTimeout(() => {
            if (document.getElementById('retry-button')) return;
            
            const retryBtn = document.createElement('button');
            retryBtn.id = 'retry-button';
            retryBtn.innerText = 'Retry Loading Quiz';
            retryBtn.style.padding = '10px 20px';
            retryBtn.style.margin = '20px auto';
            retryBtn.style.display = 'block';
            retryBtn.onclick = () => window.location.reload();
            
            document.querySelector('main')?.appendChild(retryBtn);
          }, 1000);
        }
      }
    };
    
    if (attemptId && token) {
      fetchQuizAttempt();
    } else if (!attemptId) {
      setError('No quiz attempt ID provided');
      setLoading(false);
    }
  }, [attemptId, token, navigate, location]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !submitted) {
      // Auto-submit when time runs out
      handleSubmitQuiz();
    }
  }, [timeLeft, submitted]);

  const handleAnswerChange = (questionId, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(selectedOption)
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      setSubmitting(true);
      
      // Convert answers to the expected format
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption
      }));

      console.log('Submitting quiz answers:', formattedAnswers);

      const response = await axios.post(`/api/student/quiz-attempt/${attemptId}/submit`, {
        answers: formattedAnswers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Quiz submission result:', response.data);
      setResult(response.data);
      setSubmitted(true);
      setSubmitting(false);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz. Please try again.');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading quiz...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate(-1)} 
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  if (submitted && result) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/student" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/student/courses" color="inherit">
            My Courses
          </Link>
          {courseId && (
            <Link component={RouterLink} to={`/student/course/${courseId}/videos`} color="inherit">
              Course
            </Link>
          )}
          <Typography color="text.primary">Quiz Results</Typography>
        </Breadcrumbs>

        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            {result.passed ? (
              <CheckCircleIcon color="success" sx={{ fontSize: 80 }} />
            ) : (
              <CancelIcon color="error" sx={{ fontSize: 80 }} />
            )}
          </Box>
          
          <Typography variant="h4" gutterBottom>
            Quiz {result.passed ? 'Passed!' : 'Not Passed'}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {quiz.unitTitle} - {quiz.courseTitle}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 2, mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Score</Typography>
                  <Typography variant="h4" color="primary">
                    {result.score}/{result.maxScore}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Percentage</Typography>
                  <Typography variant="h4" color={result.passed ? 'success.main' : 'error.main'}>
                    {result.percentage}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Status</Typography>
                  <Chip 
                    label={result.passed ? 'PASSED' : 'FAILED'} 
                    color={result.passed ? 'success' : 'error'}
                    size="large"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="body1" sx={{ mb: 3 }}>
            {result.passed 
              ? 'Congratulations! You have successfully completed this unit quiz.' 
              : `You need at least 70% to pass. Please review the material and try again.`
            }
          </Typography>

          <Button 
            variant="contained" 
            onClick={() => navigate(courseId ? `/student/course/${courseId}/videos` : '/student/courses')}
            size="large"
          >
            {result.passed ? 'Continue to Next Unit' : 'Back to Course'}
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!quiz) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">Quiz data not found.</Alert>
      </Container>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const answeredCount = getAnsweredCount();
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/courses" color="inherit">
          My Courses
        </Link>
        {courseId && (
          <Link component={RouterLink} to={`/student/course/${courseId}/videos`} color="inherit">
            Course
          </Link>
        )}
        <Typography color="text.primary">Quiz</Typography>
      </Breadcrumbs>

      {/* Quiz Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QuizIcon color="primary" />
              <Typography variant="h5">{quiz.unitTitle}</Typography>
            </Box>
            <Typography variant="subtitle1" color="text.secondary">
              {quiz.courseTitle}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            {timeLeft !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <AccessTimeIcon color={timeLeft < 300 ? 'error' : 'primary'} />
                <Typography 
                  variant="h6" 
                  color={timeLeft < 300 ? 'error.main' : 'text.primary'}
                >
                  {formatTime(timeLeft)}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Question {currentQuestion + 1} of {quiz.questions.length} • {answeredCount} answered
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 5 }} />
        </Box>
      </Paper>

      {/* Question */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Question {currentQuestion + 1}
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          {currentQ.questionText}
        </Typography>

        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={answers[currentQ.questionId]?.toString() || ''}
            onChange={(e) => handleAnswerChange(currentQ.questionId, e.target.value)}
          >
            {currentQ.options.map((option, index) => (
              <FormControlLabel
                key={index}
                value={index.toString()}
                control={<Radio />}
                label={`${index + 1}. ${option}`}
                sx={{ 
                  mb: 1,
                  p: 1,
                  border: '1px solid transparent',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* Navigation */}
      <Paper sx={{ p: 3 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Button
              variant="outlined"
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
          </Grid>
          
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              {answeredCount} of {quiz.questions.length} questions answered
            </Typography>
          </Grid>
          
          <Grid item>
            {isLastQuestion ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmitQuiz}
                disabled={submitting || answeredCount < quiz.questions.length}
                startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNextQuestion}
              >
                Next
              </Button>
            )}
          </Grid>
        </Grid>
        
        {answeredCount < quiz.questions.length && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Please answer all questions before submitting the quiz.
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default StudentQuizPage;
