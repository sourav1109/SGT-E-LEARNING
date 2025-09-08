import React, { useState } from 'react';
import { Box, Button, Alert } from '@mui/material';

const BulkAssignCourses = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = e => setFile(e.target.files[0]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!file) return setError('Please select a CSV file');
    try {
      await onUpload(file);
      setSuccess('Bulk course assignment successful');
      setFile(null);
    } catch (err) {
      setError(err.message || 'Bulk assignment failed');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <Button type="submit" variant="contained" color="secondary" sx={{ ml: 2 }}>Bulk Assign via CSV</Button>
    </Box>
  );
};

export default BulkAssignCourses;
