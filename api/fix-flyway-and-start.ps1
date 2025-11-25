# Fix Flyway migration issue and start backend

Write-Host "=== Fixing Flyway Migration Issue ===" -ForegroundColor Cyan
Write-Host ""

# Option 1: Repair Flyway (recommended)
Write-Host "Option 1: Repair Flyway schema history" -ForegroundColor Yellow
Write-Host "This will mark missing migrations as deleted and fix checksums" -ForegroundColor Gray
Write-Host ""

# Option 2: Clean and recreate (nuclear option)
Write-Host "Option 2: Clean database and recreate (DELETES ALL DATA!)" -ForegroundColor Red
Write-Host "This will drop all tables and re-run migrations" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Choose option (1=Repair, 2=Clean, Q=Quit)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "Running Flyway repair..." -ForegroundColor Yellow
    
    # Add flyway.repair=true to application properties temporarily
    $propsFile = "src/main/resources/application-dev.yml"
    
    Write-Host "Starting backend with Flyway repair..." -ForegroundColor Yellow
    mvn -DskipTests spring-boot:run -Dspring-boot.run.arguments="--flyway.repair=true"
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "⚠️  WARNING: This will DELETE ALL DATA!" -ForegroundColor Red
    $confirm = Read-Host "Type 'YES' to confirm"
    
    if ($confirm -eq "YES") {
        Write-Host "Running Flyway clean..." -ForegroundColor Yellow
        mvn flyway:clean
        
        Write-Host "Starting backend (will run migrations)..." -ForegroundColor Yellow
        mvn -DskipTests spring-boot:run
    } else {
        Write-Host "Cancelled." -ForegroundColor Gray
    }
    
} else {
    Write-Host "Cancelled." -ForegroundColor Gray
}
