# Requires: Docker Desktop running, Java 21, Maven installed
param(
  [int]$DbReadyTimeoutSec = 180,
  [switch]$RecreateVolumes
)

Write-Host "=== LMS Dev Up ===" -ForegroundColor Green

function Fail($msg) { Write-Host "❌ $msg" -ForegroundColor Red; exit 1 }

# 0) Quick env checks
Write-Host "Checking Docker CLI..." -ForegroundColor Yellow
try {
  $null = docker version --format '{{.Server.Version}}' 2>$null
} catch {
  Fail "Docker Desktop is not running. Please open Docker Desktop and wait until it's Running, then re-run: ./dev-up.ps1"
}

# 1) Compose up Postgres (+ pgAdmin)
Write-Host "Starting database containers (docker compose up -d)..." -ForegroundColor Yellow
if ($RecreateVolumes) {
  Write-Host "Recreating volumes (docker compose down -v)..." -ForegroundColor Yellow
  docker compose down -v | Out-Null
}

docker compose up -d | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed." }

# 2) Wait for Postgres health
$svc = "lms-postgres"
Write-Host "Waiting for Postgres ($svc) to become healthy (timeout: ${DbReadyTimeoutSec}s)..." -ForegroundColor Yellow
$start = Get-Date
while ($true) {
  $status = docker inspect --format '{{json .State.Health.Status}}' $svc 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  • Waiting for container to initialize..." -ForegroundColor DarkGray
  } else {
    $clean = $status.Trim('"')
    if ($clean -eq 'healthy') { break }
    Write-Host "  • Health: $clean" -ForegroundColor DarkGray
  }
  if ((Get-Date) - $start -gt [TimeSpan]::FromSeconds($DbReadyTimeoutSec)) {
    Fail "Postgres did not become healthy within $DbReadyTimeoutSec seconds. Try: ./dev-up.ps1 -RecreateVolumes"
  }
  Start-Sleep -Seconds 3
}

Write-Host "✅ Postgres is healthy." -ForegroundColor Green

# 3) Start Spring Boot (dev profile is default in application.yml)
Write-Host "Starting Spring Boot (mvn -DskipTests spring-boot:run)..." -ForegroundColor Yellow
mvn -DskipTests spring-boot:run
if ($LASTEXITCODE -ne 0) {
  Fail "Spring Boot failed to start. Check logs above. Common issues: Flyway migration errors, port 8088 in use."
}

Write-Host "🎉 Backend is running at http://localhost:8089" -ForegroundColor Green
Write-Host "📜 Swagger: http://localhost:8089/swagger-ui/index.html" -ForegroundColor Cyan
Write-Host "🗄️  pgAdmin: http://localhost:8081 (admin@devmail.net / S3cure!Passw0rd)" -ForegroundColor Cyan
