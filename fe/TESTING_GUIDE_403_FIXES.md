# Testing Guide for 403 Permission Error Fixes

## Overview
This document provides comprehensive testing scenarios to validate the fixes for 403 permission errors in the LMS Quiz Bank system.

## Fixed Components

### 1. Route Protection
- ✅ Quiz bank routes now protected with `teacherGuard`
- ✅ Component-level permission checks implemented
- ✅ Automatic navigation for unauthorized users

### 2. Error Handling
- ✅ Enhanced 403 error detection and messaging
- ✅ Contextual user guidance and actions
- ✅ Role-based error messages

### 3. Authentication Flow
- ✅ Improved auth interceptor with 403 handling
- ✅ Smart redirects based on user roles
- ✅ Pre-emptive permission validation

## Testing Scenarios

### Scenario 1: Student User Accessing Quiz Bank

**Steps:**
1. Log in as a student user
2. Navigate to `/teacher/quiz-bank` (should redirect to `/courses`)
3. Try to access quiz bank directly via URL

**Expected Results:**
- Immediate redirect to `/courses` page
- Clear error message: "Tính năng này chỉ dành cho giảng viên. Vui lòng đăng ký khóa học để xem nội dung."
- No 403 API errors in console
- User-friendly enrollment guidance

**Console Logs to Check:**
```
🔍 Quiz Bank ngOnInit - Current user role: student
🔍 Quiz Bank ngOnInit - Is authenticated: true
Router navigation to /courses
```

### Scenario 2: Teacher User Accessing Quiz Bank

**Steps:**
1. Log in as a teacher user
2. Navigate to `/teacher/quiz-bank`
3. Verify quiz bank loads successfully

**Expected Results:**
- Quiz bank component loads without errors
- User can access all quiz features
- No 403 errors in console
- API calls succeed for teacher-specific endpoints

**Console Logs to Check:**
```
🔍 Quiz Bank ngOnInit - Current user role: teacher
🔍 Quiz Bank ngOnInit - Is authenticated: true
🔄 loadData - About to call getMyQuestions API (teacher-specific)
✅ getMyQuestions() successful: X questions
```

### Scenario 3: Unauthenticated User

**Steps:**
1. Clear browser storage/session
2. Try to access `/teacher/quiz-bank`

**Expected Results:**
- Immediate redirect to `/auth/login`
- Return URL preserved for post-login navigation
- No 403 errors (handled as 401)

**Console Logs to Check:**
```
🔍 Quiz Bank ngOnInit - Is authenticated: false
Router navigation to /auth/login?returnUrl=/teacher/quiz-bank
```

### Scenario 4: API Call Failures

**Steps:**
1. Log in as teacher
2. Access quiz bank with proper permissions
3. Observe API call behavior

**Expected Results:**
- Successful API calls for authorized endpoints
- Proper error handling for any backend 403 responses
- User-friendly error messages with appropriate actions

## Test Cases for Error Messages

### Test Case 4.1: Backend Returns Vietnamese 403 Message
```
Message: "403: Bạn không có quyền truy cập tính năng này. Vui lòng đăng ký khóa học để xem nội dung."
```

**Expected Frontend Response:**
- Display appropriate user guidance
- Offer enrollment action button
- Navigate to `/courses` if needed

### Test Case 4.2: Backend Returns Generic 403
```
Message: "Server Error: 403"
```

**Expected Frontend Response:**
- Display generic permission denied message
- Suggest contacting administrator
- Provide appropriate navigation actions

## Browser Console Verification

### Check for Error Logs (Before Fix)
```
🚨 App Error: 403: Bạn không có quyền truy cập tính năng này. Vui lòng đăng ký khóa học để xem nội dung. Object
api-client.ts:116 API Error: Object
quiz-bank.component.ts:371 Error loading data: Error: Server Error: 403 - 403: Bạn không có quyền truy cập tính năng này...
```

### Check for Success Logs (After Fix)
```
✅ Component-level permission check passed
✅ No 403 API errors
✅ Proper user navigation
✅ Clear error messaging
```

## Network Tab Verification

### Before Fix
- Multiple failed 403 API calls
- Unnecessary network requests
- Poor user experience

### After Fix
- No unnecessary API calls for unauthorized users
- Successful API calls for authorized users
- Clean network requests

## Manual Testing Checklist

- [ ] Student user cannot access quiz bank
- [ ] Teacher user can access quiz bank
- [ ] Unauthenticated user redirected to login
- [ ] Error messages are clear and helpful
- [ ] Navigation works properly
- [ ] No 403 errors in browser console
- [ ] API calls are appropriate for user role
- [ ] Test API button works for debugging
- [ ] Route guards function correctly
- [ ] Component-level protection prevents unauthorized API calls

## Debug Features

### Test API Button
The quiz bank component includes a "🔧 Test API" button that:
- Tests `/api/v1/questions` endpoint
- Tests `/api/v1/questions/my-questions` endpoint
- Shows user role and authentication status
- Displays results in alert dialog

**Usage:**
1. Access quiz bank as different user types
2. Click "🔧 Test API" button
3. Check console logs for detailed debugging info

### Console Logging
Enhanced logging throughout the component:
- User authentication status
- User role verification
- API call attempts and results
- Error scenarios and handling

## Expected Behavior Summary

| User Type | Access Result | Navigation | Error Message |
|-----------|---------------|------------|---------------|
| Student | DENIED | → /courses | "Tính năng này chỉ dành cho giảng viên..." |
| Teacher | GRANTED | → Quiz Bank | None (success) |
| Unauthenticated | DENIED | → /auth/login | None (transparent redirect) |
| Admin | GRANTED | → Quiz Bank | None (success) |

## Deployment Verification

After deployment, verify:

1. **Production Environment**
   - All fixes work in production
   - No console errors for authorized users
   - Proper redirects for unauthorized users

2. **Performance**
   - No additional network requests for unauthorized access
   - Component loads quickly for authorized users
   - Error handling doesn't impact performance

3. **Security**
   - Route protection cannot be bypassed
   - API endpoints remain secure
   - User role validation works correctly

## Rollback Plan

If issues arise after deployment:

1. **Immediate Response**
   - Revert to previous version if critical issues
   - Check browser console for 403 errors
   - Verify route guard functionality

2. **Debugging Steps**
   - Check user roles in database
   - Verify API endpoint permissions
   - Test with different user types

3. **Fix Validation**
   - Re-apply fixes with proper testing
   - Deploy to staging environment first
   - Monitor error logs after deployment

## Success Criteria

✅ **Fix is successful when:**
- No 403 errors appear in browser console
- Users receive appropriate error messages
- Unauthorized users are properly redirected
- Authorized users can access quiz bank features
- Performance is not negatively impacted
- Security remains intact

This comprehensive testing approach ensures the 403 permission fixes work correctly across all scenarios and user types.