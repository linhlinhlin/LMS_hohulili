# ⚡ QUICK START: Fix Admin 401 Error

## The Problem
Admin page shows: **401 Unauthorized** when trying to load users

## The Solution (5 Steps)

### 1️⃣ Start Backend
```bash
cd d:\lms_1\LMS_hohulili
docker-compose up -d
```
Wait 10 seconds for services to start.

### 2️⃣ Make Sure Frontend is Built
```bash
cd d:\lms_1\LMS_hohulili\fe
npm run build
```
Should see: `Output location: D:\lms_1\LMS_hohulili\fe\dist\lms-angular` ✅

### 3️⃣ Open Browser and LOGIN
1. Go to: http://localhost:4200/login
2. Enter admin credentials:
   ```
   Email: admin@example.com  (or your admin email)
   Password: (contact admin)
   ```
3. Click "Đăng nhập" (Login)
4. Should redirect to admin page

### 4️⃣ Check Console Logs (F12)
After login, open **DevTools Console** (F12 → Console tab)

You should see:
```
✅ 🔐 Token in localStorage: EXISTS (length: 256+)
✅ 🔐 RefreshToken in localStorage: EXISTS
✅ 🔐 User in localStorage: EXISTS
✅ 🔗 AuthInterceptor: Token exists: true
✅ 🔗 AuthInterceptor: Adding Authorization header
```

**If you see ❌ (NO TOKEN FOUND)**: 
- Go back to step 3, login didn't work
- Check Console during login for error messages

### 5️⃣ Navigate to Admin
1. If logged in successfully, go to: http://localhost:4200/admin
2. Should see user list loading
3. Console should show:
   ```
   ✅ 🔗 AuthInterceptor: Adding Authorization header
   📊 AdminService.getUsers called...
   📊 API response received...
   ```

## Troubleshooting Quick Reference

| Issue | Check | Solution |
|-------|-------|----------|
| Still seeing 401 after login | Console for 🔐 NO TOKEN FOUND | Logout (clear localStorage), login again |
| Redirects to login after logout | 🔗 shows 401 error | Token expired - login again |
| Network error | Backend running? | Run `docker-compose up -d` |
| 403 Forbidden | Check 🔐 Parsed user role | Login with admin account |
| Page blank after login | Check for JS errors in Console | Try Ctrl+Shift+R (hard refresh) |

## Debug Script (Automatic)
Paste this in Console to run automatic diagnosis:

1. Open Console (F12)
2. Open file: `BROWSER_CONSOLE_DIAGNOSTIC.js`
3. Copy all code
4. Paste in Console and press Enter
5. Read output and follow recommendations

## File Locations
- Backend: `d:\lms_1\LMS_hohulili\api\`
- Frontend: `d:\lms_1\LMS_hohulili\fe\`
- Guides: 
  - `DEBUG_AUTHENTICATION_GUIDE.md` - Full guide
  - `AUTHENTICATION_ISSUE_ANALYSIS.md` - Technical analysis
  - `BROWSER_CONSOLE_DIAGNOSTIC.js` - Automated script

## Backend Credentials (If Needed)
```
Database: PostgreSQL (localhost:5432)
Admin API: http://localhost:8088
Frontend: http://localhost:4200
```

## Common Commands

### Restart Everything
```bash
# Stop services
docker-compose down

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Check if Services Running
```bash
# Backend health check
curl http://localhost:8088/health

# Frontend serving
curl http://localhost:4200
```

### Rebuild Frontend
```bash
cd fe
npm install  # if needed
npm run build
```

## When to Contact Support
1. After trying all 5 steps above
2. When you have Console output (with 🔐 and 🔗 logs)
3. Share: Console screenshot + what step failed + any error messages

---

**Version**: v1.0  
**Last Updated**: 2025  
**Build Status**: ✅ Tested and working  

💡 **Pro Tip**: Keep Console open (F12) while testing to see exactly what's happening at each step!
