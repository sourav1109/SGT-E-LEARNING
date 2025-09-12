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
  AccountBalance as DeanIcon
} from '@mui/icons-material';
import axios from 'axios';

const DeanManagement = () => {
  const [deans, setDeans] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDean, setCurrentDean] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    school: '',
    teacherId: ''
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchDeans();
    fetchSchools();
    fetchTeachers();
  }, []);

  const fetchDeans = async () => {
    try {
      const response = await axios.get('/api/admin/deans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeans(response.data);
    } catch (error) {
      showSnackbar('Error fetching deans', 'error');
    }
  };

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
        await axios.put(`/api/admin/deans/${currentDean._id}`, {
          name: currentDean.name,
          email: currentDean.email,
          schoolId: currentDean.school, // Send as schoolId, not school
          isActive: currentDean.isActive
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Dean updated successfully');
      } else {
        await axios.post('/api/admin/deans', {
          name: currentDean.name,
          email: currentDean.email,
          password: currentDean.password,
          schoolId: currentDean.school, // Send as schoolId, not school
          role: 'dean'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Dean created successfully');
      }
      fetchDeans();
      handleClose();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error saving dean', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this dean?')) {
      try {
        await axios.delete(`/api/admin/deans/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Dean deleted successfully');
        fetchDeans();
      } catch (error) {
        showSnackbar(error.response?.data?.message || 'Error deleting dean', 'error');
      }
    }
  };

  const handleEdit = (dean) => {
    setCurrentDean({
      ...dean,
      school: dean.school?._id || '',
      password: '' // Don't populate password for security
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setCurrentDean({ name: '', email: '', password: '', school: '', teacherId: '' });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeanIcon /> Dean Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Add Dean
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Dean ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deans.map((dean) => (
              <TableRow key={dean._id}>
                <TableCell>
                  <Chip label={dean.teacherId || dean.deanId} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>{dean.name}</TableCell>
                <TableCell>{dean.email}</TableCell>
                <TableCell>
                  {dean.school ? (
                    <Chip label={dean.school.name} color="secondary" variant="outlined" />
                  ) : (
                    'No School Assigned'
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={dean.isActive ? 'Active' : 'Inactive'} 
                    color={dean.isActive ? 'success' : 'error'} 
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(dean)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(dean._id)} color="error">
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
          {editMode ? 'Edit Dean' : 'Add New Dean'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={currentDean.name}
            onChange={(e) => setCurrentDean({ ...currentDean, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={currentDean.email}
            onChange={(e) => setCurrentDean({ ...currentDean, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          {!editMode && (
            <TextField
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={currentDean.password}
              onChange={(e) => setCurrentDean({ ...currentDean, password: e.target.value })}
              sx={{ mb: 2 }}
            />
          )}
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>School</InputLabel>
            <Select
              value={currentDean.school}
              onChange={(e) => setCurrentDean({ ...currentDean, school: e.target.value })}
              label="School"
            >
              {schools.map((school) => (
                <MenuItem key={school._id} value={school._id}>
                  {school.name} ({school.code})
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

export default DeanManagement;
