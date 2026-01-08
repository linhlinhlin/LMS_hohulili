# Bug Fix: Remove "Thu hồi" Button for Approved Courses

## 🐛 Issue

**Error Message**:
```
Error: Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt. 
Trạng thái hiện tại: Đã duyệt
```

**Root Cause**: 
Frontend có nút "Thu hồi" (Revoke) cho khóa học đã APPROVED, nhưng backend không hỗ trợ chức năng này. Backend chỉ cho phép:
- **Approve**: PENDING → APPROVED
- **Reject**: PENDING → REJECTED

Không có API endpoint để thu hồi khóa học đã duyệt (APPROVED → PENDING hoặc REJECTED).

---

## 🔍 Analysis

### Frontend Code (Before Fix)

```typescript
@if (course.status === 'PENDING' || course.status === 'pending') {
  <button (click)="approveCourse(course.id)">Phê duyệt</button>
  <button (click)="openRejectModal(course)">Từ chối</button>
} @else {
  <button (click)="viewCourseDetail(course)">Xem chi tiết</button>
  @if (course.status === 'APPROVED' || course.status === 'approved') {
    <button (click)="openRejectModal(course)">Thu hồi</button>  // ❌ PROBLEM
  }
}
```

**Problem**: Nút "Thu hồi" gọi `openRejectModal()` → `rejectCourse()` → API `/reject` → Backend validation fails vì course không ở trạng thái PENDING.

### Backend Validation

```java
// AdminService.java
public void rejectCourse(String courseId, String comment) {
    Course course = courseRepository.findById(courseId)
        .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học"));
    
    if (course.getReviewStatus() != CourseReviewStatus.PENDING) {
        throw new RuntimeException(
            "Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt. " +
            "Trạng thái hiện tại: " + course.getReviewStatus()
        );
    }
    // ...
}
```

**Backend is correct** - it properly validates that only PENDING courses can be rejected.

---

## ✅ Solution

**Remove the "Thu hồi" button** for approved courses.

### Reasons:
1. **No backend support** - API doesn't allow revoking approved courses
2. **Not in requirements** - Original spec doesn't mention course revocation
3. **Business logic** - Once approved, courses should remain stable
4. **Better UX** - If revocation is needed, it should be a separate, more deliberate process

### Code Change

**Before**:
```typescript
} @else {
  <button (click)="viewCourseDetail(course)"
          class="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
    Xem chi tiết
  </button>
  @if (course.status === 'APPROVED' || course.status === 'approved') {
    <button (click)="openRejectModal(course)"
            class="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium">
      Thu hồi
    </button>
  }
}
```

**After**:
```typescript
} @else {
  <button (click)="viewCourseDetail(course)"
          class="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
    Xem chi tiết
  </button>
}
```

**Changes**:
- ✅ Removed "Thu hồi" button for approved courses
- ✅ Changed "Xem chi tiết" button from `flex-1` to `w-full` for better layout

---

## 🧪 Testing

### Test Cases

#### TC-01: PENDING Course Actions
1. Navigate to Course Management (`/admin/courses`)
2. Find a course with status PENDING
3. ✅ **Expected**: Shows "Phê duyệt" and "Từ chối" buttons
4. Click "Từ chối"
5. ✅ **Expected**: Opens reject modal, can reject successfully

#### TC-02: APPROVED Course Actions
1. Navigate to Course Management
2. Find a course with status APPROVED
3. ✅ **Expected**: Shows only "Xem chi tiết" button
4. ✅ **Expected**: NO "Thu hồi" button
5. Click "Xem chi tiết"
6. ✅ **Expected**: Opens course detail modal

#### TC-03: REJECTED Course Actions
1. Navigate to Course Management
2. Find a course with status REJECTED
3. ✅ **Expected**: Shows only "Xem chi tiết" button
4. ✅ **Expected**: NO action buttons for re-approval

---

## 📊 Impact

### Before Fix
- ❌ "Thu hồi" button visible for approved courses
- ❌ Clicking "Thu hồi" causes error
- ❌ Confusing error message for users
- ❌ Poor user experience

### After Fix
- ✅ No "Thu hồi" button for approved courses
- ✅ Only "Xem chi tiết" button shown
- ✅ No errors when interacting with approved courses
- ✅ Clear, consistent UI

---

## 🔮 Future Considerations

If course revocation is needed in the future, implement it properly:

### Option 1: Add Revoke API Endpoint
```java
@PostMapping("/{courseId}/revoke")
public ResponseEntity<?> revokeCourse(
    @PathVariable String courseId,
    @RequestBody RevokeRequest request
) {
    // Validate admin permissions
    // Add audit log
    // Change status: APPROVED → PENDING or REJECTED
    // Notify teacher
    return ResponseEntity.ok(new ApiResponse("success", "Đã thu hồi khóa học"));
}
```

### Option 2: Add Status Transition Workflow
```
PENDING → APPROVED → SUSPENDED → ARCHIVED
         ↓
      REJECTED
```

### Option 3: Soft Delete with Reason
- Keep course as APPROVED
- Add `suspended` flag
- Require admin approval to unsuspend

---

## 📁 Files Modified

- `fe/src/app/features/admin/presentation/components/course-management.component.ts`

### Changes Summary
1. Removed conditional "Thu hồi" button for approved courses
2. Updated "Xem chi tiết" button styling to full width
3. Simplified template logic

---

## 📅 Timeline

- **Issue Reported**: December 1, 2024
- **Root Cause Identified**: December 1, 2024
- **Fix Applied**: December 1, 2024
- **Status**: ✅ Fixed, Ready for Testing

---

## 🎯 Related Issues

- **BUG_FIX_COURSE_MANAGEMENT_MODAL.md** - Fixed reject modal overlay and API integration
- **BUG_FIX_REJECT_BUTTON.md** - Fixed reject button functionality
- **BUG_FIX_MODAL_OVERLAY.md** - Fixed modal overlay issues

---

## 👤 Author

**Fixed by**: Kiro AI Assistant  
**Reviewed by**: Pending  
**Approved by**: Pending

---

## 📝 Notes

- This fix aligns frontend behavior with backend validation
- No backend changes required
- Maintains data integrity by preventing invalid state transitions
- Improves user experience by removing confusing error scenarios
