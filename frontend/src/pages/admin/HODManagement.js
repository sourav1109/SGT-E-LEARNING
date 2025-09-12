import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SupervisorAccount as HODIcon
} from '@mui/icons-material';
import axios from 'axios';

const HODManagement = () => {
  const [hods, setHods] = useState([]);
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentHOD, setCurrentHOD] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    school: '',
    department: '',
    teacherId: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchHODs();
    fetchSchools();
    fetchDepartments();
    fetchTeachers();
  }, []);

  // Filter departments when school changes
  useEffect(() => {
    if (currentHOD.school) {
      const filtered = departments.filter(dept => 
        dept.school && dept.school._id === currentHOD.school
      );
      setFilteredDepartments(filtered);
      // Reset department selection if the current department doesn't belong to the selected school
      if (currentHOD.department && !filtered.find(dept => dept._id === currentHOD.department)) {
        setCurrentHOD(prev => ({ ...prev, department: '' }));
      }
    } else {
      setFilteredDepartments([]);
      setCurrentHOD(prev => ({ ...prev, department: '' }));
    }
  }, [currentHOD.school, departments]);

  const fetchSchools = async () => {
    try {
      const response = await axios.get('/api/schools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data);
    } catch (error) {
      showSnackbar('Error fetching schools', 'error');
    }
  };

  const fetchHODs = async () => {
    try {
      const response = await axios.get('/api/admin/hods', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHods(response.data);
    } catch (error) {
      showSnackbar('Error fetching HODs', 'error');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data);
    } catch (error) {
      showSnackbar('Error fetching departments', 'error');
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get('/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data.filter(teacher => teacher.role === 'teacher'));
    } catch (error) {
      showSnackbar('Error fetching teachers', 'error');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (editMode) {
        await axios.put(`/api/admin/hods/${currentHOD._id}`, {
          name: currentHOD.name,
          email: currentHOD.email,
          schoolId: currentHOD.school, // Send as schoolId, not school
          departmentId: currentHOD.department, // Send as departmentId, not department
          isActive: currentHOD.isActive
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('HOD updated successfully');
      } else {
        await axios.post('/api/admin/hods', {
          name: currentHOD.name,
          email: currentHOD.email,
          password: currentHOD.password,
          schoolId: currentHOD.school, // Send as schoolId, not school
          departmentId: currentHOD.department, // Send as departmentId, not department
          role: 'hod'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('HOD created successfully');
      }
      fetchHODs();
      handleClose();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error saving HOD', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this HOD?')) {
      try {
        await axios.delete(`/api/admin/hods/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('HOD deleted successfully');
        fetchHODs();
      } catch (error) {
        showSnackbar(error.response?.data?.message || 'Error deleting HOD', 'error');
      }
    }
  };

  const handleEdit = (hod) => {
    setCurrentHOD({
      ...hod,
      school: hod.department?.school?._id || hod.department?.school || '',
      department: hod.department?._id || '',
      password: '' // Don't populate password for security
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setCurrentHOD({ 
      name: '', 
      email: '', 
      password: '', 
      school: '',
      department: '', 
      teacherId: '' 
    });
    setFilteredDepartments([]);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HODIcon /> HOD Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Add HOD
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>HOD ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hods.map((hod) => (
              <TableRow key={hod._id}>
                <TableCell>
                  <Chip label={hod.teacherId || hod.hodId} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{hod.name}</TableCell>
                <TableCell>{hod.email}</TableCell>
                <TableCell>
                  {hod.department ? (
                    <Chip label={hod.department.name} color="secondary" variant="outlined" />
                  ) : (
                    'No Department Assigned'
                  )}
                </TableCell>
                <TableCell>
                  {hod.department?.school ? (
                    <Chip label={hod.department.school.name} color="info" variant="outlined" />
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={hod.isActive ? 'Active' : 'Inactive'} 
                    color={hod.isActive ? 'success' : 'error'} 
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(hod)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(hod._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit HOD' : 'Add New HOD'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={currentHOD.name}
            onChange={(e) => setCurrentHOD({ ...currentHOD, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={currentHOD.email}
            onChange={(e) => setCurrentHOD({ ...currentHOD, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          {!editMode && (
            <TextField
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={currentHOD.password}
              onChange={(e) => setCurrentHOD({ ...currentHOD, password: e.target.value })}
              sx={{ mb: 2 }}
            />
          )}
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>School</InputLabel>
            <Select
              value={currentHOD.school}
              onChange={(e) => setCurrentHOD({ ...currentHOD, school: e.target.value })}
              label="School"
              required
            >
              {schools.map((school) => (
                <MenuItem key={school._id} value={school._id}>
                  {school.name} ({school.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={currentHOD.department}
              onChange={(e) => setCurrentHOD({ ...currentHOD, department: e.target.value })}
              label="Department"
              disabled={!currentHOD.school}
              required
            >
              {filteredDepartments.map((department) => (
                <MenuItem key={department._id} value={department._id}>
                  {department.name} ({department.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HODManagement;
