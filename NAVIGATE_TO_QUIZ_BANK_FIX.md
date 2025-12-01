# ✅ Đã Fix - Navigate đến Quiz Bank

## 🎯 Vấn đề đã hiểu

Bạn muốn khi click nút **"Thêm câu hỏi"**, hệ thống sẽ:
- **Navigate đến trang Quiz Bank** (không phải mở modal)
- Truyền `addToQuiz` parameter (lesson ID)
- Truyền `returnUrl` để quay lại sau khi xong

**URL mẫu:**
```
http://localhost:4200/teacher/quiz/quiz-bank?addToQuiz=06187690-abbd-4c41-b89a-359577257ebb&returnUrl=%2Fteacher%2Fcourses%2F...
```

## ✅ Giải pháp đã áp dụng

Đã sửa phương thức `openAddQuestionsModal()` từ:
```typescript
// CŨ: Mở modal
openAddQuestionsModal(lessonId: string) {
  this.loadQuizPackages();
  this.inlineAddQuizLessonId.set(lessonId);
  this.showInlineAddQuestionsModal.set(true);
  // ...
}
```

Thành:
```typescript
// MỚI: Navigate đến Quiz Bank
openAddQuestionsModal(lessonId: string) {
  const returnUrl = this.router.url;
  this.router.navigate(['/teacher/quiz/quiz-bank'], {
    queryParams: {
      addToQuiz: lessonId,
      returnUrl: returnUrl
    }
  });
}
```

## 🧪 Test

### Bước 1: Restart dev server (nếu cần)

```bash
cd fe
npm start
```

### Bước 2: Clear browser cache

- F12 → Right-click Refresh → "Empty Cache and Hard Reload"

### Bước 3: Test chức năng

1. Vào **Quản lý bài học**
2. Chọn một bài **Trắc nghiệm**
3. Click **Xem** để xem chi tiết
4. Click nút **"Thêm câu hỏi"**

**Kỳ vọng:**
- ✅ Chuyển đến trang Quiz Bank
- ✅ URL có parameter `addToQuiz=<lesson-id>`
- ✅ URL có parameter `returnUrl=<current-url>`
- ✅ Trang Quiz Bank hiển thị đúng
- ✅ Có thể chọn câu hỏi và thêm vào quiz
- ✅ Sau khi xong, có nút "Quay lại" để về trang cũ

## 📊 Checklist

- [ ] Click "Thêm câu hỏi" navigate đến Quiz Bank
- [ ] URL có đúng parameters (addToQuiz, returnUrl)
- [ ] Trang Quiz Bank hiển thị đúng
- [ ] Có thể chọn và thêm câu hỏi
- [ ] Có nút "Quay lại" hoặc "Hoàn tất"
- [ ] Click "Quay lại" về đúng trang cũ

## 🗑️ Dọn dẹp (Optional)

Vì không dùng modal nữa, có thể xóa:
- Modal template HTML (dòng 1568-1700)
- Các signals không dùng: `showInlineAddQuestionsModal`, `inlineAddQuizLessonId`
- Các phương thức không dùng: `closeInlineAddQuestionsModal`, `addInlineQuestionsToQuiz`, etc.

**Nhưng để an toàn, nên giữ lại cho đến khi test xong và confirm mọi thứ OK.**

## ✅ Kết quả

Bây giờ khi click "Thêm câu hỏi", hệ thống sẽ navigate đến trang Quiz Bank với đầy đủ parameters, giống như URL mẫu bạn cung cấp.

---

**Status:** ✅ Fixed
**Next:** Test và báo lại kết quả
