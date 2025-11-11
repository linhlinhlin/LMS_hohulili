# 🔐 Admin Authentication Debug Guide

## Problem Summary
The admin user list returns **401 Unauthorized** when trying to load users. The API endpoint requires authentication but the token is not being sent or is missing.

## Root Causes

1. **❌ User NOT logged in** → No token in `localStorage` → AuthInterceptor can't add Authorization header
2. **❌ Token invalid/expired** → Backend rejects token
3. **❌ Login flow broken** → Token not being saved to localStorage

## Quick Diagnostics (Run These Steps)

### Step 1: Check if User is Logged In
1. Open **Developer Console** in browser (F12)
2. Go to **Application** tab → **Local Storage**
3. Check for these keys:
   - `auth_token` - Should contain JWT token
   - `refresh_token` - Should contain refresh token  
   - `user` - Should contain user object as JSON

**Expected Result**: All three keys should exist

### Step 2: Monitor Authentication Debug Logs
1. Keep **Console** open (F12)
2. Look for messages with 🔐 and 🔗 prefixes:

```
🔐 ========== AUTHENTICATION DEBUG ==========
🔐 Token in localStorage: ✅ EXISTS (length: 256)
🔐 RefreshToken in localStorage: ✅ EXISTS
🔐 User in localStorage: ✅ EXISTS
🔐 Parsed user: { id: "...", username: "admin", role: "admin", ... }
🔐 ==========================================

🔗 AuthInterceptor: Processing request to: http://localhost:8088/api/v1/users
🔗 AuthInterceptor: Token exists: true
🔗 AuthInterceptor: Adding Authorization header, token length: 256
🔗 AuthInterceptor: Request cloned with Authorization header
```

**Expected**: See ✅ marks and token being added

### Step 3: Check AdminService Debug Logs
Look for logs from AdminService.getUsers():
```
📊 AdminService.getUsers called with params...
📊 API Base URL: http://localhost:8088/api/v1
📊 Full API URL: http://localhost:8088/api/v1/users?page=...
📊 Calling API with these params...
📊 API response received...
```

## Scenarios & Solutions

### 🔴 Scenario 1: Token MISSING in localStorage
**Symptoms**: 
- 🔐 Token in localStorage: ❌ MISSING
- 🔗 AuthInterceptor: ⚠️ NO TOKEN FOUND

**Solution**: **User needs to LOG IN first!**

1. Go to login page: http://localhost:4200/login
2. Use test credentials (check with backend team or admin):
   - Email: `admin@example.com` (or your actual admin email)
   - Password: Contact system administrator
3. After successful login, token should be saved to localStorage
4. Then navigate back to admin page

**To test login is working**:
- Open Console (F12)
- You should see: `✅ Login successful in component: { accessToken: "...", ... }`
- After login, check localStorage for `auth_token`

### 🔴 Scenario 2: Token EXISTS but Still Getting 401
**Symptoms**:
- 🔐 Token in localStorage: ✅ EXISTS
- 🔗 AuthInterceptor: Adding Authorization header...
- But API still returns 401

**Possible Causes**:
1. **Token expired** - Backend rejects old/expired token
2. **Wrong credentials** - Token is for different user without admin role
3. **Backend issue** - JWT validation failing

**Solution**:
1. Check token in localStorage - copy full token string
2. Go to https://jwt.io - paste token in "Encoded" section
3. Check "Payload" tab for:
   ```json
   {
     "exp": 1234567890,  // Expiration timestamp
     "role": "admin",     // Should be "admin"
     "sub": "user@email"  // User email
   }
   ```
4. If expired (`exp` < current time):
   - Logout and login again
   - Token should be refreshed automatically
5. If role is NOT "admin":
   - Wrong user account - need to login as admin user

### 🟡 Scenario 3: Login Works but Token Not Saved
**Symptoms**:
- Login page shows success
- But no token in localStorage
- Redirected to admin page but gets 401

**Solution**:
1. Check Console during login for errors
2. Verify localStorage not being cleared somewhere
3. Check if private/incognito mode is causing localStorage issues
4. Try in regular browser window (not incognito)

## API Endpoint Testing

### Using cURL (from Terminal)
```bash
# Get token from localStorage first (copy from Application tab)
TOKEN="your_jwt_token_here"

# Test users API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8088/api/v1/users?page=1&size=10
```

### Using Swagger/Postman
1. Go to: http://localhost:8088/swagger-ui.html
2. Click "Authorize" button in top-right
3. Paste token: `Bearer your_jwt_token_here`
4. Try GET /api/v1/users endpoint
5. Check response - should be 200 with user list

## Backend Verification

### Check if Backend is Running
```bash
# Should return 401 (expected, need to be authenticated)
curl http://localhost:8088/api/v1/users

# Should return pong or similar
curl http://localhost:8088/health
```

### Check Backend Logs for JWT Validation Errors
Look in backend logs for messages like:
- `JWT validation failed`
- `Token expired`
- `Invalid signature`

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | No token or invalid token | Login first, check localStorage |
| 403 Forbidden | User doesn't have admin role | Login with admin account |
| 404 Not Found | API endpoint doesn't exist | Check backend is running, check URL |
| 500 Server Error | Backend error | Check backend logs, restart backend |
| CORS error | Frontend URL not whitelisted | Contact backend team |

## Next Steps

1. **Verify you're logged in** - Check localStorage for token
2. **Monitor debug logs** - Check Console during admin page load
3. **Check backend logs** - Look for JWT/authentication errors
4. **Test API directly** - Use Swagger or cURL to confirm API works
5. **Contact system admin** - If still not working, provide:
   - Screenshot of Console logs
   - localStorage content (WITHOUT the actual token for security)
   - Backend error logs

## Files Modified for Debugging

- `fe/src/app/features/admin/user-management.component.ts` - Added 🔐 auth debug at ngOnInit
- `fe/src/app/api/interceptors/auth.interceptor.ts` - Added 🔗 request/response debug

These debug logs will help identify exactly where the authentication is failing.

---

**Build Status**: ✅ Frontend rebuilt successfully with debug logging enabled

**Next Action**: 
1. Make sure backend is running: `docker-compose up -d`
2. Open http://localhost:4200/login in browser
3. Login with admin account
4. Check Console (F12) for 🔐 and 🔗 debug messages
5. Navigate to admin page and monitor user list loading
