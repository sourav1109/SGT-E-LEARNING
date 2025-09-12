import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Avatar
} from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const HODTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState(null);
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      
      // Get HOD's department first
      const userRes = await axios.get(`/api/admin/users/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const departmentId = userRes.data.department;
      
      if (departmentId) {
        // Get department details
        const deptRes = await axios.get(`/api/departments/${departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDepartment(deptRes.data);
        
        // Get teachers in this department
        const response = await axios.get(`/api/admin/teachers?department=${departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTeachers(response.data);
      } else {
        setError('No department assigned to your account');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setError('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
        Department Teachers
      </Typography>
      
      {department && (
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          {department.name} Department
        </Typography>
      )}
      
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Faculty Members ({teachers.length})
          </Typography>
          
          {teachers.length === 0 ? (
            <Typography color="textSecondary">
              No teachers found in your department.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Teacher</strong></TableCell>
                    <TableCell><strong>Employee ID</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell><strong>Specialization</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getInitials(teacher.firstName, teacher.lastName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {teacher.firstName} {teacher.lastName}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {teacher.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={teacher.teacherId || 'N/A'} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          {teacher.phone && (
                            <Typography variant="body2">
                              {teacher.phone}
                            </Typography>
                          )}
                          <Typography variant="body2" color="textSecondary">
                            {teacher.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {teacher.specialization ? (
                          <Chip 
                            label={teacher.specialization}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Not specified
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={teacher.isActive ? "Active" : "Inactive"}
                          size="small" 
                          color={teacher.isActive ? "success" : "error"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default HODTeachers;
