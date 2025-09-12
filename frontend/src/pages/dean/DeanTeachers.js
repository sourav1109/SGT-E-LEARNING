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

const DeanTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [school, setSchool] = useState(null);
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      
      // Get dean's school first
      const userRes = await axios.get(`/api/admin/users/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const schoolId = userRes.data.school;
      
      if (schoolId) {
        // Get school details
        const schoolRes = await axios.get(`/api/schools/${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSchool(schoolRes.data);
        
        // Get teachers in this school
        const response = await axios.get(`/api/admin/teachers?school=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTeachers(response.data);
      } else {
        setError('No school assigned to your account');
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
        School Teachers
      </Typography>
      
      {school && (
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          {school.name}
        </Typography>
      )}
      
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Faculty Members ({teachers.length})
          </Typography>
          
          {teachers.length === 0 ? (
            <Typography color="textSecondary">
              No teachers found in your school.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Teacher</strong></TableCell>
                    <TableCell><strong>Employee ID</strong></TableCell>
                    <TableCell><strong>Department</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
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
                        {teacher.department ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {teacher.department.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {teacher.department.code}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No department
                          </Typography>
                        )}
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

export default DeanTeachers;
