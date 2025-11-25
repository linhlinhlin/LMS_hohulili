# PowerShell script to call the cleanup API
Write-Host "Calling cleanup duplicate quizzes API..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8088/api/v1/dev/cleanup-duplicate-quizzes" -Method POST -ContentType "application/json"
    
    Write-Host ""
    Write-Host "=== Cleanup Result ===" -ForegroundColor Green
    Write-Host "Success: $($response.success)"
    Write-Host "Message: $($response.message)"
    Write-Host ""
    
    if ($response.data) {
        Write-Host "Duplicates Found: $($response.data.duplicatesFound)"
        Write-Host "Total Quizzes Deleted: $($response.data.totalQuizzesDeleted)"
        
        if ($response.data.details -and $response.data.details.Count -gt 0) {
            Write-Host ""
            Write-Host "Details:" -ForegroundColor Yellow
            foreach ($detail in $response.data.details) {
                Write-Host "  Lesson ID: $($detail.lessonId)"
                Write-Host "    Total Quizzes: $($detail.totalQuizzes)"
                Write-Host "    Kept Quiz ID: $($detail.keptQuizId)"
                Write-Host "    Deleted Quiz IDs: $($detail.deletedQuizIds -join ', ')"
                Write-Host ""
            }
        }
    }
    
    Write-Host "Done!" -ForegroundColor Green
} catch {
    Write-Host "Error calling API: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend is running on http://localhost:8088" -ForegroundColor Yellow
}
