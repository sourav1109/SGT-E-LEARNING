const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Define uploads directory
const uploadsDir = path.join(__dirname, 'uploads');

// Check if uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  console.error('UPLOADS DIRECTORY NOT FOUND:', uploadsDir);
  console.log('Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created.');
} else {
  console.log('Uploads directory exists at:', uploadsDir);
  
  // List files in uploads directory
  const files = fs.readdirSync(uploadsDir);
  console.log('Files in uploads directory:', files);
  
  // Log file details
  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    console.log(`File: ${file}`);
    console.log(`  - Size: ${stats.size} bytes`);
    console.log(`  - Created: ${stats.birthtime}`);
    console.log(`  - Is file: ${stats.isFile()}`);
  });
}

// Set up static file serving
app.use('/uploads', express.static(uploadsDir));
console.log('Static file middleware configured for /uploads path');

// Test endpoint
app.get('/test', (req, res) => {
  res.send('Test server is running');
});

// Start server
const PORT = 5555;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Check uploads at http://localhost:${PORT}/uploads/[filename]`);
});
