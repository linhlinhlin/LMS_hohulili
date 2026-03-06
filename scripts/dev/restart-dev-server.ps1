# Script to restart Angular dev server and clear cache

Write-Host "🔄 Restarting Angular Dev Server..." -ForegroundColor Cyan

# Stop any running ng serve processes
Write-Host "⏹️  Stopping existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*node.exe*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear Angular cache
Write-Host "🗑️  Clearing Angular cache..." -ForegroundColor Yellow
if (Test-Path "fe/.angular") {
    Remove-Item -Path "fe/.angular" -Recurse -Force
    Write-Host "✅ Cleared .angular cache" -ForegroundColor Green
}

# Navigate to fe directory
Set-Location -Path "fe"

# Start dev server
Write-Host "🚀 Starting dev server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Instructions:" -ForegroundColor Yellow
Write-Host "1. Wait for compilation to complete"
Write-Host "2. Open browser in Incognito mode"
Write-Host "3. Press Ctrl+Shift+R to hard refresh"
Write-Host "4. Test the 'Thêm câu hỏi' function"
Write-Host ""

npm start
