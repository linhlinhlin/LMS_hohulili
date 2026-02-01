# Test Question Edit Data Flow
# Credentials: tea12345@gmail.com / tea12345

$baseUrl = "http://localhost:8088"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Question Edit API Test Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Step 1: Backend check
Write-Host "`n[1] Checking backend..." -ForegroundColor Yellow
try {
    $null = Invoke-WebRequest -Uri "$baseUrl/v3/api-docs" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "Backend is running" -ForegroundColor Green
} catch {
    Write-Host "Backend NOT running!" -ForegroundColor Red
    exit 1
}

# Step 2: Login as teacher
Write-Host "`n[2] Logging in as teacher..." -ForegroundColor Yellow

$loginBody = @{
    email = "tea12345@gmail.com"
    password = "tea12345"
} | ConvertTo-Json

$token = $null
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v3/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    if ($response.data.accessToken) { $token = $response.data.accessToken }
    elseif ($response.data.token) { $token = $response.data.token }
    elseif ($response.token) { $token = $response.token }
    Write-Host "Login SUCCESS!" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 3: Get My Questions
Write-Host "`n[3] Getting my questions..." -ForegroundColor Yellow
try {
    $myQuestions = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions/my-questions" -Method GET -Headers $headers
    
    if ($myQuestions.data -and $myQuestions.data.Count -gt 0) {
        Write-Host "Found $($myQuestions.data.Count) questions" -ForegroundColor Green
        $questionId = $myQuestions.data[0].id
        Write-Host "First question ID: $questionId" -ForegroundColor Gray
    } else {
        Write-Host "No questions found for this teacher" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Get Question By ID (Edit endpoint)
Write-Host "`n[4] Getting question details (edit endpoint): $questionId" -ForegroundColor Yellow
try {
    $question = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions/$questionId" -Method GET -Headers $headers
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "`n========== FULL API RESPONSE ==========" -ForegroundColor Cyan
    $question | ConvertTo-Json -Depth 10
    
    Write-Host "`n========== KEY ANALYSIS ==========" -ForegroundColor Cyan
    $data = if ($question.data) { $question.data } else { $question }
    
    Write-Host "id: $($data.id)" -ForegroundColor White
    Write-Host "content: $($data.content)" -ForegroundColor White
    
    if ($data.contentBlocks) {
        Write-Host "contentBlocks: $($data.contentBlocks.Count) blocks" -ForegroundColor Green
    } else {
        Write-Host "contentBlocks: NULL (PROBLEM!)" -ForegroundColor Red
    }
    
    if ($data.options) {
        Write-Host "options: $($data.options.Count) items" -ForegroundColor Green
        foreach ($opt in $data.options) {
            Write-Host "  [$($opt.optionKey)] content='$($opt.content)'" -ForegroundColor Gray
            if ($opt.contentBlocks) {
                Write-Host "       contentBlocks: $($opt.contentBlocks.Count) blocks" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "options: NULL (PROBLEM!)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Gray
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
