# 🧪 Hướng dẫn Test Fix

## ✅ Các bước test chức năng "Thêm câu hỏi"

### 1. Khởi động ứng dụng

```bash
cd fe
npm start
```

### 2. Đăng nhập với tài khoản Teacher

- Truy cập: http://localhost:4200
- Đăng nhập với role TEACHER

### 3. Vào Quản lý bài học

1. Vào menu **Khóa học**
2. Chọn một khóa học
3. Click **Chi tiết khóa học**
4. Chọn một chương (Section)
5. Click **Nội dung chương**

### 4. Test chức năng "Thêm câu hỏi"

#### Test Case 1: Xem danh sách câu hỏi của Quiz
1. Tìm một bài học loại **Trắc nghiệm** (Quiz)
2. Click nút **Xem** để xem chi tiết
3. Kiểm tra xem có hiển thị danh sách câu hỏi không

#### Test Case 2: Thêm câu hỏi mới
1. Trong phần xem chi tiết Quiz
2. Click nút **"Thêm câu hỏi"** (màu xanh)
3. **Kỳ vọng:** Modal "Thêm câu hỏi vào Quiz" hiển thị

#### Test Case 3: Chọn gói câu hỏi
1. Trong modal, chọn một gói câu hỏi từ dropdown
2. **Kỳ vọng:** Danh sách câu hỏi hiển thị

#### Test Case 4: Chọn câu hỏi
1. Tick chọn một hoặc nhiều câu hỏi
2. **Kỳ vọng:** Số câu hỏi đã chọn hiển thị ở footer

#### Test Case 5: Thêm câu hỏi vào Quiz
1. Click nút **"Thêm câu hỏi"** ở footer modal
2. **Kỳ vọng:** 
   - Hiển thị thông báo thành công
   - Modal đóng lại
   - Danh sách câu hỏi của Quiz được cập nhật

#### Test Case 6: Chọn tất cả / Bỏ chọn
1. Click **"Chọn tất cả"**
2. **Kỳ vọng:** Tất cả câu hỏi được chọn
3. Click **"Bỏ chọn"**
4. **Kỳ vọng:** Tất cả câu hỏi bị bỏ chọn

## ❌ Các lỗi có thể gặp

### Lỗi 1: Nút "Thêm câu hỏi" không hoạt động
- **Nguyên nhân:** Phương thức `openAddQuestionsModal` không tồn tại
- **Giải pháp:** Đã fix ✅

### Lỗi 2: Modal không hiển thị
- **Nguyên nhân:** Template modal bị thiếu
- **Giải pháp:** Đã fix ✅

### Lỗi 3: Không load được danh sách câu hỏi
- **Nguyên nhân:** API không hoạt động hoặc không có gói câu hỏi
- **Giải pháp:** Kiểm tra backend và tạo gói câu hỏi trước

## 📊 Checklist

- [ ] Nút "Thêm câu hỏi" hiển thị
- [ ] Click nút "Thêm câu hỏi" mở modal
- [ ] Dropdown gói câu hỏi hoạt động
- [ ] Danh sách câu hỏi hiển thị khi chọn gói
- [ ] Checkbox chọn câu hỏi hoạt động
- [ ] Nút "Chọn tất cả" hoạt động
- [ ] Nút "Bỏ chọn" hoạt động
- [ ] Thêm câu hỏi vào Quiz thành công
- [ ] Modal đóng sau khi thêm thành công
- [ ] Danh sách câu hỏi Quiz được cập nhật

## ✅ Kết quả mong đợi

Tất cả các test case phải PASS. Nếu có bất kỳ test case nào FAIL, báo lại để tiếp tục fix.

---

**Lưu ý:** Đảm bảo backend đang chạy và có dữ liệu gói câu hỏi để test.
