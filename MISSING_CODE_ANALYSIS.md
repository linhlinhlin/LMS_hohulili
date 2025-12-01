# 📋 Phân tích Code bị mất sau khi Pull

## 🔍 Tổng quan vấn đề

Sau khi pull code từ commit `333fc28`, chức năng **"Thêm câu hỏi"** trong section-editor bị mất do:
- Template HTML vẫn gọi `openAddQuestionsModal(s.id)` 
- Nhưng phương thức này và các phương thức liên quan đã bị xóa khỏi component TypeScript

## 📦 Code cần thêm lại

### 1. **Signals cần khai báo** (thêm vào class properties)

```typescript
// Open modal to add questions from Quiz Bank
showInlineAddQuestionsModal = signal<boolean>(false);
inlineAddQuizLessonId = signal<string | null>(null);

// Inline modal state
inlinePackageId: string = '';
inlinePackageQuestions = signal<Question[]>([]);
selectedInlineQuestions = signal<string[]>([]);
addingInlineQuestions = signal<boolean>(false);
```

### 2. **Phương thức openAddQuestionsModal** (thêm vào class methods)

```typescript
openAddQuestionsModal(lessonId: string) {
  // Load packages first, then show inline modal
  this.loadQuizPackages();
  this.inlineAddQuizLessonId.set(lessonId);
  this.showInlineAddQuestionsModal.set(true);
  // Reset selection
  this.inlinePackageId = '';
  this.inlinePackageQuestions.set([]);
  this.selectedInlineQuestions.set([]);
}
```

### 3. **Phương thức closeInlineAddQuestionsModal**

```typescript
closeInlineAddQuestionsModal() {
  this.showInlineAddQuestionsModal.set(false);
  this.inlineAddQuizLessonId.set(null);
  this.inlinePackageId = '';
  this.inlinePackageQuestions.set([]);
  this.selectedInlineQuestions.set([]);
}
```

### 4. **Phương thức onInlinePackageChange**

```typescript
async onInlinePackageChange(packageId: string) {
  if (!packageId) {
    this.inlinePackageQuestions.set([]);
    return;
  }

  try {
    const response = await firstValueFrom(this.packageApi.getPackageQuestions(packageId));
    const questions = Array.isArray(response) ? response : (response as any).data || [];
    this.inlinePackageQuestions.set(questions);
    console.log('📦 Loaded package questions:', questions.length);
  } catch (error) {
    console.error('Error loading package questions:', error);
    this.inlinePackageQuestions.set([]);
  }
}
```

### 5. **Phương thức toggleInlineQuestionSelection**

```typescript
toggleInlineQuestionSelection(questionId: string) {
  const current = this.selectedInlineQuestions();
  if (current.includes(questionId)) {
    this.selectedInlineQuestions.set(current.filter(id => id !== questionId));
  } else {
    this.selectedInlineQuestions.set([...current, questionId]);
  }
}
```

### 6. **Phương thức selectAllInlineQuestions**

```typescript
selectAllInlineQuestions() {
  const allIds = this.inlinePackageQuestions().map(q => q.id);
  this.selectedInlineQuestions.set(allIds);
}
```

### 7. **Phương thức clearInlineQuestionSelection**

```typescript
clearInlineQuestionSelection() {
  this.selectedInlineQuestions.set([]);
}
```

### 8. **Phương thức addInlineQuestionsToQuiz** (quan trọng nhất)

```typescript
async addInlineQuestionsToQuiz(lessonId: string) {
  if (this.selectedInlineQuestions().length === 0) {
    alert('Vui lòng chọn ít nhất một câu hỏi');
    return;
  }

  this.addingInlineQuestions.set(true);

  try {
    console.log('🔄 Adding questions to quiz:', {
      lessonId,
      questionIds: this.selectedInlineQuestions()
    });

    let addedCount = 0;
    let skippedCount = 0;

    // Add each question
    for (const questionId of this.selectedInlineQuestions()) {
      try {
        await firstValueFrom(this.quizApi.addQuestionToQuiz(lessonId, questionId));
        addedCount++;
        console.log(`✅ Added question ${questionId}`);
      } catch (error: any) {
        if (error?.error?.message?.includes('already exists')) {
          skippedCount++;
          console.log(`⚠️ Question ${questionId} already in quiz`);
        } else {
          console.error(`❌ Error adding question ${questionId}:`, error);
          throw error;
        }
      }
    }

    // Reload quiz questions
    await this.loadQuizQuestions(lessonId);

    // Reset inline selection
    this.selectedInlineQuestions.set([]);
    this.inlinePackageId = '';
    this.inlinePackageQuestions.set([]);

    // Show result
    if (addedCount > 0) {
      let msg = `✅ Đã thêm ${addedCount} câu hỏi vào Quiz!`;
      if (skippedCount > 0) {
        msg += ` (${skippedCount} câu đã có sẵn)`;
      }
      alert(msg);
      // Close modal after success
      this.closeInlineAddQuestionsModal();
    } else if (skippedCount > 0) {
      alert('⚠️ Tất cả câu hỏi đã có trong Quiz rồi!');
    }
  } catch (error: any) {
    console.error('Error adding inline questions:', error);
    alert('❌ Lỗi: ' + (error?.message || error?.error?.message || 'Không xác định'));
  } finally {
    this.addingInlineQuestions.set(false);
  }
}
```

