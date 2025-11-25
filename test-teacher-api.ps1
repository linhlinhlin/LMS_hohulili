# Test Teacher API Endpoint (PowerShell version)
# This script tests if the teacher endpoint is working

Write-Host "=== Testing Teacher API ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as teacher
Write-Host "Step 1: Login as teacher1..." -ForegroundColor Yellow
$loginBody = @{
    username = "teacher1"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.token
    
    if (-not $token) {
        Write-Host "❌ Failed to get token from response" -ForegroundColor Red
        Write-Host "Response: $($loginResponse | ConvertTo-Json)" -ForegroundColor Gray
        exit 1
    }
    
    Write-Host "✅ Got token: $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check if:" -ForegroundColor Yellow
    Write-Host "   1. Backend is running on port 8088" -ForegroundColor Gray
    Write-Host "   2. User teacher1 exists with password password123" -ForegroundColor Gray
    Write-Host "   3. Login endpoint is /api/v1/auth/login" -ForegroundColor Gray
    exit 1
}

# Step 2: Test endpoint
Write-Host "Step 2: Testing /api/v1/teacher/test endpoint..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $testResponse = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/teacher/test" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Test endpoint works!" -ForegroundColor Green
    Write-Host "Response: $($testResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ Test endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    Write-Host "This means TeacherController is not loaded or security is blocking it" -ForegroundColor Yellow
    exit 1
}

# Step 3: Test students endpoint
Write-Host "Step 3: Testing /api/v1/teacher/students endpoint..." -ForegroundColor Yellow

try {
    $studentsResponse = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/teacher/students?page=0&size=20" `
        -Method Get `
        -Headers $headers
    
    Write-Host "✅ Students endpoint works!" -ForegroundColor Green
    Write-Host "Response: $($studentsResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "The API is working correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "If frontend still shows 403, check:" -ForegroundColor Yellow
    Write-Host "  1. Frontend is sending Authorization header" -ForegroundColor Gray
    Write-Host "  2. Token is not expired" -ForegroundColor Gray
    Write-Host "  3. User is logged in as teacher" -ForegroundColor Gray
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Students endpoint failed with HTTP $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "=== FAILED ===" -ForegroundColor Red
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  1. Backend not restarted after adding TeacherController" -ForegroundColor Gray
    Write-Host "  2. Compilation error in TeacherController" -ForegroundColor Gray
    Write-Host "  3. Security configuration issue" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Try:" -ForegroundColor Yellow
    Write-Host "  1. Restart backend: cd api; ./mvnw spring-boot:run" -ForegroundColor Gray
    Write-Host "  2. Check logs for errors" -ForegroundColor Gray
    Write-Host "  3. Verify TeacherController.java compiled successfully" -ForegroundColor Gray
}
