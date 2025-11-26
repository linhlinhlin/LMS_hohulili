# Fix Hoàn Chỉnh - Giao Diện Tạo Quiz Inline

## Vấn đề
Giao diện tạo quiz không hiển thị đầy đủ các trường cấu hình và chọn câu hỏi.

## Giải pháp - Áp dụng từ GitHub Code

### BƯỚC 1: Thêm PackageApi inject (ĐÃ XONG ✅)
```typescript
private packageApi = inject(PackageApi);
```

### BƯỚC 2: Thêm các methods cần thiết

Thêm các methods sau vào cuối class (trước `ngOnDestroy()`):

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

### BƯỚC 3: Sửa logic createLesson() cho QUIZ

Tìm phần xử lý `lessonType === 'QUIZ'` trong method `createLesson()` và thay thế bằng:

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
            questionIds: selectedQuestionIds,
            timeLimitMinutes: Number(this.createForm.value.quizTimeLimit) || 30,
            maxAttempts: Number(this.createForm.value.quizMaxAttempts) || 1,
            passingScore: Number(this.createForm.value.quizMaxScore) || 100,
            shuffleQuestions: false,
            shuffleOptions: false,
            showResultsImmediately: true,
            showCorrectAnswers: true
          };

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

            // Close the form
            this.showCreateForm.set(false);

            // Show success
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

### BƯỚC 4: Thêm HTML template cho Quiz Configuration

Trong template, tìm phần sau "Content Textarea - Only for LECTURE type" và TRƯỚC phần "Error Message", thêm đoạn HTML này:

```html
<!-- Quiz Configuration Section - Full Inline -->
<div *ngIf="isQuizType" class="border-2 border-purple-300 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
  <!-- Header -->
  <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
    <h3 class="text-white font-semibold flex items-center gap-2">
      <span class="text-xl">🎯</span>Cấu hình bài trắc nghiệm
    </h3>
  </div>
  
  <div class="p-5 space-y-5">
    <!-- Basic Settings Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <span class="text-purple-600">⏱️</span> Thời gian (phút)
        </label>
        <input type="number" formControlName="quizTimeLimit" 
               class="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all" 
               placeholder="30" min="1" />
        <p class="text-xs text-gray-500 mt-1">Để trống = không giới hạn</p>
      </div>
      
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <span class="text-green-600">🎯</span> Điểm tối đa
        </label>
        <input type="number" formControlName="quizMaxScore" 
               class="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all" 
               placeholder="100" min="1" />
      </div>
      
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <span class="text-orange-600">🔄</span> Số lần làm tối đa
        </label>
        <input type="number" formControlName="quizMaxAttempts" 
               class="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all" 
               placeholder="1" min="1" />
      </div>
    </div>

    <!-- Question Selection Section -->
    <div class="bg-white rounded-xl p-5 shadow-sm border border-purple-100">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-semibold text-gray-900 flex items-center gap-2">
          <span class="text-xl">📦</span>Chọn câu hỏi từ Quiz Bank
        </h4>
        <span class="text-sm text-purple-600 font-medium bg-purple-100 px-3 py-1 rounded-full">
          {{ selectedQuizQuestions().length }} câu đã chọn
        </span>
      </div>

      <!-- Package Selector -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Chọn gói câu hỏi:</label>
        <div class="flex gap-2">
          <select [value]="quizPackageId" (change)="onQuizPackageChange($any($event.target).value)"
                  class="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:border-purple-500 focus:outline-none bg-white">
            <option value="">-- Chọn gói câu hỏi --</option>
            <option *ngFor="let pkg of quizPackages()" [value]="pkg.id">
              {{ pkg.name }} ({{ pkg.questionCount }} câu)
            </option>
          </select>
          <button type="button" (click)="loadQuizPackages()" 
                  class="px-3 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Làm mới">🔄</button>
        </div>
      </div>

      <!-- Questions List -->
      <div *ngIf="quizPackageQuestions().length > 0" class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
          <span class="text-sm font-medium text-gray-700">{{ quizPackageQuestions().length }} câu hỏi có sẵn</span>
          <div class="flex gap-2">
            <button type="button" (click)="selectAllQuizQuestions()" 
                    class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              Chọn tất cả
            </button>
            <button type="button" (click)="clearQuizQuestionSelection()" 
                    class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
              Bỏ chọn
            </button>
          </div>
        </div>
        
        <div class="max-h-48 overflow-y-auto">
          <div *ngFor="let q of quizPackageQuestions(); let i = index" 
               class="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-purple-50 cursor-pointer transition-colors"
               (click)="toggleQuizQuestion(q.id)">
            <input type="checkbox" [checked]="isQuizQuestionSelected(q.id)"
                   (click)="$event.stopPropagation()"
                   (change)="toggleQuizQuestion(q.id)"
                   class="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 line-clamp-2">{{ i + 1 }}. {{ q.content }}</p>
              <div class="flex gap-2 mt-1">
                <span class="text-xs px-2 py-0.5 rounded-full"
                      [class]="q.difficulty === 'EASY' ? 'bg-green-100 text-green-700' : q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                  {{ q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'MEDIUM' ? 'TB' : 'Khó' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="quizPackageId && quizPackageQuestions().length === 0" class="text-center py-8 text-gray-500">
        <span class="text-4xl mb-2 block">📭</span>
        <p>Gói này chưa có câu hỏi nào</p>
      </div>

      <!-- No Package Selected -->
      <div *ngIf="!quizPackageId" class="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <span class="text-4xl mb-2 block">📦</span>
        <p class="text-gray-600 mb-2">Chọn gói câu hỏi để bắt đầu</p>
        <p class="text-sm text-gray-400">Hoặc tạo gói mới trong Quiz Bank</p>
      </div>

      <!-- Quick Link to Quiz Bank -->
      <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <p class="text-sm text-gray-500">💡 Cần thêm câu hỏi mới?</p>
        <button type="button" (click)="openQuizBankInNewTab()"
                class="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
          Mở Quiz Bank
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</div>
```

## Tóm tắt các thay đổi

1. ✅ Đã thêm `packageApi` inject
2. ⏳ Cần thêm 7 methods quiz package selection
3. ⏳ Cần sửa logic `createLesson()` cho QUIZ
4. ⏳ Cần thêm HTML template đầy đủ cho quiz configuration

Sau khi hoàn thành, giao diện sẽ hiển thị đầy đủ như trong GitHub code.
