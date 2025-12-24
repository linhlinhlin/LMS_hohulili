@echo off
echo Starting Backend with R2 Storage Enabled...
echo.

REM Enable R2
set R2_ENABLED=true

REM Check if credentials are set
if "%R2_ACCOUNT_ID%"=="" (
    echo [WARNING] R2_ACCOUNT_ID not set!
    echo Run set-r2-env.bat first or set environment variables manually
    echo.
    echo For TESTING WITHOUT R2: R2 will be disabled
    set R2_ENABLED=false
)

echo R2_ENABLED=%R2_ENABLED%

cd /d "%~dp0"
call mvn spring-boot:run
pause
