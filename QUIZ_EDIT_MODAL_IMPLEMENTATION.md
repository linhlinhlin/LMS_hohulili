# Quiz Edit Modal Implementation Summary

## 🎯 Mục tiêu
Tạo modal chỉnh sửa cấu hình quiz để đồng bộ với hệ thống quiz mới, thay thế logic cũ trong section editor.

## ✅ Đã hoàn thành

### 1. Quiz Edit Modal Component
**File:** `fe/src/app/features/teacher/courses/components/quiz-edit-modal.component.ts`

**Tính năng:**
- ✅ Modal chỉnh sửa cấu hình quiz với UI đẹp, đồng bộ với quiz creation modal
- ✅ Load thông tin quiz hiện tại từ API
- ✅ Form validation đầy đủ
- ✅ Các trường cấu hình:
  - Tên quiz (title)
  - Thời gian làm bài (timeLimitMinutes)
  - Số lần làm tối đa (maxAttempts)
  - Điểm đạt % (passingScore)
  - Xáo trộn câu hỏi (shuffleQuestions)
  - Xáo trộn đáp án (shuffleOptions)
  - Hiển thị kết quả ngay (showResultsImmediately)
  - Hiển thị đáp án đúng (showCorrectAnswers)

**API Integration:**
- `getQuizByLessonId()` - Load quiz settings
- `updateQuizSettings()` - Save changes

### 2. Quiz API Updates
**File:** `fe/src/app/api/endpoints/quiz.api.ts`

**Changes:**
- ✅ Added `updateQuizSettings()` method
- ✅ Updated `QuizResponse` interface to include `title` field
- ✅ Proper TypeScript typing for all quiz settings

## 📋 Cần làm tiếp

### Backend API Endpoint
Cần tạo endpoint mới trong backend:

```java
// QuizController.java
@PutMapping("/quizzes/{quizId}/settings")
public ResponseEntity<ApiResponse<QuizDTO>> updateQuizSettings(
    @PathVariable UUID quizId,
    @RequestBody UpdateQuizSettingsRequest request
) {
    // Implementation
}
```

**Request DTO:**
```java
public class UpdateQuizSettingsRequest {
    private String title;
    private Integer timeLimitMinutes;
    private Integer maxAttempts;
    private Integer passingScore;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private Boolean showResultsImmediately;
    private Boolean showCorrectAnswers;
}
```

### Section Editor Integration
Cần update `section-editor.component.ts`:

1. **Import modal component:**
```typescript
import { QuizEditModalComponent } from './components/quiz-edit-modal.component';
```

2. **Add to imports array:**
```typescript
imports: [
  // ... existing imports
  QuizEditModalComponent
]
```

3. **Add ViewChild reference:**
```typescript
@ViewChild(QuizEditModalComponent) quizEditModal!: QuizEditModalComponent;
```

4. **Update template - thay đổi button "Sửa" cho quiz:**
```html
<!-- OLD: Generic edit button -->
<button (click)="startEdit(l)">Sửa</button>

<!-- NEW: Quiz-specific edit button -->
<button *ngIf="l.lessonType === 'QUIZ'" 
        (click)="editQuizSettings(l.id)"
        class="px-3 py-1.5 text-base shadow-sm text-blue-600 hover:shadow-md hover:text-blue-700 transition-all duration-200">
  Sửa cấu hình
</button>
<button *ngIf="l.lessonType !== 'QUIZ'" 
        (click)="startEdit(l)"
        class="px-3 py-1.5 text-base shadow-sm text-blue-600 hover:shadow-md hover:text-blue-700 transition-all duration-200">
  Sửa
</button>
```

5. **Add method to open modal:**
```typescript
editQuizSettings(lessonId: string) {
  this.quizEditModal.lessonId = lessonId;
  this.quizEditModal.open();
}

onQuizSettingsSaved() {
  // Reload lessons to show updated quiz info
  this.loadLessons();
}
```

6. **Add modal to template:**
```html
<!-- At the end of template, before closing div -->
<app-quiz-edit-modal 
  (saved)="onQuizSettingsSaved()"
  (closed)="onQuizEditModalClosed()">
</app-quiz-edit-modal>
```

## 🎨 UI/UX Improvements

### Quiz View Section
Hiện tại quiz view section đã có:
- ✅ Hiển thị thông tin quiz (time limit, max score, max attempts, question count)
- ✅ Buttons để xem câu hỏi, thêm câu hỏi, preview quiz
- ✅ Danh sách câu hỏi với đáp án đúng được highlight

### Cần cải thiện:
1. **Thêm button "Sửa cấu hình"** - để mở quiz edit modal
2. **Hiển thị title của quiz** - thay vì chỉ hiển thị lesson title
3. **Thêm badge cho quiz settings** - hiển thị các settings đang bật (shuffle, show answers, etc.)

## 🔄 Luồng hoạt động mới

### Tạo Quiz (Đã có)
1. Teacher click "Tạo Quiz nhanh" hoặc chọn lesson type = QUIZ
2. Điền thông tin trong quiz creation modal
3. Quiz được tạo với settings mặc định
4. Teacher có thể thêm câu hỏi từ quiz bank

### Sửa Quiz (Mới)
1. Teacher click "Sửa cấu hình" trên quiz lesson
2. Quiz edit modal mở ra, load settings hiện tại
3. Teacher chỉnh sửa settings
4. Click "Lưu thay đổi"
5. Settings được update qua API
6. UI refresh để hiển thị thông tin mới

### Xem Quiz (Đã có)
1. Teacher click "Xem" trên quiz lesson
2. Hiển thị thông tin quiz và danh sách câu hỏi
3. Có thể thêm/xóa câu hỏi
4. Có thể preview quiz

## 🚀 Next Steps

1. **Backend:** Tạo endpoint `PUT /api/v1/quizzes/{quizId}/settings`
2. **Frontend:** Integrate quiz edit modal vào section editor
3. **Testing:** Test toàn bộ luồng create -> edit -> view quiz
4. **UI Polish:** Thêm animations, loading states, error handling

## 📝 Notes

- Modal component đã được tạo với standalone component pattern (Angular 17+)
- Sử dụng signals cho reactive state management
- Form validation đầy đủ với Validators
- Error handling với user-friendly messages
- Responsive design với Tailwind CSS
- Consistent với quiz creation modal về UI/UX
