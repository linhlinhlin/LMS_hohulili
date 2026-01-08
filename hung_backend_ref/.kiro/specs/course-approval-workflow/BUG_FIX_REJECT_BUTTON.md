# 🐛 Bug Fix: Nút Từ Chối Không Hoạt Động

## Ngày: December 1, 2024

---

## 🔍 Vấn đề

### Issue 1: Overlay Màu Xám Che Nút Từ Chối
**Mô tả**: Khi click nút "Từ chối" trong modal, có lớp overlay màu xám `bg-gray-500 bg-opacity-75` che phủ và ngăn không cho click vào nút.

**Nguyên nhân**: Component `course-management.component.ts` có 2 modal với overlay màu xám:
- Reject modal overlay
- Detail modal overlay

### Issue 2: Nút Từ Chối Trong Form Không Hoạt Động
**Mô tả**: Nút "Từ chối" trong reject modal không trigger function `confirmReject()`.

**Nguyên nhân**: 
- Z-index không đủ cao, bị overlay khác che
- Có thể có conflict với modal khác

---

## ✅ Giải Pháp Đã Áp Dụng

### 1. Xóa Overlay Màu Xám Trong Course Management

**File**: `fe/src/app/features/admin/presentation/components/course-management.component.ts`

**Thay đổi**:
```typescript
// ❌ TRƯỚC (có overlay màu xám)
<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeRejectModal()"></div>

// ✅ SAU (xóa overlay)
<div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
```

**Vị trí**:
- Line ~293: Reject modal overlay - ✅ Đã xóa
- Line ~350: Detail modal overlay - ✅ Đã xóa

### 2. Tăng Z-Index Cho Reject Modal

**File**: `fe/src/app/features/admin/presentation/components/course-review.component.ts`

**Thay đổi**:
```typescript
// ❌ TRƯỚC
<div *ngIf="rejectModalOpen()" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">

// ✅ SAU
<div *ngIf="rejectModalOpen()" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
  <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative z-[61]">
```

**Lý do**: 
- Tăng z-index từ `z-50` lên `z-[60]` để đảm bảo modal nằm trên tất cả overlay khác
- Content div có `z-[61]` để nút bấm nằm trên cùng

### 3. Thêm Debug Logging

**File**: `fe/src/app/features/admin/presentation/components/course-review.component.ts`

**Thêm vào function `confirmReject()`**:
```typescript
confirmReject() {
  console.log('[CourseReview] confirmReject called');
  console.log('[CourseReview] rejectComment:', this.rejectComment);
  console.log('[CourseReview] selectedCourse:', this.selectedCourse);
  
  if (!this.rejectComment.trim()) {
    alert('⚠️ Vui lòng nhập lý do từ chối');
    return;
  }
  
  if (!this.selectedCourse) {
    console.error('[CourseReview] No selected course!');
    return;
  }
  
  console.log('[CourseReview] Calling rejectCourse API...');
  this.rejecting.set(true);
  // ... rest of code
}
```

**Mục đích**: Giúp debug và xác định chính xác vấn đề nếu nút vẫn không hoạt động.

---

## 📋 Checklist Kiểm Tra

### Sau khi áp dụng fix, hãy test:

- [ ] **Test 1**: Click nút "Từ chối" từ danh sách khóa học
  - Reject modal phải mở
  - Không có overlay màu xám
  - Chỉ có overlay màu đen mờ

- [ ] **Test 2**: Trong reject modal, nhập lý do và click "Từ chối"
  - Nút phải hoạt động
  - Console log phải hiện:
    - `[CourseReview] confirmReject called`
    - `[CourseReview] rejectComment: <lý do>`
    - `[CourseReview] selectedCourse: <course object>`
    - `[CourseReview] Calling rejectCourse API...`
  - API call phải được gửi
  - Alert thành công phải hiện

- [ ] **Test 3**: Click nút "Từ chối" từ detail modal
  - Detail modal phải đóng
  - Reject modal phải mở
  - Không có conflict giữa 2 modal

