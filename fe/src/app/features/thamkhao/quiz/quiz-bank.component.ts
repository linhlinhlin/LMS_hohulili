import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TeacherService } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { QuestionApi, Question as ApiQuestion } from '../../../api/endpoints/question.api';
import { firstValueFrom } from 'rxjs';

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
  createdAt: Date;
  updatedAt: Date;
}

interface QuestionOption {
  id: string;
  optionKey: string;
  content: string;
  displayOrder: number;
}

@Component({
  selector: 'app-quiz-bank',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading
      [show]="isLoading()"
      text="Đang tải ngân hàng câu hỏi..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Quiz Context Banner (shown when selecting questions for a specific quiz) -->
        @if (targetQuizId()) {
          <div class="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="bg-white/20 rounded-full p-3">
                  <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <div class="text-sm font-medium opacity-90">Đang chọn câu hỏi cho Quiz</div>
                  <div class="text-2xl font-bold">{{ targetQuizTitle() }}</div>
                  <div class="text-sm opacity-75 mt-1">
                    @if (selectedQuestions().length > 0) {
                      <span class="bg-white/20 px-3 py-1 rounded-full">
                        ✓ Đã chọn {{ selectedQuestions().length }} câu hỏi
                      </span>
                    } @else {
                      Chọn câu hỏi từ danh sách bên dưới
                    }
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                @if (selectedQuestions().length > 0) {
                  <button (click)="saveQuestionsToQuiz()"
                          class="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors shadow-lg flex items-center gap-2">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    Lưu vào Quiz ({{ selectedQuestions().length }})
                  </button>
                }
                <button (click)="clearQuizContext()"
                        class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                  </svg>
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">📚 Ngân hàng câu hỏi</h1>
              <p class="text-gray-600">
                @if (targetQuizId()) {
                  Chọn câu hỏi để thêm vào quiz "{{ targetQuizTitle() }}"
                } @else {
                  Quản lý câu hỏi trắc nghiệm cho các bài quiz
                }
              </p>
            </div>
            @if (!targetQuizId()) {
              <div class="flex space-x-3">
                <button (click)="createQuestion()"
                        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <svg class="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                  </svg>
                  Thêm câu hỏi
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <form [formGroup]="filterForm" class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Search -->
            <div>
              <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm
              </label>
              <input
                type="text"
                id="search"
                formControlName="search"
                placeholder="Nội dung câu hỏi..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
            </div>

            <!-- Difficulty -->
            <div>
              <label for="difficulty" class="block text-sm font-medium text-gray-700 mb-2">
                Độ khó
              </label>
              <select
                id="difficulty"
                formControlName="difficulty"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="">Tất cả</option>
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
            </div>

            <!-- Status -->
            <div>
              <label for="status" class="block text-sm font-medium text-gray-700 mb-2">
                Trạng thái
              </label>
              <select
                id="status"
                formControlName="status"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="">Tất cả</option>
                <option value="DRAFT">Nháp</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            </div>

            <!-- Tags -->
            <div>
              <label for="tags" class="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                formControlName="tags"
                placeholder="Ví dụ: antoan, tau"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
            </div>
          </form>
        </div>

        <!-- Questions List -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <!-- Table Header -->
          <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">
                Danh sách câu hỏi ({{ filteredQuestions().length }})
              </h2>
              <div class="flex items-center space-x-2">
                <button (click)="toggleSelectAll()"
                        class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  {{ allSelected() ? 'Bỏ chọn tất cả' : 'Chọn tất cả' }}
                </button>
                @if (selectedQuestions().length > 0) {
                  <button (click)="bulkUpdateStatus('ACTIVE')"
                          class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                    Kích hoạt ({{ selectedQuestions().length }})
                  </button>
                  <button (click)="bulkUpdateStatus('INACTIVE')"
                          class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                    Vô hiệu hóa ({{ selectedQuestions().length }})
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Table Body -->
          <div class="divide-y divide-gray-200">
            @for (question of paginatedQuestions(); track question.id) {
              <div class="p-6 hover:bg-gray-50">
                <div class="flex items-start space-x-4">
                  <!-- Checkbox -->
                  <div class="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      [checked]="isSelected(question.id)"
                      (change)="toggleSelection(question.id)"
                      class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded">
                  </div>

                  <!-- Question Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center space-x-3">
                        <h3 class="text-lg font-medium text-gray-900 truncate">
                          {{ question.content }}
                        </h3>
                        <span [class]="getDifficultyClass(question.difficulty)"
                              class="px-2 py-1 text-xs font-medium rounded-full">
                          {{ getDifficultyLabel(question.difficulty) }}
                        </span>
                        <span [class]="getStatusClass(question.status)"
                              class="px-2 py-1 text-xs font-medium rounded-full">
                          {{ getStatusLabel(question.status) }}
                        </span>
                      </div>
                      <div class="flex items-center space-x-2">
                        <button (click)="editQuestion(question)"
                                class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                          </svg>
                        </button>
                        <button (click)="deleteQuestion(question.id)"
                                class="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <!-- Options Preview -->
                    <div class="mb-3">
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

                    <!-- Metadata -->
                    <div class="flex items-center justify-between text-sm text-gray-500">
                      <div class="flex items-center space-x-4">
                        @if (question.tags) {
                          <span>Tags: {{ question.tags }}</span>
                        }
                        <span>Lượt sử dụng: {{ question.usageCount }}</span>
                        <span>Tỷ lệ đúng: {{ question.correctRate.toFixed(1) }}%</span>
                      </div>
                      <div class="text-xs">
                        Cập nhật: {{ question.updatedAt | date:'dd/MM/yyyy HH:mm' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Empty State -->
          @if (filteredQuestions().length === 0) {
            <div class="text-center py-12">
              <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
              </svg>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Không tìm thấy câu hỏi nào</h3>
              <p class="text-gray-500 mb-4">Thử thay đổi bộ lọc hoặc tạo câu hỏi mới</p>
              <button (click)="createQuestion()"
                      class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Tạo câu hỏi đầu tiên
              </button>
            </div>
          }

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-700">
                  Hiển thị {{ (currentPage() - 1) * pageSize + 1 }} - {{ currentPage() * pageSize > filteredQuestions().length ? filteredQuestions().length : currentPage() * pageSize }}
                  trong tổng số {{ filteredQuestions().length }} câu hỏi
                </div>
                <div class="flex items-center space-x-2">
                  <button (click)="previousPage()"
                          [disabled]="currentPage() === 1"
                          class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    Trước
                  </button>
                  <span class="px-3 py-1 text-sm text-gray-700">
                    Trang {{ currentPage() }} / {{ totalPages() }}
                  </span>
                  <button (click)="nextPage()"
                          [disabled]="currentPage() === totalPages()"
                          class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    Sau
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizBankComponent implements OnInit {
  private fb = inject(FormBuilder);
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private quizApi = inject(QuizApi);
  private questionApi = inject(QuestionApi);

  // State
  isLoading = signal(false);
  questions = signal<QuestionBankItem[]>([]);
  selectedQuestions = signal<string[]>([]);
  
  // Quiz context (when selecting questions for a specific quiz)
  targetQuizId = signal<string | null>(null);
  targetQuizTitle = signal<string>('');
  returnUrl = signal<string>('/teacher/courses'); // Default return URL
  
  currentPage = signal(1);
  pageSize = 10;

  // Filters
  filterForm!: FormGroup;

  // Computed
  filteredQuestions = computed(() => {
    const allQuestions = this.questions();
    const filters = this.filterForm.value;

    return allQuestions.filter(question => {
      const matchesSearch = !filters.search ||
        question.content.toLowerCase().includes(filters.search.toLowerCase());
      const matchesDifficulty = !filters.difficulty || question.difficulty === filters.difficulty;
      const matchesStatus = !filters.status || question.status === filters.status;
      const matchesTags = !filters.tags ||
        (question.tags && question.tags.toLowerCase().includes(filters.tags.toLowerCase()));

      return matchesSearch && matchesDifficulty && matchesStatus && matchesTags;
    });
  });

  paginatedQuestions = computed(() => {
    const filtered = this.filteredQuestions();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return filtered.slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredQuestions().length / this.pageSize);
  });

  allSelected = computed(() => {
    const currentPageQuestions = this.paginatedQuestions();
    return currentPageQuestions.length > 0 &&
           currentPageQuestions.every(q => this.selectedQuestions().includes(q.id));
  });

  ngOnInit(): void {
    this.initializeFilters();
    this.loadQuestions();
    
    // Check for quiz context from query params
    this.route.queryParams.subscribe(params => {
      if (params['quizId'] && params['quizTitle']) {
        this.targetQuizId.set(params['quizId']);
        this.targetQuizTitle.set(params['quizTitle']);
        
        // Save return URL if provided
        if (params['returnUrl']) {
          this.returnUrl.set(params['returnUrl']);
        }
      }
    });
  }

  private initializeFilters(): void {
    this.filterForm = this.fb.group({
      search: [''],
      difficulty: [''],
      status: [''],
      tags: ['']
    });

    // Auto-filter when form changes
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage.set(1);
    });
  }

  private async loadQuestions(): Promise<void> {
    this.isLoading.set(true);
    try {
      console.log('📡 Loading questions from API...');
      
      // Get questions from backend API
      const apiQuestions = await firstValueFrom(
        this.questionApi.getQuestions()
      );
      
      console.log('✅ Loaded questions from API:', apiQuestions);
      
      // Convert API response to QuestionBankItem format
      const questions: QuestionBankItem[] = apiQuestions.map(q => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        tags: q.tags || '',
        status: q.status,
        correctOption: q.correctOption,
        options: q.options,
        usageCount: q.usageCount || 0,
        correctRate: q.correctRate || 0,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt)
      }));
      
      this.questions.set(questions);
      console.log(`✅ Loaded ${questions.length} questions successfully`);
      
    } catch (error) {
      console.error('❌ Error loading questions:', error);
      alert('❌ Lỗi khi tải danh sách câu hỏi. Vui lòng thử lại!');
    } finally {
      this.isLoading.set(false);
    }
  }

  createQuestion(): void {
    // TODO: Navigate to question creation
    console.log('Create question');
  }

  editQuestion(question: QuestionBankItem): void {
    // TODO: Navigate to question edit
    console.log('Edit question:', question.id);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      try {
        // TODO: Delete question via API
        this.questions.update(questions =>
          questions.filter(q => q.id !== questionId)
        );
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  }

  toggleSelection(questionId: string): void {
    this.selectedQuestions.update(selected => {
      if (selected.includes(questionId)) {
        return selected.filter(id => id !== questionId);
      } else {
        return [...selected, questionId];
      }
    });
  }

  toggleSelectAll(): void {
    const currentPageQuestions = this.paginatedQuestions();
    const allSelected = this.allSelected();

    if (allSelected) {
      // Deselect all on current page
      this.selectedQuestions.update(selected =>
        selected.filter(id => !currentPageQuestions.some(q => q.id === id))
      );
    } else {
      // Select all on current page
      const currentPageIds = currentPageQuestions.map(q => q.id);
      this.selectedQuestions.update(selected => {
        const newSelected = [...selected];
        currentPageIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  }

  isSelected(questionId: string): boolean {
    return this.selectedQuestions().includes(questionId);
  }

  async bulkUpdateStatus(status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    try {
      // TODO: Bulk update via API
      this.questions.update(questions =>
        questions.map(q =>
          this.selectedQuestions().includes(q.id)
            ? { ...q, status }
            : q
        )
      );
      this.selectedQuestions.set([]);
    } catch (error) {
      console.error('Error bulk updating status:', error);
    }
  }

  async saveQuestionsToQuiz(): Promise<void> {
    const quizId = this.targetQuizId();
    const questionIds = this.selectedQuestions();
    
    console.log('🔍 saveQuestionsToQuiz called!');
    console.log('   Quiz ID (lesson_id):', quizId);
    console.log('   Selected Question IDs:', questionIds);
    console.log('   Question count:', questionIds.length);
    
    if (!quizId || questionIds.length === 0) {
      console.warn('⚠️ Cannot save: quizId or questionIds is empty');
      return;
    }

    try {
      this.isLoading.set(true);
      
      console.log('📡 Calling API: PUT /quizzes/lessons/' + quizId + '/questions');
      console.log('   Request body:', { questionIds });
      
      // Call API to update quiz with question IDs
      const result = await firstValueFrom(this.quizApi.updateQuizQuestions(quizId, { questionIds }));
      
      console.log('✅ Quiz updated successfully:', result);
      alert(`✅ Đã lưu ${questionIds.length} câu hỏi vào quiz "${this.targetQuizTitle()}" thành công!`);
      
      // Clear selection after saving
      this.selectedQuestions.set([]);
      
      // Navigate back to the page where user came from
      this.router.navigate([this.returnUrl()]);
      
    } catch (error) {
      console.error('❌ Error saving questions to quiz:', error);
      console.error('   Error type:', typeof error);
      console.error('   Error details:', JSON.stringify(error, null, 2));
      if (error && typeof error === 'object') {
        console.error('   Error keys:', Object.keys(error));
        console.error('   Error message:', (error as any).message);
        console.error('   Error status:', (error as any).status);
        console.error('   Error response:', (error as any).error);
      }
      alert('❌ Lỗi khi lưu câu hỏi. Vui lòng thử lại!');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearQuizContext(): void {
    // Navigate back to return URL without saving
    this.router.navigate([this.returnUrl()]);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HARD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return difficulty;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động';
      case 'DRAFT': return 'Nháp';
      case 'INACTIVE': return 'Không hoạt động';
      default: return status;
    }
  }
}