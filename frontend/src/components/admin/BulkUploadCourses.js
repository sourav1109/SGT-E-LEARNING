import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Alert, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Tooltip, 
  Typography, 
  Link,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  IconButton,
  Collapse,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import Papa from 'papaparse';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const REQUIRED_FIELDS = ['title', 'description', 'teacherid'];

// Helper function to generate sample CSV content
const generateSampleCSV = () => {
  return `title,description,teacherId,courseCode
Advanced Mathematics,Advanced calculus and algebra course,T0001,C000001
Physics 101,Introduction to classical mechanics,T0002,
Computer Science Fundamentals,Basic programming concepts,T0003,
Introduction to Literature,Survey of world literature,T0001,C000004`;
};

// Helper function to download sample CSV
const downloadSampleCSV = () => {
  const element = document.createElement('a');
  const file = new Blob([generateSampleCSV()], {type: 'text/csv'});
  element.href = URL.createObjectURL(file);
  element.download = 'course_template.csv';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const BulkUploadCourses = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Select CSV File', 'Validate Data', 'Upload Courses'];

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setPreview([]);
    setCsvErrors([]);
    setError('');
    setSuccess('');
    setActiveStep(1);
    
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
          
          rows.forEach((row, idx) => {
            // Handle case where header might have different capitalization
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              normalizedRow[key.toLowerCase().trim()] = row[key];
            });
            
            // Check required fields
            if (!normalizedRow.title || normalizedRow.title.trim() === '') {
              errors.push({ row: idx + 2, message: 'Missing field: title' });
            }
            
            // Teacher ID validation (should start with T followed by numbers)
            if (normalizedRow.teacherid) {
              const teacherIds = normalizedRow.teacherid.split(',').map(id => id.trim());
              teacherIds.forEach(id => {
                if (id && !id.match(/^T\d{4}$/)) {
                  errors.push({ row: idx + 2, message: `Invalid teacher ID format: ${id}. Should be in format T#### (e.g., T0001)` });
                }
              });
            }
            
            // Course code validation if provided
            if (normalizedRow.coursecode && normalizedRow.coursecode.trim() !== '') {
              const courseCode = normalizedRow.coursecode.trim();
              if (!courseCode.match(/^C\d{6}$/)) {
                errors.push({ row: idx + 2, message: `Invalid course code format: ${courseCode}. Should be in format C###### (e.g., C000001)` });
              }
            }
          });
          
          setPreview(rows);
          setCsvErrors(errors);
          
          if (errors.length === 0) {
            setActiveStep(2);
          }
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
    
    setIsUploading(true);
    
    try {
      await onUpload(file);
      setSuccess('Courses uploaded successfully');
      setFile(null);
      setPreview([]);
      setCsvErrors([]);
      setActiveStep(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk upload failed');
      if (err.response?.data?.errors) {
        setCsvErrors(err.response.data.errors);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  return (
    <Card elevation={2} sx={{ mb: 2, overflow: 'hidden' }}>
      <CardContent sx={{ pb: 0 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2 
        }}>
          <Typography variant="h6" color="primary">
            Bulk Upload Courses
          </Typography>
          <Box>
            <Tooltip title="Help">
              <IconButton onClick={toggleHelp} size="small">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={toggleExpanded} size="small">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>
        
        <Collapse in={showHelp}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              How to use the Bulk Upload feature:
            </Typography>
            <Typography variant="body2">
              1. Download the CSV template below<br />
              2. Fill in your course information following the format<br />
              3. Upload the completed CSV file<br />
              4. Review validation results and fix any errors<br />
              5. Submit to upload all courses at once
            </Typography>
          </Alert>
        </Collapse>

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadSampleCSV}
              fullWidth
            >
              Download Template
            </Button>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="csv-file-upload"
            />
            <label htmlFor="csv-file-upload" style={{ width: '100%' }}>
              <Button 
                variant="outlined" 
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Select CSV File
              </Button>
            </label>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              onClick={handleSubmit}
              disabled={csvErrors.length > 0 || !file || isUploading}
              fullWidth
            >
              Upload Courses
            </Button>
          </Grid>
        </Grid>
        
        {file && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected file: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
          </Typography>
        )}
        
        {isUploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
              Uploading courses...
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <Collapse in={expanded}>
        <Divider sx={{ mt: 2 }} />
        <CardContent>
          {preview.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Preview ({preview.length} courses):</Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Row</TableCell>
                      {Object.keys(preview[0]).map(h => (
                        <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{i + 2}</TableCell>
                        {Object.keys(preview[0]).map(h => (
                          <TableCell key={h}>{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {csvErrors.length > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    CSV Validation Errors:
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 200, mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Row</TableCell>
                          <TableCell>Error</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {csvErrors.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell>{e.row}</TableCell>
                            <TableCell>{e.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Alert>
              )}
            </Box>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Required CSV Format:
            </Typography>
            <TableContainer component={Paper} sx={{ maxWidth: 600 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Example</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>title</TableCell>
                    <TableCell>Course title (required)</TableCell>
                    <TableCell>Advanced Mathematics</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>description</TableCell>
                    <TableCell>Course description</TableCell>
                    <TableCell>An in-depth course covering advanced topics</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>teacherId</TableCell>
                    <TableCell>Teacher IDs (format: T####, comma-separated for multiple)</TableCell>
                    <TableCell>T0001,T0003</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>courseCode</TableCell>
                    <TableCell>Optional course code (format: C######). If left empty, a unique code will be generated automatically.</TableCell>
                    <TableCell>C000001</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default BulkUploadCourses;
