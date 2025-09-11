import React from 'react';
import { useParams } from 'react-router-dom';
import CourseChat from '../../components/CourseChat';
import { Container, Typography, Box, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const StudentCourseChatPage = () => {
  const { courseId } = useParams();
  const user = { name: localStorage.getItem('name') || 'Student' };
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/courses" color="inherit">
          My Courses
        </Link>
        <Typography color="text.primary">Course Chat</Typography>
      </Breadcrumbs>
      <Typography variant="h4" gutterBottom>Course Chat</Typography>
      <Box sx={{ mt: 2 }}>
        <CourseChat courseId={courseId} user={user} />
      </Box>
    </Container>
  );
};

export default StudentCourseChatPage;
