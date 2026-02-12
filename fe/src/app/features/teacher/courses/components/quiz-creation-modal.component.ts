import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PackageApi, PackageDTO } from '../../../../api/endpoints/package.api';
import { Question } from '../../../../api/endpoints/question.api';
import { QuizApi } from '../../../../api/endpoints/quiz.api';
import { LessonApi } from '../../../../api/client/lesson.api';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

interface QuizMetadata {
  title: string;
  description: string;
  timeLimit?: number;
  passingScore: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quiz-creation-modal',
  imports: [FormsModule, IconComponent],
  template: `
    @if (isOpen()) {
    <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="close()"></div>
      
      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-4xl max-h-[90vh] flex flex-col"
             (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="bg-[#0056D2] px-6 py-4 flex justify-between items-center">
            <h3 class="text-xl font-semibold text-white" id="modal-title">
              <app-icon name="target" size="sm" class="mr-1"/> Tạo bài trắc nghiệm mới
            </h3>
            <button (click)="close()" 
                    class="text-white hover:text-gray-200 transition-colors"
                    aria-label="Close modal">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            
            <!-- Quiz Metadata Section -->
            <div class="mb-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4"><app-icon name="file-text" size="sm" class="mr-1"/> Thông tin bài trắc nghiệm</h4>
              
              <div class="space-y-4">
                <!-- Title -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề <span class="text-red-500">*</span>
                  </label>
                  <input type="text" 
                         [(ngModel)]="quizTitle"
                         placeholder="Nhập tiêu đề bài trắc nghiệm"
                         class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                         [class.border-red-500]="showValidation() && !quizTitle()">
                  @if (showValidation() && !quizTitle()) {
                  <p class="text-xs text-red-500 mt-1">
                    Tiêu đề là bắt buộc
                  </p>
                  }
                </div>

                <!-- Description -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea [(ngModel)]="quizDescription"
                            rows="3"
                            placeholder="Nhập mô tả cho bài trắc nghiệm (tùy chọn)"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"></textarea>
                </div>

                <!-- Time Limit and Passing Score -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian (phút)
                    </label>
                    <input type="number" 
                           [(ngModel)]="quizTimeLimit"
                           min="1"
                           placeholder="Không giới hạn"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Điểm đạt (%) <span class="text-red-500">*</span>
                    </label>
                    <input type="number" 
                           [(ngModel)]="quizPassingScore"
                           min="0"
                           max="100"
                           placeholder="70"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                           [class.border-red-500]="showValidation() && !isValidPassingScore()">
                    @if (showValidation() && !isValidPassingScore()) {
                    <p class="text-xs text-red-500 mt-1">
                      Điểm đạt phải từ 0-100
                    </p>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-gray-200 my-6"></div>

            <!-- Question Selection Section -->
            <div>
              <h4 class="text-lg font-semibold text-gray-900 mb-4"><app-icon name="courses" size="sm" class="mr-1"/> Chọn câu hỏi</h4>
              
              <!-- Package Selector -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Chọn gói câu hỏi <span class="text-red-500">*</span>
                </label>
                <div class="flex gap-3">
                  <select [(ngModel)]="selectedPackageId" 
                          (ngModelChange)="onPackageChange($event)"
                          [disabled]="packagesLoading()"
                          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                          [class.border-red-500]="showValidation() && !selectedPackageId()">
                    <option value="">-- Chọn gói câu hỏi --</option>
                    @for (pkg of packages(); track pkg.id) {
                    <option [value]="pkg.id">
                      {{ pkg.name }} ({{ pkg.questionCount }} câu)
                    </option>
                    }
                  </select>
                  <button (click)="loadPackages()" 
                          [disabled]="packagesLoading()"
                          class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          title="Làm mới danh sách gói">
                    <app-icon name="refresh" size="sm" [class]="packagesLoading() ? 'animate-spin' : ''"/>
                  </button>
                </div>
                @if (showValidation() && !selectedPackageId()) {
                <p class="text-xs text-red-500 mt-1">
                  Vui lòng chọn gói câu hỏi
                </p>
                }
              </div>

              <!-- Questions List -->
              @if (availableQuestions().length > 0) {
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                  <div>
                    <h5 class="font-medium text-gray-900">
                      Câu hỏi có sẵn ({{ availableQuestions().length }})
                    </h5>
                    <p class="text-sm text-[#0056D2] mt-1">
                      Đã chọn: {{ selectedQuestionIds().size }} câu
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button (click)="selectAllQuestions()" 
                            class="text-sm px-3 py-1 bg-blue-100 text-[#004BB5] rounded hover:bg-blue-200">
                      Chọn tất cả
                    </button>
                    <button (click)="clearQuestionSelection()" 
                            class="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div class="max-h-64 overflow-y-auto space-y-2">
                  @for (question of availableQuestions(); track question.id) {
                  <div class="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                       (click)="toggleQuestionSelection(question.id)">
                    <input type="checkbox" 
                           [checked]="selectedQuestionIds().has(question.id)"
                           (click)="$event.stopPropagation()"
                           (change)="toggleQuestionSelection(question.id)"
                           class="mt-1">
                    <div class="flex-1">
                      <p class="text-sm text-gray-900">{{ question.content }}</p>
                      <div class="flex gap-2 mt-1">
                        <span class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          {{ question.difficulty === 'EASY' ? 'Dễ' : question.difficulty === 'MEDIUM' ? 'Trung bình' : 'Khó' }}
                        </span>
                        @if (question.tags) {
                        <span class="text-xs px-2 py-0.5 bg-blue-100 text-[#004BB5] rounded">
                          {{ question.tags }}
                        </span>
                        }
                      </div>
                    </div>
                  </div>
                  }
                </div>
                
                @if (showValidation() && selectedQuestionIds().size === 0) {
                <p class="text-xs text-red-500 mt-2">
                  Vui lòng chọn ít nhất một câu hỏi
                </p>
                }
              </div>
              }

              <!-- Loading State -->
              @if (questionsLoading()) {
              <div class="text-center py-8">
                <div class="animate-spin inline-block w-8 h-8 border-4 border-[#0056D2] border-t-transparent rounded-full"></div>
                <p class="text-gray-600 mt-2">Đang tải câu hỏi...</p>
              </div>
              }

              <!-- Empty State -->
              @if (selectedPackageId() && availableQuestions().length === 0 && !questionsLoading()) {
              <div class="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p class="text-yellow-700"><app-icon name="courses" size="sm" class="mr-1"/> Gói này chưa có câu hỏi nào.</p>
                <p class="text-sm text-yellow-600 mt-1">Hãy thêm câu hỏi vào gói hoặc chọn gói khác.</p>
              </div>
              }

              @if (!selectedPackageId() && !questionsLoading()) {
              <div class="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                <p class="text-gray-600">Chọn gói câu hỏi để bắt đầu</p>
                <p class="text-sm text-gray-500 mt-1"><app-icon name="lightbulb" size="sm" class="mr-1"/> Gói câu hỏi giúp tổ chức câu hỏi theo chủ đề</p>
              </div>
              }

              <!-- Error State -->
              @if (questionsError()) {
              <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-red-700">{{ questionsError() }}</p>
              </div>
              }
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
            <div class="text-sm text-gray-600">
              @if (selectedQuestionIds().size > 0) {
              <span>
                <app-icon name="check" size="xs"/> {{ selectedQuestionIds().size }} câu hỏi đã chọn
              </span>
              }
            </div>
            <div class="flex gap-3">
              <button (click)="close()" 
                      class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Hủy
              </button>
              <button (click)="createQuiz()" 
                      [disabled]="!isFormValid() || isCreating()"
                      class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                @if (isCreating()) {
                <span class="animate-spin">⟳</span>
                }
                <span>{{ isCreating() ? 'Đang tạo...' : 'Tạo bài trắc nghiệm' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class QuizCreationModalComponent {
  // Signal inputs (Angular v20+)
  readonly courseId = input<string>('');
  readonly sectionId = input<string>('');

  // Output functions (Angular v20+)
  readonly quizCreated = output<string>();
  readonly closed = output<void>();

  private readonly packageApi = inject(PackageApi);
  private readonly quizApi = inject(QuizApi);
  private readonly lessonApi = inject(LessonApi);

  // Modal state
  isOpen = signal<boolean>(false);
  showValidation = signal<boolean>(false);
  isCreating = signal<boolean>(false);

  // Quiz metadata
  quizTitle = signal<string>('');
  quizDescription = signal<string>('');
  quizTimeLimit = signal<number | undefined>(undefined);
  quizPassingScore = signal<number>(70);

  // Package state
  packages = signal<PackageDTO[]>([]);
  selectedPackageId = signal<string>('');
  packagesLoading = signal<boolean>(false);

  // Question state
  availableQuestions = signal<Question[]>([]);
  selectedQuestionIds = signal<Set<string>>(new Set());
  questionsLoading = signal<boolean>(false);
  questionsError = signal<string>('');

  // Computed
  isFormValid = computed(() => {
    return this.quizTitle().trim().length > 0 &&
      this.isValidPassingScore() &&
      this.selectedPackageId().length > 0 &&
      this.selectedQuestionIds().size > 0;
  });

  isValidPassingScore(): boolean {
    const score = this.quizPassingScore();
    return score >= 0 && score <= 100;
  }

  open() {
    this.isOpen.set(true);
    this.resetForm();
    this.loadPackages();
  }

  close() {
    this.isOpen.set(false);
    this.showValidation.set(false);
    this.closed.emit();
  }

  resetForm() {
    this.quizTitle.set('');
    this.quizDescription.set('');
    this.quizTimeLimit.set(undefined);
    this.quizPassingScore.set(70);
    this.selectedPackageId.set('');
    this.availableQuestions.set([]);
    this.selectedQuestionIds.set(new Set());
    this.questionsError.set('');
    this.showValidation.set(false);
  }

  async loadPackages() {
    this.packagesLoading.set(true);
    try {
      const packages = await firstValueFrom(this.packageApi.getMyPackages());
      this.packages.set(packages);
    } catch (error: any) {
    } finally {
      this.packagesLoading.set(false);
    }
  }

  async onPackageChange(packageId: string) {
    this.selectedPackageId.set(packageId);
    this.selectedQuestionIds.set(new Set());

    if (!packageId) {
      this.availableQuestions.set([]);
      return;
    }

    await this.loadQuestionsFromPackage(packageId);
  }

  async loadQuestionsFromPackage(packageId: string) {
    this.questionsLoading.set(true);
    this.questionsError.set('');

    try {
      const questions = await firstValueFrom(
        this.packageApi.getQuestionsInPackage(packageId)
      );
      this.availableQuestions.set(questions);
    } catch (error: any) {
      this.questionsError.set('Không thể tải câu hỏi từ gói');
    } finally {
      this.questionsLoading.set(false);
    }
  }

  toggleQuestionSelection(questionId: string) {
    const currentSelection = new Set(this.selectedQuestionIds());
    if (currentSelection.has(questionId)) {
      currentSelection.delete(questionId);
    } else {
      currentSelection.add(questionId);
    }
    this.selectedQuestionIds.set(currentSelection);
  }

  selectAllQuestions() {
    const allIds = new Set(this.availableQuestions().map(q => q.id));
    this.selectedQuestionIds.set(allIds);
  }

  clearQuestionSelection() {
    this.selectedQuestionIds.set(new Set());
  }

  async createQuiz() {
    // Show validation
    this.showValidation.set(true);

    // Check if form is valid
    if (!this.isFormValid()) {
      return;
    }

    this.isCreating.set(true);

    try {
      // Step 1: Create lesson with type QUIZ
      const lessonPayload = {
        title: this.quizTitle(),
        description: this.quizDescription(),
        lessonType: 'QUIZ' as const,
        content: '',
        videoUrl: ''
      };

      const lessonResponse = await firstValueFrom(
        this.lessonApi.createLesson(this.sectionId(), lessonPayload)
      );

      const lessonId = lessonResponse.data.id;

      // Step 2: Check if quiz already exists, then create or update
      try {
        // Try to get existing quiz first
        const existingQuizResponse = await firstValueFrom(
          this.quizApi.getQuizByLessonId(lessonId)
        );

        // Quiz exists, update questions
        await firstValueFrom(
          this.quizApi.updateQuizQuestions(lessonId, {
            questionIds: Array.from(this.selectedQuestionIds())
          })
        );

      } catch (getQuizError: any) {
        // Quiz doesn't exist (404), create new one
        if (getQuizError?.status === 404 || getQuizError?.error?.message?.includes('not found')) {
          const quizPayload = {
            title: this.quizTitle(), // Add title for database constraint
            questionIds: Array.from(this.selectedQuestionIds()),
            timeLimitMinutes: this.quizTimeLimit(),
            passingScore: this.quizPassingScore(),
            maxAttempts: 1,
            shuffleQuestions: false,
            shuffleOptions: false,
            showResultsImmediately: true,
            showCorrectAnswers: true
          };

          await firstValueFrom(
            this.quizApi.createQuiz(lessonId, quizPayload)
          );
        } else {
          // Other error, rethrow
          throw getQuizError;
        }
      }

      this.quizCreated.emit(lessonId);
      this.close();
    } catch (error: any) {
      const errorMessage = error?.error?.message || error?.message || 'Không thể tạo bài trắc nghiệm. Vui lòng thử lại.';
      this.questionsError.set(errorMessage);
    } finally {
      this.isCreating.set(false);
    }
  }
}
