# Tích hợp Hệ thống Gói Câu hỏi vào Quiz Bank

## Tổng quan

Đã cải thiện trang Quiz Bank (`/teacher/quiz/quiz-bank`) để tổ chức câu hỏi theo gói thay vì hiển thị tràn lan.

## Những gì đã làm

### 1. Backend API

#### Package API Client (Frontend)
- ✅ Tạo `fe/src/app/api/endpoints/package.api.ts`
- Các endpoint:
  - `getMyPackages()` - Lấy danh sách gói của người dùng
  - `getPackageById(id)` - Lấy chi tiết gói
  - `createPackage(request)` - Tạo gói mới
  - `updatePackage(id, request)` - Cập nhật gói
  - `deletePackage(id)` - Xóa gói
  - `getQuestionsInPackage(packageId)` - Lấy câu hỏi trong gói
  - `moveQuestionsToPackage(request)` - Di chuyển câu hỏi sang gói khác
  - `searchPackages(keyword)` - Tìm kiếm gói

#### Backend Endpoints (đã thêm)
- ✅ `GET /api/v1/packages/{id}/questions` - Lấy câu hỏi trong gói
- ✅ `POST /api/v1/packages/move-questions` - Di chuyển câu hỏi
- ✅ `GET /api/v1/packages/search` - Tìm kiếm gói

#### Backend Service Methods (đã thêm)
- ✅ `PackageService.getQuestionsInPackage()` - Lấy câu hỏi trong gói
- ✅ `PackageService.moveQuestionsToPackage()` - Di chuyển câu hỏi với kiểm tra quyền và capacity

### 2. Frontend UI

#### Giao diện mới
- **Sidebar bên trái**: Hiển thị danh sách các gói câu hỏi
  - Tên gói
  - Môn học
  - Số lượng câu hỏi
  - Trạng thái (Công khai/Riêng tư)
  - Nút xóa gói
  - Nút tạo gói mới

- **Khu vực chính**: Hiển thị câu hỏi của gói đang chọn
  - Bảng câu hỏi với checkbox để chọn nhiều
  - Tìm kiếm và lọc theo độ khó
  - Nút thêm câu hỏi mới (chỉ khi đã chọn gói)
  - Bulk actions: Di chuyển câu hỏi đã chọn sang gói khác

#### Modal dialogs
- **Modal tạo gói mới**:
  - Tên gói (bắt buộc)
  - Mô tả
  - Môn học
  - Hiển thị (Công khai/Riêng tư)

- **Modal di chuyển câu hỏi**:
  - Danh sách các gói đích
  - Hiển thị số câu hỏi hiện tại trong mỗi gói
  - Disable gói nguồn

### 3. Tính năng

#### Quản lý gói
- ✅ Tạo gói câu hỏi mới
- ✅ Xem danh sách gói
- ✅ Xóa gói (câu hỏi sẽ chuyển về gói "Chưa phân loại")
- ✅ Tự động chọn gói đầu tiên khi load trang

#### Quản lý câu hỏi
- ✅ Xem câu hỏi theo gói
- ✅ Tìm kiếm câu hỏi trong gói
- ✅ Lọc theo độ khó
- ✅ Chọn nhiều câu hỏi (checkbox)
- ✅ Di chuyển nhiều câu hỏi sang gói khác
- ✅ Thêm câu hỏi mới vào gói đang chọn
- ✅ Sửa/xóa câu hỏi

#### Kiểm tra quyền
- ✅ Chỉ owner mới có thể xóa gói
- ✅ Chỉ owner mới có thể di chuyển câu hỏi
- ✅ Kiểm tra capacity khi di chuyển câu hỏi
- ✅ Không thể xóa gói mặc định

## Cách sử dụng

### 1. Tạo gói mới
1. Click nút "Tạo gói mới" ở sidebar
2. Nhập thông tin gói
3. Click "Tạo gói"

### 2. Xem câu hỏi trong gói
1. Click vào gói ở sidebar
2. Danh sách câu hỏi sẽ hiển thị ở khu vực chính

### 3. Di chuyển câu hỏi
1. Chọn gói nguồn
2. Tick checkbox các câu hỏi muốn di chuyển
3. Click "Di chuyển sang gói khác"
4. Chọn gói đích
5. Câu hỏi sẽ được di chuyển

### 4. Thêm câu hỏi mới
1. Chọn gói muốn thêm câu hỏi
2. Click "Thêm câu hỏi mới"
3. Tạo câu hỏi như bình thường

## Lưu ý kỹ thuật

### Database
- Bảng `packages` đã được tạo tự động bởi Hibernate
- Quan hệ: `questions.package_id` -> `packages.id`
- Gói mặc định có ID: `00000000-0000-0000-0000-000000000001`

### API Response Format
- Tất cả API đều trả về format: `{ success: boolean, data: any, message?: string }`
- Frontend đã xử lý unwrap response trong `package.api.ts`

### State Management
- Sử dụng Angular Signals để quản lý state
- `packages()` - Danh sách gói
- `selectedPackage()` - Gói đang chọn
- `questions()` - Câu hỏi trong gói
- `filteredQuestions()` - Câu hỏi sau khi lọc
- `selectedQuestions()` - Câu hỏi đã chọn

## Các bước tiếp theo (tùy chọn)

1. **Thêm drag & drop**: Kéo thả câu hỏi giữa các gói
2. **Thêm pagination**: Phân trang cho danh sách câu hỏi
3. **Thêm sorting**: Sắp xếp câu hỏi theo các tiêu chí
4. **Thêm export/import**: Xuất/nhập gói câu hỏi
5. **Thêm sharing**: Chia sẻ gói với giảng viên khác
6. **Thêm statistics**: Thống kê về gói và câu hỏi

## Testing

### Kiểm tra backend
```bash
# Lấy danh sách gói
curl -H "Authorization: Bearer <token>" http://localhost:8088/api/v1/packages/my-packages

# Lấy câu hỏi trong gói
curl -H "Authorization: Bearer <token>" http://localhost:8088/api/v1/packages/{packageId}/questions

# Di chuyển câu hỏi
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"questionIds":["..."],"targetPackageId":"..."}' \
  http://localhost:8088/api/v1/packages/move-questions
```

### Kiểm tra frontend
1. Truy cập http://localhost:4200/teacher/quiz/quiz-bank
2. Đăng nhập với tài khoản teacher
3. Thử các tính năng:
   - Tạo gói mới
   - Chọn gói
   - Xem câu hỏi
   - Di chuyển câu hỏi
   - Xóa gói

## Kết luận

Hệ thống gói câu hỏi đã được tích hợp hoàn chỉnh vào Quiz Bank. Giờ đây câu hỏi được tổ chức có hệ thống theo gói thay vì hiển thị tràn lan. Giảng viên có thể dễ dàng quản lý và tổ chức câu hỏi của mình.
