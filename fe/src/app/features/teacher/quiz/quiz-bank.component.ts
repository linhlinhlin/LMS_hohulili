import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { QuestionApi, Question, QuestionOption } from '../../../api/endpoints/question.api';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';
import { UserRole } from '../../../shared/types/user.types';
import { firstValueFrom } from 'rxjs';

interface Quiz {
  id: string;
  lesson: any;
  questionIds: string;
  timeLimitMinutes: number;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-quiz-bank',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto p-6">
      <!-- Main Content -->
      <div>
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">🏦 Quiz Bank</h1>
            <p class="text-gray-600 mt-2">Quản lý ngân hàng câu hỏi và tạo quiz</p>
          </div>
          <div class="flex gap-3">
            <button (click)="createNewQuiz()"
                    class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
              ➕ Tạo Quiz Mới
            </button>
            <button (click)="createNewQuestion()"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              ❓ Thêm Câu Hỏi
            </button>
            <button (click)="testApiAccess()"
                    class="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium">
              🔧 Test API
            </button>
          </div>
        </div>

      <!-- Quiz Context Alert -->
      <div *ngIf="currentQuizId" 
           class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-purple-800">🎯 Đang thêm câu hỏi cho quiz:</h3>
            <p class="text-purple-700">{{ currentQuizTitle }}</p>
          </div>
          <button (click)="clearQuizContext()" 
                  class="px-3 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300 text-sm">
            ✕ Đóng
          </button>
        </div>
      </div>

      <!-- Main Content Tabs -->
      <div class="bg-white rounded-lg shadow">
        <!-- Tab Headers -->
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex">
            <button (click)="activeTab.set('quizzes')"
                    [class.border-purple-500]="activeTab() === 'quizzes'"
                    [class.text-purple-600]="activeTab() === 'quizzes'"
                    class="whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm">
              📋 Quản lý Quiz ({{ quizzes().length }})
            </button>
            <button (click)="activeTab.set('questions')"
                    [class.border-purple-500]="activeTab() === 'questions'"
                    [class.text-purple-600]="activeTab() === 'questions'"
                    class="whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm">
              ❓ Ngân hàng câu hỏi ({{ questions().length }})
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Quiz Management Tab -->
          <div *ngIf="activeTab() === 'quizzes'" class="space-y-6">
            <!-- Quiz List -->
            <div *ngIf="quizzes().length > 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div *ngFor="let quiz of quizzes()" 
                   class="bg-gray-50 border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-4">
                  <h3 class="font-semibold text-lg text-gray-900">{{ quiz.lesson?.title || 'Quiz không có tiêu đề' }}</h3>
                  <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    Đã xuất bản
                  </span>
                </div>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">{{ quiz.lesson?.description || 'Chưa có mô tả' }}</p>
                
                <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div class="text-center">
                    <div class="font-semibold text-purple-600">{{ quiz.timeLimitMinutes }}</div>
                    <div class="text-gray-500">Phút</div>
                  </div>
                  <div class="text-center">
                    <div class="font-semibold text-green-600">{{ quiz.passingScore }}%</div>
                    <div class="text-gray-500">Điểm đỗ</div>
                  </div>
                </div>
                
                <div class="flex gap-2">
                  <button (click)="editQuiz(quiz)" 
                          class="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                    ✏️ Sửa
                  </button>
                  <button (click)="addQuestionsToQuiz(quiz)" 
                          class="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                    ➕ Câu hỏi
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div *ngIf="quizzes().length === 0" 
                 class="text-center py-12 text-gray-500">
              <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h3 class="text-lg font-medium mb-2">Chưa có quiz nào</h3>
              <p class="mb-4">Tạo quiz đầu tiên để bắt đầu</p>
              <button (click)="createNewQuiz()" 
                      class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                ➕ Tạo Quiz Mới
              </button>
            </div>
          </div>

