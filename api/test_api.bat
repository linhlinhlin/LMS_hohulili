@echo off
chcp 65001 >nul
REM ================================================================
REM LMS API Debug Test Script - With Correct Credentials
REM ================================================================

set BASE_URL=http://localhost:8088

echo.
echo ================================================================
echo LMS API Debug Test Script
echo ================================================================
echo.

REM Step 1: Test if backend is running
echo [1/4] Testing if backend is running...
curl -s -o nul -w "%%{http_code}" %BASE_URL%/swagger-ui/index.html > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt
if "%STATUS%"=="200" (
    echo [OK] Backend is running
) else (
    echo [FAIL] Backend not responding. Status: %STATUS%
    echo Please start backend with: mvn spring-boot:run
    pause
    exit /b 1
)

echo.
echo [2/4] Testing login endpoint...
echo Email: stu12345@gmail.com
echo Password: stu12345

REM Login and capture full response
curl -s -X POST %BASE_URL%/api/v3/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"stu12345@gmail.com\",\"password\":\"stu12345\"}" > login_response.json

echo.
echo Login Response:
type login_response.json
echo.

REM Extract token using PowerShell
powershell -Command "$json = Get-Content login_response.json -Raw | ConvertFrom-Json; if($json.data.accessToken) { $json.data.accessToken } else { '' }" > token.txt
set /p TOKEN=<token.txt

if "%TOKEN%"=="" (
    echo [FAIL] Login failed - no token received
    echo Check the login response above for error details
    pause
    exit /b 1
)

echo.
echo [OK] Token received!
echo Token (first 50 chars): %TOKEN:~0,50%...

echo.
echo ================================================================
echo [3/4] Testing enrolled-courses WITH token...
echo ================================================================
curl -s -w "\n\nHTTP Status: %%{http_code}" ^
  -X GET "%BASE_URL%/api/v3/courses/enrolled-courses?page=1&limit=10" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json"

echo.
echo.
echo ================================================================
echo [4/4] Testing public courses (no auth required)...
echo ================================================================
curl -s -w "\n\nHTTP Status: %%{http_code}" ^
  -X GET "%BASE_URL%/api/v3/courses?page=1&limit=10" ^
  -H "Content-Type: application/json"

echo.
echo.
echo ================================================================
echo Debug complete!
echo - 200 = Success
echo - 401 = Unauthorized (token invalid/missing)  
echo - 403 = Forbidden (authenticated but no permission)
echo ================================================================

REM Cleanup
del login_response.json 2>nul
del token.txt 2>nul

pause
