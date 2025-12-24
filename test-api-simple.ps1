# Simple Video Progress API Test
# Run each command step by step

$baseUrl = "http://localhost:8088/api/v1"

Write-Host "`n=== Step 1: Login ===" -ForegroundColor Cyan

$loginBody = @{
    email = "stu12345@gmail.com"
    password = "stu12345"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $response.accessToken
    
    if (-not $token) {
        Write-Host "ERROR: No token received from login" -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Gray
        exit
    }
    
    Write-Host "SUCCESS: Token received" -ForegroundColor Green
    Write-Host "User: $($response.user.fullName) ($($response.user.role))" -ForegroundColor Gray
    if ($token -and $token.Length -gt 50) {
        Write-Host "Token: $($token.Substring(0,50))..." -ForegroundColor Gray
    } else {
        Write-Host "Token: $token" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n=== Step 2: Track 40% Progress ===" -ForegroundColor Cyan
Write-Host "Using token: $($token.Substring(0,20))..." -ForegroundColor Gray
Write-Host "NOTE: Replace sectionId with real UUID from database" -ForegroundColor Yellow
# Get real section ID from Supabase: SELECT id FROM sections WHERE type = 'VIDEO' LIMIT 1;
$sectionId = "4dfecf55-444a-4204-b90a-9b37dc860625"  # Section: 2.1:
$trackBody = @{
    sectionId = $sectionId
    videoUrl = "https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/test.mp4"
    currentPosition = 120
    duration = 300
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/video-progress/track" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $trackBody
    Write-Host "SUCCESS: Progress tracked" -ForegroundColor Green
    Write-Host "Progress: $($response.data.progressPercentage)%" -ForegroundColor Gray
    Write-Host "Completed: $($response.data.completed)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Step 3: Check Can Proceed (at 40%) ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/video-progress/$sectionId/can-proceed" -Method GET -Headers @{Authorization="Bearer $token"}
    Write-Host "Can Proceed: $($response.data.canProceed)" -ForegroundColor $(if($response.data.canProceed){"Green"}else{"Yellow"})
    Write-Host "Current Progress: $($response.data.currentProgress)%" -ForegroundColor Gray
    Write-Host "Message: $($response.data.message)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Step 4: Track 80% Progress ===" -ForegroundColor Cyan
$trackBody80 = @{
    sectionId = $sectionId
    videoUrl = "https://pub-a9b1e20e911c45f69a1008c8a993fe7d.r2.dev/test.mp4"
    currentPosition = 240
    duration = 300
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/video-progress/track" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $trackBody80
    Write-Host "SUCCESS: Progress tracked" -ForegroundColor Green
    Write-Host "Progress: $($response.data.progressPercentage)%" -ForegroundColor Gray
    Write-Host "Completed: $($response.data.completed)" -ForegroundColor $(if($response.data.completed){"Green"}else{"Red"})
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Step 5: Check Can Proceed (at 80%) ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/video-progress/$sectionId/can-proceed" -Method GET -Headers @{Authorization="Bearer $token"}
    Write-Host "Can Proceed: $($response.data.canProceed)" -ForegroundColor $(if($response.data.canProceed){"Green"}else{"Red"})
    Write-Host "Current Progress: $($response.data.currentProgress)%" -ForegroundColor Gray
    Write-Host "Message: $($response.data.message)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Expected Results:" -ForegroundColor Yellow
Write-Host "  - At 40%: completed = false, canProceed = false" -ForegroundColor Gray
Write-Host "  - At 80%: completed = true, canProceed = true" -ForegroundColor Gray
