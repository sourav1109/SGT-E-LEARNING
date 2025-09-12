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
  Alert
} from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const DeanDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      
      // Get dean's school first
      const userRes = await axios.get(`/api/admin/users/${currentUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const schoolId = userRes.data.school;
      
      if (schoolId) {
        const response = await axios.get(`/api/departments?school=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDepartments(response.data);
      } else {
        setError('No school assigned to your account');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
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
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Departments Overview
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Departments in Your School
          </Typography>
          
          {departments.length === 0 ? (
            <Typography color="textSecondary">
              No departments found in your school.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Department Name</strong></TableCell>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>HOD</strong></TableCell>
                    <TableCell><strong>Courses</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept._id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {dept.name}
                          </Typography>
                          {dept.description && (
                            <Typography variant="body2" color="textSecondary">
                              {dept.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={dept.code} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {dept.hod ? (
                          <Box>
                            <Typography variant="body2">
                              {dept.hod.firstName} {dept.hod.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {dept.hod.email}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No HOD assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${dept.courses?.length || 0} courses`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label="Active" 
                          size="small" 
                          color="success"
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

export default DeanDepartments;
