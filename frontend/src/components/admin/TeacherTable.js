
import React, { useState } from 'react';
import { 
  Button, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Chip,
  Tooltip
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

const TeacherTable = ({ teachers, onResetPassword, onDeactivate, onAssignCourse }) => {
  const [search, setSearch] = useState('');

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(search.toLowerCase()) ||
    teacher.email.toLowerCase().includes(search.toLowerCase()) ||
    (teacher.teacherId && teacher.teacherId.toLowerCase().includes(search.toLowerCase()))
  );
  
  // Format assigned courses
  const formatCourses = (courses) => {
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return <span style={{ color: '#999' }}>No courses</span>;
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {courses.map((course, index) => (
          <Tooltip 
            key={index} 
            title={course.title || (typeof course === 'string' ? course : 'Unknown')}
          >
            <Chip 
              label={course.courseCode || (typeof course === 'string' ? 'Course' : 'Unknown')} 
              size="small" 
              color="primary"
              variant="outlined"
              sx={{ margin: '2px' }} 
            />
          </Tooltip>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 2 }}>
      <input
        type="text"
        placeholder="Search by ID, name, or email"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 8, padding: 6, width: '100%', maxWidth: 300 }}
      />
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader aria-label="teacher table">
          <TableHead>
            <TableRow>
              <TableCell>Teacher ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned Courses</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTeachers.map((teacher) => (
              <TableRow key={teacher._id}>
                <TableCell>{teacher.teacherId || 'N/A'}</TableCell>
                <TableCell>{teacher.name}</TableCell>
                <TableCell>{teacher.email}</TableCell>
                <TableCell>{teacher.isActive ? 'Active' : 'Deactivated'}</TableCell>
                <TableCell>{formatCourses(teacher.coursesAssigned)}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => onResetPassword(teacher._id)}>
                    Reset Password
                  </Button>
                  <Button 
                    size="small" 
                    color="error" 
                    onClick={() => onDeactivate(teacher._id)}
                    disabled={!teacher.isActive}
                    sx={{ ml: 1 }}
                  >
                    Deactivate
                  </Button>
                  <Button 
                    size="small" 
                    color="primary"
                    startIcon={<AssignmentIcon />} 
                    onClick={() => onAssignCourse(teacher)}
                    disabled={!teacher.isActive}
                    sx={{ ml: 1 }}
                  >
                    Assign Course
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TeacherTable;
