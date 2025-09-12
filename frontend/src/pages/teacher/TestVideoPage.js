import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, Grid, Paper, TextField, Alert } from '@mui/material';
import TeacherVideoPlayer from '../../components/teacher/TeacherVideoPlayer';
import { formatVideoUrl } from '../../utils/videoUtils';

const TestVideoPage = () => {
  const [customUrl, setCustomUrl] = useState('');
  const [message, setMessage] = useState(null);
  const [testResults, setTestResults] = useState([]);
  
  // List of known videos in the uploads folder
  const knownVideos = useMemo(() => [
    '7bdd6cb5b415d9cdd7d31f5388f9067f',
    '9c5f9f0b1562d968d2aa1c7191e988f4',
    'ba7d0266a35a46eeeee9733d5303c72b',
    'd61931fb2c0e2f37893d11689351bcc7'
  ], []);

  // Test the direct access to each video
  useEffect(() => {
    const testDirectAccess = async () => {
      const results = await Promise.all(
        knownVideos.map(async (videoId) => {
          const url = `http://localhost:5000/uploads/${videoId}`;
          try {
            const response = await fetch(url, { method: 'HEAD' });
            return {
              videoId,
              url,
              status: response.status,
              ok: response.ok
            };
          } catch (error) {
            return {
              videoId,
              url,
              status: 'Error',
              ok: false,
              error: error.message
            };
          }
        })
      );
      
      setTestResults(results);
    };
    
    testDirectAccess();
  }, [knownVideos]);

  const handleCustomUrlChange = (e) => {
    setCustomUrl(e.target.value);
  };

  const testCustomUrl = async () => {
    if (!customUrl) {
      setMessage({ severity: 'error', text: 'Please enter a URL to test' });
      return;
    }
    
    try {
      const formattedUrl = formatVideoUrl(customUrl);
      const response = await fetch(formattedUrl, { method: 'HEAD' });
      
      if (response.ok) {
        setMessage({ 
          severity: 'success', 
          text: `URL is accessible (Status: ${response.status})` 
        });
      } else {
        setMessage({ 
          severity: 'warning', 
          text: `URL is not accessible (Status: ${response.status})` 
        });
      }
    } catch (error) {
      setMessage({ 
        severity: 'error', 
        text: `Error testing URL: ${error.message}` 
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Video Testing Page
      </Typography>
      
      <Typography variant="body1" paragraph>
        This page tests direct access to videos in the uploads folder.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Direct video access test results */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Direct Access Test Results
            </Typography>
            
            {testResults.length > 0 ? (
              <Box component="ul">
                {testResults.map((result) => (
                  <Box component="li" key={result.videoId} sx={{ mb: 1 }}>
                    <Typography>
                      {result.videoId}: 
                      <Box component="span" sx={{ 
                        color: result.ok ? 'success.main' : 'error.main',
                        ml: 1,
                        fontWeight: 'bold'
                      }}>
                        {result.ok ? 'Accessible' : 'Not Accessible'} 
                      </Box>
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        (Status: {result.status})
                      </Typography>
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>Running tests...</Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Custom URL test */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Test Custom Video URL
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <TextField
                label="Video URL or ID"
                value={customUrl}
                onChange={handleCustomUrlChange}
                fullWidth
                variant="outlined"
                helperText="Enter a video URL, filename, or ID to test"
                sx={{ mr: 2 }}
              />
              <Button 
                variant="contained" 
                onClick={testCustomUrl}
                sx={{ mt: 1 }}
              >
                Test
              </Button>
            </Box>
            
            {message && (
              <Alert severity={message.severity} sx={{ mb: 2 }}>
                {message.text}
              </Alert>
            )}
            
            {customUrl && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Preview
                </Typography>
                <TeacherVideoPlayer 
                  videoUrl={formatVideoUrl(customUrl)} 
                  title="Custom Video Test" 
                />
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Known videos */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Known Videos
            </Typography>
            
            <Grid container spacing={2}>
              {knownVideos.map((videoId) => (
                <Grid item xs={12} md={6} key={videoId}>
                  <Typography variant="subtitle1" gutterBottom>
                    {videoId}
                  </Typography>
                  <TeacherVideoPlayer 
                    videoUrl={formatVideoUrl(videoId)} 
                    title={videoId} 
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TestVideoPage;
