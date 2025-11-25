# Debug 403 Issue - Teacher Students Endpoint

## Problem
Still getting 403 Forbidden when calling `/api/v1/teacher/students`

## Checklist

### 1. Backend Status
- [ ] Backend is running on port 8088
- [ ] TeacherController is compiled and loaded
- [ ] No compilation errors

### 2. Security Configuration
- ✅ SecurityConfig has: `.requestMatchers("/api/v1/teacher/**").hasAnyRole("ADMIN", "TEACHER")`
- ✅ TeacherController has: `@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")`

### 3. User Authentication
- [ ] User is logged in with valid JWT token
- [ ] User has role TEACHER or ADMIN
- [ ] JWT token is being sent in Authorization header

## Debug Steps

### Step 1: Check if backend restarted
```bash
# Stop backend if running
# Restart backend
cd api
./mvnw spring-boot:run
```

### Step 2: Test endpoint exists
```bash
# Call test endpoint
curl -X GET http://localhost:8088/api/v1/teacher/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: 200 OK with message

### Step 3: Check user role
Login as teacher and check JWT token payload:
```javascript
// In browser console
const token = localStorage.getItem('token'); // or wherever you store it
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User role:', payload.role);
```

Expected: `role: "TEACHER"` or `role: "ADMIN"`

### Step 4: Check Authorization header
```javascript
// In browser Network tab
// Look at request headers for /api/v1/teacher/students
// Should have: Authorization: Bearer eyJhbGc...
```

### Step 5: Check backend logs
Look for:
```
Teacher {teacherId} requesting students list
```

If you see this, backend is receiving the request.

## Common Issues

### Issue 1: Backend not restarted
**Solution:** Restart backend server

### Issue 2: User not logged in as TEACHER
**Solution:** 
- Logout current user
- Login with teacher credentials:
  - Username: `teacher1`
  - Password: `password123`

### Issue 3: JWT token expired
**Solution:** Logout and login again

### Issue 4: Authorization header not sent
**Solution:** Check ApiClient interceptor is adding token

### Issue 5: Role format mismatch
Spring Security expects: `ROLE_TEACHER`
JWT might have: `TEACHER`

Check `User.getAuthorities()` method adds `ROLE_` prefix

## Quick Fix Test

Try calling endpoint with Postman/curl:

```bash
# 1. Login to get token
curl -X POST http://localhost:8088/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher1","password":"password123"}'

# 2. Copy token from response

# 3. Call teacher endpoint
curl -X GET "http://localhost:8088/api/v1/teacher/students?page=0&size=20" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

If this works → Frontend issue (token not being sent)
If this fails → Backend issue (security config or user role)

## Next Steps

1. **Restart backend** - Most common issue
2. **Check user role** - Must be TEACHER or ADMIN
3. **Check JWT token** - Must be valid and not expired
4. **Check logs** - Backend should log the request

---

**Status:** Debugging in progress
**Date:** 2025-11-18
