# Test Question Creation with Content Blocks
# Credentials: tea12345@gmail.com / tea12345

$baseUrl = "http://localhost:8088"
$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Question Creation API Test Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Step 1: Login
Write-Host "`n[1] Logging in as teacher..." -ForegroundColor Yellow
$loginBody = @{
    email = "tea12345@gmail.com"
    password = "tea12345"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v3/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = if ($response.data.accessToken) { $response.data.accessToken } else { $response.data.token }
    Write-Host "Login SUCCESS!" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Step 2: Create Question Payload
Write-Host "`n[2] Creating Question with Blocks..." -ForegroundColor Yellow

$questionBlocks = @(
    @{
        id = [Guid]::NewGuid().ToString()
        type = "paragraph"
        data = @{ text = "What is the capital of Vietnam?" }
    }
)

$optA = @(@{ id = [Guid]::NewGuid().ToString(); type = "text"; data = @{ text = "Hanoi" } })
$optB = @(@{ id = [Guid]::NewGuid().ToString(); type = "text"; data = @{ text = "Ho Chi Minh City" } })
$optC = @(@{ id = [Guid]::NewGuid().ToString(); type = "text"; data = @{ text = "Da Nang" } })
$optD = @(@{ id = [Guid]::NewGuid().ToString(); type = "text"; data = @{ text = "Hue" } })

$payload = @{
    blocks = $questionBlocks
    correctOption = "A"
    optionBlocks = @($optA, $optB, $optC, $optD)
    difficulty = "EASY"
    tags = "geography,vietnam"
    packageId = $null # Optional
} | ConvertTo-Json -Depth 10

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions" -Method POST -Headers $headers -Body $payload
    $questionId = $createResponse.data
    Write-Host "Question Created! ID: $questionId" -ForegroundColor Green
} catch {
    Write-Host "Create Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray }
    exit 1
}

# Step 3: Verify Question Content
Write-Host "`n[3] Verifying Question Content..." -ForegroundColor Yellow
try {
    $getRes = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions/$questionId" -Method GET -Headers $headers
    $q = $getRes.data
    
    Write-Host "Question ID: $($q.id)" -ForegroundColor White
    
    if ($q.contentBlocks) {
        Write-Host "Question contentBlocks: Found ($($q.contentBlocks.Count))" -ForegroundColor Green
        Write-Host "  Text: $($q.contentBlocks[0].data.text)" -ForegroundColor Gray
    } else {
        Write-Host "Question contentBlocks: MISSING!" -ForegroundColor Red
    }
    
    if ($q.options) {
        Write-Host "Options: Found ($($q.options.Count))" -ForegroundColor Green
        foreach ($opt in $q.options) {
            Write-Host "  Option $($opt.optionKey):" -NoNewline
            if ($opt.contentBlocks) {
                 Write-Host " Has Blocks ($($opt.contentBlocks.Count))" -ForegroundColor Green -NoNewline
                 Write-Host " Text: '$($opt.contentBlocks[0].data.text)'" -ForegroundColor Gray
            } else {
                 Write-Host " NO BLOCKS!" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "Options: MISSING!" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Verify Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Verification Complete ===" -ForegroundColor Cyan
