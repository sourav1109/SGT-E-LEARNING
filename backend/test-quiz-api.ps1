# PowerShell script to test Unit Quiz API endpoints
# Update these variables with actual values from your database

$baseUrl = "http://localhost:5000/api/student"
$unitId = "68bffe017818abcf8b12a584"  # Replace with actual unit ID
$studentEmail = "student@example.com"   # Replace with actual student email  
$studentPassword = "password123"        # Replace with actual student password

Write-Host "🧪 Testing Unit Quiz API Endpoints" -ForegroundColor Green
Write-Host "=====================================`n" -ForegroundColor Green

# Step 1: Login to get student token
Write-Host "1️⃣ Logging in as student..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $studentEmail
        password = $studentPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $studentToken = $loginResponse.token
    
    if ($studentToken) {
        Write-Host "✅ Login successful! Token obtained." -ForegroundColor Green
    } else {
        Write-Host "❌ Login failed: No token received" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the student credentials in the script" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check quiz availability
Write-Host "`n2️⃣ Checking quiz availability..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $studentToken"
    }
    
    $availabilityResponse = Invoke-RestMethod -Uri "$baseUrl/unit/$unitId/quiz/availability" -Method Get -Headers $headers
    Write-Host "✅ Quiz availability check successful:" -ForegroundColor Green
    Write-Host ($availabilityResponse | ConvertTo-Json -Depth 3) -ForegroundColor Cyan
    
    if (-not $availabilityResponse.available) {
        Write-Host "❌ Quiz is not available. Reason: $($availabilityResponse.message)" -ForegroundColor Red
        Write-Host "Please ensure all videos in the unit are watched before taking the quiz." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Quiz availability check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the unit ID in the script" -ForegroundColor Yellow
    exit 1
}

# Step 3: Generate quiz
Write-Host "`n3️⃣ Generating quiz..." -ForegroundColor Yellow
try {
    $generateResponse = Invoke-RestMethod -Uri "$baseUrl/unit/$unitId/quiz/generate" -Method Post -Headers $headers -Body "{}" -ContentType "application/json"
    Write-Host "✅ Quiz generation successful:" -ForegroundColor Green
    Write-Host ($generateResponse | ConvertTo-Json -Depth 3) -ForegroundColor Cyan
    
    $attemptId = $generateResponse.attemptId
    if (-not $attemptId) {
        Write-Host "❌ No attempt ID received from quiz generation" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Quiz generation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error details: $errorContent" -ForegroundColor Red
    }
    exit 1
}

# Step 4: Get quiz attempt details
Write-Host "`n4️⃣ Getting quiz attempt details..." -ForegroundColor Yellow
try {
    $attemptResponse = Invoke-RestMethod -Uri "$baseUrl/quiz/attempt/$attemptId" -Method Get -Headers $headers
    Write-Host "✅ Quiz attempt retrieval successful:" -ForegroundColor Green
    Write-Host "Quiz Title: $($attemptResponse.unitTitle)" -ForegroundColor Cyan
    Write-Host "Course: $($attemptResponse.courseTitle)" -ForegroundColor Cyan
    Write-Host "Time Limit: $($attemptResponse.timeLimit) minutes" -ForegroundColor Cyan
    Write-Host "Questions: $($attemptResponse.questions.Count)" -ForegroundColor Cyan
    
    # Show first question as example
    if ($attemptResponse.questions.Count -gt 0) {
        $firstQuestion = $attemptResponse.questions[0]
        Write-Host "`nFirst Question Example:" -ForegroundColor Magenta
        Write-Host "Q: $($firstQuestion.questionText)" -ForegroundColor White
        for ($i = 0; $i -lt $firstQuestion.options.Count; $i++) {
            Write-Host "  $($i): $($firstQuestion.options[$i])" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Quiz attempt retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 All API tests passed! Quiz endpoints are working correctly." -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. The quiz attempt ID is: $attemptId" -ForegroundColor White
Write-Host "2. You can now test the frontend quiz page with this attempt ID" -ForegroundColor White
Write-Host "3. URL to test: http://localhost:3000/student/course/YOUR_COURSE_ID/quiz/$attemptId" -ForegroundColor White
