# 🔧 Hướng dẫn sửa lỗi Bulk Import Users

## ❌ Vấn đề ban đầu

Khi import người dùng từ file Excel, gặp lỗi **403 Forbidden**:
```
POST http://localhost:8088/api/v1/users/bulk-import 403 (Forbidden)
```

## 🔍 Nguyên nhân

Backend **chưa có endpoint** `/api/v1/users/bulk-import` để xử lý bulk import.

## ✅ Giải pháp đã áp dụng

Thay vì gọi API bulk-import (chưa tồn tại), frontend sẽ:
1. **Đọc file Excel** trực tiếp bằng thư viện `xlsx`
2. **Parse dữ liệu** từ Excel thành JSON
3. **Gọi API create user** từng người dùng một (sequential)
4. **Hiển thị progress** realtime cho user

## 📝 Cách sử dụng

### 1. Tải Template Excel

1. Vào trang **Quản lý người dùng**
2. Click nút **"Import Excel"**
3. Click **"Tải template mẫu"**
4. File `user_import_template_[timestamp].xlsx` sẽ được tải về

### 2. Chuẩn bị dữ liệu

Mở file Excel và điền thông tin theo format:

| Username | Email | Full Name | Department |
|----------|-------|-----------|------------|
| nguyenvana | nguyenvana@student.edu.vn | Nguyễn Văn A | Khoa Hàng hải |
| tranthib | tranthib@student.edu.vn | Trần Thị B | Khoa Hàng hải |

**Lưu ý:**
- **Username**: Tên đăng nhập (bắt buộc)
- **Email**: Email (bắt buộc)
- **Full Name**: Họ tên đầy đủ (bắt buộc)
- **Department**: Phòng ban/Khoa (tùy chọn)
- **Password**: Nếu không có, mặc định là `Password123!`
- **Role**: Nếu không có, sẽ dùng role mặc định được chọn trong modal

### 3. Import File

1. Click **"Chọn file Excel"**
2. Chọn file đã chuẩn bị
3. Chọn **Vai trò mặc định** (STUDENT/TEACHER/ADMIN)
4. Click **"Bắt đầu Import"**

### 4. Theo dõi tiến trình

Hệ thống sẽ hiển thị:
- **Progress bar**: Tiến độ import (%)
- **Trạng thái**: "Đang tạo người dùng X/Y..."
- **Kết quả**: 
  - Tổng số dòng
  - Số người dùng tạo thành công
  - Số người dùng thất bại
  - Danh sách lỗi (nếu có)

## 🎯 Ưu điểm của giải pháp

✅ **Không cần thay đổi backend** - Sử dụng API create user có sẵn
✅ **Xử lý lỗi tốt hơn** - Hiển thị chi tiết lỗi từng dòng
✅ **Progress realtime** - User biết được tiến độ import
✅ **Linh hoạt** - Có thể custom logic validation ở frontend
✅ **Tự động reload** - Danh sách user được cập nhật sau khi import

## ⚠️ Lưu ý

- Import **từng user một** nên có thể chậm với file lớn (>100 users)
- Có delay 100ms giữa mỗi request để tránh quá tải server
- Nếu 1 user thất bại, các user khác vẫn tiếp tục được tạo
- Hiển thị tối đa 10 lỗi đầu tiên trong kết quả

## 🔮 Cải tiến trong tương lai

Nếu muốn tối ưu hơn, có thể:
1. **Implement backend bulk-import API** - Xử lý hàng loạt trên server
2. **Batch processing** - Gửi nhiều user cùng lúc (5-10 users/batch)
3. **Background job** - Upload file và xử lý async ở backend
4. **Validation trước** - Kiểm tra dữ liệu trước khi gửi API

## 📊 Format Excel chi tiết

### Cột bắt buộc:
- **Username**: Tên đăng nhập duy nhất
- **Email**: Email hợp lệ và duy nhất
- **Full Name**: Họ tên đầy đủ

### Cột tùy chọn:
- **Password**: Mật khẩu (mặc định: Password123!)
- **Role**: ADMIN/TEACHER/STUDENT (mặc định: theo lựa chọn trong modal)
- **Department**: Phòng ban/Khoa

### Ví dụ file Excel đầy đủ:

| Username | Email | Full Name | Password | Role | Department |
|----------|-------|-----------|----------|------|------------|
| admin01 | admin01@edu.vn | Quản trị viên 1 | Admin@123 | ADMIN | Ban Giám hiệu |
| teacher01 | teacher01@edu.vn | Giảng viên 1 | Teacher@123 | TEACHER | Khoa Hàng hải |
| student01 | student01@edu.vn | Sinh viên 1 | Student@123 | STUDENT | Khoa Hàng hải |

## 🐛 Troubleshooting

### Lỗi: "File Excel không có dữ liệu"
- Kiểm tra file Excel có dữ liệu ở sheet đầu tiên
- Đảm bảo có header row và ít nhất 1 dòng dữ liệu

### Lỗi: "Thiếu email hoặc họ tên"
- Kiểm tra các cột bắt buộc đã được điền đầy đủ
- Đảm bảo tên cột khớp với template (Username, Email, Full Name)

### Lỗi: "Email đã tồn tại"
- Email bị trùng với user đã có trong hệ thống
- Kiểm tra và thay đổi email

### Import chậm
- Đây là hành vi bình thường khi import nhiều user
- Mỗi user mất ~100-200ms để tạo
- Với 100 users sẽ mất khoảng 10-20 giây

## ✅ Kết luận

Tính năng bulk import đã được sửa và hoạt động ổn định. User có thể import hàng loạt người dùng từ file Excel một cách dễ dàng và trực quan.
