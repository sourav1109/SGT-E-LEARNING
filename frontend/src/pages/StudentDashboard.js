import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Paper, Typography, Box, Button, List, ListItem, ListItemText, IconButton, Menu, MenuItem, Tooltip, Badge } from '@mui/material';
import axios from 'axios';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { parseJwt } from '../utils/jwt';
import { logoutUser } from '../utils/authService';
import Sidebar from '../components/Sidebar';
import AnnouncementPage from './AnnouncementPage';

// Import student pages
import StudentHomeDashboard from './student/StudentHomeDashboard';
import StudentCoursesPage from './student/StudentCoursesPage';
import StudentCourseVideos from './student/StudentCourseVideos';
import StudentCourseProgress from './student/StudentCourseProgress';
import StudentForumPage from './student/StudentForumPage';
import StudentForumDetailPage from './student/StudentForumDetailPage';
import StudentUnansweredForumsPage from './student/StudentUnansweredForumsPage';

const StudentDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnread, setPrevUnread] = useState(0);
  const [blink, setBlink] = useState(false); // transient pulse when unread increases
  const [annBlink, setAnnBlink] = useState(false); // persistent while any unread announcement exists

  // Poll unread notifications & detect announcement-type unread
  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res = await axios.get('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } });
        const count = res.data.unread || 0;
        setUnreadCount(count);
        if (count > prevUnread) {
          setBlink(true);
          setTimeout(() => setBlink(false), 5000);
        }
        setPrevUnread(count);
        if (count > 0) {
          try {
            const listRes = await axios.get('/api/notifications?page=1&limit=50', { headers: { Authorization: `Bearer ${token}` } });
            const list = listRes.data.notifications || listRes.data || [];
            const hasAnn = list.some(n => !n.read && n.type === 'announcement');
            setAnnBlink(hasAnn);
          } catch (_) { /* ignore list fetch errors */ }
        } else {
          setAnnBlink(false);
        }
      } catch (e) { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [token, prevUnread]);

  const openNotifications = async (e) => {
    setNotifAnchor(e.currentTarget);
    try {
      const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      const list = res.data.notifications || res.data || [];
      setNotifications(list);
      if (unreadCount > 0) {
        await axios.patch('/api/notifications/mark-all/read', {}, { headers: { Authorization: `Bearer ${token}` } });
        setUnreadCount(0);
        setAnnBlink(false); // stop persistent glow
      }
    } catch (e) {/* ignore */}
  };

  const closeNotifications = () => setNotifAnchor(null);

  if (!currentUser || currentUser.role !== 'student') {
    return <Navigate to="/login" />;
  }
  
  // User menu handlers
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };
  
  // Logout handler
  const handleLogout = async () => {
    handleUserMenuClose();
    const result = await logoutUser();
    if (result.success) {
      navigate('/login');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar currentUser={currentUser} />
      <Box sx={{ position: 'absolute', top: 16, right: 24, zIndex: 1201, display: 'flex', gap: 1 }}>
        <style>{`@keyframes bellPulse {0%{transform:scale(1);}50%{transform:scale(1.25);}100%{transform:scale(1);} } @keyframes annGlow {0%{box-shadow:0 0 0 0 rgba(255,0,0,0.65);}70%{box-shadow:0 0 0 16px rgba(255,0,0,0);}100%{box-shadow:0 0 0 0 rgba(255,0,0,0);} }`}</style>
        <Tooltip title="Notifications">
          <IconButton
            onClick={openNotifications}
            size="medium"
            sx={{
              ...(blink ? { animation: 'bellPulse 1s ease-in-out infinite' } : {}),
              ...(annBlink ? { animation: `${blink ? 'bellPulse 1s ease-in-out infinite,' : ''} annGlow 1.6s infinite` } : {}),
              bgcolor: annBlink ? 'error.light' : 'warning.main',
              color: 'white',
              '&:hover': { bgcolor: annBlink ? 'error.main' : 'warning.dark' }
            }}
          >
            <Badge color="error" badgeContent={unreadCount > 99 ? '99+' : unreadCount} invisible={unreadCount === 0}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <Tooltip title="Account">
          <IconButton 
            onClick={handleUserMenuOpen}
            size="medium"
            sx={{ 
              bgcolor: 'info.main', 
              color: 'white',
              '&:hover': { bgcolor: 'info.dark' } 
            }}
          >
            <AccountCircleIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleLogout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={closeNotifications}
          PaperProps={{ sx: { maxHeight: 400, width: 320 } }}
        >
          {notifications.length === 0 && <MenuItem disabled>No notifications</MenuItem>}
            {notifications.slice(0, 50).map(n => (
              <MenuItem key={n._id} onClick={closeNotifications} sx={!n.read ? { fontWeight: 600 } : {}}>
                <Box>
                  <Typography variant="body2">{n.message}</Typography>
                  <Typography variant="caption" color="text.secondary">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Typography>
                </Box>
              </MenuItem>
            ))}
        </Menu>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Routes>
          <Route path="/" element={<StudentHomeDashboard />} />
          <Route path="/dashboard" element={<StudentHomeDashboard />} />
          <Route path="/courses" element={<StudentCoursesPage />} />
          <Route path="/course/:courseId/videos" element={<StudentCourseVideos />} />
          <Route path="/course/:courseId/video/:videoId" element={<StudentCourseVideos />} />
          <Route path="/course/:courseId/progress" element={<StudentCourseProgress />} />
          <Route path="/forums" element={<StudentForumPage />} />
          <Route path="/forum/:forumId" element={<StudentForumDetailPage />} />
          <Route path="/unanswered-forums" element={<StudentUnansweredForumsPage />} />
          <Route path="/announcements" element={<AnnouncementPage role="student" />} />
          <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default StudentDashboard;
