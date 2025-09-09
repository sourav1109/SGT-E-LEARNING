const dotenv = require('dotenv');
dotenv.config();

// Function to generate test instructions for announcement APIs
function generateAnnouncementTestInstructions() {
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

// Run the function when the script is executed directly
generateAnnouncementTestInstructions();
