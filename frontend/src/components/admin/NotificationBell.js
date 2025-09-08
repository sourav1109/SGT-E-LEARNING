import React, { useEffect, useState } from 'react';
import { IconButton, Badge, Menu, MenuItem, ListItemText, ListItemSecondaryAction, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import axios from 'axios';

export default function NotificationBell({ token }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(res.data);
      setUnread(res.data.filter(n => !n.read).length);
    })();
  }, [token]);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const markAsRead = async (id) => {
    await axios.patch(`/api/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setNotifications(n => n.map(notif => notif._id === id ? { ...notif, read: true } : notif));
    setUnread(u => u - 1);
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unread} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {notifications.length === 0 && <MenuItem disabled>No notifications</MenuItem>}
        {notifications.map(n => (
          <MenuItem key={n._id} selected={!n.read} onClick={() => markAsRead(n._id)}>
            <ListItemText
              primary={<Typography fontWeight={!n.read ? 700 : 400}>{n.message}</Typography>}
              secondary={new Date(n.createdAt).toLocaleString()}
            />
            {!n.read && <ListItemSecondaryAction><Typography color="primary">New</Typography></ListItemSecondaryAction>}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
