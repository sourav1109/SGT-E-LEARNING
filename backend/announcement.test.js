const mongoose = require('mongoose');
const User = require('./models/User');
const Announcement = require('./models/Announcement');
const Course = require('./models/Course');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Let's try a direct manual testing approach using PowerShell
// Instead of trying to run a supertest server in parallel with the existing one

// We'll export a function to run the tests with PowerShell
async function runAnnouncementTests() {
  try {
    // Step 1: Login as admin
    console.log('Step 1: Login as admin with email:', process.env.ADMIN_EMAIL);
    const adminLoginBody = {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    };
    console.log('Admin login body:', adminLoginBody);
    
    // Step 2: Create an admin announcement
    console.log('\nStep 2: To create an admin announcement, run:');
    console.log(`
    # First, get the admin token from login response
    $adminLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/login" -Method Post -ContentType "application/json" -Body '{"email":"sourav11092002@gmail.com","password":"Admin@1234"}'
    $adminToken = $adminLogin.token
    Write-Host "Admin Token: $adminToken"
    
    # Create announcement for both teachers and students
    Invoke-RestMethod -Uri "http://localhost:5000/api/admin/announcement" -Method Post -Headers @{"Authorization"="Bearer $adminToken"; "Content-Type"="application/json"} -Body '{"message":"Important announcement from admin for testing","recipients":["teacher","student"]}'
    `);
    
    // Step 3: Get announcements as admin
    console.log('\nStep 3: To view all announcements as admin, run:');
    console.log(`
    Invoke-RestMethod -Uri "http://localhost:5000/api/admin/announcement" -Method Get -Headers @{"Authorization"="Bearer $adminToken"}
    `);
    
    // Step 4: Create a teacher if you don't have one
    console.log('\nStep 4: To create a teacher with announcement permission, run:');
    console.log(`
    Invoke-RestMethod -Uri "http://localhost:5000/api/admin/teacher" -Method Post -Headers @{"Authorization"="Bearer $adminToken"; "Content-Type"="application/json"} -Body '{"name":"Test Teacher","email":"test.teacher@example.com","password":"Password123","canAnnounce":true}'
    `);
    
    // Step 5: Login as teacher
    console.log('\nStep 5: To login as teacher, run:');
    console.log(`
    $teacherLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/teacher/login" -Method Post -ContentType "application/json" -Body '{"email":"test.teacher@example.com","password":"Password123"}'
    $teacherToken = $teacherLogin.token
    `);
    
    // Step 6: Get teacher's courses
    console.log('\nStep 6: To get teacher\'s courses, run:');
    console.log(`
    $courses = Invoke-RestMethod -Uri "http://localhost:5000/api/teacher/courses" -Method Get -Headers @{"Authorization"="Bearer $teacherToken"}
    $courseId = $courses[0]._id
    `);
    
    // Step 7: Create a course announcement as teacher
    console.log('\nStep 7: To create a course announcement as teacher, run:');
    console.log(`
    Invoke-RestMethod -Uri "http://localhost:5000/api/teacher/course/$courseId/announcement" -Method Post -Headers @{"Authorization"="Bearer $teacherToken"; "Content-Type"="application/json"} -Body '{"message":"Important course announcement for students"}'
    `);
    
    // Step 8: Get announcements as teacher
    console.log('\nStep 8: To view all announcements as teacher, run:');
    console.log(`
    Invoke-RestMethod -Uri "http://localhost:5000/api/teacher/announcement" -Method Get -Headers @{"Authorization"="Bearer $teacherToken"}
    `);
    
    // Step 9: Get announcements as student
    console.log('\nStep 9: To login as student and view announcements, run:');
    console.log(`
    # First login as student
    $studentLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/student/login" -Method Post -ContentType "application/json" -Body '{"email":"STUDENT_EMAIL","password":"STUDENT_PASSWORD"}'
    $studentToken = $studentLogin.token
    
    # Then get announcements
    Invoke-RestMethod -Uri "http://localhost:5000/api/student/announcement" -Method Get -Headers @{"Authorization"="Bearer $studentToken"}
    `);
    
    console.log('\nInstructions to test announcement functionality have been generated.');
    
  } catch (error) {
    console.error('Error generating test instructions:', error);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  runAnnouncementTests();
}

module.exports = { runAnnouncementTests };

describe('Announcement Endpoints', () => {
  it('Super admin can create announcement for teachers and students', async () => {
    // Mock req/res
    const req = {
      user: { _id: adminId, role: 'admin' },
      body: { message: 'Test announcement', recipients: ['teacher', 'student'] }
    };
    const res = mockResponse();
    
    await adminController.createAnnouncement(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    
    // Verify announcement was created in DB
    const announcement = await Announcement.findOne({ message: 'Test announcement' });
    expect(announcement).toBeTruthy();
  });

  it('Admin can toggle teacher announcement permission', async () => {
    // Mock req/res
    const req = {
      user: { _id: adminId, role: 'admin' },
      params: { teacherId },
      body: { canAnnounce: true }
    };
    const res = mockResponse();
    
    await adminController.toggleTeacherAnnouncePermission(req, res);
    
    // Verify teacher permission was updated
    const teacher = await User.findById(teacherId);
    expect(teacher.canAnnounce).toBe(true);
  });

  it('Teacher with permission can create course announcement', async () => {
    // Mock req/res
    const req = {
      user: { _id: teacherId, role: 'teacher', canAnnounce: true },
      params: { courseId },
      body: { message: 'Course announcement' }
    };
    const res = mockResponse();
    
    await teacherController.createCourseAnnouncement(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    
    // Verify announcement was created
    const announcement = await Announcement.findOne({ message: 'Course announcement' });
    expect(announcement).toBeTruthy();
  });

  it('Teacher without permission cannot create course announcement', async () => {
    // Set permission to false
    await User.findByIdAndUpdate(teacherId, { canAnnounce: false });
    
    // Mock req/res
    const req = {
      user: { _id: teacherId, role: 'teacher', canAnnounce: false },
      params: { courseId },
      body: { message: 'Should fail' }
    };
    const res = mockResponse();
    
    await teacherController.createCourseAnnouncement(req, res);
    
    expect(res.status).toHaveBeenCalledWith(403);
    
    // Verify no announcement was created
    const announcement = await Announcement.findOne({ message: 'Should fail' });
    expect(announcement).toBeFalsy();
  });
});

afterAll(async () => {
  // Clean up test data
  await User.deleteMany({ email: { $in: ['admin.test@example.com', 'teacher.test@example.com'] }});
  await Course.deleteMany({ name: 'Test Course' });
  await Announcement.deleteMany({ message: /Test/ });
  
  // Keep connection open if tests are continuing, close otherwise
  if (process.env.NODE_ENV === 'test') {
    // mongoose connection will be handled by Jest
  } else {
    await mongoose.connection.close();
  }
});
