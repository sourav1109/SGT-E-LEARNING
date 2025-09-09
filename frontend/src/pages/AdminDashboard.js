
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Box, 
  Button, 
  Chip, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  Avatar, 
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import axios from 'axios';
import ForumIcon from '@mui/icons-material/Forum';
import DashboardIcon from '@mui/icons-material/Dashboard';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventNoteIcon from '@mui/icons-material/EventNote';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { parseJwt } from '../utils/jwt';
import { logoutUser } from '../utils/authService';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/admin/NotificationBell';
import AnnouncementPage from './AnnouncementPage';
import AnalyticsDashboard from './admin/AnalyticsDashboard';
import EnhancedAnalytics from './admin/EnhancedAnalytics';
import TeacherManagement from './admin/TeacherManagement';
import StudentManagement from './admin/StudentManagement';
import CourseManagement from './admin/CourseManagement';
import ForumModeration from './admin/ForumModeration';
import RoleManagement from './admin/RoleManagement';


const AdminDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const navigate = useNavigate();
  
  // Notifications section state
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  
  // Activity feed state
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  
  // Forum activity state
  const [forumActivity, setForumActivity] = useState([]);
  const [forumLoading, setForumLoading] = useState(true);
  
  // User menu state
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  
  // Check if we're on a sub-page
  const isOnMainDashboard = window.location.pathname === '/admin' || window.location.pathname === '/admin/';

  useEffect(() => {
    if (!token) return;
    
    // Fetch notifications
    (async () => {
      try {
        setNotificationsLoading(true);
        const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        setNotifications(res.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setNotificationsLoading(false);
      }
    })();
    
    // Fetch activity feed
    (async () => {
      try {
        setActivityLoading(true);
        const res = await axios.get('/api/admin/audit-logs/recent', { headers: { Authorization: `Bearer ${token}` } });
        setActivity(res.data);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
      } finally {
        setActivityLoading(false);
      }
    })();
    
    // Fetch forum activity
    (async () => {
      try {
        setForumLoading(true);
        const res = await axios.get('/api/admin/forums/recent-activity', { headers: { Authorization: `Bearer ${token}` } });
        setForumActivity(res.data);
      } catch (err) {
        console.error('Error fetching forum activity:', err);
      } finally {
        setForumLoading(false);
      }
    })();
  }, [token]);

  // Helper function to render loading or empty state
  const renderLoadingOrEmpty = (loading, items, emptyMessage) => {
    if (loading) {
      return (
        <ListItem>
          <ListItemText primary="Loading..." />
        </ListItem>
      );
    }
    
    if (items.length === 0) {
      return (
        <ListItem>
          <ListItemText primary={emptyMessage} />
        </ListItem>
      );
    }
    
    return null;
  };
  
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <Sidebar currentUser={currentUser} />
      <Box sx={{ position: 'absolute', top: 16, right: 80, zIndex: 1201 }}>
        <NotificationBell token={token} />
      </Box>
      <Box sx={{ position: 'absolute', top: 16, right: 24, zIndex: 1201 }}>
        <Tooltip title="Account">
          <IconButton 
            onClick={handleUserMenuOpen}
            size="medium"
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' } 
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
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {isOnMainDashboard && (
          <>
            <Typography variant="h4" component="h1" gutterBottom color="primary" sx={{ mb: 4, fontWeight: 600 }}>
              <DashboardIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
              Admin Dashboard
            </Typography>
            
            <Grid container spacing={3}>
              {/* Notifications Section */}
              <Grid item xs={12} md={6} lg={4}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <NotificationsActiveIcon />
                      </Avatar>
                    }
                    action={
                      <IconButton aria-label="view all notifications" onClick={() => {}}>
                        <MoreVertIcon />
                      </IconButton>
                    }
                    title="Notifications"
                    titleTypographyProps={{ variant: 'h6' }}
                  />
                  <Divider />
                  <CardContent sx={{ height: 300, overflow: 'auto', p: 0 }}>
                    <List dense>
                      {renderLoadingOrEmpty(notificationsLoading, notifications, "No notifications")}
                      
                      {!notificationsLoading && notifications.map(n => (
                        <ListItem key={n._id} selected={!n.read} sx={{
                          borderLeft: !n.read ? '4px solid #3f51b5' : 'none',
                          bgcolor: !n.read ? 'rgba(63, 81, 181, 0.08)' : 'transparent'
                        }}>
                          <ListItemText
                            primary={<span style={{ fontWeight: n.read ? 400 : 700 }}>{n.message}</span>}
                            secondary={new Date(n.createdAt).toLocaleString()}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Activity Feed Section */}
              <Grid item xs={12} md={6} lg={4}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <EventNoteIcon />
                      </Avatar>
                    }
                    action={
                      <IconButton aria-label="view all activity">
                        <MoreVertIcon />
                      </IconButton>
                    }
                    title="Recent Activity"
                    titleTypographyProps={{ variant: 'h6' }}
                  />
                  <Divider />
                  <CardContent sx={{ height: 300, overflow: 'auto', p: 0 }}>
                    <List dense>
                      {renderLoadingOrEmpty(activityLoading, activity, "No recent activity")}
                      
                      {!activityLoading && activity.map(a => (
                        <ListItem key={a._id} sx={{ 
                          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                        }}>
                          <ListItemText
                            primary={
                              <Box>
                                <Chip 
                                  label={a.action} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ mr: 1, textTransform: 'capitalize' }}
                                />
                                <Typography component="span" variant="body2">
                                  by {a.performedBy?.email}
                                  {a.targetUser && <> → {a.targetUser.email}</>}
                                </Typography>
                              </Box>
                            }
                            secondary={new Date(a.createdAt).toLocaleString()}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Forum Activity Section */}
              <Grid item xs={12} md={6} lg={4}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: 'warning.main' }}>
                        <ForumIcon />
                      </Avatar>
                    }
                    action={
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary" 
                        onClick={() => navigate('/admin/forum')}
                        startIcon={<ForumIcon />}
                      >
                        Moderate
                      </Button>
                    }
                    title="Forum Activity"
                    titleTypographyProps={{ variant: 'h6' }}
                  />
                  <Divider />
                  <CardContent sx={{ height: 300, overflow: 'auto', p: 0 }}>
                    <List dense>
                      {renderLoadingOrEmpty(forumLoading, forumActivity, "No recent forum activity")}
                      
                      {!forumLoading && forumActivity.map((item, index) => (
                        <ListItem 
                          key={index} 
                          sx={{ 
                            bgcolor: item.flagged ? 'rgba(255, 152, 0, 0.1)' : 'transparent',
                            borderLeft: item.flagged ? '4px solid #ff9800' : 'none',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box>
                                <Typography component="span" variant="body2" fontWeight={500}>
                                  {item.action} in {item.forumTitle}
                                </Typography>
                                {item.flagged && 
                                  <Chip 
                                    size="small" 
                                    label="Flagged" 
                                    color="error" 
                                    sx={{ ml: 1 }} 
                                  />
                                }
                              </Box>
                            }
                            secondary={`${item.userName} (${item.userRole}) - ${new Date(item.timestamp).toLocaleString()}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
        
        <Box sx={{ mt: isOnMainDashboard ? 4 : 0 }}>
          <Routes>
            <Route path="dashboard" element={<AnalyticsDashboard />} />
            <Route path="teachers" element={<TeacherManagement currentUser={currentUser} />} />
            <Route path="students" element={<StudentManagement currentUser={currentUser} />} />
            <Route path="courses" element={<CourseManagement currentUser={currentUser} />} />
            <Route path="enhanced-analytics" element={<EnhancedAnalytics />} />
            <Route path="forum/*" element={<ForumModeration currentUser={currentUser} />} />
            <Route path="announcements" element={<AnnouncementPage role="admin" />} />
            {currentUser?.role === 'admin' && <Route path="roles" element={<RoleManagement />} />}
            <Route path="*" element={<Navigate to="/admin/dashboard" />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
