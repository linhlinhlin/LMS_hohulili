# Test specific question with image tags
$baseUrl = "http://localhost:8088"

# Login
$loginBody = @{ email = "tea12345@gmail.com"; password = "tea12345" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "$baseUrl/api/v3/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $response.data.accessToken
if (-not $token) { $token = $response.data.token }

$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

# Get specific question that user was editing
$questionId = "ce34ee61-676d-443e-a201-b53b4b1c7a01"
Write-Host "Getting question: $questionId" -ForegroundColor Yellow

$detail = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions/$questionId" -Method GET -Headers $headers

Write-Host "`n========== FULL RAW RESPONSE ==========" -ForegroundColor Cyan
$detail | ConvertTo-Json -Depth 10

Write-Host "`n========== LOOKING FOR [IMG:...] PATTERNS ==========" -ForegroundColor Yellow
$jsonStr = $detail | ConvertTo-Json -Depth 10
$matches = [regex]::Matches($jsonStr, "\[IMG:[^\]]+\]")
if ($matches.Count -gt 0) {
    Write-Host "Found $($matches.Count) image tags:" -ForegroundColor Green
    foreach ($m in $matches) {
        Write-Host "  $($m.Value)" -ForegroundColor Cyan
    }
} else {
    Write-Host "No [IMG:...] patterns found" -ForegroundColor Gray
}
