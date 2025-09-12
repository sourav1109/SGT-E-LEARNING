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

const HODCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState(null);
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
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
        
        // Get courses in this department
        const response = await axios.get(`/api/admin/courses?department=${departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourses(response.data);
      } else {
        setError('No department assigned to your account');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses');
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
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
        Department Courses
      </Typography>
      
      {department && (
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          {department.name} Department
        </Typography>
      )}
      
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Courses ({courses.length})
          </Typography>
          
          {courses.length === 0 ? (
            <Typography color="textSecondary">
              No courses found in your department.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Course</strong></TableCell>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Teacher</strong></TableCell>
                    <TableCell><strong>Students</strong></TableCell>
                    <TableCell><strong>Videos</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course._id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {course.title}
                          </Typography>
                          {course.description && (
                            <Typography variant="body2" color="textSecondary" noWrap>
                              {course.description.substring(0, 50)}...
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={course.code} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {course.teacher ? (
                          <Box>
                            <Typography variant="body2">
                              {course.teacher.firstName} {course.teacher.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {course.teacher.teacherId}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No teacher assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${course.students?.length || 0} enrolled`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${course.videos?.length || 0} videos`}
                          size="small"
                          color="info"
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

export default HODCourses;
