
import React, { useState } from 'react';
import { Box, TextField, Button, Alert, FormGroup, FormControlLabel, Checkbox } from '@mui/material';

const PERMISSIONS = [
  { key: 'manage_teachers', label: 'Manage Teachers' },
  { key: 'manage_students', label: 'Manage Students' },
  { key: 'manage_courses', label: 'Manage Courses' },
  { key: 'manage_videos', label: 'Manage Videos' },
  { key: 'view_analytics', label: 'View Analytics' },
  // Add more as needed
];

const AddTeacherForm = ({ onAdd }) => {

  const [form, setForm] = useState({ name: '', email: '', password: '', permissions: [] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState({});

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTouched({ ...touched, [e.target.name]: true });
  };
  const handlePermissionChange = key => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key]
    }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!emailRegex.test(form.email)) return 'Invalid email address';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await onAdd(form);
      setSuccess('Teacher added successfully');
      setForm({ name: '', email: '', password: '', permissions: [] });
      setTouched({});
    } catch (err) {
      setError(err.message || 'Failed to add teacher');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <Alert severity="info" sx={{ mb: 2 }}>
        A unique Teacher ID (format: T####) will be automatically generated upon creation.
      </Alert>
      <TextField
        label="Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        error={!!touched.name && !form.name.trim()}
        helperText={touched.name && !form.name.trim() ? 'Name is required' : ''}
        inputProps={{ title: 'Enter the full name of the teacher' }}
      />
      <TextField
        label="Email"
        name="email"
        value={form.email}
        onChange={handleChange}
        fullWidth
        margin="normal"
        required
        error={!!touched.email && (!form.email.trim() || !emailRegex.test(form.email))}
        helperText={touched.email && !form.email.trim() ? 'Email is required' : (touched.email && !emailRegex.test(form.email) ? 'Invalid email address' : '')}
        inputProps={{ title: 'Enter a valid email address' }}
      />
      <TextField
        label="Password"
        name="password"
        value={form.password}
        onChange={handleChange}
        type="password"
        fullWidth
        margin="normal"
        required
        error={!!touched.password && (!form.password || form.password.length < 6)}
        helperText={touched.password && (!form.password || form.password.length < 6) ? 'Password must be at least 6 characters' : ''}
        inputProps={{ title: 'Password must be at least 6 characters' }}
      />
      <FormGroup row sx={{ mt: 2 }}>
        {PERMISSIONS.map(p => (
          <FormControlLabel
            key={p.key}
            control={<Checkbox checked={form.permissions.includes(p.key)} onChange={() => handlePermissionChange(p.key)} />}
            label={p.label}
          />
        ))}
      </FormGroup>
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>Add Teacher</Button>
    </Box>
  );
};

export default AddTeacherForm;
