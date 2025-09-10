// Bulk messaging: email or notification to students/teachers
const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');

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
    const students = await User.find({ role: 'student' });
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
const User = require('../models/User');
const Course = require('../models/Course');
const Video = require('../models/Video');
const bcrypt = require('bcryptjs');

// Add a teacher manually
exports.addTeacher = async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    
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
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = new User({ 
      name, 
      email: normalizedEmail, 
      password: hashedPassword, 
      role: 'teacher', 
      permissions,
      teacherId: null // Will be auto-generated in the pre-save hook
    });
    
    await teacher.save();
    await AuditLog.create({ 
      action: 'add_teacher', 
      performedBy: req.user._id, 
      targetUser: teacher._id, 
      details: { name, email: normalizedEmail } 
    });
    
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
    const { name, email, password, regNo, coursesAssigned } = req.body;
    
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
      console.log('Generated registration number:', studentRegNo);
    } else if (!studentRegNo.startsWith('S') || !/^S\d{6}$/.test(studentRegNo)) {
      console.log('Invalid registration number format:', studentRegNo);
      return res.status(400).json({ 
        message: 'Registration number format is invalid. It should start with S followed by 6 digits.' 
      });
    }
    
    // Create the student
    const student = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'student',
      regNo: studentRegNo,
      coursesAssigned: coursesAssigned || []
    });
    
    console.log('Saving student:', student);
    const savedStudent = await student.save();
    console.log('Student saved successfully:', savedStudent);
    
    // Log the action
    await AuditLog.create({
      action: 'add_student',
      performedBy: req.user._id,
      targetUser: student._id,
      details: { name, email: normalizedEmail, regNo: studentRegNo }
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
        console.log(`Processing ${results.length} rows from CSV for students`);
        
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
          
          // Validate regNo format if provided
          if (row.regno && row.regno.trim() !== '') {
            const regNo = row.regno.trim();
            if (!regNo.startsWith('S') || !/^S\d{6}$/.test(regNo)) {
              errors.push({ 
                row: rowNum, 
                message: 'Invalid registration number format. Should be S followed by 6 digits.' 
              });
            }
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
        
        // Find the highest existing regNo for auto-generation
        let nextRegNumber = 1;
        const highestStudent = await User.findOne(
          { regNo: { $regex: /^S\d{6}$/ } },
          { regNo: 1 },
          { sort: { regNo: -1 } }
        );
        
        if (highestStudent && highestStudent.regNo) {
          // Extract the number from existing regNo and increment
          const currentNumber = parseInt(highestStudent.regNo.substring(1), 10);
          nextRegNumber = currentNumber + 1;
        }
        
        // If valid, insert all
        for (const row of results) {
          // Check if regNo is provided, otherwise generate one
          let studentRegNo = (row.regno || '').trim();
          if (!studentRegNo) {
            // Format with leading zeros to ensure 6 digits
            studentRegNo = 'S' + nextRegNumber.toString().padStart(6, '0');
            nextRegNumber++; // Increment for next student
          }
          
          const name = row.name ? row.name.trim() : '';
          const email = row.email ? row.email.trim().toLowerCase() : '';
          const password = row.password ? row.password.trim() : '';
          const courseAssigned = row.courseassigned || row.courseAssigned || row['course assigned'] || '';
          
          const hashedPassword = await bcrypt.hash(password, 10);
          const student = new User({ 
            regNo: studentRegNo, 
            name, 
            email, 
            password: hashedPassword, 
            role: 'student', 
            coursesAssigned: courseAssigned ? [courseAssigned] : [] 
          });
          
          await student.save();
          await AuditLog.create({ 
            action: 'bulk_add_student', 
            performedBy: req.user._id, 
            targetUser: student._id, 
            details: { regNo: studentRegNo, name, email } 
          });
        }
        
        fs.unlinkSync(req.file.path);
        res.json({ 
          message: `${results.length} students uploaded successfully` 
        });
      } catch (err) {
        console.error('Error in bulkUploadStudents:', err);
        res.status(500).json({ message: err.message });
      }
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(400).json({ message: `CSV parsing error: ${err.message}` });
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
    const updates = req.body;
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
    const { title, description, teacherIds } = req.body;
    
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
      details: { courseCode, title, description, teacherIds, forumCreated: true } 
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
