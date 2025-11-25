# PowerShell Script to Run Package Migration

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Question Packages Migration Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Ensure we're in the correct directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
Write-Host "Working directory: $scriptDir" -ForegroundColor Gray
Write-Host ""

# Database connection details
$DB_HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres.rljldvpboqapokzecfff"
$DB_PASSWORD = "ho_hu_li_li_"

Write-Host "Database Info:" -ForegroundColor Yellow
Write-Host "  Host: $DB_HOST" -ForegroundColor Gray
Write-Host "  Database: $DB_NAME" -ForegroundColor Gray
Write-Host "  User: $DB_USER" -ForegroundColor Gray
Write-Host ""

# Check if psql is available
try {
    $null = Get-Command psql -ErrorAction Stop
    Write-Host "PostgreSQL client (psql) found" -ForegroundColor Green
} catch {
    Write-Host "PostgreSQL client (psql) not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "WARNING: This will modify your database!" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Do you want to continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting migration..." -ForegroundColor Cyan
Write-Host ""

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD

try {
    # Run migration script
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "run-package-migration.sql"
    
    Write-Host ""
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Restart your Spring Boot application"
        Write-Host "2. Check logs for any errors"
        Write-Host "3. Test the new Package API endpoints"
    } else {
        Write-Host "Migration failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error running migration: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
