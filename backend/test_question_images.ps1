# Test Question with Images
# Find questions that have images in contentBlocks

$baseUrl = "http://localhost:8088"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Finding Questions with Images" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Login
$loginBody = @{ email = "tea12345@gmail.com"; password = "tea12345" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "$baseUrl/api/v3/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $response.data.accessToken
if (-not $token) { $token = $response.data.token }
if (-not $token) { $token = $response.token }

$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

Write-Host "Logged in successfully" -ForegroundColor Green

# Get all questions
$myQuestions = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions/my-questions" -Method GET -Headers $headers
Write-Host "Found $($myQuestions.data.Count) questions total" -ForegroundColor Gray

# Check each question for images
Write-Host "`n========== Checking Each Question ==========" -ForegroundColor Cyan

foreach ($q in $myQuestions.data) {
    $questionId = $q.id
    $detail = Invoke-RestMethod -Uri "$baseUrl/api/v3/questions/$questionId" -Method GET -Headers $headers
    $data = if ($detail.data) { $detail.data } else { $detail }
    
    $hasImage = $false
    $imageInfo = ""
    
    # Check question contentBlocks for images
    if ($data.contentBlocks) {
        foreach ($block in $data.contentBlocks) {
            if ($block.type -eq "image") {
                $hasImage = $true
                $url = $block.data.url
                if ($block.data.file.url) { $url = $block.data.file.url }
                $imageInfo += "  [Question] Image URL: $url`n"
            }
        }
    }
    
    # Check option contentBlocks for images
    if ($data.options) {
        foreach ($opt in $data.options) {
            if ($opt.contentBlocks) {
                foreach ($block in $opt.contentBlocks) {
                    if ($block.type -eq "image") {
                        $hasImage = $true
                        $url = $block.data.url
                        if ($block.data.file.url) { $url = $block.data.file.url }
                        $imageInfo += "  [Option $($opt.optionKey)] Image URL: $url`n"
                    }
                }
            }
        }
    }
    
    if ($hasImage) {
        Write-Host "`nQuestion ID: $questionId" -ForegroundColor Green
        Write-Host "Content: $($data.content)" -ForegroundColor White
        Write-Host "HAS IMAGES:" -ForegroundColor Yellow
        Write-Host $imageInfo -ForegroundColor Cyan
        
        # Print full structure for this question
        Write-Host "`nFull contentBlocks structure:" -ForegroundColor Yellow
        $data.contentBlocks | ConvertTo-Json -Depth 5
        
        Write-Host "`nFull options structure:" -ForegroundColor Yellow
        $data.options | ConvertTo-Json -Depth 5
    } else {
        Write-Host "Question $questionId - No images" -ForegroundColor Gray
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
