import React, { useEffect, useState } from 'react';
import { IconButton, Badge, Menu, MenuItem, ListItemText, ListItemSecondaryAction, Typography, Divider, Chip, ListItemIcon } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import axios from 'axios';

export default function NotificationBell({ token }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]); // Initialize as empty array
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        // The API returns { notifications: [...], total, page }, so we need to access res.data.notifications
        const notificationsData = res.data.notifications || [];
        setNotifications(notificationsData);
        setUnread(notificationsData.filter(n => !n.read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]); // Set empty array on error
        setUnread(0);
      }
    })();
  }, [token]);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(n => n.map(notif => notif._id === id ? { ...notif, read: true } : notif));
      setUnread(u => Math.max(0, u - 1)); // Ensure unread count doesn't go below 0
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen} size="large" sx={{ ml: 2 }}>
        <Badge badgeContent={unread} color="error" overlap="circular">
          <NotificationsIcon fontSize="large" />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} PaperProps={{ sx: { minWidth: 340, maxWidth: 400, p: 1 } }}>
        <Typography variant="h6" sx={{ px: 2, py: 1, fontWeight: 600, color: 'primary.main' }}>Notifications</Typography>
        <Divider sx={{ mb: 1 }} />
        {notifications.length === 0 && <MenuItem disabled><Typography color="text.secondary">No notifications</Typography></MenuItem>}
        {Array.isArray(notifications) && notifications.map(n => (
          <MenuItem key={n._id} selected={!n.read} onClick={() => markAsRead(n._id)} sx={{ alignItems: 'flex-start', py: 1.5, borderLeft: !n.read ? '4px solid #1976d2' : 'none', bgcolor: !n.read ? 'rgba(25, 118, 210, 0.07)' : 'transparent', mb: 0.5 }}>
            <ListItemIcon sx={{ mt: 0.5 }}>
              <NotificationsIcon color={n.read ? 'disabled' : 'primary'} fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography fontWeight={!n.read ? 700 : 400} color={n.read ? 'text.secondary' : 'text.primary'}>{n.message}</Typography>}
              secondary={<Typography variant="caption" color="text.secondary">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(n.createdAt).toLocaleDateString()}</Typography>}
            />
            {!n.read && <ListItemSecondaryAction><Chip label="New" color="primary" size="small" sx={{ ml: 1 }} /></ListItemSecondaryAction>}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
