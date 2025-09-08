import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider, Avatar, Button, Menu, MenuItem } from '@mui/material';
import { Navigate, useNavigate, Routes, Route } from 'react-router-dom';
import { Menu as MenuIcon, Home as HomeIcon, VideoLibrary as VideoLibraryIcon, History as HistoryIcon, ExitToApp as LogoutIcon, AccountCircle as AccountIcon } from '@mui/icons-material';
import StudentRoutes from '../routes/StudentRoutes';

const StudentDashboardPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [accountMenu, setAccountMenu] = useState(null);
  const navigate = useNavigate();
  
  // Parse user from localStorage if available
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
  }, []);
  
  // If no token or not a student, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  const handleAccountMenuOpen = (event) => {
    setAccountMenu(event.currentTarget);
  };
  
  const handleAccountMenuClose = () => {
    setAccountMenu(null);
  };
  
  const drawerWidth = 240;
  
  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          {user?.name?.charAt(0) || 'S'}
        </Avatar>
        <Box>
          <Typography variant="subtitle1">{user?.name || 'Student'}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email || ''}</Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        <ListItem button onClick={() => { navigate('/student'); setDrawerOpen(false); }}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button onClick={() => { navigate('/student/courses'); setDrawerOpen(false); }}>
          <ListItemIcon><VideoLibraryIcon /></ListItemIcon>
          <ListItemText primary="My Courses" />
        </ListItem>
        <ListItem button onClick={() => { navigate('/student/watch-history'); setDrawerOpen(false); }}>
          <ListItemIcon><HistoryIcon /></ListItemIcon>
          <ListItemText primary="Watch History" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Student Portal
          </Typography>
          <IconButton color="inherit" onClick={handleAccountMenuOpen}>
            <AccountIcon />
          </IconButton>
          <Menu
            anchorEl={accountMenu}
            open={Boolean(accountMenu)}
            onClose={handleAccountMenuClose}
          >
            <MenuItem onClick={handleAccountMenuClose}>My Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}>
        <StudentRoutes user={user} token={token} />
      </Box>
    </Box>
  );
};

export default StudentDashboardPage;