- [ ] **Test 4**: Kiểm tra course-management component
  - Modal vẫn hoạt động bình thường
  - Không có overlay màu xám
  - Nút trong modal vẫn click được

---

## 🔧 Files Đã Sửa

1. ✅ `fe/src/app/features/admin/presentation/components/course-management.component.ts`
   - Xóa 2 overlay màu xám (reject modal + detail modal)

2. ✅ `fe/src/app/features/admin/presentation/components/course-review.component.ts`
   - Tăng z-index của reject modal
   - Thêm debug logging vào `confirmReject()`

---

## 🎯 Kết Quả Mong Đợi

### Trước Fix:
- ❌ Overlay màu xám che nút
- ❌ Nút từ chối không click được
- ❌ Không có feedback khi click

### Sau Fix:
- ✅ Không có overlay màu xám
- ✅ Nút từ chối click được
- ✅ Console log hiện khi click
- ✅ API call được gửi đi
- ✅ Alert thành công hiện ra

---

## 📊 Trạng Thái

**Status**: ✅ Fix Applied - Cần Test

**Next Steps**:
1. Test lại tất cả modal interactions
2. Kiểm tra console logs
3. Xác nhận API calls hoạt động
4. Xóa debug logs nếu không cần thiết

---

## 🐛 Issue 3: Backend Logic Error - Cannot Reject Approved Courses

### Vấn Đề
**Error Message**: 
```
Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt. Trạng thái hiện tại: Đã duyệt
```

**Nguyên Nhân**: 
Backend method `reviewCourse()` chỉ cho phép review khóa học ở trạng thái PENDING. Điều này ngăn admin từ chối (thu hồi) khóa học đã được duyệt.

**File**: `api/src/main/java/com/example/lms/service/AdminService.java`

### Giải Pháp

**Thay đổi logic validation**:

```java
// ❌ TRƯỚC - Chỉ cho phép review PENDING courses
if (course.getStatus() != Course.CourseStatus.PENDING) {
    throw new RuntimeException("Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt...");
}

// ✅ SAU - Phân biệt approve và reject
// Allow approve only for PENDING courses
if (request.isApproved() && course.getStatus() != Course.CourseStatus.PENDING) {
    throw new RuntimeException("Chỉ có thể duyệt khóa học ở trạng thái chờ duyệt. " +
        "Trạng thái hiện tại: " + course.getStatus().getDisplayName());
}

// Allow reject for PENDING or APPROVED courses (revoke approval)
if (!request.isApproved() && 
    course.getStatus() != Course.CourseStatus.PENDING && 
    course.getStatus() != Course.CourseStatus.APPROVED) {
    throw new RuntimeException("Chỉ có thể từ chối khóa học ở trạng thái chờ duyệt hoặc đã duyệt. " +
        "Trạng thái hiện tại: " + course.getStatus().getDisplayName());
}
```

**Kết quả**:
- ✅ Admin có thể approve khóa học PENDING
- ✅ Admin có thể reject khóa học PENDING
- ✅ Admin có thể reject (thu hồi) khóa học APPROVED
- ❌ Admin không thể approve khóa học đã APPROVED
- ❌ Admin không thể reject khóa học REJECTED hoặc DRAFT

---

## 📊 Tổng Kết Tất Cả Bug Fixes

### Frontend Fixes:
1. ✅ Xóa overlay màu xám trong course-management component
2. ✅ Tăng z-index cho reject modal trong course-review component
3. ✅ Thêm debug logging cho confirmReject()

### Backend Fixes:
4. ✅ Sửa logic validation để cho phép reject approved courses

### Files Đã Sửa:
1. `fe/src/app/features/admin/presentation/components/course-management.component.ts`
2. `fe/src/app/features/admin/presentation/components/course-review.component.ts`
3. `api/src/main/java/com/example/lms/service/AdminService.java`

---

**Last Updated**: December 1, 2024  
**Fixed By**: Kiro AI Assistant
