import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  LinearProgress, 
  Alert,
  Autocomplete,
  Typography,
  Box
} from '@mui/material';
import { getCourses } from '../../api/courseApi';

const VideoUploadDialog = ({ open, onClose, onUpload }) => {
  const [form, setForm] = useState({ title: '', description: '', courseId: '' });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const courseData = await getCourses(token);
      setCourses(courseData);
    } catch (err) {
      setError('Failed to load courses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = e => setFile(e.target.files[0]);

  const handleDrop = e => {
    e.preventDefault();
    setFile(e.dataTransfer.files[0]);
  };

  const handleCourseChange = (event, value) => {
    setSelectedCourse(value);
    if (value) {
      setForm({ ...form, courseId: value._id });
    } else {
      setForm({ ...form, courseId: '' });
    }
  };

  const handleUpload = async () => {
    setError('');
    if (!file || !form.title || !form.courseId) return setError('Title, course, and file are required');
    try {
      await onUpload({ ...form, file }, setProgress);
      setForm({ title: '', description: '', courseId: '' });
      setSelectedCourse(null);
      setFile(null);
      setProgress(0);
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Video</DialogTitle>
      <DialogContent onDrop={handleDrop} onDragOver={e => e.preventDefault()} sx={{ minWidth: 350 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField 
          label="Title" 
          name="title" 
          value={form.title} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
          required 
        />
        <TextField 
          label="Description" 
          name="description" 
          value={form.description} 
          onChange={handleChange} 
          fullWidth 
          margin="normal" 
          multiline 
          rows={3}
        />
        
        <Autocomplete
          options={courses}
          getOptionLabel={(option) => `${option.courseCode || ''} - ${option.title}`}
          value={selectedCourse}
          onChange={handleCourseChange}
          loading={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Course"
              margin="normal"
              required
              fullWidth
              placeholder="Search by course code or title"
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box>
                <Typography variant="body1" fontWeight="medium" color="primary">
                  {option.courseCode || 'No Code'} - {option.title}
                </Typography>
                {option.description && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {option.description.substring(0, 60)}
                    {option.description.length > 60 ? '...' : ''}
                  </Typography>
                )}
              </Box>
            </li>
          )}
          noOptionsText={loading ? "Loading courses..." : "No courses found"}
        />
        
        <Box sx={{ mt: 3, mb: 1 }}>
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleFileChange} 
            style={{ width: '100%' }} 
          />
        </Box>
        
        {file && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="body2">
              Selected: <strong>{file.name}</strong> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </Typography>
          </Box>
        )}
        
        {progress > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" align="center" gutterBottom>
              Uploading: {progress.toFixed(0)}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 2 }} />
          </Box>
        )}
        
        <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px dashed #ccc' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Or drag and drop a video file here
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleUpload} 
          variant="contained" 
          disabled={!file || !form.title || !form.courseId || progress > 0}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VideoUploadDialog;
