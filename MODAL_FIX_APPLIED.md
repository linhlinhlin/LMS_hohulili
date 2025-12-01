# ✅ Đã Fix Modal Backdrop Issue

## ❌ Vấn đề trước đó

Khi click "Thêm câu hỏi", modal backdrop (lớp phủ xám) hiển thị nhưng nội dung modal không thấy, khiến:
- Màn hình bị phủ xám
- Không thể tương tác
- Không thể đóng modal

## 🔧 Nguyên nhân

Modal content bị ẩn phía sau backdrop do:
- `align-bottom` khiến modal bị đẩy xuống dưới viewport
- Thiếu `z-index` để đảm bảo modal content hiển thị trên backdrop

## ✅ Giải pháp đã áp dụng

Đã sửa modal container từ:
```html
<div class="inline-block align-bottom bg-white rounded-lg ...">
```

Thành:
```html
<div class="inline-block align-middle bg-white rounded-lg ... relative z-50">
```

**Thay đổi:**
- `align-bottom` → `align-middle`: Modal hiển thị ở giữa màn hình
- Thêm `relative z-50`: Đảm bảo modal content hiển thị trên backdrop

## 🧪 Test lại

### Bước 1: Restart dev server (nếu cần)

```bash
# Stop server hiện tại (Ctrl+C)
cd fe
npm start
```

### Bước 2: Clear browser cache

- Mở DevTools (F12)
- Right-click nút Refresh
- Chọn "Empty Cache and Hard Reload"

### Bước 3: Test chức năng

1. Vào **Quản lý bài học**
2. Chọn một bài **Trắc nghiệm**
3. Click **Xem** để xem chi tiết
4. Click nút **"Thêm câu hỏi"**

**Kỳ vọng:**
- ✅ Modal hiển thị ở giữa màn hình
- ✅ Có thể thấy nội dung modal (header, dropdown, buttons)
- ✅ Có thể chọn gói câu hỏi
- ✅ Có thể đóng modal bằng nút X hoặc click backdrop

## 📊 Checklist

- [ ] Modal hiển thị đúng vị trí (giữa màn hình)
- [ ] Thấy header "Thêm câu hỏi vào Quiz"
- [ ] Thấy dropdown "Chọn gói câu hỏi"
- [ ] Có thể chọn gói và thấy danh sách câu hỏi
- [ ] Có thể chọn câu hỏi (checkbox)
- [ ] Nút "Thêm câu hỏi" hoạt động
- [ ] Có thể đóng modal

## ⚠️ Nếu vẫn lỗi

Nếu modal vẫn không hiển thị đúng:

### Option 1: Check console errors

Mở DevTools Console (F12) và xem có lỗi gì không. Báo lại lỗi để tôi fix tiếp.

### Option 2: Kiểm tra signals

Mở Console và chạy:
```javascript
// Check if modal is open
console.log('Modal open:', document.querySelector('[aria-modal="true"]'));
```

### Option 3: Undo và restore version mới

```bash
git checkout HEAD -- fe/src/app/features/teacher/courses/section-editor.component.ts
```

Sau đó báo lại để tôi thử cách khác (không restore toàn bộ file cũ).

## 📝 Files đã sửa

- `fe/src/app/features/teacher/courses/section-editor.component.ts` (dòng 1575)

---

**Status:** ✅ Fixed
**Next:** Test và báo lại kết quả
