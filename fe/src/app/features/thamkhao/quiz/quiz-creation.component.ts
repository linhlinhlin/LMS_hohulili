import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TeacherService, TeacherCourse } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface QuestionBankItem {
  id: string;
  content: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  correctOption: string;
  options: QuestionOption[];
  usageCount: number;
  correctRate: number;
}

interface QuestionOption {
  id: string;
  optionKey: string;
  content: string;
  displayOrder: number;
}

@Component({
  selector: 'app-quiz-creation',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading
      [show]="isSubmitting()"
      text="Đang tạo quiz..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-6xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">❓ Tạo Quiz mới</h1>
              <p class="text-gray-600">Tạo bài kiểm tra trắc nghiệm cho khóa học</p>
            </div>
            <button routerLink="/teacher/courses"
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              ← Quay lại
            </button>
          </div>
        </div>

        <!-- Quiz Creation Form -->
        <form [formGroup]="quizForm" (ngSubmit)="onSubmit()" class="space-y-8">
          <!-- Basic Information -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
              Thông tin cơ bản
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Quiz Title -->
              <div class="md:col-span-2">
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                  Tên Quiz *
                </label>
                <input
                  type="text"
                  id="title"
                  formControlName="title"
                  placeholder="Ví dụ: Quiz An toàn Hàng hải Cơ bản"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('title')">
                @if (quizForm.get('title')?.invalid && quizForm.get('title')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Tên quiz là bắt buộc</p>
                }
              </div>

              <!-- Course Selection -->
              <div>
                <label for="courseId" class="block text-sm font-medium text-gray-700 mb-2">
                  Khóa học *
                </label>
                <select
                  id="courseId"
                  formControlName="courseId"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('courseId')">
                  <option value="">Chọn khóa học</option>
                  @for (course of availableCourses(); track course.id) {
                    <option [value]="course.id">{{ course.title }}</option>
                  }
                </select>
                @if (quizForm.get('courseId')?.invalid && quizForm.get('courseId')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Vui lòng chọn khóa học</p>
                }
              </div>

              <!-- Section Selection -->
              <div>
                <label for="sectionId" class="block text-sm font-medium text-gray-700 mb-2">
                  Chương học *
                </label>
                <select
                  id="sectionId"
                  formControlName="sectionId"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('sectionId')">
                  <option value="">Chọn chương học</option>
                  @for (section of availableSections(); track section.id) {
                    <option [value]="section.id">{{ section.title }}</option>
                  }
                </select>
                @if (quizForm.get('sectionId')?.invalid && quizForm.get('sectionId')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Vui lòng chọn chương học</p>
                }
              </div>

              <!-- Time Limit -->
              <div>
                <label for="timeLimitMinutes" class="block text-sm font-medium text-gray-700 mb-2">
                  Giới hạn thời gian (phút)
                </label>
                <input
                  type="number"
                  id="timeLimitMinutes"
                  formControlName="timeLimitMinutes"
                  placeholder="30"
                  min="1"
                  max="300"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              </div>

              <!-- Max Attempts -->
              <div>
                <label for="maxAttempts" class="block text-sm font-medium text-gray-700 mb-2">
                  Số lần làm tối đa *
                </label>
                <input
                  type="number"
                  id="maxAttempts"
                  formControlName="maxAttempts"
                  placeholder="1"
                  min="1"
                  max="10"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('maxAttempts')">
                @if (quizForm.get('maxAttempts')?.invalid && quizForm.get('maxAttempts')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Số lần làm tối đa là bắt buộc</p>
                }
              </div>

              <!-- Passing Score -->
              <div>
                <label for="passingScore" class="block text-sm font-medium text-gray-700 mb-2">
                  Điểm đạt (%) *
                </label>
                <input
                  type="number"
                  id="passingScore"
                  formControlName="passingScore"
                  placeholder="60"
                  min="0"
                  max="100"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  [class]="getFieldClass('passingScore')">
                @if (quizForm.get('passingScore')?.invalid && quizForm.get('passingScore')?.touched) {
                  <p class="mt-1 text-sm text-red-600">Điểm đạt là bắt buộc</p>
                }
              </div>

              <!-- Start Date -->
              <div>
                <label for="startDate" class="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian mở
                </label>
                <input
                  type="datetime-local"
                  id="startDate"
                  formControlName="startDate"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              </div>

              <!-- End Date -->
              <div>
                <label for="endDate" class="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian đóng
                </label>
                <input
                  type="datetime-local"
                  id="endDate"
                  formControlName="endDate"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              </div>
            </div>

            <!-- Description -->
            <div class="mt-6">
              <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                Mô tả Quiz *
              </label>
              <textarea
                id="description"
                formControlName="description"
                rows="4"
                placeholder="Mô tả chi tiết về quiz, hướng dẫn làm bài..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                [class]="getFieldClass('description')"></textarea>
              @if (quizForm.get('description')?.invalid && quizForm.get('description')?.touched) {
                <p class="mt-1 text-sm text-red-600">Mô tả quiz là bắt buộc</p>
              }
            </div>
          </div>

          <!-- Quiz Settings -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c1.56.379 2.98-1.56 2.978-2.98a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
              </svg>
              Cài đặt Quiz
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Shuffle Questions -->
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="shuffleQuestions"
                  formControlName="shuffleQuestions"
                  class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded">
                <label for="shuffleQuestions" class="ml-2 block text-sm text-gray-900">
                  Xáo trộn câu hỏi
                </label>
              </div>

              <!-- Shuffle Options -->
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="shuffleOptions"
                  formControlName="shuffleOptions"
                  class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded">
                <label for="shuffleOptions" class="ml-2 block text-sm text-gray-900">
                  Xáo trộn đáp án
                </label>
              </div>

              <!-- Show Results Immediately -->
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="showResultsImmediately"
                  formControlName="showResultsImmediately"
                  class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded">
                <label for="showResultsImmediately" class="ml-2 block text-sm text-gray-900">
                  Hiển thị kết quả ngay sau khi nộp
                </label>
              </div>

              <!-- Show Correct Answers -->
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="showCorrectAnswers"
                  formControlName="showCorrectAnswers"
                  class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded">
                <label for="showCorrectAnswers" class="ml-2 block text-sm text-gray-900">
                  Hiển thị đáp án đúng
                </label>
              </div>
            </div>
          </div>

          <!-- Question Selection -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-gray-900 flex items-center">
                <svg class="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                Chọn câu hỏi từ ngân hàng ({{ selectedQuestions().length }})
              </h2>
              <button
                type="button"
                (click)="openQuestionBank()"
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                Chọn từ ngân hàng
              </button>
            </div>

            <!-- Selected Questions List -->
            <div class="space-y-4">
              @for (question of selectedQuestions(); track question.id; let i = $index) {
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-lg font-semibold text-gray-900">Câu hỏi {{ i + 1 }}</h3>
                    <button
                      type="button"
                      (click)="removeQuestion(question.id)"
                      class="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>

                  <div class="mb-3">
                    <p class="text-gray-900">{{ question.content }}</p>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>Độ khó: <span class="font-medium">{{ getDifficultyLabel(question.difficulty) }}</span></div>
                    <div>Tags: <span class="font-medium">{{ question.tags || 'Không có' }}</span></div>
                    <div>Đáp án đúng: <span class="font-medium">{{ question.correctOption }}</span></div>
                    <div>Lượt sử dụng: <span class="font-medium">{{ question.usageCount }}</span></div>
                  </div>

                  <!-- Options Preview -->
                  <div class="mt-3">
                    <p class="text-sm font-medium text-gray-700 mb-2">Các lựa chọn:</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      @for (option of question.options; track option.id) {
                        <div class="flex items-center space-x-2 text-sm">
                          <span class="font-medium text-purple-600">{{ option.optionKey }}.</span>
                          <span [class]="option.optionKey === question.correctOption ? 'font-medium text-green-600' : 'text-gray-700'">
                            {{ option.content }}
                          </span>
                          @if (option.optionKey === question.correctOption) {
                            <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                          }
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- Empty State -->
              @if (selectedQuestions().length === 0) {
                <div class="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa chọn câu hỏi nào</h3>
                  <p class="text-gray-500 mb-4">Chọn câu hỏi từ ngân hàng để tạo quiz</p>
                  <button
                    type="button"
                    (click)="openQuestionBank()"
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Chọn câu hỏi
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end space-x-4">
            <button
              type="button"
              routerLink="/teacher/courses"
              class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Hủy
            </button>
            <button
              type="submit"
              [disabled]="quizForm.invalid || isSubmitting() || selectedQuestions().length === 0"
              class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isSubmitting()) {
                <svg class="w-4 h-4 mr-2 animate-spin inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                </svg>
                Đang tạo...
              } @else {
                Tạo Quiz
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizCreationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private teacherService = inject(TeacherService);
  private router = inject(Router);

  // Form state
  quizForm!: FormGroup;
  isSubmitting = signal(false);
  selectedQuestions = signal<QuestionBankItem[]>([]);
  showQuestionBank = signal(false);

  // Available courses and sections
  availableCourses = computed(() => this.teacherService.activeCourses());
  availableSections = signal<any[]>([]);

  ngOnInit(): void {
    this.initializeForm();
    this.loadCourses();
  }

  private initializeForm(): void {
    this.quizForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      courseId: ['', Validators.required],
      sectionId: ['', Validators.required],
      timeLimitMinutes: [null],
      maxAttempts: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      passingScore: [60, [Validators.required, Validators.min(0), Validators.max(100)]],
      startDate: [null],
      endDate: [null],
      shuffleQuestions: [false],
      shuffleOptions: [false],
      showResultsImmediately: [true],
      showCorrectAnswers: [false]
    });

    // Watch course selection to load sections
    this.quizForm.get('courseId')?.valueChanges.subscribe(courseId => {
      if (courseId) {
        this.loadSections(courseId);
      } else {
        this.availableSections.set([]);
      }
    });
  }

  private async loadCourses(): Promise<void> {
    await this.teacherService.getCourses();
  }

  private async loadSections(courseId: string): Promise<void> {
    // TODO: Load sections for the selected course
    // For now, mock some sections
    this.availableSections.set([
      { id: 'section1', title: 'Chương 1: Cơ bản' },
      { id: 'section2', title: 'Chương 2: Nâng cao' },
      { id: 'section3', title: 'Chương 3: Ứng dụng' }
    ]);
  }

  getFieldClass(fieldName: string): string {
    const field = this.quizForm.get(fieldName);
    if (field?.invalid && field?.touched) {
      return 'border-red-500 focus:ring-red-500 focus:border-red-500';
    }
    return '';
  }

  openQuestionBank(): void {
    this.showQuestionBank.set(true);
    // TODO: Open question bank modal/selector
  }

  removeQuestion(questionId: string): void {
    this.selectedQuestions.update(questions =>
      questions.filter(q => q.id !== questionId)
    );
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return difficulty;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.quizForm.valid && this.selectedQuestions().length > 0) {
      this.isSubmitting.set(true);

      try {
        const formValue = this.quizForm.value;
        const questionIds = this.selectedQuestions().map(q => q.id);

        // TODO: Call quiz creation API
        console.log('Creating quiz:', {
          ...formValue,
          questionIds
        });

        // Navigate back to courses
        this.router.navigate(['/teacher/courses']);

      } catch (error) {
        console.error('Error creating quiz:', error);
      } finally {
        this.isSubmitting.set(false);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.quizForm.controls).forEach(key => {
        this.quizForm.get(key)?.markAsTouched();
      });
    }
  }
}