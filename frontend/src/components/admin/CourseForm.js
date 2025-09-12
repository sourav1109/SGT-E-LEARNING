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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { getTeachersBySearch } from '../../api/courseApi';
import axios from 'axios';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';

const CourseForm = ({ onSubmit, initial, submitLabel }) => {
  const [form, setForm] = useState(initial || { 
    title: '', 
    description: '', 
    teacherIds: [], 
    school: '', 
    department: '' 
  });
  const [error, setError] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Fetch schools and departments
    const fetchData = async () => {
      try {
        const [schoolsRes, departmentsRes] = await Promise.all([
          axios.get('/api/schools', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setSchools(schoolsRes.data);
        setDepartments(departmentsRes.data);
      } catch (err) {
        console.error('Error fetching schools/departments:', err);
      }
    };
    
    fetchData();
    
    // If initial includes teachers, set them as selected
    if (initial && initial.teachers && Array.isArray(initial.teachers)) {
      setSelectedTeachers(initial.teachers.map(teacher => ({
        _id: teacher._id,
        name: teacher.name,
        teacherId: teacher.teacherId || '',
        email: teacher.email || ''
      })));
    }
    
    // Set initial school and department if editing
    if (initial) {
      setForm(prev => ({
        ...prev,
        school: initial.school?._id || initial.school || '',
        department: initial.department?._id || initial.department || ''
      }));
    }
  }, [initial, token]);

  // Filter departments when school changes
  useEffect(() => {
    if (form.school) {
      const filtered = departments.filter(dept => dept.school._id === form.school);
      setFilteredDepartments(filtered);
      // Reset department if it doesn't belong to selected school
      if (form.department && !filtered.find(d => d._id === form.department)) {
        setForm(prev => ({ ...prev, department: '' }));
      }
    } else {
      setFilteredDepartments([]);
      setForm(prev => ({ ...prev, department: '' }));
    }
  }, [form.school, departments]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ title: '', description: '', teacherIds: [], school: '', department: '' });
    setSelectedTeachers([]);
    setError('');
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');
    if (!form.title) return setError('Title required');
    if (!form.school) return setError('School is required');
    if (!form.department) return setError('Department is required');
    
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
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>School</InputLabel>
              <Select
                name="school"
                value={form.school}
                onChange={handleChange}
                label="School"
              >
                {schools.map(school => (
                  <MenuItem key={school._id} value={school._id}>
                    {school.name} ({school.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal" required disabled={!form.school}>
              <InputLabel>Department</InputLabel>
              <Select
                name="department"
                value={form.department}
                onChange={handleChange}
                label="Department"
              >
                {filteredDepartments.map(dept => (
                  <MenuItem key={dept._id} value={dept._id}>
                    {dept.name} ({dept.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={option._id || index}
                      label={`${option.teacherId || ''} - ${option.name}`}
                      {...tagProps}
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
                  );
                })
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
