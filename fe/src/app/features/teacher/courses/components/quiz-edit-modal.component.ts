import { Component, input, output, signal, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuizApi } from '../../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';

interface QuizSettings {
  id: string;
  title: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quiz-edit-modal',
  imports: [ReactiveFormsModule],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="close()"></div>

        <!-- Modal -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <!-- Header -->
          <div class="bg-purple-600 px-6 py-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                </svg>
                Chỉnh sửa cấu hình Quiz
              </h3>
              <button (click)="close()" class="text-white hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="p-6">
            <!-- Loading State -->
            @if (isLoading()) {
            <div class="flex flex-col items-center justify-center py-12">
              <svg class="animate-spin h-12 w-12 text-purple-600 mb-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-gray-600">Đang tải thông tin quiz...</p>
            </div>
            }

            <!-- Error State -->
            @if (!isLoading() && errorMessage()) {
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div class="flex items-start gap-3">
                <svg class="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                <div class="flex-1">
                  <h4 class="font-semibold text-red-900 mb-1">Lỗi</h4>
                  <p class="text-red-700">{{ errorMessage() }}</p>
                </div>
              </div>
            </div>
            }

            <!-- Form -->
            @if (!isLoading() && !errorMessage()) {
            <form [formGroup]="editForm" class="space-y-6">
              <!-- Quiz Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tên Quiz</label>
              <input type="text" formControlName="title"
                     class="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                     placeholder="Nhập tên quiz">
              <p class="mt-1 text-sm text-gray-500">Tên hiển thị của bài trắc nghiệm</p>
            </div>

            <!-- Time Settings -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian làm bài (phút)
                </label>
                <input type="number" formControlName="timeLimitMinutes"
                       class="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                       placeholder="30" min="1">
                <p class="mt-1 text-sm text-gray-500">Để trống = không giới hạn</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Số lần làm tối đa
                </label>
                <input type="number" formControlName="maxAttempts"
                       class="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                       placeholder="1" min="1">
                <p class="mt-1 text-sm text-gray-500">Số lần sinh viên được làm</p>
              </div>
            </div>

            <!-- Passing Score -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Điểm đạt (%)
              </label>
              <input type="number" formControlName="passingScore"
                     class="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                     placeholder="60" min="0" max="100">
              <p class="mt-1 text-sm text-gray-500">Điểm tối thiểu để đạt (0-100%)</p>
            </div>

            <!-- Quiz Options -->
            <div class="space-y-3">
              <h4 class="font-medium text-gray-900">Tùy chọn Quiz</h4>
              
              <label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" formControlName="shuffleQuestions"
                       class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">Xáo trộn câu hỏi</div>
                  <div class="text-sm text-gray-500">Thứ tự câu hỏi sẽ khác nhau cho mỗi sinh viên</div>
                </div>
              </label>

              <label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" formControlName="shuffleOptions"
                       class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">Xáo trộn đáp án</div>
                  <div class="text-sm text-gray-500">Thứ tự A, B, C, D sẽ khác nhau cho mỗi sinh viên</div>
                </div>
              </label>

              <label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" formControlName="showResultsImmediately"
                       class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">Hiển thị kết quả ngay</div>
                  <div class="text-sm text-gray-500">Sinh viên thấy điểm ngay sau khi nộp bài</div>
                </div>
              </label>

              <label class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" formControlName="showCorrectAnswers"
                       class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">Hiển thị đáp án đúng</div>
                  <div class="text-sm text-gray-500">Sinh viên có thể xem đáp án đúng sau khi nộp</div>
                </div>
              </label>
            </div>

            <!-- Error Message -->
            @if (errorMessage()) {
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                <p class="text-sm text-red-800">{{ errorMessage() }}</p>
              </div>
            </div>
            }
            </form>
            }
          </div>

          <!-- Footer -->
          @if (!isLoading()) {
          <div class="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
            <button (click)="close()" type="button"
                    class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
              {{ errorMessage() ? 'Đóng' : 'Hủy' }}
            </button>
            @if (!errorMessage()) {
            <button (click)="save()" type="button" [disabled]="isSaving() || editForm.invalid"
                    class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              @if (isSaving()) {
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              }
              <span>{{ isSaving() ? 'Đang lưu...' : 'Lưu thay đổi' }}</span>
            </button>
            }
          </div>
          }
        </div>
      </div>
    </div>
    }
  `
})
export class QuizEditModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly quizApi = inject(QuizApi);

  // Writable signal for programmatic assignment from parent via ViewChild
  lessonId = signal<string | null>(null);

  // Output functions (Angular v20+)
  readonly closed = output<void>();
  readonly saved = output<void>();

  isOpen = signal(false);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);

  editForm!: FormGroup;
  private quizSettings: QuizSettings | null = null;

  ngOnInit() {
    this.editForm = this.fb.group({
      title: ['', Validators.required],
      timeLimitMinutes: [null],
      maxAttempts: [1, [Validators.required, Validators.min(1)]],
      passingScore: [60, [Validators.required, Validators.min(0), Validators.max(100)]],
      shuffleQuestions: [false],
      shuffleOptions: [false],
      showResultsImmediately: [true],
      showCorrectAnswers: [false]
    });
  }

  async open() {
    const currentLessonId = this.lessonId();

    if (!currentLessonId) {
      this.errorMessage.set('Không tìm thấy lesson ID');
      return;
    }

    this.isOpen.set(true);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Load current quiz settings
    try {
      const quiz = await firstValueFrom(this.quizApi.getQuizByReference(currentLessonId));

      this.quizSettings = {
        id: quiz.id,
        title: quiz.title || '',
        timeLimitMinutes: quiz.timeLimitMinutes,
        maxAttempts: quiz.maxAttempts || 1,
        passingScore: quiz.passingScore || 60,
        shuffleQuestions: quiz.shuffleQuestions || false,
        shuffleOptions: quiz.shuffleOptions || false,
        showResultsImmediately: quiz.showResultsImmediately !== false,
        showCorrectAnswers: quiz.showCorrectAnswers || false
      };

      // Populate form
      this.editForm.patchValue(this.quizSettings);
      this.isLoading.set(false);
    } catch (error: any) {
      this.isLoading.set(false);
      this.errorMessage.set(error.message || 'Không thể tải thông tin quiz. Vui lòng thử lại.');
    }
  }

  close() {
    this.isOpen.set(false);
    this.editForm.reset();
    this.quizSettings = null;
    this.errorMessage.set(null);
    this.closed.emit();
  }

  async save() {
    if (this.editForm.invalid || !this.quizSettings) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const formValue = this.editForm.value;

      // Update quiz settings via API
      await firstValueFrom(this.quizApi.updateQuizSettings(this.quizSettings.id, {
        title: formValue.title,
        timeLimitMinutes: formValue.timeLimitMinutes || null,
        maxAttempts: formValue.maxAttempts,
        passingScore: formValue.passingScore,
        shuffleQuestions: formValue.shuffleQuestions,
        shuffleOptions: formValue.shuffleOptions,
        showResultsImmediately: formValue.showResultsImmediately,
        showCorrectAnswers: formValue.showCorrectAnswers
      }));

      this.saved.emit();
      this.close();
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Không thể cập nhật quiz');
    } finally {
      this.isSaving.set(false);
    }
  }
}
