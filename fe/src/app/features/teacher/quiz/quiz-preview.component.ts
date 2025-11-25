import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';

interface QuizQuestion {
  id: string;
  content: string;
  difficulty: string;
  options: { key: string; content: string }[];
  correctOption: string;
}

@Component({
  selector: 'app-quiz-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Top Header Bar -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <!-- Left: Back & Title -->
            <div class="flex items-center gap-4">
              <button (click)="goBack()" 
                      class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
              </button>
              <div>
                <h1 class="text-lg font-semibold text-gray-900">{{ quizTitle() }}</h1>
                <p class="text-xs text-gray-500">Chế độ xem trước</p>
              </div>
            </div>

            <!-- Center: Timer -->
            <div class="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="font-mono text-lg font-semibold text-blue-700">{{ formatTime(timeRemaining()) }}</span>
            </div>

            <!-- Right: Progress & Submit -->
            <div class="flex items-center gap-4">
              <div class="hidden sm:block text-sm text-gray-600">
                <span class="font-semibold text-blue-600">{{ answeredCount() }}</span> / {{ questions().length }} câu
              </div>
              @if (!showResults()) {
                <button (click)="submitQuiz()" 
                        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Nộp bài
                </button>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center min-h-[60vh]">
          <div class="text-center">
            <div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-gray-600">Đang tải bài kiểm tra...</p>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="max-w-2xl mx-auto px-4 py-16">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Không thể tải bài kiểm tra</h3>
            <p class="text-gray-600 mb-6">{{ error() }}</p>
            <button (click)="goBack()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Quay lại
            </button>
          </div>
        </div>
      }

      <!-- Main Quiz Content -->
      @if (!loading() && !error() && questions().length > 0) {
        <div class="flex">
          <!-- Sidebar - Question Navigator -->
          <div class="hidden lg:block w-72 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] sticky top-16">
            <div class="p-4">
              <!-- Progress Circle -->
              <div class="flex items-center justify-center mb-6">
                <div class="relative w-32 h-32">
                  <svg class="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#E5E7EB" stroke-width="8" fill="none"/>
                    <circle cx="64" cy="64" r="56" stroke="#2563EB" stroke-width="8" fill="none"
                            [attr.stroke-dasharray]="351.86"
                            [attr.stroke-dashoffset]="351.86 - (351.86 * answeredCount() / questions().length)"
                            class="transition-all duration-500"/>
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-2xl font-bold text-gray-900">{{ answeredCount() }}</span>
                    <span class="text-xs text-gray-500">/ {{ questions().length }}</span>
                  </div>
                </div>
              </div>

              <!-- Question Grid -->
              <div class="mb-4">
                <h3 class="text-sm font-medium text-gray-700 mb-3">Danh sách câu hỏi</h3>
                <div class="grid grid-cols-5 gap-2">
                  @for (q of questions(); track q.id; let i = $index) {
                    <button (click)="goToQuestion(i)"
                            class="w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center"
                            [class.bg-blue-600]="i === currentIndex() && !showResults()"
                            [class.text-white]="i === currentIndex() && !showResults()"
                            [class.ring-2]="i === currentIndex()"
                            [class.ring-blue-600]="i === currentIndex()"
                            [class.bg-green-100]="showResults() && answers()[q.id] === q.correctOption"
                            [class.text-green-700]="showResults() && answers()[q.id] === q.correctOption"
                            [class.bg-red-100]="showResults() && answers()[q.id] && answers()[q.id] !== q.correctOption"
                            [class.text-red-700]="showResults() && answers()[q.id] && answers()[q.id] !== q.correctOption"
                            [class.bg-blue-100]="!showResults() && i !== currentIndex() && answers()[q.id]"
                            [class.text-blue-700]="!showResults() && i !== currentIndex() && answers()[q.id]"
                            [class.bg-gray-100]="!showResults() && i !== currentIndex() && !answers()[q.id]"
                            [class.text-gray-600]="!showResults() && i !== currentIndex() && !answers()[q.id]">
                      {{ i + 1 }}
                    </button>
                  }
                </div>
              </div>

              <!-- Legend -->
              <div class="space-y-2 text-xs">
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded bg-blue-600"></div>
                  <span class="text-gray-600">Đang xem</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded bg-blue-100"></div>
                  <span class="text-gray-600">Đã trả lời</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded bg-gray-100"></div>
                  <span class="text-gray-600">Chưa trả lời</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content Area -->
          <div class="flex-1 p-4 lg:p-8">
            <div class="max-w-3xl mx-auto">
              <!-- Question Card -->
              <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <!-- Question Header -->
                <div class="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <span class="text-white font-bold">{{ currentIndex() + 1 }}</span>
                    </div>
                    <div>
                      <h2 class="text-white font-semibold">Câu hỏi {{ currentIndex() + 1 }}</h2>
                      <p class="text-blue-100 text-sm">{{ questions().length }} câu hỏi</p>
                    </div>
                  </div>
                  <span class="px-3 py-1 rounded-full text-xs font-medium"
                        [class.bg-green-100]="currentQuestion()?.difficulty === 'EASY'"
                        [class.text-green-800]="currentQuestion()?.difficulty === 'EASY'"
                        [class.bg-yellow-100]="currentQuestion()?.difficulty === 'MEDIUM'"
                        [class.text-yellow-800]="currentQuestion()?.difficulty === 'MEDIUM'"
                        [class.bg-red-100]="currentQuestion()?.difficulty === 'HARD'"
                        [class.text-red-800]="currentQuestion()?.difficulty === 'HARD'">
                    {{ currentQuestion()?.difficulty === 'EASY' ? 'Dễ' : currentQuestion()?.difficulty === 'MEDIUM' ? 'Trung bình' : 'Khó' }}
                  </span>
                </div>

                <!-- Question Content -->
                <div class="p-6">
                  <p class="text-lg text-gray-900 leading-relaxed mb-8">{{ currentQuestion()?.content }}</p>

                  <!-- Options -->
                  <div class="space-y-3">
                    @for (opt of currentQuestion()?.options; track opt.key) {
                      <button (click)="selectAnswer(currentQuestion()!.id, opt.key)"
                              [disabled]="showResults()"
                              class="w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group"
                              [class.border-blue-500]="answers()[currentQuestion()!.id] === opt.key && !showResults()"
                              [class.bg-blue-50]="answers()[currentQuestion()!.id] === opt.key && !showResults()"
                              [class.border-gray-200]="answers()[currentQuestion()!.id] !== opt.key && !showResults()"
                              [class.hover:border-blue-300]="!showResults() && answers()[currentQuestion()!.id] !== opt.key"
                              [class.hover:bg-gray-50]="!showResults() && answers()[currentQuestion()!.id] !== opt.key"
                              [class.border-green-500]="showResults() && opt.key === currentQuestion()!.correctOption"
                              [class.bg-green-50]="showResults() && opt.key === currentQuestion()!.correctOption"
                              [class.border-red-400]="showResults() && answers()[currentQuestion()!.id] === opt.key && opt.key !== currentQuestion()!.correctOption"
                              [class.bg-red-50]="showResults() && answers()[currentQuestion()!.id] === opt.key && opt.key !== currentQuestion()!.correctOption">
                        <div class="flex items-center gap-4">
                          <span class="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-colors"
                                [class.bg-blue-600]="answers()[currentQuestion()!.id] === opt.key && !showResults()"
                                [class.text-white]="answers()[currentQuestion()!.id] === opt.key && !showResults()"
                                [class.bg-gray-100]="answers()[currentQuestion()!.id] !== opt.key && !showResults()"
                                [class.text-gray-600]="answers()[currentQuestion()!.id] !== opt.key && !showResults()"
                                [class.group-hover:bg-blue-100]="!showResults() && answers()[currentQuestion()!.id] !== opt.key"
                                [class.bg-green-600]="showResults() && opt.key === currentQuestion()!.correctOption"
                                [class.text-white]="showResults() && opt.key === currentQuestion()!.correctOption"
                                [class.bg-red-500]="showResults() && answers()[currentQuestion()!.id] === opt.key && opt.key !== currentQuestion()!.correctOption">
                            {{ opt.key }}
                          </span>
                          <span class="flex-1 text-gray-700">{{ opt.content }}</span>
                          @if (showResults() && opt.key === currentQuestion()!.correctOption) {
                            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                          }
                          @if (showResults() && answers()[currentQuestion()!.id] === opt.key && opt.key !== currentQuestion()!.correctOption) {
                            <svg class="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                            </svg>
                          }
                        </div>
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Navigation Buttons -->
              <div class="flex items-center justify-between">
                <button (click)="prevQuestion()" 
                        [disabled]="currentIndex() === 0"
                        class="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                  Câu trước
                </button>

                <!-- Mobile Question Navigator -->
                <div class="flex lg:hidden items-center gap-1 overflow-x-auto max-w-[200px] px-2">
                  @for (q of questions(); track q.id; let i = $index) {
                    <button (click)="goToQuestion(i)"
                            class="flex-shrink-0 w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                            [class.bg-blue-600]="i === currentIndex()"
                            [class.text-white]="i === currentIndex()"
                            [class.bg-blue-100]="i !== currentIndex() && answers()[q.id]"
                            [class.text-blue-700]="i !== currentIndex() && answers()[q.id]"
                            [class.bg-gray-100]="i !== currentIndex() && !answers()[q.id]"
                            [class.text-gray-600]="i !== currentIndex() && !answers()[q.id]">
                      {{ i + 1 }}
                    </button>
                  }
                </div>

                @if (currentIndex() < questions().length - 1) {
                  <button (click)="nextQuestion()"
                          class="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                    Câu tiếp
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </button>
                } @else if (!showResults()) {
                  <button (click)="submitQuiz()"
                          class="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Nộp bài
                  </button>
                } @else {
                  <button (click)="resetQuiz()"
                          class="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Làm lại
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Results Modal -->
        @if (showResults()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
              <!-- Result Header -->
              <div class="p-6 text-center" 
                   [class.bg-gradient-to-br]="true"
                   [class.from-green-500]="scorePercent() >= 80"
                   [class.to-emerald-600]="scorePercent() >= 80"
                   [class.from-yellow-500]="scorePercent() >= 50 && scorePercent() < 80"
                   [class.to-orange-500]="scorePercent() >= 50 && scorePercent() < 80"
                   [class.from-red-500]="scorePercent() < 50"
                   [class.to-rose-600]="scorePercent() < 50">
                <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  @if (scorePercent() >= 80) {
                    <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  } @else if (scorePercent() >= 50) {
                    <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                  } @else {
                    <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                    </svg>
                  }
                </div>
                <h2 class="text-2xl font-bold text-white mb-1">
                  @if (scorePercent() >= 80) { Xuất sắc! }
                  @else if (scorePercent() >= 50) { Khá tốt! }
                  @else { Cần cố gắng thêm! }
                </h2>
                <p class="text-white/80">Bạn đã hoàn thành bài kiểm tra</p>
              </div>

              <!-- Score Display -->
              <div class="p-6">
                <div class="text-center mb-6">
                  <div class="text-5xl font-bold text-gray-900 mb-1">{{ scorePercent() }}%</div>
                  <p class="text-gray-500">Điểm số của bạn</p>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-3 gap-4 mb-6">
                  <div class="bg-green-50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-bold text-green-600">{{ correctCount() }}</div>
                    <div class="text-xs text-green-700">Đúng</div>
                  </div>
                  <div class="bg-red-50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-bold text-red-600">{{ wrongCount() }}</div>
                    <div class="text-xs text-red-700">Sai</div>
                  </div>
                  <div class="bg-gray-50 rounded-xl p-4 text-center">
                    <div class="text-2xl font-bold text-gray-600">{{ unansweredCount() }}</div>
                    <div class="text-xs text-gray-700">Bỏ qua</div>
                  </div>
                </div>

                <!-- Time Spent -->
                <div class="bg-blue-50 rounded-xl p-4 flex items-center justify-between mb-6">
                  <div class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="text-blue-700">Thời gian làm bài</span>
                  </div>
                  <span class="font-mono font-semibold text-blue-700">{{ formatTime(timeSpent()) }}</span>
                </div>

                <!-- Actions -->
                <div class="flex gap-3">
                  <button (click)="closeResults()" 
                          class="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium">
                    Xem lại đáp án
                  </button>
                  <button (click)="resetQuiz()" 
                          class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">
                    Làm lại
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,

  styles: [`
    @keyframes scale-in {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-in {
      animation: scale-in 0.3s ease-out;
    }
  `]
})
export class QuizPreviewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizApi = inject(QuizApi);

  lessonId = '';
  quizTitle = signal('Bài kiểm tra');
  returnUrl = '';

  loading = signal(true);
  error = signal<string | null>(null);
  questions = signal<QuizQuestion[]>([]);
  currentIndex = signal(0);
  answers = signal<Record<string, string>>({});
  showResults = signal(false);
  showResultsModal = signal(true);

  // Timer
  timeRemaining = signal(30 * 60); // 30 minutes default
  timeSpent = signal(0);
  private timerInterval: any;
  private startTime = 0;

  currentQuestion = computed(() => this.questions()[this.currentIndex()]);
  answeredCount = computed(() => Object.keys(this.answers()).length);
  
  correctCount = computed(() => {
    const ans = this.answers();
    return this.questions().filter(q => ans[q.id] === q.correctOption).length;
  });

  wrongCount = computed(() => {
    const ans = this.answers();
    return this.questions().filter(q => ans[q.id] && ans[q.id] !== q.correctOption).length;
  });

  unansweredCount = computed(() => {
    return this.questions().length - Object.keys(this.answers()).length;
  });

  scorePercent = computed(() => {
    if (this.questions().length === 0) return 0;
    return Math.round((this.correctCount() / this.questions().length) * 100);
  });

  ngOnInit() {
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';
    this.quizTitle.set(this.route.snapshot.queryParamMap.get('title') || 'Bài kiểm tra');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/teacher/courses';
    
    this.loadQuiz();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  async loadQuiz() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(this.lessonId));
      const questions = Array.isArray(response) ? response : (response as any).data || [];

      if (questions.length === 0) {
        this.error.set('Bài kiểm tra này chưa có câu hỏi nào.');
        return;
      }

      this.questions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        correctOption: q.correctOption,
        options: (q.options || []).map((opt: any) => ({
          key: opt.optionKey || opt.key,
          content: opt.content
        })).sort((a: any, b: any) => a.key.localeCompare(b.key))
      })));

      this.startTimer();

    } catch (err: any) {
      console.error('Error loading quiz:', err);
      this.error.set(err?.message || 'Không thể tải bài kiểm tra');
    } finally {
      this.loading.set(false);
    }
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.timeRemaining.update(t => Math.max(0, t - 1));
      this.timeSpent.set(Math.floor((Date.now() - this.startTime) / 1000));
      
      if (this.timeRemaining() === 0) {
        this.submitQuiz();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  selectAnswer(questionId: string, optionKey: string) {
    if (this.showResults()) return;
    this.answers.update(ans => ({ ...ans, [questionId]: optionKey }));
  }

  prevQuestion() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  nextQuestion() {
    if (this.currentIndex() < this.questions().length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  goToQuestion(index: number) {
    this.currentIndex.set(index);
  }

  submitQuiz() {
    this.stopTimer();
    this.showResults.set(true);
    this.showResultsModal.set(true);
  }

  closeResults() {
    this.showResultsModal.set(false);
  }

  resetQuiz() {
    this.answers.set({});
    this.currentIndex.set(0);
    this.showResults.set(false);
    this.showResultsModal.set(false);
    this.timeRemaining.set(30 * 60);
    this.timeSpent.set(0);
    this.startTimer();
  }

  goBack() {
    this.stopTimer();
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/teacher/courses']);
    }
  }
}
