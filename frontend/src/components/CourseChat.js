import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, TextField, Button, CircularProgress, List, ListItem, ListItemText, Avatar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const CourseChat = ({ courseId, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/course/${courseId}/chat`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessages(res.data.messages || []);
        setLoading(false);
      } catch (err) {
        setError('Failed to load chat messages.');
        setLoading(false);
      }
    };
    if (courseId) fetchMessages();
  }, [courseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/course/${courseId}/chat`, {
        content: input
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages([...messages, res.data.message]);
      setInput('');
    } catch (err) {
      setError('Failed to send message.');
    }
    setSending(false);
  };

  return (
    <Paper sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>Course Chat</Typography>
      <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, bgcolor: '#f9f9f9', borderRadius: 1, p: 1 }}>
        {loading ? <CircularProgress /> : (
          <List>
            {messages.map((msg, idx) => (
              <ListItem key={msg._id || idx} alignItems="flex-start">
                <ListItemText
                  primary={<><Avatar sx={{ width: 24, height: 24, mr: 1, display: 'inline-block', verticalAlign: 'middle' }}>{msg.user?.name?.[0] || '?'}</Avatar> <b>{msg.user?.name || 'User'}</b></>}
                  secondary={<span>{msg.content}<br /><small>{new Date(msg.createdAt).toLocaleString()}</small></span>}
                />
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={sending}
        />
        <Button variant="contained" endIcon={<SendIcon />} onClick={handleSend} disabled={sending || !input.trim()}>
          Send
        </Button>
      </Box>
      {error && <Typography color="error" variant="body2">{error}</Typography>}
    </Paper>
  );
};

export default CourseChat;
