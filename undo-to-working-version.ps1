# Script to undo section-editor to working version

Write-Host "🔄 Undoing section-editor.component.ts to working version..." -ForegroundColor Cyan
Write-Host ""

# Show current status
Write-Host "📊 Current status:" -ForegroundColor Yellow
git status --short fe/src/app/features/teacher/courses/section-editor.component.ts

Write-Host ""
Write-Host "⚠️  This will restore the file to commit fae3715 (working version)" -ForegroundColor Yellow
Write-Host "    You will LOSE any changes from commit 333fc28 in this file" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Do you want to continue? (yes/no)"

if ($confirm -eq "yes" -or $confirm -eq "y") {
    Write-Host ""
    Write-Host "🔄 Restoring file..." -ForegroundColor Cyan
    
    git checkout fae3715 -- fe/src/app/features/teacher/courses/section-editor.component.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ File restored successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Next steps:" -ForegroundColor Yellow
        Write-Host "1. Restart dev server: cd fe && npm start"
        Write-Host "2. Clear browser cache (F12 → Hard Reload)"
        Write-Host "3. Test the 'Thêm câu hỏi' function"
        Write-Host "4. If OK, commit: git commit -m 'Revert to working version'"
        Write-Host ""
        
        # Show diff
        Write-Host "📊 Changes staged:" -ForegroundColor Yellow
        git status --short
    } else {
        Write-Host "❌ Failed to restore file" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Operation cancelled" -ForegroundColor Yellow
}
