# Bug Fix: Revoke Modal Overlay Issue

## Vấn đề
Khi nhấn nút "Thu hồi" khóa học, modal bị che phủ bởi overlay `<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>`, khiến người dùng không thể tương tác với modal.

## Nguyên nhân
Overlay div được đặt riêng biệt và có thể che phủ cả modal content, gây ra vấn đề về z-index và event handling.

## Giải pháp

### 1. Frontend - Xóa Overlay Div Riêng Biệt
**File**: `fe/src/app/features/admin/presentation/components/course-management.component.ts`

**Thay đổi**:
- Xóa div overlay riêng biệt: `<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeRevokeModal()"></div>`
- Di chuyển event handler `(click)="closeRevokeModal()"` lên container chính
- Thêm `(click)="$event.stopPropagation()"` vào modal content để ngăn event bubbling

**Trước**:
```html
<div class="fixed inset-0 z-50 overflow-y-auto">
  <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeRevokeModal()"></div>
    
    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
```

**Sau**:
```html
<div class="fixed inset-0 z-50 overflow-y-auto" (click)="closeRevokeModal()">
  <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    
    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" (click)="$event.stopPropagation()">
```

### 2. Backend - Thêm Debug Logging
**File**: `api/src/main/java/com/example/lms/controller/AdminController.java`

Thêm logging chi tiết để debug lỗi 403:
```java
@PatchMapping("/courses/{courseId}/revoke")
public ResponseEntity<ApiResponse<String>> revokeCourse(
        @PathVariable UUID courseId,
        @AuthenticationPrincipal User currentUser,
        @Valid @RequestBody RevokeCourseRequest request
) {
    System.out.println("🔍 REVOKE ENDPOINT CALLED");
    System.out.println("📋 Course ID: " + courseId);
    System.out.println("👤 Current User: " + (currentUser != null ? currentUser.getEmail() : "NULL"));
    System.out.println("🔑 User Role: " + (currentUser != null ? currentUser.getRole() : "NULL"));
    System.out.println("📝 Reason: " + (request != null ? request.getReason() : "NULL"));
    
    try {
        adminService.revokeCourse(courseId, request.getReason(), currentUser);
        return ResponseEntity.ok(ApiResponse.success("Khóa học đã được thu hồi"));
    } catch (RuntimeException e) {
        System.err.println("❌ Error revoking course: " + e.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
    }
}
```

## Lỗi 403 - Troubleshooting

Lỗi 403 có thể do:

1. **User không có role ADMIN**: Kiểm tra token JWT và role của user hiện tại
2. **Token hết hạn**: Đăng nhập lại để lấy token mới
3. **SecurityConfig không cho phép endpoint**: Đã kiểm tra - endpoint `/api/v1/admin/**` đã được cấu hình đúng cho role ADMIN

### Các bước kiểm tra:
1. Mở browser console và kiểm tra request headers có chứa `Authorization: Bearer <token>`
2. Kiểm tra backend logs để xem:
   - Endpoint có được gọi không (nếu không thấy log "🔍 REVOKE ENDPOINT CALLED" nghĩa là request bị chặn ở security layer)
   - User role là gì
3. Nếu cần, tạo admin user mới bằng script SQL hoặc dev endpoint

## Kết quả
- Modal revoke không còn bị che phủ
- User có thể tương tác bình thường với modal
- Có thể click outside modal để đóng
- Thêm logging để debug lỗi 403

## Testing
1. Đăng nhập với tài khoản admin
2. Vào trang quản lý khóa học
3. Tìm khóa học có status APPROVED
4. Click nút "Thu hồi"
5. Modal hiển thị đúng và không bị che phủ
6. Nhập lý do và submit
7. Kiểm tra backend logs để xem thông tin debug

## Files Changed
- `fe/src/app/features/admin/presentation/components/course-management.component.ts`
- `api/src/main/java/com/example/lms/controller/AdminController.java`
