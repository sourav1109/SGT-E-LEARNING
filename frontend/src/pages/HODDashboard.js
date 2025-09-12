import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, Toolbar, IconButton, Menu, MenuItem, Tooltip, Badge, Typography } from '@mui/material';
import axios from 'axios';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { parseJwt } from '../utils/jwt';
import { logoutUser } from '../utils/authService';
import Sidebar from '../components/Sidebar';
import AnnouncementPage from './AnnouncementPage';

// Import HOD Dashboard components
import HODDashboardHome from './hod/HODDashboardHome';
import HODTeachers from './hod/HODTeachers';
import HODCourses from './hod/HODCourses';
import HODAnalytics from './hod/HODAnalytics';

const HODDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res = await axios.get('/api/notifications/unread-count', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setUnreadCount(res.data.unread || 0);
      } catch (e) { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Allow only hod users to access the HOD dashboard
  if (!currentUser || currentUser.role !== 'hod') {
    return <Navigate to="/login" />;
  }

  // Auto-redirect to dashboard if at the root hod path
  if (location.pathname === '/hod') {
    return <Navigate to="/hod/dashboard" replace />;
  }

  // User menu handlers
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const openNotifications = async (e) => {
    setNotifAnchor(e.currentTarget);
    try {
      const res = await axios.get('/api/notifications', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setNotifications(res.data.notifications || res.data || []);
      if (unreadCount > 0) {
        await axios.patch('/api/notifications/mark-all/read', {}, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setUnreadCount(0);
      }
    } catch (e) {/* ignore */}
  };

  const closeNotifications = () => setNotifAnchor(null);

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar currentUser={currentUser} />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        {/* Top Navigation Bar */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid #e0e0e0',
          px: 3,
          py: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h5" sx={{ color: '#333', fontWeight: 600 }}>
            HOD Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton onClick={openNotifications} color="inherit">
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <Tooltip title="Account settings">
              <IconButton onClick={handleUserMenuOpen} color="inherit">
                <AccountCircleIcon />
              </IconButton>
            </Tooltip>
            
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
            >
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        <Toolbar />
        
        {/* Main Content */}
        <Routes>
          <Route path="/dashboard" element={<HODDashboardHome />} />
          <Route path="/teachers" element={<HODTeachers />} />
          <Route path="/courses" element={<HODCourses />} />
          <Route path="/analytics" element={<HODAnalytics />} />
          <Route path="/announcements" element={<AnnouncementPage role="hod" userId={currentUser?._id} />} />
          <Route path="*" element={<Navigate to="/hod/dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default HODDashboard;
