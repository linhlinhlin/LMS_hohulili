# 🔧 Hướng dẫn Fix lỗi hiển thị

## ❌ Vấn đề hiện tại

Sau khi restore code, giao diện bị lỗi hiển thị - các chữ bị encode sai (hiển thị ký tự lạ).

## ✅ Nguyên nhân

Code đã được restore đúng và đầy đủ, nhưng:
1. Browser cache chưa được clear
2. Angular dev server chưa rebuild
3. File encoding có thể bị thay đổi

## 🔧 Giải pháp

### Bước 1: Stop Angular Dev Server

Nếu đang chạy `ng serve` hoặc `npm start`, hãy dừng lại (Ctrl+C)

### Bước 2: Clear Browser Cache

**Chrome/Edge:**
1. Mở DevTools (F12)
2. Right-click vào nút Refresh
3. Chọn "Empty Cache and Hard Reload"

**Hoặc:**
- Ctrl + Shift + Delete
- Chọn "Cached images and files"
- Click "Clear data"

### Bước 3: Rebuild Angular

```bash
cd fe
npm start
```

### Bước 4: Kiểm tra lại

1. Mở browser ở chế độ Incognito/Private
2. Truy cập lại ứng dụng
3. Test chức năng "Thêm câu hỏi"

## 🔍 Kiểm tra code hiện tại

Tất cả methods cần thiết đã có:
- ✅ openAddQuestionsModal
- ✅ closeInlineAddQuestionsModal  
- ✅ addInlineQuestionsToQuiz
- ✅ onInlinePackageChange
- ✅ toggleInlineQuestionSelection
- ✅ selectAllInlineQuestions
- ✅ clearInlineQuestionSelection

## ⚠️ Nếu vẫn lỗi

Nếu sau khi làm các bước trên vẫn lỗi, có thể cần:

### Option 1: Xóa node_modules và rebuild

```bash
cd fe
rm -rf node_modules
rm -rf .angular
npm install
npm start
```

### Option 2: Check file encoding

File có thể bị lỗi encoding. Kiểm tra:

```powershell
Get-Content fe/src/app/features/teacher/courses/section-editor.component.ts -Encoding UTF8 | Select-Object -First 10
```

Nếu thấy ký tự lạ, cần convert lại encoding.

### Option 3: Undo và làm lại cẩn thận hơn

```bash
git checkout HEAD -- fe/src/app/features/teacher/courses/section-editor.component.ts
```

Sau đó tôi sẽ thêm code theo cách khác (patch file thay vì restore toàn bộ).

## 📞 Báo lại kết quả

Sau khi thử các bước trên, hãy cho tôi biết:
1. Giao diện đã hiển thị đúng chưa?
2. Chức năng "Thêm câu hỏi" hoạt động chưa?
3. Có lỗi nào trong Console không?
