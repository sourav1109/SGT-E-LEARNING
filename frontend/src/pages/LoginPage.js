import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Link, Alert, Paper } from '@mui/material';
import { loginUser, isAuthenticated, getCurrentUser } from '../utils/authService';
import { universityImages } from '../assets/universityImages';
import sgtLogo from '../assets/sgt-logo-white.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  // Slideshow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === universityImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, []);

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
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* Left Side - University Images Slideshow */}
      <Box
        sx={{
          flex: 2, // Changed from 1 to 2 to make it twice as wide
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
        }}
      >
        {/* Slideshow Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {universityImages.map((image, index) => (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: currentImageIndex === index ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(26, 35, 126, 0.3)', // Overlay for better text readability
                  zIndex: 1,
                }
              }}
            />
          ))}
        </Box>

        {/* Overlay Content */}
        <Box
          sx={{
            position: 'absolute',
            zIndex: 2,
            color: 'white',
            textAlign: 'center',
            p: 4,
            maxWidth: '80%',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              mb: 2,
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              fontSize: { xs: '2rem', md: '3rem', lg: '3.5rem' },
            }}
          >
            Welcome to SGT University
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 300,
              opacity: 0.9,
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              fontSize: { xs: '1rem', md: '1.25rem' },
              lineHeight: 1.6,
            }}
          >
            Excellence in Education • Innovation in Learning • Future in Making
          </Typography>
        </Box>

        {/* Slide Indicators */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            zIndex: 2,
          }}
        >
          {universityImages.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: currentImageIndex === index ? 'white' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.8)',
                }
              }}
              onClick={() => setCurrentImageIndex(index)}
            />
          ))}
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: 1, // Keeping this at 1 while left side is 2, creating 2:1 ratio
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)', // Light blue gradient matching the logo colors
          p: 4,
          minWidth: '400px', // Added minimum width to ensure login form doesn't get too cramped
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={8}
            sx={{
              p: 4,
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              maxWidth: 450,
              width: '100%',
              mx: 'auto',
            }}
          >
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 2
            }}>
              <img
                src={sgtLogo}
                alt="SGT University Logo"
                style={{
                  width: 180,
                  marginBottom: 16,
                  filter: 'drop-shadow(0 4px 12px rgba(26, 35, 126, 0.15))',
                  objectFit: 'contain',
                }}
              />
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#1a237e',
                  letterSpacing: 0.5,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  mb: 1
                }}
              >
                Academy Management
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  color: '#3949ab',
                  textAlign: 'center',
                }}
              >
                System
              </Typography>
            </Box>
            
            <Typography 
              variant="body1" 
              color="text.secondary" 
              mb={3} 
              textAlign="center"
              sx={{ fontSize: '1.1rem' }}
            >
              Enter your credentials to access your dashboard
            </Typography>
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  width: '100%',
                  borderRadius: 2,
                }}
              >
                {error}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                label="Email Address"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
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
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ 
                  mt: 1, 
                  mb: 2, 
                  py: 1.5,
                  fontWeight: 600, 
                  fontSize: '1.1rem',
                  borderRadius: 2,
                  backgroundColor: '#1a237e',
                  '&:hover': {
                    backgroundColor: '#303f9f',
                  },
                  '&:disabled': {
                    backgroundColor: '#ccc',
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Box mt={2} textAlign="center">
                <Link 
                  href="/forgot-password" 
                  variant="body2"
                  sx={{
                    color: '#1a237e',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  Forgot password?
                </Link>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default LoginPage;
