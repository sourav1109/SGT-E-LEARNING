const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create middleware for file uploads based on type
module.exports = function(type) {
  // Define directory based on type
  const directory = path.join(__dirname, '..', 'uploads', type);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  
  // Configure storage
  const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, directory);
    },
    filename: function(req, file, cb) {
      // Create unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });
  
  // Define file filter based on type
  const fileFilter = function(req, file, cb) {
    if (type === 'discussions' || type === 'profiles') {
      // For discussions and profiles, only allow images
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    } else if (type === 'videos') {
      // For videos, only allow video files
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'), false);
      }
    } else if (type === 'documents') {
      // For documents, allow PDFs, DOCs, etc.
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only document files are allowed'), false);
      }
    } else {
      // Default: accept all files
      cb(null, true);
    }
  };
  
  // Set file size limits based on type
  const limits = {};
  if (type === 'discussions' || type === 'profiles') {
    limits.fileSize = 5 * 1024 * 1024; // 5MB for images
  } else if (type === 'videos') {
    limits.fileSize = 100 * 1024 * 1024; // 100MB for videos
  } else if (type === 'documents') {
    limits.fileSize = 10 * 1024 * 1024; // 10MB for documents
  }
  
  return multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    limits: limits
  });
};
