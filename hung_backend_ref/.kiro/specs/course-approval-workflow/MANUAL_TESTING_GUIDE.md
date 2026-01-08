# Manual Testing Guide - Course Approval Workflow

## 📋 Tổng quan

Hướng dẫn này cung cấp các test case chi tiết để kiểm tra toàn bộ quy trình phê duyệt khóa học. Thực hiện theo thứ tự để đảm bảo tất cả tính năng hoạt động đúng.

**Thời gian ước tính**: 2-3 giờ  
**Yêu cầu**: Backend và Frontend đang chạy

---

## 🔧 Chuẩn bị

### 1. Khởi động Hệ thống

```bash
# Backend
cd api
./mvnw spring-boot:run

# Frontend
cd fe
npm start
```

### 2. Tài khoản Test

Cần 3 loại tài khoản:

| Vai trò | Username | Password | Email |
|---------|----------|----------|-------|
| Teacher | teacher | password | teacher@example.com |
| Admin | admin | password | admin@example.com |
| Student | student | password | student@example.com |

### 3. Dữ liệu Test

- Tạo sẵn 1-2 khóa học ở mỗi trạng thái
- Chuẩn bị file video/tài liệu để upload
- Có danh sách test cases để check off

---

## 🧪 Test Cases

## Phase 1: Teacher Workflow - Tạo và Gửi Khóa học

### TC-01: Tạo Khóa học Mới

**Mục đích**: Verify khóa học mới được tạo với trạng thái DRAFT

**Steps**:
1. Đăng nhập với tài khoản teacher
2. Vào "Khóa học của tôi"
3. Click "Tạo khóa học mới"
4. Điền thông tin:
   - Mã: TEST001
   - Tên: "Khóa học Test Phê duyệt"
   - Mô tả: "Đây là khóa học để test quy trình phê duyệt"
   - Danh mục: "Kỹ thuật tàu biển"
5. Click "Tạo khóa học"

**Expected Result**:
- ✅ Khóa học được tạo thành công
- ✅ Hiển thị trong danh sách với badge "Nháp" (màu xám)
- ✅ Có nút "Gửi duyệt"
- ✅ Có nút "Sửa"
- ✅ KHÔNG có nút "Hủy yêu cầu"

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-02: Xây dựng Nội dung Khóa học

**Mục đích**: Verify có thể thêm chương và bài học vào khóa học DRAFT

**Steps**:
1. Click vào khóa học vừa tạo
2. Click "Thêm chương"
3. Nhập tên: "Chương 1: Giới thiệu"
4. Click "Lưu"
5. Click "Thêm bài học" trong chương 1
6. Nhập:
   - Tên: "Bài 1: Tổng quan"
   - Loại: Video
7. Click "Lưu"
8. Thêm ít nhất 2 chương và 4 bài học

**Expected Result**:
- ✅ Có thể thêm chương thành công
- ✅ Có thể thêm bài học thành công
- ✅ Nội dung được lưu đúng
- ✅ Hiển thị số chương/bài học chính xác

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-03: Gửi Khóa học để Phê duyệt

**Mục đích**: Verify chuyển trạng thái từ DRAFT → PENDING

**Steps**:
1. Quay lại "Khóa học của tôi"
2. Tìm khóa học TEST001
3. Click nút "Gửi duyệt"
4. Xác nhận trong dialog

**Expected Result**:
- ✅ Hiển thị thông báo thành công
- ✅ Badge chuyển sang "Chờ duyệt" (màu vàng)
- ✅ Nút "Gửi duyệt" biến mất
- ✅ Xuất hiện nút "Hủy yêu cầu"
- ✅ Nút "Sửa" bị disable với tooltip giải thích

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-04: Không thể Chỉnh sửa Khóa học PENDING

**Mục đích**: Verify không thể edit khóa học đang chờ duyệt

**Steps**:
1. Click vào khóa học TEST001 (đang PENDING)
2. Thử click nút "Sửa"

**Expected Result**:
- ✅ Nút "Sửa" bị disable
- ✅ Hiển thị tooltip: "Không thể sửa khóa học đang chờ duyệt"
- ✅ Hoặc redirect với thông báo lỗi nếu vào trực tiếp URL

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-05: Hủy Yêu cầu Phê duyệt

**Mục đích**: Verify chuyển trạng thái từ PENDING → DRAFT

