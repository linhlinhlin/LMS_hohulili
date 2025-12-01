# Bug Fix: Modal Overlay Remains After Approve/Reject

## 🐛 Issue Description

**Problem**: Khi click nút "Phê duyệt" hoặc "Từ chối" từ modal chi tiết khóa học, overlay (lớp phủ mờ `bg-gray-500 bg-opacity-75`) vẫn còn che màn hình sau khi modal đóng.

**Affected Component**: `course-review.component.ts`

**Root Cause**: Modal detail không được đóng đúng cách trước khi thực hiện action approve/reject, dẫn đến overlay vẫn còn trong DOM.

---

## ✅ Solution

### Changes Made

**File**: `fe/src/app/features/admin/presentation/components/course-review.component.ts`

#### 1. Fix `approveCourseFromModal()`

**Before**:
```typescript
approveCourseFromModal() {
  if (!this.courseDetails) return;
  this.approveCourse(this.courseDetails.id);
}
```

**After**:
```typescript
approveCourseFromModal() {
  if (!this.courseDetails) return;
  const courseId = this.courseDetails.id;
  this.closeDetailModal(); // Đóng modal trước khi approve
  this.approveCourse(courseId);
}
```

**Reason**: Đóng modal detail trước khi gọi approve để đảm bảo overlay được remove khỏi DOM.

---

#### 2. Fix `showRejectModalFromDetail()`

**Before**:
```typescript
showRejectModalFromDetail() {
  if (!this.courseDetails) return;
  this.closeDetailModal();
  this.showRejectModal(this.courseDetails);
}
```

**After**:
```typescript
showRejectModalFromDetail() {
  if (!this.courseDetails) return;
  const course = this.courseDetails;
  this.closeDetailModal(); // Đóng modal detail trước
  // Delay nhỏ để đảm bảo modal detail đã đóng hoàn toàn
  setTimeout(() => {
    this.showRejectModal(course);
  }, 100);
}
```

**Reason**: Thêm delay 100ms để đảm bảo modal detail đã đóng hoàn toàn trước khi mở modal reject, tránh conflict giữa 2 modal.

---

#### 3. Update `approveCourse()`

**Added**:
```typescript
// Đảm bảo modal detail đã đóng
if (this.detailModalOpen()) {
  this.closeDetailModal();
}
```

**Reason**: Double-check để đảm bảo modal detail được đóng sau khi approve thành công.

---

#### 4. Update `confirmReject()`

**Added**:
```typescript
// Đảm bảo modal detail cũng đã đóng
if (this.detailModalOpen()) {
  this.closeDetailModal();
}
```

**Reason**: Double-check để đảm bảo modal detail được đóng sau khi reject thành công.

---

## 🧪 Testing

### Test Cases

1. **TC-01: Approve from Detail Modal**
   - Open course detail modal
   - Click "Duyệt khóa học"
   - Confirm approval
   - ✅ Expected: Modal closes, overlay disappears, success message shows

2. **TC-02: Reject from Detail Modal**
   - Open course detail modal
   - Click "Từ chối"
   - ✅ Expected: Detail modal closes, reject modal opens, no overlay conflict

3. **TC-03: Approve from Table**
   - Click "Duyệt" button directly from table
   - Confirm approval
   - ✅ Expected: Works as before, no regression

4. **TC-04: Reject from Table**
   - Click "Từ chối" button directly from table
   - ✅ Expected: Reject modal opens, works as before

---

## 📝 Technical Details

### Modal State Management

The component uses Angular signals for modal state:

```typescript
detailModalOpen = signal(false);  // Course detail modal
rejectModalOpen = signal(false);  // Reject modal
```

### Z-Index Hierarchy

```
Base page: z-0
Detail modal overlay: z-50
Detail modal content: z-50
Reject modal overlay: z-50
Reject modal content: z-50
```

### Issue with Multiple Modals

When both modals are open simultaneously (even briefly), their overlays can stack and cause issues. The fix ensures:

1. Only one modal is open at a time
2. Previous modal is fully closed before opening next
3. State is properly cleaned up after actions

---

## 🔍 Root Cause Analysis

### Why the Bug Occurred

1. **Timing Issue**: `approveCourseFromModal()` called `approveCourse()` while modal was still open
2. **State Conflict**: Modal state (`detailModalOpen`) was not set to false before action
3. **DOM Cleanup**: Angular's change detection didn't remove overlay before new state

### Why the Fix Works

1. **Explicit Close**: Call `closeDetailModal()` before any action
2. **State First**: Set modal state to false before API call
3. **Delay for Transition**: 100ms delay allows DOM cleanup to complete
4. **Double Check**: Verify modal is closed after successful action

---

## 📊 Impact

### Before Fix
- ❌ Overlay remains after approve
- ❌ User cannot interact with page
- ❌ Must refresh page to continue

### After Fix
- ✅ Overlay properly removed
- ✅ User can continue working
- ✅ Smooth user experience

---

## 🚀 Deployment

### Files Changed
- `fe/src/app/features/admin/presentation/components/course-review.component.ts`

### Deployment Steps
1. Commit changes
2. Build frontend: `npm run build`
3. Deploy to staging
4. Test all modal interactions
5. Deploy to production

### Rollback Plan
If issues occur, revert commit and redeploy previous version.

---

## 📅 Timeline

- **Bug Reported**: December 1, 2024
- **Fix Implemented**: December 1, 2024
- **Status**: ✅ Fixed, Ready for Testing

---

## 👤 Author

**Fixed by**: Kiro AI Assistant  
**Reviewed by**: Pending  
**Approved by**: Pending
