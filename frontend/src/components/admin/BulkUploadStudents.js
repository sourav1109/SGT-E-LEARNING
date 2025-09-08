import React, { useState } from 'react';
import { Box, Button, Alert, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Link } from '@mui/material';
import Papa from 'papaparse';
import DownloadIcon from '@mui/icons-material/Download';

const REQUIRED_FIELDS = ['name', 'email', 'password'];
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Helper function to generate sample CSV content
const generateSampleCSV = () => {
  return `name,email,password,regNo,courseAssigned
John Smith,john.smith@example.com,StrongPass123!,S123456,COURSE001
Jane Doe,jane.doe@example.com,SecurePass456!,,COURSE002
Alan Johnson,alan.johnson@example.com,SafePass789!,S567890,COURSE003`;
};

// Helper function to download sample CSV
const downloadSampleCSV = () => {
  const element = document.createElement('a');
  const file = new Blob([generateSampleCSV()], {type: 'text/csv'});
  element.href = URL.createObjectURL(file);
  element.download = 'student_template.csv';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const BulkUploadStudents = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setPreview([]);
    setCsvErrors([]);
    setError('');
    setSuccess('');
    if (e.target.files[0]) {
      Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(), // Normalize headers
        complete: (results) => {
          const rows = results.data;
          
          // Check if we have the right headers
          const headers = Object.keys(rows[0] || {}).map(h => h.toLowerCase());
          const missingHeaders = REQUIRED_FIELDS.filter(f => !headers.includes(f));
          
          if (missingHeaders.length > 0) {
            setError(`CSV is missing required headers: ${missingHeaders.join(', ')}. Please use the template.`);
            return;
          }
          
          const errors = [];
          const seenEmails = new Set();
          
          rows.forEach((row, idx) => {
            // Handle case where name might be NAME or Name instead of name
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase().trim()] = row[key];
            });
            
            REQUIRED_FIELDS.forEach(f => {
              if (!normalizedRow[f] || normalizedRow[f].trim() === '') {
                errors.push({ row: idx + 2, message: `Missing field: ${f}` });
              }
            });
            
            if (normalizedRow.email) {
              if (!emailRegex.test(normalizedRow.email)) {
                errors.push({ row: idx + 2, message: 'Invalid email' });
              }
              if (seenEmails.has(normalizedRow.email.toLowerCase())) {
                errors.push({ row: idx + 2, message: 'Duplicate email in file' });
              }
              seenEmails.add(normalizedRow.email.toLowerCase());
            }
          });
          
          setPreview(rows);
          setCsvErrors(errors);
        },
        error: (err) => setError('CSV parse error: ' + err.message)
      });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!file) return setError('Please select a CSV file');
    if (csvErrors.length > 0) return setError('Please fix CSV errors before uploading.');
    try {
      await onUpload(file);
      setSuccess('Students uploaded successfully');
      setFile(null);
      setPreview([]);
      setCsvErrors([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk upload failed');
      if (err.response?.data?.errors) {
        setCsvErrors(err.response.data.errors);
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Upload a CSV file with the following required columns: 
          <strong>name</strong>, <strong>email</strong>, <strong>password</strong>.
          Optional columns: <strong>regNo</strong>, <strong>courseAssigned</strong>.
          <br />
          <strong>Note:</strong> If you don't provide a registration number (regNo), the system will automatically generate one starting with "S" followed by 6 digits.
          <br />
          <Link 
            component="button" 
            onClick={downloadSampleCSV} 
            sx={{ display: 'inline-flex', alignItems: 'center', mt: 1 }}
          >
            <DownloadIcon fontSize="small" sx={{ mr: 0.5 }} />
            Download CSV Template
          </Link>
        </Typography>
      </Alert>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          style={{ marginRight: 8 }} 
        />
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={csvErrors.length > 0 && preview.length > 0}
          sx={{ ml: 2 }}
        >
          Upload Students
        </Button>
      </Box>
      
      {preview.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Preview:</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {Object.keys(preview[0]).map(h => <TableCell key={h}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((row, i) => (
                  <TableRow key={i}>
                    {Object.keys(preview[0]).map(h => <TableCell key={h}>{row[h]}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {csvErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <b>CSV Errors:</b>
              <ul style={{ margin: 0 }}>
                {csvErrors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};

export default BulkUploadStudents;