**Steps**:
1. Ở "Khóa học của tôi"
2. Tìm khóa học TEST001 (PENDING)
3. Click nút "Hủy yêu cầu"
4. Xác nhận trong dialog

**Expected Result**:
- ✅ Hiển thị thông báo thành công
- ✅ Badge chuyển về "Nháp" (màu xám)
- ✅ Nút "Hủy yêu cầu" biến mất
- ✅ Nút "Gửi duyệt" xuất hiện lại
- ✅ Nút "Sửa" hoạt động bình thường

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

## Phase 2: Admin Workflow - Xem xét và Phê duyệt

### TC-06: Xem Danh sách Khóa học Chờ duyệt

**Mục đích**: Verify admin có thể xem danh sách PENDING courses

**Preparation**:
- Gửi lại khóa học TEST001 để phê duyệt (từ tài khoản teacher)

**Steps**:
1. Đăng xuất teacher
2. Đăng nhập với tài khoản admin
3. Vào menu "Duyệt khóa học"

**Expected Result**:
- ✅ Hiển thị danh sách khóa học chờ duyệt
- ✅ Khóa học TEST001 xuất hiện trong danh sách
- ✅ Hiển thị đúng: tên, mã, giảng viên, ngày gửi
- ✅ Có nút "Xem chi tiết", "Duyệt", "Từ chối"
- ✅ Badge "Chờ duyệt" màu vàng

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-07: Tìm kiếm Khóa học

**Mục đích**: Verify search functionality

**Steps**:
1. Ở trang "Duyệt khóa học"
2. Nhập "Test" vào ô tìm kiếm
3. Click "Tìm kiếm" hoặc Enter

**Expected Result**:
- ✅ Danh sách lọc chỉ hiển thị khóa học có "Test" trong tên
- ✅ Khóa học TEST001 vẫn hiển thị
- ✅ Các khóa học khác bị ẩn

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-08: Lọc theo Trạng thái

**Mục đích**: Verify status filter

**Steps**:
1. Chọn "Tất cả trạng thái" từ dropdown
2. Verify hiển thị tất cả khóa học
3. Chọn "Chờ duyệt"
4. Verify chỉ hiển thị khóa học PENDING
5. Chọn "Đã duyệt"
6. Verify chỉ hiển thị khóa học APPROVED

**Expected Result**:
- ✅ Filter hoạt động đúng cho mỗi trạng thái
- ✅ Số lượng khóa học thay đổi phù hợp
- ✅ Badge màu sắc đúng với trạng thái

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-09: Xem Chi tiết Khóa học

**Mục đích**: Verify course detail modal

**Steps**:
1. Ở danh sách chờ duyệt
2. Click "Xem chi tiết" trên khóa học TEST001

**Expected Result**:
- ✅ Modal mở ra hiển thị đầy đủ thông tin:
  - Tên khóa học
  - Mã khóa học
  - Mô tả
  - Tên giảng viên
  - Email giảng viên
  - Số chương
  - Số bài học
  - Ngày tạo
  - Ngày gửi duyệt
- ✅ Badge trạng thái "Chờ duyệt"
- ✅ Có nút "Duyệt khóa học" (xanh)
- ✅ Có nút "Từ chối" (đỏ)
- ✅ Có nút "Đóng"

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-10: Phê duyệt Khóa học

**Mục đích**: Verify approve functionality (PENDING → APPROVED)

**Steps**:
1. Trong modal chi tiết khóa học TEST001
2. Click nút "Duyệt khóa học"
3. Xác nhận trong dialog

**Expected Result**:
- ✅ Hiển thị thông báo thành công
- ✅ Modal đóng lại
- ✅ Khóa học biến mất khỏi danh sách "Chờ duyệt"
- ✅ Chuyển filter sang "Đã duyệt" → khóa học xuất hiện
- ✅ Badge chuyển sang "Đã duyệt" (màu xanh)

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-11: Từ chối Khóa học (Không có comment)

**Mục đích**: Verify rejection requires comment

**Preparation**:
- Tạo và gửi khóa học TEST002 từ tài khoản teacher

**Steps**:
1. Ở trang admin "Duyệt khóa học"
2. Tìm khóa học TEST002 (PENDING)
3. Click "Từ chối"
4. Để trống ô "Lý do từ chối"
5. Click "Từ chối khóa học"

