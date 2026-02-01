# Test Question API Script
# First login to get JWT token, then test question endpoints

$baseUrl = "http://localhost:8088"

Write-Host "=== Testing Question API ===" -ForegroundColor Cyan

# Step 1: Login to get JWT token
Write-Host "`n[1] Logging in as teacher..." -ForegroundColor Yellow
$loginBody = @{
    email = "teacher1@lms.edu"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v3/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    if (-not $token) {
        $token = $loginResponse.token
    }
    Write-Host "Login successful! Token: $($token.Substring(0, 50))..." -ForegroundColor Green
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    
    # Try alternative login endpoint
    Write-Host "`nTrying /api/auth/login..." -ForegroundColor Yellow
    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        $token = $loginResponse.data.token
        if (-not $token) {
            $token = $loginResponse.token
        }
        Write-Host "Login successful! Token obtained" -ForegroundColor Green
    } catch {
        Write-Host "Alternative login also failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Get my questions to find a question ID
Write-Host "`n[2] Getting my questions..." -ForegroundColor Yellow
try {
    $myQuestions = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions/my-questions" -Method GET -Headers $headers
    Write-Host "Response type: $($myQuestions.GetType().Name)" -ForegroundColor Gray
    Write-Host "Response: " -ForegroundColor Gray
    $myQuestions | ConvertTo-Json -Depth 3 | Write-Host
    
    # Extract first question ID
    if ($myQuestions.data -and $myQuestions.data.Count -gt 0) {
        $firstQuestionId = $myQuestions.data[0].id
        Write-Host "`nFirst question ID: $firstQuestionId" -ForegroundColor Green
    } elseif ($myQuestions.Count -gt 0) {
        $firstQuestionId = $myQuestions[0].id
        Write-Host "`nFirst question ID: $firstQuestionId" -ForegroundColor Green
    } else {
        Write-Host "No questions found!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Failed to get my questions: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Get specific question by ID
Write-Host "`n[3] Getting question by ID: $firstQuestionId" -ForegroundColor Yellow
try {
    $question = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions/$firstQuestionId" -Method GET -Headers $headers
    Write-Host "Success! Response structure:" -ForegroundColor Green
    $question | ConvertTo-Json -Depth 5 | Write-Host
} catch {
    Write-Host "Failed to get question: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
