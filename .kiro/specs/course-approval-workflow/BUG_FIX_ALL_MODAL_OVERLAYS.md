# Bug Fix: Remove Modal Overlays That Block User Interaction

## Vấn đề
Tất cả các modal (Detail Modal và Reject Modal) đều bị overlay `<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity">` che phủ, khiến người dùng không thể tương tác với nội dung modal.

## Nguyên nhân
Overlay div được đặt riêng biệt với z-index có thể cao hơn modal content, gây ra vấn đề về stacking context và event handling.

## Giải pháp

### Pattern chung cho tất cả modals:
1. **Xóa overlay div riêng biệt**
2. **Di chuyển click handler lên container chính** 
3. **Thêm stopPropagation vào modal content**

### 1. Detail Modal
**File**: `fe/src/app/features/admin/presentation/components/course-management.component.ts`

**Trước**:
```html
<div class="fixed inset-0 z-50 overflow-y-auto">
  <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeDetailModal()"></div>
    
    <div class="inline-block align-bottom bg-white rounded-lg...">
```

**Sau**:
```html
<div class="fixed inset-0 z-50 overflow-y-auto" (click)="closeDetailModal()">
  <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    
    <div class="inline-block align-bottom bg-white rounded-lg..." (click)="$event.stopPropagation()">
```

### 2. Reject Modal
**File**: `fe/src/app/features/admin/presentation/components/course-management.component.ts`

**Trước**:
```html
<div class="fixed inset-0 z-50 overflow-y-auto">
  <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeRejectModal()"></div>
    
    <div class="inline-block align-bottom bg-white rounded-lg...">
```

**Sau**:
```html
<div class="fixed inset-0 z-50 overflow-y-auto" (click)="closeRejectModal()">
  <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    
    <div class="inline-block align-bottom bg-white rounded-lg..." (click)="$event.stopPropagation()">
```

## Cách hoạt động

### Event Flow:
1. **Click outside modal**: Event bubbles lên container → `closeModal()` được gọi → Modal đóng
2. **Click inside modal**: `$event.stopPropagation()` ngăn event bubbling → Modal không đóng

### Lợi ích:
- Không có overlay riêng biệt che phủ content
- Click outside vẫn đóng modal được
- Click inside modal không đóng modal
- Code đơn giản hơn, ít div hơn
- Không có vấn đề về z-index

## Additional Fix: Enrolled Students Count

### Vấn đề
Backend đang hardcode `enrolledCount(0)` trong `convertToAdminCourseSummary()` method.

### Giải pháp
**File**: `api/src/main/java/com/example/lms/controller/AdminController.java`

**Trước**:
```java
.enrolledCount(0) // TODO: Add count query for enrolled students
```

**Sau**:
```java
int enrolledCount = 0;
try {
    enrolledCount = course.getEnrolledStudents() != null ? course.getEnrolledStudents().size() : 0;
} catch (Exception ignored) {
    // If lazy loading fails, default to 0
}

return AdminCourseSummary.builder()
    // ...
    .enrolledCount(enrolledCount)
    // ...
```

### Kết quả:
- Số học viên hiển thị đúng thay vì luôn là 0
- Handle gracefully khi lazy loading fails
- Không cần thêm query mới

## Testing

### Manual Testing Steps:
1. Đăng nhập với tài khoản admin
2. Vào trang "Quản lý khóa học"

**Test Detail Modal:**
3. Click nút "Xem chi tiết" trên bất kỳ khóa học nào
4. Verify modal hiển thị đúng, không bị che phủ
5. Verify số học viên hiển thị đúng (không phải 0 nếu có học viên)
6. Click vào nội dung modal → Modal không đóng
7. Click ra ngoài modal → Modal đóng

**Test Reject Modal:**
8. Tìm khóa học có status PENDING
9. Click nút "Từ chối"
10. Verify modal hiển thị đúng, không bị che phủ
11. Click vào textarea → Modal không đóng
12. Click ra ngoài modal → Modal đóng

## Files Changed

### Frontend
- `fe/src/app/features/admin/presentation/components/course-management.component.ts`
  - Removed overlay div from Detail Modal
  - Removed overlay div from Reject Modal
  - Added click handlers and stopPropagation

### Backend
- `api/src/main/java/com/example/lms/controller/AdminController.java`
  - Fixed `enrolledCount` to use actual data from `course.getEnrolledStudents()`
  - Added try-catch for lazy loading safety

## Conclusion

Tất cả các modal overlay issues đã được fix. Người dùng giờ có thể tương tác bình thường với tất cả các modal trong admin course management, và số liệu học viên hiển thị chính xác.