**Expected Result**:
- ✅ Hiển thị lỗi validation
- ✅ Thông báo: "Vui lòng nhập lý do từ chối"
- ✅ Nút "Từ chối khóa học" bị disable khi comment trống
- ✅ Khóa học KHÔNG bị từ chối

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-12: Từ chối Khóa học (Có comment)

**Mục đích**: Verify reject functionality (PENDING → REJECTED)

**Steps**:
1. Click "Từ chối" trên khóa học TEST002
2. Nhập lý do: "Nội dung chương 1 cần bổ sung thêm ví dụ thực tế. Video bài 2 không rõ ràng."
3. Click "Từ chối khóa học"

**Expected Result**:
- ✅ Hiển thị thông báo thành công
- ✅ Modal đóng lại
- ✅ Khóa học biến mất khỏi danh sách "Chờ duyệt"
- ✅ Chuyển filter sang "Bị từ chối" → khóa học xuất hiện
- ✅ Badge chuyển sang "Bị từ chối" (màu đỏ)

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

## Phase 3: Teacher Workflow - Xử lý Phản hồi

### TC-13: Xem Phản hồi Từ chối

**Mục đích**: Verify teacher can view rejection feedback

**Steps**:
1. Đăng xuất admin
2. Đăng nhập lại với tài khoản teacher
3. Vào "Khóa học của tôi"
4. Tìm khóa học TEST002 (REJECTED)
5. Click nút "Xem phản hồi"

**Expected Result**:
- ✅ Hiển thị modal/alert với phản hồi đầy đủ:
  - Lý do từ chối
  - Tên admin đã từ chối
  - Thời gian từ chối
- ✅ Nội dung phản hồi chính xác như admin đã nhập
- ✅ Badge "Bị từ chối" màu đỏ
- ✅ Có nút "Gửi duyệt" để gửi lại

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-14: Chỉnh sửa và Gửi lại Khóa học Bị từ chối

**Mục đích**: Verify can edit and resubmit rejected course

**Steps**:
1. Click vào khóa học TEST002 (REJECTED)
2. Click "Sửa"
3. Thêm nội dung vào chương 1
4. Lưu thay đổi
5. Quay lại "Khóa học của tôi"
6. Click "Gửi duyệt" trên TEST002

**Expected Result**:
- ✅ Có thể chỉnh sửa khóa học REJECTED
- ✅ Thay đổi được lưu thành công
- ✅ Có thể gửi lại để phê duyệt
- ✅ Trạng thái chuyển từ REJECTED → PENDING
- ✅ Badge chuyển sang "Chờ duyệt"

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

## Phase 4: Advanced Scenarios

### TC-15: Chỉnh sửa Khóa học Đã duyệt

**Mục đích**: Verify editing approved course requires re-approval

**Steps**:
1. Ở "Khóa học của tôi"
2. Tìm khóa học TEST001 (APPROVED)
3. Click "Sửa"

**Expected Result**:
- ✅ Hiển thị cảnh báo modal:
  > "⚠️ Chỉnh sửa khóa học này sẽ yêu cầu phê duyệt lại"
- ✅ Có nút "Tiếp tục" và "Hủy"
- ✅ Nếu click "Tiếp tục":
  - Cho phép chỉnh sửa
  - Sau khi lưu, trạng thái chuyển APPROVED → PENDING
  - Badge chuyển sang "Chờ duyệt"

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-16: Pagination

**Mục đích**: Verify pagination works correctly

**Preparation**:
- Tạo ít nhất 15 khóa học ở trạng thái PENDING

**Steps**:
1. Đăng nhập admin
2. Vào "Duyệt khóa học"
3. Verify hiển thị "Trang 1 / 2"
4. Click nút "Sau"
5. Verify chuyển sang trang 2
6. Click nút "Trước"
7. Verify quay lại trang 1

**Expected Result**:
- ✅ Hiển thị 10 khóa học mỗi trang
- ✅ Pagination controls hoạt động đúng
- ✅ Hiển thị đúng số trang
- ✅ Nút "Trước" disable ở trang 1
- ✅ Nút "Sau" disable ở trang cuối

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

## Phase 5: Student Visibility

### TC-17: Khóa học DRAFT không hiển thị

**Mục đích**: Verify DRAFT courses are hidden from students

**Steps**:
1. Đăng xuất
2. Đăng nhập với tài khoản student
3. Vào "Khóa học" (marketplace)
4. Tìm kiếm khóa học DRAFT

