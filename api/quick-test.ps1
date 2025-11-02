# LMS Maritime API Quick Test
$BASE_URL = "http://localhost:8088"

Write-Host "=== Testing LMS Maritime API ===" -ForegroundColor Green

# 1. Register Admin
Write-Host "`n1. Register Random Test User..." -ForegroundColor Yellow
$rand = Get-Random -Maximum 999999
$username = "user$rand"
$email = "$username@example.com"
$password = "test1234"
$registerData = @{
    username = $username
    email = $email
    password = $password
    fullName = "Test User $rand"
    role = "STUDENT"
} | ConvertTo-Json

try {
    $registerResult = Invoke-RestMethod -Uri "$BASE_URL/api/v1/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "✅ Register Success: $($registerResult.user.username) ($($registerResult.user.email))" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Register: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. Login and get token
Write-Host "`n2. Login to get JWT token..." -ForegroundColor Yellow
$loginData = @{
    # Backend expects 'email' field which can be an email or a username
    email = $username
    password = $password
} | ConvertTo-Json

try {
    $loginResult = Invoke-RestMethod -Uri "$BASE_URL/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResult.accessToken
    Write-Host "✅ Login Success! Token: $($token.Substring(0,40))..." -ForegroundColor Green
    
    # 3. Get Profile
    Write-Host "`n3. Get User Profile..." -ForegroundColor Yellow
    $headers = @{ Authorization = "Bearer $token" }
    $profile = Invoke-RestMethod -Uri "$BASE_URL/api/v1/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Profile: $($profile.data.fullName) - Role: $($profile.data.role)" -ForegroundColor Green
    
    # Additional checks can be added here if needed
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 API Testing Complete!" -ForegroundColor Green
Write-Host "👉 Open Swagger UI: http://localhost:8088/swagger-ui/index.html" -ForegroundColor Cyan