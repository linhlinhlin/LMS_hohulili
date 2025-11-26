# Hướng dẫn sửa giao diện Quiz Configuration Inline

## Vấn đề
Giao diện tạo quiz trong form "Thêm nội dung mới" không hiển thị đầy đủ. Hiện tại code đang gọi modal riêng thay vì hiển thị inline.

## Giải pháp

### Bước 1: Sửa logic trong `createLesson()` method

Trong file `fe/src/app/features/teacher/courses/section-editor.component.ts`, tìm phần:

```typescript
} else if (lessonType === 'QUIZ') {
  // Open quiz creation modal instead of creating inline
  this.isCreating.set(false);
  this.showCreateForm.set(false);
  this.openQuizCreationModal();
  return;
}
```

**THAY THẾBẰNG:**

```typescript
} else if (lessonType === 'QUIZ') {
  // Get selected question IDs
  const selectedQuestionIds = this.selectedQuizQuestions();
  
  // Create quiz lesson with proper backend integration
  const lessonPayload: CreateLessonRequest = {
    title: this.createForm.value.title ?? '',
    lessonType: 'QUIZ',
    // Use values from form
    quizTimeLimit: Number(this.createForm.value.quizTimeLimit) || 30,
    quizMaxScore: Number(this.createForm.value.quizMaxScore) || 100,
    quizMaxAttempts: Number(this.createForm.value.quizMaxAttempts) || 1
  };

  // Create the lesson first
  this.lessonApi.createLesson(sectionId, lessonPayload).subscribe({
    next: async (lessonRes) => {
      const lesson = lessonRes?.data;
      if (lesson) {
        try {
          // Create Quiz entity using Backend Quiz API
          const quizPayload = {
            questionIds: selectedQuestionIds, // Use selected questions
            timeLimitMinutes: Number(this.createForm.value.quizTimeLimit) || 30,
            maxAttempts: Number(this.createForm.value.quizMaxAttempts) || 1,
            passingScore: Number(this.createForm.value.quizMaxScore) || 100,
            shuffleQuestions: false,
            shuffleOptions: false,
            showResultsImmediately: true,
            showCorrectAnswers: true
          };

          // Create Quiz entity
          const quizResponse = await firstValueFrom(this.quizApi.createQuiz(lesson.id, quizPayload));
          const createdQuiz = quizResponse as any;

          if (createdQuiz) {
            this.lessons.update(list => [...list, lesson]);

            // Reset form and quiz selection
            this.createForm.reset({
              title: '',
              lessonType: 'LECTURE',
              content: '',
              videoUrl: '',
              assignmentTitle: '',
              assignmentDescription: '',
              assignmentInstructions: '',
              dueDate: '',
              maxScore: 100,
              quizTimeLimit: 30,
              quizMaxScore: 100,
              quizMaxAttempts: 1
            });
            
            // Reset quiz selection state
            this.quizPackageId = '';
            this.quizPackageQuestions.set([]);
            this.selectedQuizQuestions.set([]);

            // Close the form after successful creation
            this.showCreateForm.set(false);

            // Show success message
            this.opError.set('');
            const questionCount = selectedQuestionIds.length;
            alert(`✅ Đã tạo bài trắc nghiệm "${lesson.title}" thành công!\n\n📝 ${questionCount} câu hỏi đã được thêm vào quiz.`);
          }
          this.isCreating.set(false);
        } catch (quizError) {
          console.error('Quiz creation error:', quizError);
          this.lessons.update(list => [...list, lesson]);
          this.opError.set('');
          this.isCreating.set(false);
          alert(`⚠️ Đã tạo lesson "${lesson.title}" nhưng lỗi khi tạo Quiz entity: ${(quizError as any)?.message || 'Lỗi không xác định'}`);
        }
      }
    },
    error: (err) => {
      this.opError.set(err?.message || 'Tạo bài trắc nghiệm thất bại');
      this.isCreating.set(false);
    }
  });
}
```

### Bước 2: Thêm các properties cần thiết

Thêm vào phần khai báo properties (sau dòng `private questionApi = inject(QuestionApi);`):

