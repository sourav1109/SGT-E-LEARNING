import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResetPasswordErrorPage from './pages/ResetPasswordErrorPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import PrivateRoute from './components/PrivateRoute';
import { restoreUserFromToken } from './utils/authService';

// Create a simple theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f4f6f8',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Roboto, Arial',
  },
});

function App() {
  const navigate = useNavigate();
  const timerRef = useRef();
  const INACTIVITY_LIMIT = 300000; // 5 minutes in ms

  // Reset inactivity timer
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Clear session (localStorage, etc.)
      localStorage.removeItem('token');
      // You may want to clear other session data here
      navigate('/login');
    }, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    restoreUserFromToken();
    
    // List of events to consider as activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); // Start timer on mount
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/reset-password-error" element={<ResetPasswordErrorPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route 
          path="/admin/*" 
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/teacher/*" 
          element={
            <PrivateRoute allowedRoles={['teacher', 'admin']}>
              <TeacherDashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/student/*" 
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentDashboard />
            </PrivateRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
