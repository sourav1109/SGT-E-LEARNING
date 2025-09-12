// Bulk messaging: email or notification to students/teachers
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Course = require('../models/Course');
const School = require('../models/School');
const Department = require('../models/Department');
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');

// POST /api/admin/bulk-message
exports.bulkMessage = async (req, res) => {
  try {
    const { target, type, subject, message } = req.body; // target: 'students'|'teachers', type: 'email'|'notification'
    let users = [];
    if (target === 'students') users = await User.find({ role: 'student', isActive: true });
    else if (target === 'teachers') users = await User.find({ role: 'teacher', isActive: true });
    else return res.status(400).json({ message: 'Invalid target' });

    if (type === 'email') {
      // Send email to all
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      const sendAll = users.map(u =>
        transporter.sendMail({
          to: u.email,
          subject: subject || 'Message from Admin',
          text: message
        })
      );
      await Promise.all(sendAll);
    } else if (type === 'notification') {
      // Create notification for all
      const notifs = users.map(u => ({ user: u._id, message, read: false }));
      await Notification.insertMany(notifs);
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }
    res.json({ message: 'Bulk message sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Recent audit logs for dashboard
exports.getRecentAuditLogs = async (req, res) => {
  try {
    const logs = await require('../models/AuditLog').find().populate('performedBy', 'email').populate('targetUser', 'email').sort({ createdAt: -1 }).limit(20);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const AuditLog = require('../models/AuditLog');
const AssignmentHistory = require('../models/AssignmentHistory');
// Admin changes own password
exports.changeOwnPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const admin = await User.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    const isMatch = await require('bcryptjs').compare(oldPassword, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Old password incorrect' });
    admin.password = await require('bcryptjs').hash(newPassword, 10);
    await admin.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Bulk assign courses via CSV (students or teachers)
exports.bulkAssignCourses = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        for (const row of results) {
          // CSV: { userType: 'student'|'teacher', userId, courseId }
          const { userType, userId, courseId } = row;
          if (userType === 'student') {
            await require('../models/User').findByIdAndUpdate(userId, { $addToSet: { coursesAssigned: courseId } });
          } else if (userType === 'teacher') {
            await require('../models/Course').findByIdAndUpdate(courseId, { teacher: userId });
          }
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Bulk course assignment successful' });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });
};
// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate('teachers', 'name email teacherId');
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .populate('school', 'name code')
      .populate('coursesAssigned', 'title courseCode');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .populate('coursesAssigned', 'title courseCode description');
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

  // Super admin: Create announcement for teachers and/or students
  const Announcement = require('../models/Announcement');
  exports.createAnnouncement = async (req, res) => {
    try {
      const { message, recipients } = req.body; // recipients: ['teacher', 'student']
      if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: 'Message and recipients are required.' });
      }
      const announcement = new Announcement({
        sender: req.user._id,
        role: 'admin',
        message,
        recipients,
      });
      await announcement.save();

      // Send notifications to recipients
      const NotificationController = require('./notificationController');
      let users = [];
      if (recipients.includes('teacher')) {
        users = users.concat(await User.find({ role: 'teacher', isActive: true }));
      }
      if (recipients.includes('student')) {
        users = users.concat(await User.find({ role: 'student', isActive: true }));
      }
      for (const user of users) {
        await NotificationController.createNotification({
          type: 'announcement',
          recipient: user._id,
          message: `New announcement: ${message}`,
          data: { announcementId: announcement._id },
          announcement: announcement._id
        });
      }
      res.json({ message: 'Announcement created successfully.' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Update announcement
  exports.updateAnnouncement = async (req, res) => {
    try {
      const { id } = req.params;
      const { message, recipients } = req.body;
      
      if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: 'Message and recipients are required.' });
      }
      
      const announcement = await Announcement.findById(id);
      if (!announcement) {
        return res.status(404).json({ message: 'Announcement not found.' });
      }
      
      // Store previous values for edit history
      const previousMessage = announcement.message;
      const previousRecipients = [...announcement.recipients];
      
      // Update announcement
      announcement.message = message;
      announcement.recipients = recipients;
      announcement.isEdited = true;
      announcement.lastEditedBy = req.user._id;
      announcement.lastEditedAt = new Date();
      
      // Add to edit history
      announcement.editHistory = announcement.editHistory || [];
      announcement.editHistory.push({
        editedBy: req.user._id,
        editedAt: new Date(),
        previousMessage: previousMessage,
        previousRecipients: previousRecipients
      });
      
      await announcement.save();
      
      // Create audit log
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'edit_announcement',
        performedBy: req.user._id,
        details: { announcementId: id, message, recipients }
      });
      
      res.json({ message: 'Announcement updated successfully.' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  
  // Delete announcement
  exports.deleteAnnouncement = async (req, res) => {
    try {
      const { id } = req.params;
      
      const announcement = await Announcement.findById(id);
      if (!announcement) {
        return res.status(404).json({ message: 'Announcement not found.' });
      }
      
      await Announcement.findByIdAndDelete(id);
      
      // Create audit log
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'delete_announcement',
        performedBy: req.user._id,
        details: { announcementId: id }
      });
      
      res.json({ message: 'Announcement deleted successfully.' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Admin: Toggle teacher announcement permission
  exports.toggleTeacherAnnounce = async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { canAnnounce } = req.body;
      if (typeof canAnnounce !== 'boolean') {
        return res.status(400).json({ message: 'canAnnounce must be boolean.' });
      }
      const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found.' });
      }
      teacher.canAnnounce = canAnnounce;
      await teacher.save();
      res.json({ message: `Teacher announcement permission updated to ${canAnnounce}.` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

// Search teachers for dropdown selection
exports.searchTeachers = async (req, res) => {
  try {
    const query = req.query.q || '';
    
    // Search by name, email or teacherId
    const teachers = await User.find({
      role: 'teacher',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { teacherId: { $regex: query, $options: 'i' } }
      ]
    }).select('_id name email teacherId').limit(10);
    
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const Video = require('../models/Video');

// Helper: resolve an array of course identifiers (ObjectId strings or courseCode strings)
// to an array of valid Course ObjectIds. Returns { ids, notFound }
async function resolveCourseIdentifiers(identifiers) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) return { ids: [], notFound: [] };
  const ids = [];
  const notFound = [];
  for (const raw of identifiers) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    // If already a valid ObjectId, use directly
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      ids.push(trimmed);
      continue;
    }
    // Otherwise treat as courseCode
    const course = await Course.findOne({ courseCode: trimmed });
    if (course) ids.push(course._id);
    else notFound.push(trimmed);
  }
  // De-duplicate
  const unique = [...new Set(ids.map(id => id.toString()))];
  return { ids: unique, notFound };
}

// Add a teacher manually
exports.addTeacher = async (req, res) => {
  try {
    const { name, email, password, permissions, school, department } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !school || !department) {
      return res.status(400).json({ message: 'Name, email, password, school, and department are required' });
    }
    
    // Validate email format
    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if teacher with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    
    // Validate school and department exist
    const schoolExists = await School.findById(school);
    if (!schoolExists) {
      return res.status(400).json({ message: 'Invalid school selected' });
    }
    
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({ message: 'Invalid department selected' });
    }
    
    // Verify department belongs to the selected school
    if (departmentExists.school.toString() !== school) {
      return res.status(400).json({ message: 'Department does not belong to the selected school' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = new User({ 
      name, 
      email: normalizedEmail, 
      password: hashedPassword, 
      role: 'teacher', 
      permissions,
      school,
      department,
      teacherId: null // Will be auto-generated in the pre-save hook
    });
    
    await teacher.save();
    await AuditLog.create({ 
      action: 'add_teacher', 
      performedBy: req.user._id, 
      targetUser: teacher._id, 
      details: { name, email: normalizedEmail, school, department } 
    });
    
    // Populate school and department info for response
    await teacher.populate('school department');
    
    res.status(201).json(teacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Super Admin: Add admin
exports.addAdmin = async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    
    // Validate email format
    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if admin with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new User({ 
      name, 
      email: normalizedEmail, 
      password: hashedPassword, 
      role: 'admin', 
      permissions 
    });
    
    await admin.save();
    await AuditLog.create({ 
      action: 'add_admin', 
      performedBy: req.user._id, 
      targetUser: admin._id, 
      details: { name, email: normalizedEmail } 
    });
    
    res.status(201).json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Bulk upload teachers via CSV with validation and error reporting
exports.bulkUploadTeachers = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const results = [];
  const errors = [];
  const seenEmails = new Set();
  
  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase() // Normalize headers
    }))
    .on('data', (data) => {
      // Normalize the data object to ensure keys are lowercase
      const normalizedData = {};
      Object.keys(data).forEach(key => {
        normalizedData[key.toLowerCase().trim()] = data[key];
      });
      results.push(normalizedData);
    })
    .on('end', async () => {
      try {
        // Validate all rows first
        console.log(`Processing ${results.length} rows from CSV`);
        
        // Check for basic required fields in the CSV
        if (results.length > 0) {
          const firstRow = results[0];
          const requiredFields = ['name', 'email', 'password'];
          const missingHeaders = requiredFields.filter(field => 
            !Object.keys(firstRow).some(key => key.toLowerCase() === field)
          );
          
          if (missingHeaders.length > 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
              message: `CSV is missing required headers: ${missingHeaders.join(', ')}. Please use the template.` 
            });
          }
        }
        
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 2; // header is row 1
          
          if (!row.name || row.name.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: name' });
          }
          
          if (!row.email || row.email.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: email' });
          } else {
            // Normalize email for comparison
            const normalizedEmail = row.email.trim().toLowerCase();
            
            if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
              errors.push({ row: rowNum, message: 'Invalid email format' });
            }
            
            if (seenEmails.has(normalizedEmail)) {
              errors.push({ row: rowNum, message: 'Duplicate email in file' });
            }
            seenEmails.add(normalizedEmail);
          }
          
          if (!row.password || row.password.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: password' });
          }
        }
        
        // Check for existing emails in DB
        const emails = results
          .filter(r => r.email && r.email.trim() !== '')
          .map(r => r.email.trim().toLowerCase());
        
        if (emails.length > 0) {
          const existing = await User.find({ 
            email: { $in: emails } 
          }, 'email');
          
          for (const e of existing) {
            const normalizedExistingEmail = e.email.toLowerCase();
            const idx = results.findIndex(r => 
              r.email && r.email.trim().toLowerCase() === normalizedExistingEmail
            );
            
            if (idx !== -1) {
              errors.push({ 
                row: idx + 2, 
                message: `Email ${results[idx].email} already exists in system` 
              });
            }
          }
        }
        
        if (errors.length > 0) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'Validation failed', errors });
        }
        
        // If valid, insert all
        for (const row of results) {
          const name = row.name ? row.name.trim() : '';
          const email = row.email ? row.email.trim().toLowerCase() : '';
          const password = row.password ? row.password.trim() : '';
          
          const hashedPassword = await bcrypt.hash(password, 10);
          const teacher = await User.create({ 
            name, 
            email, 
            password: hashedPassword, 
            role: 'teacher',
            teacherId: null // Will be auto-generated in the pre-save hook
          });
          
          await AuditLog.create({ 
            action: 'bulk_add_teacher', 
            performedBy: req.user._id, 
            targetUser: teacher._id, 
            details: { name, email } 
          });
        }
        
        fs.unlinkSync(req.file.path);
        res.json({ 
          message: `${results.length} teachers uploaded successfully` 
        });
      } catch (err) {
        console.error('Error in bulkUploadTeachers:', err);
        res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

// Reset teacher password
exports.resetTeacherPassword = async (req, res) => {
  try {
    const { teacherId, newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(teacherId, { password: hashedPassword });
  await AuditLog.create({ action: 'reset_teacher_password', performedBy: req.user._id, targetUser: teacherId });
  res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Deactivate teacher
exports.deactivateTeacher = async (req, res) => {
  try {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  await AuditLog.create({ action: 'deactivate_teacher', performedBy: req.user._id, targetUser: req.params.id });
  res.json({ message: 'Teacher deactivated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Add a single student with auto-generating registration number if not provided
exports.createStudent = async (req, res) => {
  try {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected when trying to create student');
      return res.status(500).json({ message: 'Database connection error. Please try again later.' });
    }
    
    console.log('Creating student with data:', req.body);
  const { name, email, password, regNo, school, coursesAssigned } = req.body;
    
    // Validate required fields
    if (!school) {
      return res.status(400).json({ message: 'School is required for student admission' });
    }
    
    // Verify school exists
    const schoolExists = await require('../models/School').findById(school);
    if (!schoolExists) {
      return res.status(400).json({ message: 'Selected school not found' });
    }
    
    // Validate email format
    if (!email || !email.includes('@') || !email.includes('.')) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Normalized email:', normalizedEmail);
    
    // Check if student with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      console.log('User with email already exists:', normalizedEmail);
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if regNo is provided or generate a new one
    let studentRegNo = regNo;
    if (!studentRegNo) {
      // Generate a unique registration number with retry logic
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        // Find the highest existing regNo
        const highestStudent = await User.findOne(
          { regNo: { $regex: /^S\d{6}$/ } },
          { regNo: 1 },
          { sort: { regNo: -1 } }
        );
        
        let nextNumber = 1;
        if (highestStudent && highestStudent.regNo) {
          // Extract the number from existing regNo and increment
          const currentNumber = parseInt(highestStudent.regNo.substring(1), 10);
          nextNumber = currentNumber + 1;
        }
        
        // Format with leading zeros to ensure 6 digits
        studentRegNo = 'S' + nextNumber.toString().padStart(6, '0');
        
        // Check if this regNo already exists
        const existingStudent = await User.findOne({ regNo: studentRegNo });
        if (!existingStudent) {
          break; // Found a unique regNo
        }
        
        attempts++;
        console.log(`Registration number ${studentRegNo} already exists, trying again (attempt ${attempts})`);
      }
      
      if (attempts >= maxAttempts) {
        return res.status(500).json({ 
          message: 'Unable to generate a unique registration number. Please try again.' 
        });
      }
      
      console.log('Generated registration number:', studentRegNo);
    } else if (!studentRegNo.startsWith('S') || !/^S\d{6}$/.test(studentRegNo)) {
      console.log('Invalid registration number format:', studentRegNo);
      return res.status(400).json({ 
        message: 'Registration number format is invalid. It should start with S followed by 6 digits.' 
      });
    } else {
      // If regNo is provided, check if it already exists
      const existingStudent = await User.findOne({ regNo: studentRegNo });
      if (existingStudent) {
        return res.status(400).json({ 
          message: `Registration number ${studentRegNo} is already in use.` 
        });
      }
    }
    
    // Create the student
    // Normalize incoming coursesAssigned (may arrive as string like "C000001" or "['C000001']")
    let normalizedCourseInputs = [];
    if (coursesAssigned) {
      if (Array.isArray(coursesAssigned)) {
        normalizedCourseInputs = coursesAssigned;
      } else if (typeof coursesAssigned === 'string') {
        let raw = coursesAssigned.trim();
        // Attempt to parse bracketed list
        if (raw.startsWith('[') && raw.endsWith(']')) {
          try {
            const jsonish = raw.replace(/'/g, '"');
            const parsed = JSON.parse(jsonish);
            if (Array.isArray(parsed)) normalizedCourseInputs = parsed.map(v => String(v).trim());
            else normalizedCourseInputs = [String(parsed).trim()];
          } catch (parseErr) {
            console.warn('Failed to parse coursesAssigned string list, using raw value:', parseErr.message);
            // Fallback: strip brackets and split by comma
            raw = raw.slice(1, -1); // remove [ ]
            normalizedCourseInputs = raw.split(',').map(s => s.replace(/['"\s]/g, '')).filter(Boolean);
          }
        } else {
          normalizedCourseInputs = [raw];
        }
      }
    }

    // Resolve provided course identifiers (could be course codes or ObjectIds)
    let resolvedCourses = [];
    if (normalizedCourseInputs.length > 0) {
      const { ids, notFound } = await resolveCourseIdentifiers(normalizedCourseInputs);
      resolvedCourses = ids;
      if (notFound.length === normalizedCourseInputs.length && ids.length === 0) {
        return res.status(400).json({ message: 'None of the provided course identifiers were found', notFound });
      }
      if (notFound.length > 0) {
        console.warn('Some course identifiers not found while creating student:', notFound);
      }
    }

    const student = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'student',
      regNo: studentRegNo,
      school: school, // Add school reference
      coursesAssigned: resolvedCourses
    });
    
    console.log('Saving student:', student);
    const savedStudent = await student.save();
    console.log('Student saved successfully:', savedStudent);
    
    // Log the action
    await AuditLog.create({
      action: 'add_student',
      performedBy: req.user._id,
      targetUser: student._id,
      details: { name, email: normalizedEmail, regNo: studentRegNo, school: schoolExists.name }
    });
    
    // Unlock the first video for each assigned course
    const StudentProgress = require('../models/StudentProgress');
    const Video = require('../models/Video');
    if (Array.isArray(savedStudent.coursesAssigned)) {
      for (const courseId of savedStudent.coursesAssigned) {
        // Find the first video in the course
        const firstVideo = await Video.findOne({ course: courseId }).sort({ createdAt: 1 });
        if (firstVideo) {
          await StudentProgress.findOneAndUpdate(
            { student: savedStudent._id, course: courseId },
            { $addToSet: { unlockedVideos: firstVideo._id } },
            { upsert: true }
          );
        }
      }
    }

    res.status(201).json({
      _id: student._id,
      name: student.name,
      email: student.email,
      regNo: student.regNo,
      coursesAssigned: student.coursesAssigned
    });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(400).json({ message: err.message });
  }
};

// Add student via CSV
exports.bulkUploadStudents = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const rows = [];
  const headerIssues = [];
  const normalizedHeader = h => (h || '').trim().toLowerCase();
  const seenEmails = new Set();

  fs.createReadStream(req.file.path)
    .pipe(csv({ 
      mapHeaders: ({ header }) => normalizedHeader(header),
      skipEmptyLines: true,
      skipLinesWithError: false
    }))
    .on('data', (raw) => {
      const norm = {};
      Object.keys(raw).forEach(k => { norm[normalizedHeader(k)] = raw[k]; });
      rows.push(norm);
    })
    .on('end', async () => {
      const startedAt = Date.now();
      console.log(`[bulkUploadStudents] Start processing ${rows.length} rows`);
      try {
        if (rows.length === 0) {
          try { fs.unlinkSync(req.file.path); } catch (_) {}
          return res.status(400).json({ message: 'CSV file is empty' });
        }

        // Required logical columns (password now optional - will auto-generate if missing)
        const first = rows[0];
        const mustHaveAny = ['name', 'email'];
        const missing = mustHaveAny.filter(col => !Object.prototype.hasOwnProperty.call(first, col));
        if (missing.length) headerIssues.push(`Missing required header(s): ${missing.join(', ')}`);
        if (headerIssues.length) {
          try { fs.unlinkSync(req.file.path); } catch (_) {}
          return res.status(400).json({ message: 'Header validation failed', errors: headerIssues });
        }

        // Pre-fetch existing emails to cut DB calls
        const fileEmails = rows
          .map(r => (r.email || '').trim().toLowerCase())
          .filter(e => e !== '');
        const uniqueFileEmails = [...new Set(fileEmails)];
        const existingUsers = await User.find({ email: { $in: uniqueFileEmails } }, 'email');
        const existingEmailSet = new Set(existingUsers.map(u => u.email.toLowerCase()));

        // Find next reg number once
        let nextRegNumber = 1;
        const highestStudent = await User.findOne(
          { regNo: { $regex: /^S\d{6}$/ } }, { regNo: 1 }, { sort: { regNo: -1 } }
        );
        if (highestStudent?.regNo) {
          nextRegNumber = parseInt(highestStudent.regNo.substring(1), 10) + 1;
        }

        const results = [];
        const rowErrors = [];
        let successCount = 0;

        // Helper for password generation
        const genPassword = () => crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0,10);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
            const rowNum = i + 2; // counting header line as 1
          try {
            const nameRaw = (row.name || '').trim();
            const emailRaw = (row.email || '').trim().toLowerCase();
            const passwordRaw = (row.password || '').trim();
            const regRaw = (row.regno || row['reg no'] || row['reg_no'] || '').trim();
            let coursesRaw = (row.courseassigned || row.courseAssigned || row['course assigned'] || row.coursesassigned || '').trim();
            
            console.log(`[DEBUG] Row ${rowNum} - coursesRaw: "${coursesRaw}" (type: ${typeof coursesRaw})`);

            // Basic validation
            if (!nameRaw) throw new Error('Missing name');
            if (!emailRaw) throw new Error('Missing email');
            if (!/^\S+@\S+\.\S+$/.test(emailRaw)) throw new Error('Invalid email format');
            if (seenEmails.has(emailRaw)) throw new Error('Duplicate email in CSV');
            seenEmails.add(emailRaw);
            if (existingEmailSet.has(emailRaw)) throw new Error('Email already exists');

            // RegNo validation/generation
            let regNoVal = regRaw;
            if (regNoVal) {
              if (!regNoVal.startsWith('S') || !/^S\d{6}$/.test(regNoVal)) {
                throw new Error('Invalid registration number format (expected S + 6 digits)');
              }
            } else {
              regNoVal = 'S' + nextRegNumber.toString().padStart(6, '0');
              nextRegNumber++;
            }

            // Courses parsing: support comma, semicolon, bracket lists
            let courseTokens = [];
            if (coursesRaw) {
              let rawStr = coursesRaw.trim();
              
              // Handle JSON array format like ["C000001","C000002"] or ['C000001','C000002']
              if (rawStr.startsWith('[') && rawStr.endsWith(']')) {
                try {
                  // Try to parse as JSON array
                  const parsed = JSON.parse(rawStr.replace(/'/g, '"'));
                  if (Array.isArray(parsed)) {
                    courseTokens = parsed.map(v => String(v).trim()).filter(Boolean);
                  } else if (parsed) {
                    courseTokens = [String(parsed).trim()];
                  }
                } catch (e) {
                  // Fallback: remove brackets and split by delimiter
                  rawStr = rawStr.slice(1, -1);
                  courseTokens = rawStr.split(/[;,]/).map(s => s.replace(/['"\s]/g, '')).filter(Boolean);
                }
              } else {
                // Handle simple comma/semicolon separated values
                courseTokens = rawStr.split(/[;,]/).map(s => s.trim()).filter(Boolean);
              }
            }

            let resolvedCourses = [];
            if (courseTokens.length > 0) {
              console.log(`[DEBUG] Row ${rowNum} - courseTokens before resolve:`, courseTokens);
              const { ids, notFound } = await resolveCourseIdentifiers(courseTokens);
              console.log(`[DEBUG] Row ${rowNum} - resolved course IDs:`, ids);
              console.log(`[DEBUG] Row ${rowNum} - not found courses:`, notFound);
              
              // The resolveCourseIdentifiers already returns ObjectId strings, just use them directly
              resolvedCourses = ids;
              if (notFound.length) {
                console.warn(`[bulkUploadStudents] Row ${rowNum} unresolved course identifiers: ${notFound.join(', ')}`);
              }
            }
            
            console.log(`[DEBUG] Row ${rowNum} - final resolvedCourses:`, resolvedCourses);

            const finalPassword = passwordRaw || genPassword();
            const hashedPassword = await bcrypt.hash(finalPassword, 10);

            const student = new User({
              regNo: regNoVal,
              name: nameRaw,
              email: emailRaw,
              password: hashedPassword,
              role: 'student',
              coursesAssigned: resolvedCourses
            });
            await student.save();
            successCount++;
            results.push({ row: rowNum, regNo: regNoVal, email: emailRaw, generatedPassword: passwordRaw ? null : finalPassword });
            await AuditLog.create({
              action: 'bulk_add_student',
              performedBy: req.user._id,
              targetUser: student._id,
              details: { regNo: regNoVal, name: nameRaw, email: emailRaw }
            });
          } catch (err) {
            rowErrors.push({ row: rowNum, message: err.message });
          }
        }

        try { fs.unlinkSync(req.file.path); } catch (_) {}

        const durationMs = Date.now() - startedAt;
        console.log(`[bulkUploadStudents] Completed: ${successCount} success, ${rowErrors.length} failed in ${durationMs}ms`);

        const status = rowErrors.length ? 207 : 200;
        return res.status(status).json({
          message: `Processed ${rows.length} rows: ${successCount} succeeded, ${rowErrors.length} failed`,
            total: rows.length,
          success: successCount,
          failed: rowErrors.length,
          results,
          errors: rowErrors
        });
      } catch (err) {
        console.error('[bulkUploadStudents] Fatal error:', err);
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('[bulkUploadStudents] CSV parsing error:', err);
      return res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};


// Batch/multi course assignment with condition and history
exports.assignCourses = async (req, res) => {
  try {
    const { studentIds, courseIds, condition } = req.body;
    if (!Array.isArray(studentIds) || !Array.isArray(courseIds)) return res.status(400).json({ message: 'Invalid input' });
    // Optionally filter students by condition (e.g., grade/year)
    let students = await User.find({ _id: { $in: studentIds }, role: 'student' });
    if (condition) {
      // Example: condition = 'grade:10' or 'year:2025'
      const [field, value] = condition.split(':');
      students = students.filter(s => String(s[field]) === value);
    }
    for (const student of students) {
      for (const courseId of courseIds) {
        if (!student.coursesAssigned.includes(courseId)) {
          student.coursesAssigned.push(courseId);
        }
      }
      await student.save();
      await AssignmentHistory.create({ student: student._id, courses: courseIds, assignedBy: req.user._id, condition });
      await AuditLog.create({ action: 'assign_courses', performedBy: req.user._id, targetUser: student._id, details: { courseIds, condition } });
    }
    res.json({ message: 'Courses assigned', count: students.length });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get assignment history for a student
exports.getAssignmentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const history = await AssignmentHistory.find({ student: studentId }).populate('courses', 'title').populate('assignedBy', 'email').sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Edit/remove student access
exports.editStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Allow single field alias 'courseAssigned'
    if (!updates.coursesAssigned && updates.courseAssigned) {
      updates.coursesAssigned = updates.courseAssigned;
      delete updates.courseAssigned;
    }

    if (updates.coursesAssigned) {
      // Normalize to array of strings
      let rawList = updates.coursesAssigned;
      if (typeof rawList === 'string') {
        let trimmed = rawList.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed.replace(/'/g, '"'));
            if (Array.isArray(parsed)) rawList = parsed; else rawList = [parsed];
          } catch (_) {
            // fallback split by comma / semicolon
            trimmed = trimmed.slice(1, -1); // remove brackets
            rawList = trimmed.split(/[;,]/).map(s => s.replace(/['"\s]/g, '')).filter(Boolean);
          }
        } else {
          rawList = trimmed.split(/[;,]/).map(s => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(rawList)) rawList = [String(rawList)];
      // Resolve each identifier (ObjectId or courseCode)
      const { ids, notFound } = await resolveCourseIdentifiers(rawList.map(String));
      if (rawList.length && ids.length === 0) {
        return res.status(400).json({ message: 'No provided course identifiers could be resolved', notFound });
      }
      if (notFound.length > 0) {
        console.warn(`[editStudent] Unresolved course identifiers for student ${id}:`, notFound);
      }
      updates.coursesAssigned = ids; // Replace with resolved ObjectIds
    }

    await User.findByIdAndUpdate(id, updates);
    await AuditLog.create({ action: 'edit_student', performedBy: req.user._id, targetUser: id, details: updates });
    res.json({ message: 'Student updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.removeStudent = async (req, res) => {
  try {
  await User.findByIdAndDelete(req.params.id);
  await AuditLog.create({ action: 'remove_student', performedBy: req.user._id, targetUser: req.params.id });
  res.json({ message: 'Student removed' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Course management
exports.createCourse = async (req, res) => {
  try {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected when trying to create course');
      return res.status(500).json({ message: 'Database connection error. Please try again later.' });
    }
    
    console.log('Creating course with data:', req.body);
    const { title, description, teacherIds, school, department } = req.body;
    
    // Validate required fields
    if (!school) {
      return res.status(400).json({ message: 'School is required for course creation' });
    }
    
    if (!department) {
      return res.status(400).json({ message: 'Department is required for course creation' });
    }
    
    // Verify school and department exist
    const School = require('../models/School');
    const Department = require('../models/Department');
    
    const schoolExists = await School.findById(school);
    if (!schoolExists) {
      return res.status(400).json({ message: 'Selected school not found' });
    }
    
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({ message: 'Selected department not found' });
    }
    
    // Verify department belongs to the selected school
    if (departmentExists.school.toString() !== school) {
      return res.status(400).json({ message: 'Selected department does not belong to the selected school' });
    }
    
    // Validate teacher IDs if provided
    let teacherObjectIds = [];
    if (teacherIds && Array.isArray(teacherIds)) {
      // Get User IDs from the teacherIds
      for (const teacherId of teacherIds) {
        const teacher = await User.findOne({ teacherId, role: 'teacher' });
        if (!teacher) {
          console.log(`Teacher ID ${teacherId} not found`);
          return res.status(400).json({ message: `Teacher ID ${teacherId} not found` });
        }
        teacherObjectIds.push(teacher._id);
      }
    } else if (teacherIds && typeof teacherIds === 'string') {
      // If a single teacherId is provided as string
      const teacher = await User.findOne({ teacherId: teacherIds, role: 'teacher' });
      if (!teacher) {
        console.log(`Teacher ID ${teacherIds} not found`);
        return res.status(400).json({ message: `Teacher ID ${teacherIds} not found` });
      }
      teacherObjectIds.push(teacher._id);
    }
    
    // Generate a unique course code (C + 6 digits)
    let courseCode;
    let isUnique = false;
    
    while (!isUnique) {
      // Find the highest existing course code
      const highestCourse = await Course.findOne(
        { courseCode: { $regex: /^C\d{6}$/ } },
        { courseCode: 1 },
        { sort: { courseCode: -1 } }
      );
      
      let nextNumber = 1;
      if (highestCourse && highestCourse.courseCode) {
        // Extract the number from existing course code and increment
        const currentNumber = parseInt(highestCourse.courseCode.substring(1), 10);
        nextNumber = currentNumber + 1;
      }
      
      // Format with leading zeros to ensure 6 digits
      courseCode = 'C' + nextNumber.toString().padStart(6, '0');
      
      // Check if this code is already in use
      const existingCourse = await Course.findOne({ courseCode });
      if (!existingCourse) {
        isUnique = true;
      }
    }
    
    console.log('Generated course code:', courseCode);
    
    const course = new Course({ 
      courseCode,
      title, 
      description, 
      school,
      department,
      teachers: teacherObjectIds 
    });
    
    console.log('Saving course:', course);
    const savedCourse = await course.save();
    console.log('Course saved successfully:', savedCourse);
    
    // Update each teacher's coursesAssigned array with the new course
    for (const teacherId of teacherObjectIds) {
      await User.findByIdAndUpdate(teacherId, {
        $addToSet: { coursesAssigned: course._id }
      });
    }
    
    // Create default discussion forum for the course
    const Discussion = require('../models/Discussion');
    const courseDiscussion = new Discussion({
      course: savedCourse._id,
      user: req.user._id,
      title: `${title} - Course Discussion Forum`,
      content: `Welcome to the discussion forum for ${title}. Use this space to ask questions, share insights, and discuss course-related topics.`,
      isPinned: true,
      isAnnouncement: true
    });
    
    await courseDiscussion.save();
    console.log('Created default discussion forum for course:', courseDiscussion);
    
    await AuditLog.create({ 
      action: 'create_course', 
      performedBy: req.user._id, 
      details: { 
        courseCode, 
        title, 
        description, 
        school: schoolExists.name,
        department: departmentExists.name,
        teacherIds, 
        forumCreated: true 
      } 
    });
    
    res.status(201).json(savedCourse);
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.editCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // If teacherIds is in the updates, process them
    if (updates.teacherIds) {
      let teacherObjectIds = [];
      // Handle array of teacher IDs
      if (Array.isArray(updates.teacherIds)) {
        for (const teacherId of updates.teacherIds) {
          const teacher = await User.findOne({ teacherId, role: 'teacher' });
          if (!teacher) {
            return res.status(400).json({ message: `Teacher ID ${teacherId} not found` });
          }
          teacherObjectIds.push(teacher._id);
          
          // Add the course to the teacher's coursesAssigned array
          await User.findByIdAndUpdate(teacher._id, {
            $addToSet: { coursesAssigned: id }
          });
        }
      } else if (typeof updates.teacherIds === 'string') {
        // Handle single teacher ID
        const teacher = await User.findOne({ teacherId: updates.teacherIds, role: 'teacher' });
        if (!teacher) {
          return res.status(400).json({ message: `Teacher ID ${updates.teacherIds} not found` });
        }
        teacherObjectIds.push(teacher._id);
        
        // Add the course to the teacher's coursesAssigned array
        await User.findByIdAndUpdate(teacher._id, {
          $addToSet: { coursesAssigned: id }
        });
      }
      
      // Replace teacherIds with teachers array of ObjectIds
      delete updates.teacherIds;
      updates.teachers = teacherObjectIds;
    }
    
    await Course.findByIdAndUpdate(id, updates);
    await AuditLog.create({ action: 'edit_course', performedBy: req.user._id, details: { id, updates } });
    res.json({ message: 'Course updated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Bulk upload courses via CSV with validation and error reporting
exports.bulkUploadCourses = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  console.log('Starting bulk course upload, file path:', req.file.path);
  
  const results = [];
  const errors = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim().toLowerCase() // Normalize headers
    }))
    .on('data', (data) => {
      // Normalize the data object to ensure keys are lowercase
      const normalizedData = {};
      Object.keys(data).forEach(key => {
        normalizedData[key.toLowerCase().trim()] = data[key];
      });
      results.push(normalizedData);
    })
    .on('end', async () => {
      try {
        // Validate all rows first
        console.log(`Processing ${results.length} rows from CSV for courses`);
        
        // Check for basic required fields in the CSV
        if (results.length > 0) {
          const firstRow = results[0];
          console.log('First row headers:', Object.keys(firstRow));
          
          const requiredFields = ['title', 'description', 'teacherid'];
          const missingHeaders = requiredFields.filter(field => 
            !Object.keys(firstRow).some(key => key.toLowerCase() === field)
          );
          
          if (missingHeaders.length > 0) {
            console.log('Missing headers in CSV:', missingHeaders);
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
              message: `CSV is missing required headers: ${missingHeaders.join(', ')}. Please use the template.` 
            });
          }
        }
        
        // Validate each row
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const rowNum = i + 2; // header is row 1
          
          if (!row.title || row.title.trim() === '') {
            errors.push({ row: rowNum, message: 'Missing field: title' });
          }
          
          // Validate teacher IDs if present
          if (row.teacherid) {
            const teacherIds = row.teacherid.split(',').map(id => id.trim()).filter(id => id);
            
            for (const teacherId of teacherIds) {
              if (!teacherId.match(/^T\d{4}$/)) {
                errors.push({ 
                  row: rowNum, 
                  message: `Invalid teacher ID format: ${teacherId}. Should be in format T#### (e.g., T0001)` 
                });
              } else {
                // Check if teacher ID exists in the database
                const teacher = await User.findOne({ teacherId, role: 'teacher' });
                if (!teacher) {
                  errors.push({ 
                    row: rowNum, 
                    message: `Teacher ID ${teacherId} does not exist in the system` 
                  });
                }
              }
            }
          }
          
          // Validate course code if provided
          if (row.coursecode) {
            const courseCode = row.coursecode.trim();
            if (!courseCode.match(/^C\d{6}$/)) {
              errors.push({
                row: rowNum,
                message: `Invalid course code format: ${courseCode}. Should be in format C###### (e.g., C000001)`
              });
            } else {
              // Check if this course code already exists
              const existingCourse = await Course.findOne({ courseCode });
              if (existingCourse) {
                errors.push({
                  row: rowNum,
                  message: `Course code ${courseCode} already exists in the system`
                });
              }
            }
          }
        }
        
        if (errors.length > 0) {
          console.log('Validation errors in CSV:', errors);
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: 'Validation failed', errors });
        }
        
        // Find the highest existing course code for auto-generation
        let nextCourseNumber = 1;
        const highestCourse = await Course.findOne(
          { courseCode: { $regex: /^C\d{6}$/ } },
          { courseCode: 1 },
          { sort: { courseCode: -1 } }
        );
        
        if (highestCourse && highestCourse.courseCode) {
          // Extract the number from existing course code and increment
          const currentNumber = parseInt(highestCourse.courseCode.substring(1), 10);
          nextCourseNumber = currentNumber + 1;
        }
        
        console.log('Next course number for auto-generation:', nextCourseNumber);
        
        // If valid, insert all courses
        const createdCourses = [];
        for (const row of results) {
          const title = row.title ? row.title.trim() : '';
          const description = row.description ? row.description.trim() : '';
          
          // Use provided course code or generate a new one
          let courseCode = row.coursecode ? row.coursecode.trim() : '';
          if (!courseCode) {
            // Format with leading zeros to ensure 6 digits
            courseCode = 'C' + nextCourseNumber.toString().padStart(6, '0');
            nextCourseNumber++; // Increment for next course
          }
          
          // Process teacher IDs
          const teacherIds = row.teacherid ? 
            row.teacherid.split(',').map(id => id.trim()).filter(id => id) : [];
          
          // Find the User IDs for the teacher IDs
          const teacherObjectIds = [];
          for (const teacherId of teacherIds) {
            const teacher = await User.findOne({ teacherId, role: 'teacher' });
            if (teacher) {
              teacherObjectIds.push(teacher._id);
            }
          }
          
          console.log(`Creating course: ${title}, code: ${courseCode}, teachers: ${teacherIds.join(',')}`);
          
          // Create course with teachers array
          const course = new Course({ 
            courseCode,
            title, 
            description, 
            teachers: teacherObjectIds
          });
          
          console.log('Saving course:', course);
          const savedCourse = await course.save();
          console.log('Course saved successfully:', savedCourse);
          
          // Update each teacher's coursesAssigned array with the new course
          for (const teacherId of teacherObjectIds) {
            await User.findByIdAndUpdate(teacherId, {
              $addToSet: { coursesAssigned: course._id }
            });
          }
          
          createdCourses.push(course);
          
          await AuditLog.create({ 
            action: 'bulk_add_course', 
            performedBy: req.user._id, 
            details: { courseCode, title, description, teacherIds } 
          });
        }
        
        fs.unlinkSync(req.file.path);
        console.log(`Successfully created ${createdCourses.length} courses`);
        res.status(201).json({ 
          message: `Successfully created ${createdCourses.length} courses`, 
          courses: createdCourses 
        });
      } catch (err) {
        console.error('Error in bulkUploadCourses:', err);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error processing CSV file', error: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
    });
};

exports.deleteCourse = async (req, res) => {
  try {
  await Course.findByIdAndDelete(req.params.id);
  await AuditLog.create({ action: 'delete_course', performedBy: req.user._id, details: { id: req.params.id } });
  res.json({ message: 'Course deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get course details
exports.getCourseDetails = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Find the course with populated teachers
    const course = await Course.findById(courseId)
      .populate('teachers', 'name email teacherId')
      .populate('videos')
      .populate('units');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Get units for the course
    const Unit = require('../models/Unit');
    const units = await Unit.find({ course: courseId })
      .sort('order')
      .populate('videos', 'title description videoUrl duration sequence')
      .populate('readingMaterials', 'title description contentType order')
      // include questions minimally so frontend can fallback length; avoid sending answers separately endpoint provides details
      .populate('quizzes', 'title description isActive questions')
      .populate('quizPool', 'title description');
    
    // Get quiz pools for the course
    const QuizPool = require('../models/QuizPool');
    const Quiz = require('../models/Quiz');
    
    // Populate quiz pools for each unit and count questions
    for (const unit of units) {
      // Get quiz pools for this unit
      const quizPools = await QuizPool.find({ 
        unit: unit._id,
        isActive: true 
      })
        .select('_id title description quizzes createdBy contributors')
        .populate('createdBy', 'name email')
        .populate('contributors', 'name email');
      
      // Add quiz pools to the unit
      unit.quizPools = [];
      
      // Process each quiz pool to count questions
      for (const pool of quizPools) {
        // Get all quizzes in this pool
        const quizzes = await Quiz.find({ _id: { $in: pool.quizzes } });
        
        // Count total questions across all quizzes
        let questionCount = 0;
        quizzes.forEach(quiz => {
          questionCount += quiz.questions ? quiz.questions.length : 0;
        });
        
        // Add the quiz pool with question count to the unit
        unit.quizPools.push({
          ...pool.toObject(),
          questionCount: questionCount,
          contributors: pool.contributors || [],
          createdBy: pool.createdBy || null
        });
      }
      
      // Also ensure question count for individual quizzes (avoid extra DB call if questions already populated)
      if (unit.quizzes && unit.quizzes.length > 0) {
        unit.quizzes = unit.quizzes.map(q => {
          const qObj = q.toObject ? q.toObject() : q;
          return {
            _id: qObj._id,
            title: qObj.title,
            description: qObj.description,
            isActive: qObj.isActive,
            questionCount: Array.isArray(qObj.questions) ? qObj.questions.length : 0
          };
        });
      }
    }
    // Convert units to plain objects so added quizPools & quiz questionCount reliably serialized
    const unitsResponse = units.map(u => ({
      _id: u._id,
      title: u.title,
      description: u.description,
      order: u.order,
      videos: (u.videos || []).map(v => ({
        _id: v._id,
        title: v.title,
        description: v.description,
        videoUrl: v.videoUrl && v.videoUrl.startsWith('http') ? v.videoUrl : `${req.protocol}://${req.get('host')}/${(v.videoUrl || '').replace(/\\/g, '/')}`,
        duration: v.duration || 0,
        sequence: v.sequence
      })),
      readingMaterials: (u.readingMaterials || []).map(r => ({
        _id: r._id,
        title: r.title,
        description: r.description,
        contentType: r.contentType,
        order: r.order
      })),
      quizzes: u.quizzes || [],
      quizPools: u.quizPools || []
    }));
    // Get students assigned to this course
    const students = await User.find({
      coursesAssigned: courseId,
      role: 'student'
    }).select('_id');
    
    // Calculate overall progress if we have watch history data
    let overallProgress = 0;
    if (course.videos && course.videos.length > 0) {
      const allStudents = await User.find({
        coursesAssigned: courseId,
        role: 'student'
      }).select('watchHistory');
      
      const videoIds = course.videos.map(video => video._id);
      let totalWatchedVideos = 0;
      let totalPossibleWatches = videoIds.length * allStudents.length;
      
      if (totalPossibleWatches > 0) {
        for (const student of allStudents) {
          for (const videoId of videoIds) {
            const watched = student.watchHistory.some(item => 
              item.video && item.video.toString() === videoId.toString() && item.timeSpent > 0
            );
            
            if (watched) {
              totalWatchedVideos++;
            }
          }
        }
        
        overallProgress = Math.round((totalWatchedVideos / totalPossibleWatches) * 100);
      }
    }
    
    // Construct the response
    const response = {
      _id: course._id,
      courseCode: course.courseCode,
      title: course.title,
      description: course.description,
      teachers: course.teachers,
      overallProgress,
      studentsCount: students.length,
      videosCount: course.videos.length,
  units: unitsResponse || [],
  hasUnits: unitsResponse && unitsResponse.length > 0,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    };
    
    res.json(response);
  } catch (err) {
    console.error('Error getting course details:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get course videos
// Debug endpoint to check video data
exports.debugVideos = async (req, res) => {
  try {
    const Video = require('../models/Video');
    const videos = await Video.find().limit(5).select('title videoUrl duration createdAt');
    console.log('Sample videos from database:', videos);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCourseVideos = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Find all videos for this course
    const videos = await Video.find({ course: courseId })
      .populate('teacher', 'name email teacherId');
    
    if (!videos || videos.length === 0) {
      return res.json([]);
    }
    
    // Get all students for this course to calculate completion rates
    const students = await User.find({
      coursesAssigned: courseId,
      role: 'student'
    }).select('watchHistory');
    
    // Calculate analytics for each video
    const videoData = videos.map(video => {
      let views = 0;
      let totalWatchTime = 0;
      let completedViews = 0;
      
      for (const student of students) {
        const watchRecord = student.watchHistory.find(item => 
          item.video && item.video.toString() === video._id.toString()
        );
        
        if (watchRecord && watchRecord.timeSpent > 0) {
          views++;
          totalWatchTime += watchRecord.timeSpent;
          
          // Count as completed if watched more than 90% of the video
          if (video.duration && watchRecord.timeSpent >= video.duration * 0.9) {
            completedViews++;
          }
        }
      }
      
      const completionRate = students.length > 0 
        ? Math.round((completedViews / students.length) * 100) 
        : 0;
      
      return {
        _id: video._id,
        title: video.title,
        description: video.description,
        url: video.videoUrl.startsWith('http') ? video.videoUrl : `${req.protocol}://${req.get('host')}/${video.videoUrl.replace(/\\/g, '/')}`,
        thumbnail: video.thumbnail || null,
        duration: video.duration || 0,
        teacherName: video.teacher ? video.teacher.name : 'Unknown',
        uploadDate: video.createdAt,
        views,
        completionRate,
        warned: video.warned || false
      };
    });
    
    res.json(videoData);
  } catch (err) {
    console.error('Error getting course videos:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get students assigned to a course
exports.getCourseStudents = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Find all students assigned to this course
    const students = await User.find({
      coursesAssigned: courseId,
      role: 'student'
    }).select('_id name email regNo isActive');
    
    if (!students || students.length === 0) {
      return res.json([]);
    }
    
    // Get course videos
    const course = await Course.findById(courseId).populate('videos');
    const videoIds = course.videos.map(video => video._id);
    
    // Calculate progress for each student
    const studentData = await Promise.all(students.map(async (student) => {
      // Get watch history for this student
      const studentWithHistory = await User.findById(student._id).select('watchHistory');
      
      let videosWatched = 0;
      let totalWatchTime = 0;
      
      // Count videos watched by this student
      for (const videoId of videoIds) {
        const watchRecord = studentWithHistory.watchHistory.find(item => 
          item.video && item.video.toString() === videoId.toString() && item.timeSpent > 0
        );
        
        if (watchRecord) {
          videosWatched++;
          totalWatchTime += watchRecord.timeSpent;
        }
      }
      
      // Calculate progress percentage
      const progress = videoIds.length > 0 
        ? Math.round((videosWatched / videoIds.length) * 100) 
        : 0;
      
      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        regNo: student.regNo,
        isActive: student.isActive,
        progress,
        videosWatched,
        totalVideos: videoIds.length,
        totalWatchTime
      };
    }));
    
    res.json(studentData);
  } catch (err) {
    console.error('Error getting course students:', err);
    res.status(500).json({ message: err.message });
  }
};

// Dean Management Functions
exports.createDean = async (req, res) => {
  try {
    const { name, email, password, schoolId } = req.body;
    
    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(400).json({ message: 'School not found' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create dean user
    const dean = new User({
      name,
      email,
      password: hashedPassword,
      role: 'dean',
      school: schoolId,
      isActive: true,
      emailVerified: true
    });
    
    await dean.save();
    
    // Update school to reference this dean
    await School.findByIdAndUpdate(schoolId, { dean: dean._id });
    
    res.status(201).json({ 
      message: 'Dean created successfully', 
      dean: {
        _id: dean._id,
        name: dean.name,
        email: dean.email,
        school: school.name
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllDeans = async (req, res) => {
  try {
    const deans = await User.find({ role: 'dean' })
      .populate('school', 'name')
      .select('name email school isActive createdAt');
    
    res.json(deans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateDean = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, schoolId, isActive } = req.body;
    
    // Find current dean
    const dean = await User.findById(id);
    if (!dean || dean.role !== 'dean') {
      return res.status(404).json({ message: 'Dean not found' });
    }
    
    // If school is changing, update old and new schools
    if (schoolId && schoolId !== dean.school?.toString()) {
      // Remove dean from old school
      if (dean.school) {
        await School.findByIdAndUpdate(dean.school, { $unset: { dean: 1 } });
      }
      
      // Verify new school exists
      const newSchool = await School.findById(schoolId);
      if (!newSchool) {
        return res.status(400).json({ message: 'New school not found' });
      }
      
      // Add dean to new school
      await School.findByIdAndUpdate(schoolId, { dean: id });
    }
    
    // Update dean
    const updatedDean = await User.findByIdAndUpdate(
      id,
      { name, email, school: schoolId, isActive },
      { new: true }
    ).populate('school', 'name');
    
    res.json({ 
      message: 'Dean updated successfully', 
      dean: updatedDean 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteDean = async (req, res) => {
  try {
    const { id } = req.params;
    
    const dean = await User.findById(id);
    if (!dean || dean.role !== 'dean') {
      return res.status(404).json({ message: 'Dean not found' });
    }
    
    // Remove dean reference from school
    if (dean.school) {
      await School.findByIdAndUpdate(dean.school, { $unset: { dean: 1 } });
    }
    
    // Delete dean
    await User.findByIdAndDelete(id);
    
    res.json({ message: 'Dean deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// HOD Management Functions
exports.createHOD = async (req, res) => {
  try {
    const { name, email, password, schoolId, departmentId } = req.body;
    
    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Verify department exists and belongs to the school
    const department = await Department.findById(departmentId).populate('school');
    if (!department) {
      return res.status(400).json({ message: 'Department not found' });
    }
    
    if (department.school._id.toString() !== schoolId) {
      return res.status(400).json({ message: 'Department does not belong to the selected school' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create HOD user
    const hod = new User({
      name,
      email,
      password: hashedPassword,
      role: 'hod',
      school: schoolId,
      department: departmentId,
      isActive: true,
      emailVerified: true
    });
    
    await hod.save();
    
    // Update department to reference this HOD
    await Department.findByIdAndUpdate(departmentId, { hod: hod._id });
    
    res.status(201).json({ 
      message: 'HOD created successfully', 
      hod: {
        _id: hod._id,
        name: hod.name,
        email: hod.email,
        school: department.school.name,
        department: department.name
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllHODs = async (req, res) => {
  try {
    const hods = await User.find({ role: 'hod' })
      .populate('school', 'name')
      .populate('department', 'name')
      .select('name email school department isActive createdAt');
    
    res.json(hods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, schoolId, departmentId, isActive } = req.body;
    
    // Find current HOD
    const hod = await User.findById(id);
    if (!hod || hod.role !== 'hod') {
      return res.status(404).json({ message: 'HOD not found' });
    }
    
    // If department is changing, update old and new departments
    if (departmentId && departmentId !== hod.department?.toString()) {
      // Remove HOD from old department
      if (hod.department) {
        await Department.findByIdAndUpdate(hod.department, { $unset: { hod: 1 } });
      }
      
      // Verify new department exists and belongs to the school
      const newDepartment = await Department.findById(departmentId);
      if (!newDepartment) {
        return res.status(400).json({ message: 'New department not found' });
      }
      
      if (newDepartment.school.toString() !== schoolId) {
        return res.status(400).json({ message: 'Department does not belong to the selected school' });
      }
      
      // Add HOD to new department
      await Department.findByIdAndUpdate(departmentId, { hod: id });
    }
    
    // Update HOD
    const updatedHOD = await User.findByIdAndUpdate(
      id,
      { name, email, school: schoolId, department: departmentId, isActive },
      { new: true }
    ).populate('school', 'name').populate('department', 'name');
    
    res.json({ 
      message: 'HOD updated successfully', 
      hod: updatedHOD 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteHOD = async (req, res) => {
  try {
    const { id } = req.params;
    
    const hod = await User.findById(id);
    if (!hod || hod.role !== 'hod') {
      return res.status(404).json({ message: 'HOD not found' });
    }
    
    // Remove HOD reference from department
    if (hod.department) {
      await Department.findByIdAndUpdate(hod.department, { $unset: { hod: 1 } });
    }
    
    // Delete HOD
    await User.findByIdAndDelete(id);
    
    res.json({ message: 'HOD deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
