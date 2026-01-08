# Feature: Thu hồi khóa học đã duyệt (Revoke Approved Course)

## Tổng quan
Thêm chức năng cho phép admin thu hồi khóa học đã được duyệt, chuyển về trạng thái DRAFT để teacher có thể chỉnh sửa lại.

## Thay đổi Backend

### 1. AdminService.java
- Thêm method `revokeCourse()`:
  - Chỉ cho phép thu hồi khóa học có status APPROVED
  - Yêu cầu lý do thu hồi (bắt buộc)
  - Chuyển status về DRAFT
  - Lưu lý do thu hồi vào `reviewComment`
  - Lưu thông tin reviewer và thời gian

### 2. AdminController.java
- Thêm endpoint `PATCH /api/v1/admin/courses/{courseId}/revoke`
- Thêm DTO class `RevokeCourseRequest` với field `reason`

## Thay đổi Frontend

### 1. admin.endpoints.ts
- Thêm endpoint `REVOKE_COURSE: (courseId: string) => /api/v1/admin/courses/${courseId}/revoke`

### 2. admin.service.ts
- Thêm method `revokeCourse(courseId: string, reason: string)`

### 3. course-management.component.ts
**State:**
- Thêm `showRevokeModal = signal(false)`
- Thêm `revokeReason = signal('')`

**UI Logic:**
- Nút "Thu hồi" chỉ hiển thị cho khóa học APPROVED
- Nút màu cam (orange) để phân biệt với nút "Từ chối" (đỏ)

**Methods:**
- `openRevokeModal(course)`: Mở modal thu hồi
- `closeRevokeModal()`: Đóng modal
- `revokeCourse()`: Gọi API thu hồi khóa học

**Modal:**
- Giống modal "Từ chối" nhưng:
  - Màu cam thay vì đỏ
  - Icon warning thay vì X
  - Text "Thu hồi khóa học đã duyệt"
  - Thông báo: "Khóa học sẽ chuyển về trạng thái Nháp để giảng viên chỉnh sửa"

## Luồng hoạt động

1. **Admin xem khóa học APPROVED**
   - Hiển thị nút "Xem chi tiết" và "Thu hồi"

2. **Admin click "Thu hồi"**
   - Modal hiện ra yêu cầu nhập lý do

3. **Admin nhập lý do và xác nhận**
   - API được gọi: `PATCH /api/v1/admin/courses/{id}/revoke`
   - Backend kiểm tra:
     - Khóa học phải có status APPROVED
     - Lý do không được rỗng
   - Backend cập nhật:
     - Status → DRAFT
     - reviewComment → lý do thu hồi
     - reviewedAt → thời gian hiện tại
     - reviewedBy → admin hiện tại

4. **Teacher nhận thông báo**
   - Khóa học chuyển về DRAFT
   - Teacher có thể xem lý do thu hồi qua nút "Xem phản hồi"
   - Teacher có thể chỉnh sửa và gửi lại phê duyệt

## Testing

### Test Cases
1. ✅ Thu hồi khóa học APPROVED thành công
2. ✅ Không thể thu hồi khóa học PENDING
3. ✅ Không thể thu hồi khóa học DRAFT
4. ✅ Không thể thu hồi khóa học REJECTED
5. ✅ Lý do thu hồi bắt buộc phải nhập
6. ✅ Teacher có thể xem lý do thu hồi
7. ✅ Teacher có thể chỉnh sửa sau khi bị thu hồi

### Manual Testing Steps
1. Login as admin
2. Navigate to "Quản lý khóa học"
3. Find an APPROVED course
4. Click "Thu hồi" button
5. Enter revoke reason
6. Confirm revoke
7. Verify course status changed to DRAFT
8. Login as teacher
9. Verify teacher can see revoke reason
10. Verify teacher can edit the course

## UI/UX

### Button Colors
- **Phê duyệt** (Approve): Xanh lá (green)
- **Từ chối** (Reject): Đỏ (red)
- **Thu hồi** (Revoke): Cam (orange)

### Modal Design
- Icon: Warning triangle (⚠️)
- Color scheme: Orange
- Clear message about status change to DRAFT
- Required reason field

## Status Flow

```
DRAFT → (Teacher submits) → PENDING
PENDING → (Admin approves) → APPROVED
PENDING → (Admin rejects) → REJECTED
APPROVED → (Admin revokes) → DRAFT ← NEW!
REJECTED → (Teacher resubmits) → PENDING
```

## Completed
- ✅ Backend API endpoint
- ✅ Backend service logic
- ✅ Frontend service method
- ✅ Frontend UI button
- ✅ Frontend modal
- ✅ Validation logic
- ✅ No compilation errors
