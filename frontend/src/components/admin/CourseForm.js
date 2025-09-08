import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Alert, 
  Typography, 
  Autocomplete, 
  Chip, 
  Paper, 
  Divider,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { getTeachersBySearch } from '../../api/courseApi';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';

const CourseForm = ({ onSubmit, initial, submitLabel }) => {
  const [form, setForm] = useState(initial || { title: '', description: '', teacherIds: [] });
  const [error, setError] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    // If initial includes teachers, set them as selected
    if (initial && initial.teachers && Array.isArray(initial.teachers)) {
      setSelectedTeachers(initial.teachers.map(teacher => ({
        _id: teacher._id,
        name: teacher.name,
        teacherId: teacher.teacherId || '',
        email: teacher.email || ''
      })));
    }
  }, [initial]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ title: '', description: '', teacherIds: [] });
    setSelectedTeachers([]);
    setError('');
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');
    if (!form.title) return setError('Title required');
    
    // Add the selected teacher IDs to the form
    const teacherIds = selectedTeachers.map(teacher => teacher.teacherId);
    
    onSubmit({
      ...form,
      teacherIds
    });
    
    // Only reset if not editing an existing course
    if (!initial) {
      resetForm();
    }
  };

  const searchTeachers = async (query) => {
    if (!query || query.length < 2) return;
    
    setLoading(true);
    try {
      const teachers = await getTeachersBySearch(query, token);
      setTeacherOptions(teachers);
    } catch (err) {
      console.error('Error searching teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacherSearch.length >= 2) {
      const timer = setTimeout(() => {
        searchTeachers(teacherSearch);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [teacherSearch]);

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
        {initial ? 'Update Course' : 'Create New Course'}
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {initial && initial.courseCode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Course Code: <strong>{initial.courseCode}</strong>
          </Typography>
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {initial && initial.courseCode && (
            <Grid item xs={12}>
              <TextField 
                label="Course Code" 
                value={initial.courseCode} 
                fullWidth 
                margin="normal" 
                InputProps={{
                  readOnly: true,
                  startAdornment: <CodeIcon color="action" sx={{ mr: 1 }} />,
                }}
                variant="filled"
                helperText="This is an automatically generated unique course code"
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField 
              label="Course Title" 
              name="title" 
              value={form.title} 
              onChange={handleChange} 
              fullWidth 
              margin="normal" 
              required
              variant="outlined"
              InputProps={{
                startAdornment: <TitleIcon color="action" sx={{ mr: 1 }} />,
              }}
              placeholder="Enter a descriptive title for the course"
              helperText="A clear title helps students understand the course content"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField 
              label="Course Description" 
              name="description" 
              value={form.description} 
              onChange={handleChange} 
              fullWidth 
              margin="normal" 
              multiline 
              rows={4}
              variant="outlined"
              InputProps={{
                startAdornment: <DescriptionIcon color="action" sx={{ mr: 1 }} />,
              }}
              placeholder="Provide details about the course content, objectives, and learning outcomes"
              helperText="A detailed description helps students know what to expect"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={teacherOptions}
              getOptionLabel={(option) => `${option.teacherId || ''} - ${option.name} (${option.email})`}
              value={selectedTeachers}
              onChange={(event, newValue) => {
                setSelectedTeachers(newValue);
              }}
              onInputChange={(event, newInputValue) => {
                setTeacherSearch(newInputValue);
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={index}
                    label={`${option.teacherId || ''} - ${option.name}`}
                    {...getTagProps({ index })}
                    color="primary"
                    variant="outlined"
                    sx={{ 
                      m: 0.5,
                      '& .MuiChip-deleteIcon': {
                        color: 'error.light',
                        '&:hover': { color: 'error.main' }
                      }
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign Teachers"
                  placeholder="Search by ID, name or email"
                  margin="normal"
                  fullWidth
                  helperText="Select one or more teachers to assign to this course"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <PersonAddIcon color="action" sx={{ mr: 1 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              loading={loading}
              loadingText="Searching for teachers..."
              filterOptions={(x) => x} // Disable the built-in filtering
              filterSelectedOptions
              noOptionsText={
                teacherSearch.length < 2 
                  ? "Type at least 2 characters to search" 
                  : "No matching teachers found"
              }
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={resetForm}
            startIcon={<ClearIcon />}
          >
            Clear
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
          >
            {submitLabel || 'Create Course'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CourseForm;
