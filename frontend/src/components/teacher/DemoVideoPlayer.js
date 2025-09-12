import React from 'react';
import { Box, Typography } from '@mui/material';

const DemoVideoPlayer = ({ title = 'Sample Video' }) => {
  // Use local sample video or fallback to a publicly available one without CORS issues
  const sampleVideoUrl = 'http://localhost:5000/uploads/ba7d0266a35a46eeeee9733d5303c72b';

  return (
    <Box sx={{ width: '100%', borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ p: 2, bgcolor: '#4361ee', color: 'white' }}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="caption">Demo Video Player</Typography>
      </Box>
      
      <video 
        controls
        width="100%"
        height="auto"
        autoPlay
        style={{ display: 'block' }}
      >
        <source src={sampleVideoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      <Box sx={{ p: 2, bgcolor: '#f8f9fa' }}>
        <Typography variant="body2">
          This is a demo video player showing sample content. In a production environment,
          this would be replaced with the actual video content from your server.
        </Typography>
      </Box>
    </Box>
  );
};

export default DemoVideoPlayer;
