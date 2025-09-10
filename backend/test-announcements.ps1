Write-Host "Testing Announcement API Endpoints" -ForegroundColor Green

# Step 1: Login as admin
Write-Host "`nStep 1: Login as admin" -ForegroundColor Cyan
$adminLoginBody = @{
    email = "sourav11092002@gmail.com"
    password = "Admin@1234"
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/login" -Method Post -ContentType "application/json" -Body $adminLoginBody
    $adminToken = $adminResponse.token
    Write-Host "Admin login successful. Token obtained." -ForegroundColor Green
    Write-Host "Admin Token: $adminToken"
} catch {
    Write-Host "Admin login failed: $_" -ForegroundColor Red
    exit
}

# Step 2: Create an admin announcement
Write-Host "`nStep 2: Create an admin announcement" -ForegroundColor Cyan
$announcementBody = @{
    message = "Important announcement from admin for testing"
    recipients = @("teacher", "student")
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    $createAnnouncementResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/announcement" -Method Post -Headers $headers -Body $announcementBody
    Write-Host "Admin announcement created successfully:" -ForegroundColor Green
    $createAnnouncementResponse | ConvertTo-Json
} catch {
    Write-Host "Failed to create admin announcement: $_" -ForegroundColor Red
}

# Step 3: Get all announcements as admin
Write-Host "`nStep 3: Get all announcements as admin" -ForegroundColor Cyan
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $adminAnnouncements = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/announcement" -Method Get -Headers $headers
    Write-Host "Admin announcements retrieved successfully:" -ForegroundColor Green
    $adminAnnouncements | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to get admin announcements: $_" -ForegroundColor Red
}

# Step 4: Create a teacher with announcement permission (if needed)
Write-Host "`nStep 4: Create a test teacher with announcement permission" -ForegroundColor Cyan
$teacherBody = @{
    name = "Test Teacher"
    email = "test.teacher@example.com"
    password = "Password123"
    canAnnounce = $true
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    $createTeacherResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/teacher" -Method Post -Headers $headers -Body $teacherBody
    Write-Host "Teacher created successfully:" -ForegroundColor Green
    $createTeacherResponse | ConvertTo-Json
} catch {
    Write-Host "Note: Teacher creation failed (may already exist): $_" -ForegroundColor Yellow
}

# Step 5: Login as teacher
Write-Host "`nStep 5: Login as teacher" -ForegroundColor Cyan
$teacherLoginBody = @{
    email = "test.teacher@example.com"
    password = "Password123"
} | ConvertTo-Json

try {
    $teacherResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/teacher/login" -Method Post -ContentType "application/json" -Body $teacherLoginBody
    $teacherToken = $teacherResponse.token
    Write-Host "Teacher login successful. Token obtained." -ForegroundColor Green
    Write-Host "Teacher Token: $teacherToken"
} catch {
    Write-Host "Teacher login failed: $_" -ForegroundColor Red
    Write-Host "Skipping teacher-specific tests."
    exit
}

# Step 6: Get teacher's courses
Write-Host "`nStep 6: Get teacher's courses" -ForegroundColor Cyan
try {
    $headers = @{
        "Authorization" = "Bearer $teacherToken"
    }
    $teacherCourses = Invoke-RestMethod -Uri "http://localhost:5000/api/teacher/courses" -Method Get -Headers $headers
    Write-Host "Teacher courses retrieved successfully:" -ForegroundColor Green
    $teacherCourses | ConvertTo-Json -Depth 3
    
    if ($teacherCourses.Count -gt 0) {
        $courseId = $teacherCourses[0]._id
        Write-Host "Selected Course ID: $courseId" -ForegroundColor Green
        
        # Step 7: Create a course announcement as teacher
        Write-Host "`nStep 7: Create a course announcement as teacher" -ForegroundColor Cyan
        $courseAnnouncementBody = @{
            message = "Important course announcement for students"
        } | ConvertTo-Json
        
        try {
            $headers = @{
                "Authorization" = "Bearer $teacherToken"
                "Content-Type" = "application/json"
            }
            $createCourseAnnouncementResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/teacher/course/$courseId/announcement" -Method Post -Headers $headers -Body $courseAnnouncementBody
            Write-Host "Course announcement created successfully:" -ForegroundColor Green
            $createCourseAnnouncementResponse | ConvertTo-Json
        } catch {
            Write-Host "Failed to create course announcement: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "No courses found for this teacher. Cannot test course announcements." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to get teacher courses: $_" -ForegroundColor Red
}

# Step 8: Get announcements as teacher
Write-Host "`nStep 8: Get announcements as teacher" -ForegroundColor Cyan
try {
    $headers = @{
        "Authorization" = "Bearer $teacherToken"
    }
    $teacherAnnouncements = Invoke-RestMethod -Uri "http://localhost:5000/api/teacher/announcement" -Method Get -Headers $headers
    Write-Host "Teacher announcements retrieved successfully:" -ForegroundColor Green
    $teacherAnnouncements | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed to get teacher announcements: $_" -ForegroundColor Red
}

Write-Host "`nAnnouncement API testing completed!" -ForegroundColor Green