          <!-- Question Bank Tab -->
          <div *ngIf="activeTab() === 'questions'" class="space-y-6">
            <!-- Question Filters -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                  <input type="text" 
                         [(ngModel)]="questionFilters.search" 
                         (ngModelChange)="filterQuestions()"
                         placeholder="Nội dung câu hỏi..."
                         class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Độ khó</label>
                  <select [(ngModel)]="questionFilters.difficulty"
                          (ngModelChange)="filterQuestions()"
                          class="w-full px-3 py-2 border rounded-lg">
                    <option value="">Tất cả</option>
                    <option value="EASY">Dễ</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HARD">Khó</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input type="text"
                         [(ngModel)]="questionFilters.tags"
                         (ngModelChange)="filterQuestions()"
                         placeholder="Tags..."
                         class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select [(ngModel)]="questionFilters.status"
                          (ngModelChange)="filterQuestions()"
                          class="w-full px-3 py-2 border rounded-lg">
                    <option value="">Tất cả</option>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="DRAFT">Nháp</option>
                    <option value="INACTIVE">Không hoạt động</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Question List -->
            <div *ngIf="filteredQuestions().length > 0" class="space-y-4">
              <div *ngFor="let question of filteredQuestions()" 
                   class="border rounded-lg p-4 hover:shadow-sm">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xs px-2 py-1 rounded-full font-medium"
                            [class]="getDifficultyClass(question.difficulty)">
                        {{ getDifficultyLabel(question.difficulty) }}
                      </span>
                      <span class="text-xs text-gray-500">ID: {{ question.id }}</span>
                      <span class="text-xs text-gray-500">Status: {{ getStatusLabel(question.status) }}</span>
                      <span class="text-xs text-gray-500">Sử dụng: {{ question.usageCount || 0 }} lần</span>
                    </div>
                    <h4 class="font-medium text-gray-900 mb-2">{{ question.content }}</h4>
                  </div>
                  <div class="flex gap-2 ml-4">
                    <button (click)="editQuestion(question)" 
                            class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      ✏️ Sửa
                    </button>
                    <button *ngIf="currentQuizId" 
                            (click)="addQuestionToCurrentQuiz(question)" 
                            class="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                      ➕ Thêm vào Quiz
                    </button>
                  </div>
                </div>

                <!-- Question Options -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  <div *ngFor="let option of question.options" 
                       class="flex items-center gap-2 p-2 rounded"
                       [class.bg-green-50]="option.optionKey === question.correctOption"
                       [class.border-green-200]="option.optionKey === question.correctOption"
                       [class.border]="true">
                   <div class="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold"
                        [class.bg-green-500]="option.optionKey === question.correctOption"
                        [class.text-white]="option.optionKey === question.correctOption"
                        [class.bg-gray-400]="option.optionKey !== question.correctOption"
                        [class.text-white]="option.optionKey !== question.correctOption">
                     {{ option.optionKey }}
                   </div>
                   <span class="text-sm flex-1">{{ option.content }}</span>
                   <svg *ngIf="option.optionKey === question.correctOption"
                        class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                     <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                   </svg>
                  </div>
                </div>