**Expected Result**:
- ✅ Không tìm thấy khóa học DRAFT
- ✅ Không thể truy cập trực tiếp qua URL

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-18: Khóa học PENDING không hiển thị

**Mục đích**: Verify PENDING courses are hidden from students

**Steps**:
1. Với tài khoản student
2. Tìm kiếm khóa học PENDING
3. Thử truy cập trực tiếp URL: `/courses/{id}` của khóa học PENDING

**Expected Result**:
- ✅ Không tìm thấy trong marketplace
- ✅ Truy cập trực tiếp hiển thị lỗi 404 hoặc "Không có quyền"

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-19: Khóa học APPROVED hiển thị

**Mục đích**: Verify APPROVED courses are visible to students

**Steps**:
1. Với tài khoản student
2. Vào marketplace
3. Tìm khóa học TEST001 (APPROVED)

**Expected Result**:
- ✅ Khóa học hiển thị trong danh sách
- ✅ Có thể xem chi tiết
- ✅ Có nút "Đăng ký học"
- ✅ Có thể đăng ký thành công

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-20: Khóa học REJECTED không hiển thị

**Mục đích**: Verify REJECTED courses are hidden from students

**Steps**:
1. Với tài khoản student
2. Tìm kiếm khóa học REJECTED
3. Thử truy cập trực tiếp URL

**Expected Result**:
- ✅ Không tìm thấy trong marketplace
- ✅ Không thể truy cập trực tiếp

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

## Phase 6: Edge Cases

### TC-21: Học viên Đã đăng ký vẫn Truy cập được khi Khóa học PENDING

**Mục đích**: Verify enrolled students retain access when course goes to PENDING

**Preparation**:
- Đăng ký khóa học TEST001 với tài khoản student
- Chỉnh sửa TEST001 từ tài khoản teacher (chuyển sang PENDING)

**Steps**:
1. Đăng nhập với tài khoản student đã đăng ký
2. Vào "Khóa học của tôi"
3. Tìm khóa học TEST001
4. Click vào khóa học

**Expected Result**:
- ✅ Vẫn thấy khóa học trong "Khóa học của tôi"
- ✅ Vẫn truy cập được nội dung
- ✅ Có thể học bình thường
- ✅ Học viên MỚI không thể đăng ký

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-22: Không thể Gửi khóa học Trống

**Mục đích**: Verify cannot submit empty course

**Steps**:
1. Đăng nhập teacher
2. Tạo khóa học mới TEST003
3. KHÔNG thêm chương/bài học
4. Thử click "Gửi duyệt"

**Expected Result**:
- ✅ Hiển thị lỗi validation
- ✅ Yêu cầu thêm nội dung trước khi gửi
- ✅ Không chuyển sang PENDING

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

### TC-23: Concurrent Approval/Rejection

**Mục đích**: Verify system handles concurrent admin actions

**Preparation**:
- Cần 2 tài khoản admin

**Steps**:
1. Admin 1 mở modal chi tiết khóa học TEST002
2. Admin 2 cũng mở modal chi tiết khóa học TEST002
3. Admin 1 click "Duyệt"
4. Admin 2 click "Từ chối"

**Expected Result**:
- ✅ Chỉ action đầu tiên được thực hiện
- ✅ Action thứ 2 hiển thị lỗi: "Khóa học đã được xử lý"
- ✅ Trạng thái cuối cùng nhất quán

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________________________________

---

## 📊 Test Summary

### Overall Results

| Phase | Total Tests | Passed | Failed | Pass Rate |
|-------|-------------|--------|--------|-----------|
| Phase 1: Teacher Create | 5 | ___ | ___ | ___% |
| Phase 2: Admin Review | 7 | ___ | ___ | ___% |
| Phase 3: Teacher Feedback | 2 | ___ | ___ | ___% |
| Phase 4: Advanced | 2 | ___ | ___ | ___% |
| Phase 5: Student Visibility | 4 | ___ | ___ | ___% |
| Phase 6: Edge Cases | 3 | ___ | ___ | ___% |
| **TOTAL** | **23** | **___** | **___** | **___%** |

### Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendations

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 📝 Sign-off

**Tested by**: _______________  
**Date**: _______________  
**Environment**: [ ] Dev [ ] Staging [ ] Production  
**Overall Status**: [ ] Pass [ ] Fail [ ] Pass with Issues  

**Approved for Production**: [ ] Yes [ ] No  
**Approver**: _______________  
**Date**: _______________
