# Hướng dẫn Test Bulk Question Selection trong Section Editor

## Tính năng mới: Bulk Question Selection

### Mô tả
Đã triển khai tính năng cho phép giảng viên chọn và thêm nhiều câu hỏi cùng lúc vào quiz từ ngân hàng câu hỏi khóa học.

### Tính năng đã triển khai
1. **Bulk Selection UI**: Checkbox cho từng câu hỏi
2. **Select All/Clear All**: Controls để chọn/bỏ chọn tất cả
3. **Bulk Add**: Thêm nhiều câu hỏi vào quiz cùng lúc
4. **State Management**: Tự động clear selection sau khi thêm thành công
5. **Visual Feedback**: Hiển thị số lượng đã chọn và trạng thái

## Hướng dẫn Test

### Test Case 1: Chọn từng câu hỏi
1. Tạo hoặc mở một quiz lesson trong Section Editor
2. Click "Chọn câu hỏi từ khóa học" 
3. Verify rằng danh sách câu hỏi khóa học hiển thị với checkboxes
4. Click checkbox của một vài câu hỏi để chọn
5. Verify rằng "Đã chọn: X" hiển thị đúng số lượng
6. Click nút "Thêm" cho từng câu hỏi
7. Verify rằng câu hỏi được thêm vào quiz thành công
8. Verify rằng checkbox được tự động bỏ chọn sau khi thêm

### Test Case 2: Bulk Selection
1. Click "Chọn tất cả" để chọn tất cả câu hỏi
2. Verify rằng tất cả checkboxes được check
3. Verify rằng counter hiển thị đúng số lượng
4. Click "Bỏ chọn" để clear tất cả
5. Verify rằng tất cả checkboxes được bỏ chọn
6. Chọn một vài câu hỏi thủ công
7. Click "Thêm X câu hỏi vào quiz" (bulk add button)
8. Verify rằng tất cả câu hỏi được thêm vào quiz
9. Verify rằng selection được clear sau khi thêm thành công

### Test Case 3: Error Handling
1. Thử thêm câu hỏi đã có trong quiz
2. Verify rằng hiển thị thông báo "Câu hỏi này đã được thêm vào quiz rồi!"
3. Thử thêm khi không có câu hỏi nào được chọn
4. Verify rằng hiển thị thông báo "Vui lòng chọn ít nhất một câu hỏi"

### Test Case 4: UI/UX
1. Verify rằng câu hỏi được chọn có visual highlight (border xanh, background xanh nhạt)
2. Verify rằng câu hỏi có text "✓ Đã chọn" khi được select
3. Verify rằng bulk buttons chỉ hiển thị khi có câu hỏi được chọn
4. Verify rằng counter cập nhật real-time khi chọn/bỏ chọn

### Test Case 5: Integration với Quiz Display
1. Sau khi thêm nhiều câu hỏi, click "Xem câu hỏi"
2. Verify rằng tất cả câu hỏi đã thêm hiển thị trong quiz
3. Verify rằng số lượng câu hỏi trong quiz updated correctly
4. Click "Xem trước quiz" để test preview mode

## Code Changes Summary

### Frontend Changes (section-editor.component.ts)
1. **Added Signals**:
   - `selectedQuestionIds: Signal<Set<string>>`

2. **Added Methods**:
   - `toggleQuestionSelection(questionId: string)`
   - `selectAllQuestions()` 
   - `clearQuestionSelection()`
   - `getSelectedQuestionCount()`
   - `isQuestionSelected(questionId: string)`
   - `addSelectedQuestionsToQuiz(quizId: string)`

3. **Updated Methods**:
   - `addQuestionToQuiz()` - Thêm logic clear selection

4. **Updated Template**:
   - Thêm checkbox cho mỗi câu hỏi
   - Thêm bulk selection controls
   - Thêm visual feedback cho selected state
   - Thêm bulk add button

## Backend Support
- API endpoints đã sẵn sàng:
  - `GET /api/v1/questions/course/{courseId}/user` - Lấy câu hỏi theo khóa học
  - `PUT /api/v1/quizzes/{quizId}/questions` - Cập nhật quiz questions
  - `GET /api/v1/quizzes/{quizId}/questions` - Lấy questions của quiz

## Expected Results
✅ Giảng viên có thể chọn nhiều câu hỏi cùng lúc
✅ Bulk add hoạt động mượt mà
✅ State management chính xác
✅ UI responsive và user-friendly
✅ Integration hoàn chỉnh với quiz system

## Troubleshooting
- Nếu bulk add không hoạt động: Kiểm tra API connectivity
- Nếu selection bị mất: Kiểm tra Signal updates
- Nếu UI không refresh: Kiểm tra change detection

---
*Generated: 2025-11-07 18:58:40*
*Component: Section Editor*
*Feature: Bulk Question Selection*