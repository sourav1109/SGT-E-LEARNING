import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Link, Alert, Paper } from '@mui/material';
import { loginUser, isAuthenticated, getCurrentUser } from '../utils/authService';
import videoBg from '../assets/SGTU_Video_Banner.mp4';
import sgtLogo from '../assets/sgt-logo-white.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      if (user) {
        // Redirect based on user role
        if (user.role === 'admin') {
          navigate('/admin');
        } else if (user.role === 'dean') {
          navigate('/dean');
        } else if (user.role === 'hod') {
          navigate('/hod');
        } else if (user.role === 'teacher') {
          navigate('/teacher');
        } else if (user.role === 'student') {
          navigate('/student');
        }
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await loginUser(email, password);
      
      if (!result.success) {
        setError(result.error);
        return;
      }
      
      const user = result.user;
      
      // Redirect based on user role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'dean') {
        navigate('/dean');
      } else if (user.role === 'hod') {
        navigate('/hod');
      } else if (user.role === 'teacher') {
        navigate('/teacher');
      } else if (user.role === 'student') {
        navigate('/student');
      } else {
        setError('Unknown user role');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: 0,
        }}
        src={videoBg}
      >
        Your browser does not support the video tag.
      </video>
      <Container maxWidth="xs" sx={{ p: 0, position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={6}
          sx={{
            p: 3.5,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            backdropFilter: 'blur(4px)',
            minWidth: 340,
            maxWidth: 380
          }}
        >
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 0.5
          }}>
            <img
              src={sgtLogo}
              alt="SGT University Logo"
              style={{
                width: 155,
                marginBottom: 12,
                marginTop: 0,
                filter: 'drop-shadow(0 2px 8px rgba(30, 34, 90, 0.10))',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#1a237e',
                letterSpacing: 0.5,
                textAlign: 'center',
                lineHeight: 1.2,
                mb: 0.5
              }}
            >
              Academy Management System
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" mb={1.2} textAlign="center">
            Enter your credentials to access your dashboard
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2.5, mb: 1.5, fontWeight: 600, fontSize: 18 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Box mt={1.5} textAlign="center">
              <Link href="/forgot-password" variant="body2">
                Forgot password?
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
