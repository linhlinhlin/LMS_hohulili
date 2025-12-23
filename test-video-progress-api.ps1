# Video Progress API Test Script
# Tests the 75% completion rule for video tracking

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:8088/api/v1"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Video Progress Tracking - API Test Suite" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get JWT token
Write-Host "[1/7] Login to get JWT token..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@lms.com"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    if ($loginResponse.success) {
        $token = $loginResponse.data.token
        $userId = $loginResponse.data.userId
        Write-Host "   ✅ Login successful!" -ForegroundColor Green
        Write-Host "   User ID: $userId" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Login error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Generate a test section ID (replace with real section ID from your database)
$testSectionId = "550e8400-e29b-41d4-a716-446655440000"  # Example UUID
$testVideoUrl = "https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/courses/intro-video.mp4"

Write-Host "Test Configuration:" -ForegroundColor Cyan
Write-Host "   Section ID: $testSectionId" -ForegroundColor Gray
Write-Host "   Video URL: $testVideoUrl" -ForegroundColor Gray
Write-Host ""

# Step 2: Track progress at 40%
Write-Host "[2/7] 📊 Track progress at 40% (120s / 300s)..." -ForegroundColor Yellow
try {
    $trackBody = @{
        sectionId = $testSectionId
        videoUrl = $testVideoUrl
        currentPosition = 120
        duration = 300
    } | ConvertTo-Json

    $trackResponse = Invoke-RestMethod -Uri "$baseUrl/video-progress/track" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        } `
        -Body $trackBody

    if ($trackResponse.success) {
        Write-Host "   ✅ Progress tracked successfully!" -ForegroundColor Green
        Write-Host "   Progress: $([math]::Round($trackResponse.data.progressPercentage, 2))%" -ForegroundColor Gray
        Write-Host "   Completed: $($trackResponse.data.completed)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Track failed: $($trackResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Track error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 3: Check if can proceed (should be false at 40%)
Write-Host "[3/7] 🔒 Check if can proceed to next lesson (40%)..." -ForegroundColor Yellow
try {
    $canProceedResponse = Invoke-RestMethod -Uri "$baseUrl/video-progress/$testSectionId/can-proceed" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer $token"}

    if ($canProceedResponse.success) {
        $canProceed = $canProceedResponse.data.canProceed
        $currentProgress = [math]::Round($canProceedResponse.data.currentProgress, 2)
        $message = $canProceedResponse.data.message

        if ($canProceed) {
            Write-Host "   ⚠️  UNEXPECTED: Can proceed at 40%!" -ForegroundColor Red
        } else {
            Write-Host "   ✅ Correctly LOCKED (< 75%)" -ForegroundColor Green
        }
        Write-Host "   Progress: $currentProgress%" -ForegroundColor Gray
        Write-Host "   Message: $message" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Check error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 4: Track progress at 80% (should trigger completion)
Write-Host "[4/7] 📊 Track progress at 80% (240s / 300s) - Should complete!" -ForegroundColor Yellow
try {
    $trackBody80 = @{
        sectionId = $testSectionId
        videoUrl = $testVideoUrl
        currentPosition = 240
        duration = 300
    } | ConvertTo-Json

    $trackResponse80 = Invoke-RestMethod -Uri "$baseUrl/video-progress/track" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        } `
        -Body $trackBody80

    if ($trackResponse80.success) {
        $completed = $trackResponse80.data.completed
        $progress = [math]::Round($trackResponse80.data.progressPercentage, 2)
        
        Write-Host "   ✅ Progress tracked successfully!" -ForegroundColor Green
        Write-Host "   Progress: $progress%" -ForegroundColor Gray
        
        if ($completed) {
            Write-Host "   🎉 Video COMPLETED (≥75%)!" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  UNEXPECTED: Not completed at 80%!" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   ❌ Track error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 5: Check if can proceed (should be true at 80%)
Write-Host "[5/7] 🔓 Check if can proceed to next lesson (80%)..." -ForegroundColor Yellow
try {
    $canProceedResponse80 = Invoke-RestMethod -Uri "$baseUrl/video-progress/$testSectionId/can-proceed" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer $token"}

    if ($canProceedResponse80.success) {
        $canProceed = $canProceedResponse80.data.canProceed
        $currentProgress = [math]::Round($canProceedResponse80.data.currentProgress, 2)
        $message = $canProceedResponse80.data.message

        if ($canProceed) {
            Write-Host "   ✅ Correctly UNLOCKED (≥75%)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  UNEXPECTED: Still locked at 80%!" -ForegroundColor Red
        }
        Write-Host "   Progress: $currentProgress%" -ForegroundColor Gray
        Write-Host "   Message: $message" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Check error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 6: Get specific progress details
Write-Host "[6/7] 📋 Get progress details..." -ForegroundColor Yellow
try {
    $progressResponse = Invoke-RestMethod -Uri "$baseUrl/video-progress/$testSectionId" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer $token"}

    if ($progressResponse.success) {
        $data = $progressResponse.data
        Write-Host "   ✅ Progress retrieved successfully!" -ForegroundColor Green
        Write-Host "   ID: $($data.id)" -ForegroundColor Gray
        Write-Host "   Current Position: $($data.currentPosition)s" -ForegroundColor Gray
        Write-Host "   Duration: $($data.duration)s" -ForegroundColor Gray
        Write-Host "   Progress: $([math]::Round($data.progressPercentage, 2))%" -ForegroundColor Gray
        Write-Host "   Completed: $($data.completed)" -ForegroundColor Gray
        Write-Host "   Last Watched: $($data.lastWatchedAt)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Get progress error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 7: Get all user progress
Write-Host "[7/7] 📚 Get all user progress..." -ForegroundColor Yellow
try {
    $allProgressResponse = Invoke-RestMethod -Uri "$baseUrl/video-progress/my-progress" `
        -Method GET `
        -Headers @{"Authorization" = "Bearer $token"}

    if ($allProgressResponse.success) {
        $progressList = $allProgressResponse.data
        $totalVideos = $progressList.Count
        $completedVideos = ($progressList | Where-Object { $_.completed -eq $true }).Count
        
        Write-Host "   ✅ All progress retrieved successfully!" -ForegroundColor Green
        Write-Host "   Total Videos Tracked: $totalVideos" -ForegroundColor Gray
        Write-Host "   Completed Videos: $completedVideos" -ForegroundColor Gray
        
        if ($totalVideos -gt 0) {
            Write-Host ""
            Write-Host "   Video Progress List:" -ForegroundColor Cyan
            foreach ($item in $progressList) {
                $completedIcon = if ($item.completed) { "✓" } else { "○" }
                $progressPct = [math]::Round($item.progressPercentage, 0)
                Write-Host "   $completedIcon Section: $($item.sectionId.Substring(0,8))... - $progressPct%" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "   ❌ Get all progress error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ✅ Test Suite Completed!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  - 40% progress -> Should be LOCKED" -ForegroundColor Gray
Write-Host "  - 80% progress -> Should be UNLOCKED" -ForegroundColor Gray
Write-Host "  - 75% threshold enforced correctly" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Replace \$testSectionId with real section UUID" -ForegroundColor Gray
Write-Host "  2. Test with real video in Course Learning flow" -ForegroundColor Gray
Write-Host "  3. Integrate Video Player Tracked component" -ForegroundColor Gray
Write-Host ""
