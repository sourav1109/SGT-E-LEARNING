const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const cors = require('cors');

// Enable CORS for all routes
app.use(cors());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Check if files exist
const uploadsDir = path.join(__dirname, 'uploads');
console.log('Uploads directory:', uploadsDir);

try {
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files in uploads directory:`);
  
  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    console.log(`- ${file} (${stats.size} bytes)`);
  });
} catch (err) {
  console.error('Error reading uploads directory:', err);
}

// Create a test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test server is running' });
});

// Check access to specific file
app.get('/check/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.json({ 
      exists: true, 
      filename,
      size: fs.statSync(filePath).size,
      url: `/uploads/${filename}`
    });
  } else {
    res.status(404).json({ exists: false, filename });
  }
});

// Start server on port 5001 (to avoid conflict with main server)
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`- Test endpoint: http://localhost:${PORT}/test`);
  console.log(`- Check file: http://localhost:${PORT}/check/[filename]`);
  console.log(`- Access file: http://localhost:${PORT}/uploads/[filename]`);
});