```typescript
private packageApi = inject(PackageApi);

// Quiz creation - Package and Question selection
quizPackages = signal<any[]>([]);
quizPackageId = '';
quizPackageQuestions = signal<any[]>([]);
selectedQuizQuestions = signal<string[]>([]);
```

### Bước 3: Thêm các methods cần thiết

Thêm các methods sau vào cuối class (trước `ngOnDestroy`):

```typescript
// ==================== QUIZ PACKAGE SELECTION METHODS ====================
async loadQuizPackages() {
  try {
    const packages = await firstValueFrom(this.packageApi.getMyPackages());
    this.quizPackages.set(packages || []);
    console.log('📦 Loaded packages:', packages?.length || 0);
  } catch (error) {
    console.error('Failed to load packages:', error);
    this.quizPackages.set([]);
  }
}

async onQuizPackageChange(packageId: string) {
  this.quizPackageId = packageId;
  this.selectedQuizQuestions.set([]);
  
  if (!packageId) {
    this.quizPackageQuestions.set([]);
    return;
  }

  try {
    const questions = await firstValueFrom(this.packageApi.getQuestionsInPackage(packageId));
    const questionList = Array.isArray(questions) ? questions : [];
    this.quizPackageQuestions.set(questionList);
    console.log('📝 Loaded questions for package:', questionList.length);
  } catch (error) {
    console.error('Failed to load package questions:', error);
    this.quizPackageQuestions.set([]);
  }
}

toggleQuizQuestion(questionId: string) {
  const current = this.selectedQuizQuestions();
  if (current.includes(questionId)) {
    this.selectedQuizQuestions.set(current.filter(id => id !== questionId));
  } else {
    this.selectedQuizQuestions.set([...current, questionId]);
  }
}

isQuizQuestionSelected(questionId: string): boolean {
  return this.selectedQuizQuestions().includes(questionId);
}

selectAllQuizQuestions() {
  const allIds = this.quizPackageQuestions().map(q => q.id);
  this.selectedQuizQuestions.set(allIds);
}

clearQuizQuestionSelection() {
  this.selectedQuizQuestions.set([]);
}

openQuizBankInNewTab() {
  this.router.navigate(['/teacher/quiz/quiz-bank']);
}
```

### Bước 4: Tìm và thay thế phần template Quiz Configuration

Trong template (phần `template: \`...\``), tìm phần:

```html
<!-- Quiz Configuration Section -->
<div *ngIf="isQuizType" class="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-purple-50 space-y-4">
  <div class="flex items-start gap-3">
    <span class="text-3xl">🚀</span>
    <div class="flex-1">
      <div class="text-base font-semibold text-purple-800 mb-2">Thiết lập bài trắc nghiệm</div>
      <p class="text-sm text-purple-700 mb-4">Sau khi tạo bài học, bạn sẽ được chuyển đến trang thiết lập chi tiết để:</p>
      <ul class="list-disc list-inside text-sm text-purple-700 space-y-1 ml-2">
        <li>Cấu hình thời gian, điểm số, số lần làm bài.</li>
        <li>Chọn câu hỏi từ ngân hàng câu hỏi.</li>
        <li>Xem trước bài kiểm tra.</li>
      </ul>
    </div>
  </div>
</div>
```

**THAY THẾBẰNG code từ file GitHub (phần Quiz Configuration Section - Simplified)** - xem file đính kèm `QUIZ_CONFIG_TEMPLATE.html`

## Kết quả mong đợi

Sau khi áp dụng các thay đổi trên, khi chọn loại "❓ Trắc nghiệm" trong form tạo nội dung mới, bạn sẽ thấy:

1. ⏱️ Thời gian (phút)
2. 🎯 Điểm tối đa  
3. 🔄 Số lần làm tối đa
4. 📦 Chọn gói câu hỏi từ Quiz Bank
5. Danh sách câu hỏi có thể chọn
6. Nút "Chọn tất cả" và "Bỏ chọn"
7. Link đến Quiz Bank để tạo câu hỏi mới

## Lưu ý

- Đảm bảo đã import `PackageApi` trong phần imports
- Kiểm tra xem `QuizCreationModalComponent` có cần thiết không, nếu không thì có thể xóa khỏi imports
