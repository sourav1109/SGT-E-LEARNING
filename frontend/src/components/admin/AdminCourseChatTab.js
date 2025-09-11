import React from 'react';
import CourseChat from '../CourseChat';
import { Box } from '@mui/material';

const AdminCourseChatTab = ({ courseId }) => {
  const user = { name: localStorage.getItem('name') || 'Admin' };
  return (
    <Box sx={{ mt: 2 }}>
      <CourseChat courseId={courseId} user={user} />
    </Box>
  );
};

export default AdminCourseChatTab;