### 9. **Template HTML Modal** (thêm vào cuối template, trước thẻ đóng `</div>`)

```html
<!-- Inline Add Questions Modal -->
@if (showInlineAddQuestionsModal()) {
  <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="closeInlineAddQuestionsModal()"></div>

      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">Thêm câu hỏi vào Quiz</h3>
            <button (click)="closeInlineAddQuestionsModal()" class="text-white/80 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <p class="text-blue-100 text-sm mt-1">Chọn gói câu hỏi và các câu hỏi muốn thêm</p>
        </div>

        <!-- Content -->
        <div class="bg-white px-6 py-6 max-h-96 overflow-y-auto">
          <!-- Package Selector -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Chọn gói câu hỏi</label>
            <select [(ngModel)]="inlinePackageId"
                    (change)="onInlinePackageChange(inlinePackageId)"
                    class="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">-- Chọn gói câu hỏi --</option>
              @for (pkg of quizPackages(); track pkg.id) {
                <option [value]="pkg.id">{{ pkg.name }} ({{ pkg.questionCount || 0 }} câu)</option>
              }
            </select>
          </div>

          <!-- Questions List -->
          @if (inlinePackageQuestions().length > 0) {
            <div class="space-y-3">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-medium text-gray-900">Danh sách câu hỏi</span>
                <div class="flex items-center gap-2">
                  <button type="button"
                          (click)="selectAllInlineQuestions()"
                          class="px-3 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                    Chọn tất cả
                  </button>
                  <button type="button"
                          (click)="clearInlineQuestionSelection()"
                          class="px-3 py-1 text-xs text-gray-600 bg-gray-50 rounded hover:bg-gray-100">
                    Bỏ chọn
                  </button>
                </div>
              </div>

              @for (q of inlinePackageQuestions(); track q.id) {
                <label class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all"
                       [class.border-blue-500]="selectedInlineQuestions().includes(q.id)"
                       [class.bg-blue-50]="selectedInlineQuestions().includes(q.id)">
                  <input type="checkbox"
                         [checked]="selectedInlineQuestions().includes(q.id)"
                         (change)="toggleInlineQuestionSelection(q.id)"
                         class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-900 mb-2">{{ q.content }}</p>
                    <div class="flex items-center gap-2">
                      <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                            [class.bg-green-100]="q.difficulty === 'EASY'"
                            [class.text-green-700]="q.difficulty === 'EASY'"
                            [class.bg-yellow-100]="q.difficulty === 'MEDIUM'"
                            [class.text-yellow-700]="q.difficulty === 'MEDIUM'"
                            [class.bg-red-100]="q.difficulty === 'HARD'"
                            [class.text-red-700]="q.difficulty === 'HARD'">
                        {{ q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'MEDIUM' ? 'TB' : 'Khó' }}
                      </span>
                    </div>
                  </div>
                </label>
              }
            </div>
          }

          @if (inlinePackageId && inlinePackageQuestions().length === 0) {
            <div class="text-center py-8 text-gray-500">
              <p>Gói này chưa có câu hỏi</p>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <div class="text-sm text-gray-600">
            @if (selectedInlineQuestions().length > 0) {
              <span class="font-medium text-blue-600">Đã chọn {{ selectedInlineQuestions().length }} câu hỏi</span>
            } @else {
              <span>Chưa chọn câu hỏi nào</span>
            }
          </div>
          <div class="flex gap-3">
            <button (click)="closeInlineAddQuestionsModal()"
                    class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button (click)="addInlineQuestionsToQuiz(inlineAddQuizLessonId()!)"
                    [disabled]="selectedInlineQuestions().length === 0 || addingInlineQuestions()"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              @if (addingInlineQuestions()) {
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang thêm...
              } @else {
                Thêm câu hỏi
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
}
```

## 📍 Vị trí thêm code

1. **Signals**: Thêm vào sau dòng khai báo các signal khác (khoảng dòng 2000-2100)
2. **Methods**: Thêm vào phần methods của class (sau các method hiện có)
3. **Template Modal**: Thêm vào cuối template, trước thẻ đóng `</div>` cuối cùng

## ✅ Kết luận

Tổng cộng cần thêm:
- **4 signals** mới
- **8 methods** mới  
- **1 modal template** HTML

Sau khi thêm code này, chức năng "Thêm câu hỏi" sẽ hoạt động trở lại bình thường.
