import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, Link } from '@mui/material';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [suggestedEmail, setSuggestedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSuggestedEmail('');
    
    // Trim whitespace from email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      console.log('Sending password reset request for:', trimmedEmail);
      const response = await axios.post('/api/auth/request-password-reset', { email: trimmedEmail });
      console.log('Password reset response:', response.data);
      setMessage('Password reset link sent to your email.');
    } catch (err) {
      console.error('Password reset error:', err.response?.data);
      
      // Check if there's a suggested email
      if (err.response?.data?.suggestedEmail) {
        setSuggestedEmail(err.response.data.suggestedEmail);
      }
      
      setError(err.response?.data?.message || 'Failed to send reset link');
    }
  };
  
  const useSuggestedEmail = () => {
    setEmail(suggestedEmail);
    setSuggestedEmail('');
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, p: 4, bgcolor: 'white', borderRadius: 2, boxShadow: 2 }}>
        <Typography variant="h5" mb={2} align="center">Forgot Password</Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {suggestedEmail && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Did you mean <Link component="button" onClick={useSuggestedEmail} underline="hover">{suggestedEmail}</Link>?
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <TextField 
            label="Email" 
            type="email"
            fullWidth 
            margin="normal" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            error={!!error && !suggestedEmail}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Send Reset Link</Button>
        </form>
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage;