                <!-- Question Tags -->
                <div class="flex flex-wrap gap-1">
                  <span *ngFor="let tag of question.tags.split(',')" 
                        class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    #{{ tag.trim() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Empty Questions State -->
            <div *ngIf="filteredQuestions().length === 0" 
                 class="text-center py-12 text-gray-500">
              <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 class="text-lg font-medium mb-2">Không tìm thấy câu hỏi</h3>
              <p class="mb-4">Thử thay đổi bộ lọc hoặc tạo câu hỏi mới</p>
              <button (click)="createNewQuestion()" 
                      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                ❓ Tạo Câu Hỏi Mới
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error()"
           class="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
        {{ error() }}
        <button (click)="error.set('')" class="ml-2">✕</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizBankComponent implements OnInit {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private errorService = inject(ErrorHandlingService);
  private quizApi = inject(QuizApi);
  private questionApi = inject(QuestionApi);

  // Component state
  activeTab = signal<'quizzes' | 'questions'>('quizzes');
  error = signal<string>('');




  // Data
  quizzes = signal<any[]>([]);
  questions = signal<Question[]>([]);
  filteredQuestions = signal<Question[]>([]);

  // Quiz context from URL params
  currentQuizId: string | null = null;
  currentQuizTitle: string = '';
  courseId: string | null = null;  // Add courseId context

  // Question filters
  questionFilters = {
    search: '',
    difficulty: '',
    status: '',
    tags: ''
  };

  constructor() {
    // Check for quiz context from navigation
    this.route.queryParams.subscribe(params => {
      if (params['quizId']) {
        this.currentQuizId = params['quizId'];
        this.currentQuizTitle = params['quizTitle'] || '';
        
        // Switch to questions tab when adding to quiz
        this.activeTab.set('questions');
      }
      
      // Check for refresh request
      if (params['refresh'] === 'true') {
        this.activeTab.set('questions'); // Switch to questions tab after creating
        this.loadData();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Get context from URL params
    this.currentQuizId = this.route.snapshot.queryParamMap.get('quizId');
    this.currentQuizTitle = this.route.snapshot.queryParamMap.get('quizTitle') || '';
    this.courseId = this.route.snapshot.queryParamMap.get('courseId');
    
    // Load data immediately
    await this.loadData();
  }

  async loadData(): Promise<void> {

    try {
      
      // Add JWT token debugging
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔍 JWT Token Debug:', {
            tokenExists: true,
            tokenLength: token.length,
            tokenPreview: token.substring(0, 20) + '...',
            roles: payload.roles,
            authorities: payload.authorities,
            username: payload.sub,
            exp: new Date(payload.exp * 1000),
            iat: new Date(payload.iat * 1000),
            isExpired: payload.exp * 1000 < Date.now()
          });
        } catch (e) {
          console.log('🚨 JWT Token Parse Error:', e);
        }
      } else {
        console.log('🚨 No JWT token found in localStorage!');
        console.log('🔍 All localStorage keys:', Object.keys(localStorage));
      }

      // Load questions from Question API - Use getMyQuestions for teacher-specific questions
      const questionsRes = await firstValueFrom(this.questionApi.getMyQuestions());
      
      if (questionsRes) {
        this.questions.set(questionsRes);
        this.filteredQuestions.set(questionsRes);
      }

      // Load quizzes from teacher API
      const quizzesRes = await firstValueFrom(this.quizApi.getTeacherQuizzes());
      
      if (quizzesRes) {
        this.quizzes.set(quizzesRes);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      this.error.set('Lỗi khi tải dữ liệu: ' + (error?.error?.message || error?.message || 'Lỗi không xác định'));
    }
  }

  filterQuestions(): void {
    let filtered = [...this.questions()];

    if (this.questionFilters.search) {
      const search = this.questionFilters.search.toLowerCase();
      filtered = filtered.filter(q => q.content.toLowerCase().includes(search));
    }

    if (this.questionFilters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === this.questionFilters.difficulty);
    }

    if (this.questionFilters.status) {
      filtered = filtered.filter(q => q.status === this.questionFilters.status);
    }

    if (this.questionFilters.tags) {
      const tags = this.questionFilters.tags.toLowerCase();
      filtered = filtered.filter(q => q.tags?.toLowerCase().includes(tags));
    }

    this.filteredQuestions.set(filtered);
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'HARD': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'EASY': return 'Dễ';
      case 'MEDIUM': return 'Trung bình';
      case 'HARD': return 'Khó';
      default: return 'Không xác định';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động';
      case 'DRAFT': return 'Nháp';
      case 'INACTIVE': return 'Không hoạt động';
      default: return 'Không xác định';
    }
  }

  getQuizStatusClass(status: string): string {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'PUBLISHED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  createNewQuiz(): void {
    console.log('🎯 Creating new quiz...');
    // Navigate to quiz creation page - path will be /teacher/quiz/create
    this.router.navigate(['/teacher/quiz/create'], {
      queryParams: {
        returnUrl: this.router.url
      }
    });
  }

  editQuiz(quiz: Quiz): void {
    console.log('🔧 Editing quiz:', quiz);
    this.router.navigate(['/teacher/quiz', quiz.id, 'edit'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  addQuestionsToQuiz(quiz: Quiz): void {
    console.log('🔧 Adding questions to quiz:', quiz);
    const quizId = quiz.lesson?.id || quiz.id;
    const quizTitle = quiz.lesson?.title || 'Quiz';
    this.router.navigate(['/teacher/quiz/quiz-bank'], {
      queryParams: {
        quizId: quizId,
        quizTitle: quizTitle,
        returnUrl: this.router.url
      }
    });
  }

  createNewQuestion(): void {
    console.log('❓ Creating new question...');
    // Navigate to question creation page with courseId if available
    const queryParams: any = {
      returnUrl: this.router.url
    };
    
    if (this.courseId) {
      queryParams.courseId = this.courseId;
      console.log('🔍 Passing courseId to question-create:', this.courseId);
    }
    
    this.router.navigate(['/teacher/quiz/question/create'], {
      queryParams
    });
  }

  editQuestion(question: Question): void {
    console.log('🔧 Editing question:', question);
    this.router.navigate(['/teacher/quiz/question', question.id, 'edit'], {
      queryParams: {
        returnUrl: this.router.url
      }
    });
  }

  async addQuestionToCurrentQuiz(question: Question): Promise<void> {
    if (!this.currentQuizId) return;

    try {
      
      await firstValueFrom(this.quizApi.addQuestionToQuiz(this.currentQuizId, question.id));
      
      alert(`Đã thêm câu hỏi "${question.content.substring(0, 50)}..." vào quiz "${this.currentQuizTitle}"`);
      
      // Reload quizzes to reflect changes
      await this.loadData();
    } catch (error: any) {
      console.error('Error adding question to quiz:', error);
      this.error.set('Lỗi khi thêm câu hỏi vào quiz: ' + (error?.error?.message || error?.message || 'Lỗi không xác định'));
    }
  }

  clearQuizContext(): void {
    this.currentQuizId = null;
    this.currentQuizTitle = '';
    
    this.router.navigate(['/teacher/quiz/quiz-bank'], {
      queryParams: {}
    });
  }

  async testApiAccess(): Promise<void> {
    try {
      const myQuestions = await firstValueFrom(this.questionApi.getMyQuestions());
      alert(`✅ API Test thành công!\n- getMyQuestions(): ${myQuestions?.length || 0} câu hỏi`);
    } catch (error: any) {
      console.error('❌ API Test failed:', error);
      alert(`❌ API Test thất bại:\n${error?.error?.message || error?.message || 'Lỗi không xác định'}`);
    }
  }

  navigateToCourses(): void {
    this.router.navigate(['/courses']);
  }
}