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
  TextField,
  LinearProgress,
  Alert
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
  Add as AddIcon,
  QuestionAnswer as QuizIcon
} from '@mui/icons-material';

import { getCourseDetails, getCourseVideos, getCourseStudents } from '../../api/courseApi';
import { getQuizDetails, getQuizPoolQuestions, getQuizPoolAnalytics } from '../../api/quizPoolApi';
import { getVideoAnalytics } from '../../api/videoApi';
import { createUnit } from '../../api/unitApi';

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
            {/* Video analytics content here */}
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
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizDialogLoading, setQuizDialogLoading] = useState(false);
  const [quizDialogError, setQuizDialogError] = useState('');
  const [selectedQuizData, setSelectedQuizData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoAnalyticsOpen, setVideoAnalyticsOpen] = useState(false);
  const [addUnitDialogOpen, setAddUnitDialogOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({ title: '', description: '' });
  const [unitCreationError, setUnitCreationError] = useState('');
  const [unitCreationSuccess, setUnitCreationSuccess] = useState(false);
  const [unitCreationLoading, setUnitCreationLoading] = useState(false);

  // helper to fetch pool analytics
  const fetchPoolAnalytics = async (poolId) => {
    try {
      return await getQuizPoolAnalytics(poolId, token);
    } catch (e) {
      console.error('Failed to fetch quiz pool analytics', e);
      return null;
    }
  };

  const handleCreateUnit = async () => {
    try {
      setUnitCreationError('');
      setUnitCreationSuccess(false);
      setUnitCreationLoading(true);
      
      if (!newUnit.title) {
        setUnitCreationError('Unit title is required');
        setUnitCreationLoading(false);
        return;
      }
      
      await createUnit(courseId, newUnit, token);
      setNewUnit({ title: '', description: '' });
      setUnitCreationSuccess(true);
      
      // Refresh course data
      const [details, videosData, studentsData] = await Promise.all([
        getCourseDetails(courseId, token),
        getCourseVideos(courseId, token),
        getCourseStudents(courseId, token)
      ]);
      
      setCourseDetails(details);
      setVideos(videosData);
      setStudents(studentsData);
      
      // Close dialog after a delay to show success message
      setTimeout(() => {
        setAddUnitDialogOpen(false);
        setUnitCreationSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error creating unit:', error);
      setUnitCreationError(error.message || 'Failed to create unit');
    } finally {
      setUnitCreationLoading(false);
    }
  };

  if (loading || !courseDetails) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Course Header and Content */}
        <Typography variant="h4">Course: {courseDetails.title}</Typography>
        {/* Simplified version for debugging */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">Units and Quiz Pools</Typography>
          {courseDetails.units && courseDetails.units.map((unit, index) => (
            <Card key={unit._id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Unit {index + 1}: {unit.title}
                </Typography>
                
                {unit.quizPools && unit.quizPools.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2">Quiz Pools:</Typography>
                    {unit.quizPools.map((pool, poolIndex) => (
                      <Button 
                        key={poolIndex}
                        variant="outlined"
                        onClick={async () => {
                          setQuizDialogError('');
                          setQuizDialogLoading(true);
                          setQuizDialogOpen(true);
                          try {
                            const [questions, analytics] = await Promise.all([
                              getQuizPoolQuestions(pool._id, token),
                              fetchPoolAnalytics(pool._id)
                            ]);
                            setSelectedQuizData({ type: 'pool', data: { pool, questions, analytics } });
                          } catch (e) {
                            setQuizDialogError(e.response?.data?.message || e.message);
                          } finally {
                            setQuizDialogLoading(false);
                          }
                        }}
                        sx={{ m: 0.5 }}
                      >
                        {pool.title} ({pool.questionCount || 0} questions)
                      </Button>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {/* Quiz / Quiz Pool Detail Dialog */}
      <Dialog
        open={quizDialogOpen}
        onClose={() => { setQuizDialogOpen(false); setSelectedQuizData(null); }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white' }}>
          {selectedQuizData?.type === 'pool' ? 'Quiz Pool Questions' : 'Quiz Details'}
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 600 }}>
          {quizDialogLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}
          {quizDialogError && !quizDialogLoading && (
            <Alert severity="error" sx={{ mb: 2 }}>{quizDialogError}</Alert>
          )}
          {!quizDialogLoading && !quizDialogError && selectedQuizData && (
            <Box>
              {selectedQuizData.type === 'pool' && (
                <Box>
                  <Typography variant="h6" gutterBottom>{selectedQuizData.data.pool.title}</Typography>
                  {selectedQuizData.data.pool.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {selectedQuizData.data.pool.description}
                    </Typography>
                  )}
                  <Typography variant="body2" gutterBottom>
                    Total Questions: {selectedQuizData.data.pool.questionCount || selectedQuizData.data.questions.length} (Pool Count) • Loaded: {selectedQuizData.data.questions.length}
                  </Typography>
                  
                  {selectedQuizData.data.pool.contributors && selectedQuizData.data.pool.contributors.length > 0 && (
                    <Box sx={{ mb:2 }}>
                      <Typography variant="subtitle2" gutterBottom>Contributors:</Typography>
                      {selectedQuizData.data.pool.contributors.map(c => (
                        <Chip key={c._id} label={c.name} size="small" sx={{ mr:0.5, mt:0.5 }} />
                      ))}
                    </Box>
                  )}
                  
                  {selectedQuizData.data.analytics && (
                    <Box sx={{ mb:3 }}>
                      <Divider sx={{ my:2 }} />
                      <Typography variant="subtitle1" gutterBottom>Student Attempts</Typography>
                      {selectedQuizData.data.analytics.attempts.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No attempts yet.</Typography>
                      ) : (
                        <Table size="small" sx={{ mb:2 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Student</TableCell>
                              <TableCell>Reg No</TableCell>
                              <TableCell>Score</TableCell>
                              <TableCell>%</TableCell>
                              <TableCell>Passed</TableCell>
                              <TableCell>Date</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedQuizData.data.analytics.attempts.map(a => (
                              <TableRow key={a._id}>
                                <TableCell>{a.student?.name}</TableCell>
                                <TableCell>{a.student?.regNo}</TableCell>
                                <TableCell>{a.score}/{a.maxScore}</TableCell>
                                <TableCell>{a.percentage.toFixed(1)}%</TableCell>
                                <TableCell>{a.passed ? 'Yes' : 'No'}</TableCell>
                                <TableCell>{a.completedAt ? new Date(a.completedAt).toLocaleString() : '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Box>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>Questions</Typography>
                  {selectedQuizData.data.questions.map((q, idx) => (
                    <Paper key={q._id} sx={{ p:2, mb:2 }} variant="outlined">
                      <Typography variant="subtitle2" gutterBottom>
                        {idx + 1}. {q.text}
                      </Typography>
                      <Box sx={{ pl:1 }}>
                        {q.options.map((opt, oIdx) => (
                          <Typography key={oIdx} variant="body2" sx={{ fontWeight: opt.isCorrect ? 'bold' : 'normal', color: opt.isCorrect ? 'success.main' : 'text.primary' }}>
                            {String.fromCharCode(65 + oIdx)}. {opt.text}
                          </Typography>
                        ))}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display:'block', mt:0.5 }}>
                        Points: {q.points} • Source Quiz: {q.originalQuizTitle}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Question Uploader: {q.uploader?.name || 'Unknown'}{q.uploader?.teacherId ? ` (${q.uploader.teacherId})` : ''} • User ID: {q.uploader?.id || 'N/A'}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setQuizDialogOpen(false); setSelectedQuizData(null); }}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CourseDetails;
