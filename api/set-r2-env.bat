@echo off
REM Enable Cloudflare R2 Storage
set R2_ENABLED=true

REM R2 Credentials (Thay YOUR_XXX bằng thông tin thực của bạn)
REM Lấy từ: https://dash.cloudflare.com/ -> R2 Object Storage
set R2_ACCOUNT_ID=YOUR_ACCOUNT_ID
set R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
set R2_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
set R2_BUCKET=lms-videos
set R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
set R2_PUBLIC_BASE_URL=https://YOUR_BUCKET.r2.dev
set R2_PRESIGN_TTL=900

echo R2 Storage Environment Variables Set!
echo.
echo IMPORTANT: Replace YOUR_XXX with your actual Cloudflare R2 credentials
echo Get them from: https://dash.cloudflare.com/ - R2 Object Storage
echo.
echo Next steps:
echo 1. Update the credentials above
echo 2. Run this script: run-backend-with-r2.bat
echo 3. Or copy these commands to your terminal before starting backend
pause
