import { Component, signal, computed, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  timeLimit?: number; // in seconds
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  passed: boolean;
  detailedResults: QuestionResult[];
}

interface QuestionResult {
  questionId: string;
  userAnswer: number | string;
  correctAnswer: number | string;
  isCorrect: boolean;
  timeSpent: number;
  points: number;
}

@Component({
  selector: 'app-enhanced-quiz',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      @if (!showResults()) {
        <!-- Enhanced Quiz Header -->
        <div class="bg-white shadow-xl border-b border-gray-200 sticky top-0 z-50">
          <div class="max-w-6xl mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                  <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">{{ quizTitle() }}</h1>
                  <p class="text-gray-600">{{ quizDescription() }}</p>
                </div>
              </div>
              
              <!-- Timer và Progress -->
              <div class="flex items-center space-x-6">
                <div class="text-center">
                  <div class="text-sm text-gray-500 mb-1">Thời gian còn lại</div>
                  <div class="text-3xl font-bold" [class]="getTimerClass()">
                    {{ formatTime(timeRemaining()) }}
                  </div>
                </div>
                
                <div class="text-center">
                  <div class="text-sm text-gray-500 mb-1">Tiến độ</div>
                  <div class="text-2xl font-bold text-blue-600">
                    {{ currentQuestionIndex() + 1 }}/{{ totalQuestions() }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="mt-4">
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500" 
                     [style.width.%]="progressPercentage()"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quiz Content -->
        <div class="max-w-4xl mx-auto px-6 py-8">
          @if (currentQuestion()) {
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
              <!-- Question Header -->
              <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <span class="bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                      Câu {{ currentQuestionIndex() + 1 }}
                    </span>
                    <span class="text-sm text-gray-600">{{ currentQuestion()!.points }} điểm</span>
                    @if (currentQuestion()!.timeLimit) {
                      <span class="text-sm text-gray-600">
                        ⏱️ {{ currentQuestion()!.timeLimit }}s
                      </span>
                    }
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ answeredQuestions() }}/{{ totalQuestions() }} đã trả lời
                  </div>
                </div>
              </div>
              
              <!-- Question Content -->
              <div class="p-8">
                <h2 class="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
                  {{ currentQuestion()!.question }}
                </h2>
                
                <!-- Question Options -->
                <div class="space-y-4">
                  @for (option of currentQuestion()!.options; track $index) {
                    <label class="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                           [class.border-blue-500]="selectedAnswers()[currentQuestionIndex()] === $index"
                           [class.bg-blue-50]="selectedAnswers()[currentQuestionIndex()] === $index">
                      <input type="radio" 
                             name="question-{{ currentQuestion()!.id }}"
                             [value]="$index"
                             [checked]="selectedAnswers()[currentQuestionIndex()] === $index"
                             (change)="selectAnswer($index)"
                             class="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500">
                      <span class="ml-4 text-gray-900 font-medium group-hover:text-blue-700 transition-colors">
                        {{ option }}
                      </span>
                    </label>
                  }
                </div>
              </div>
              
              <!-- Question Navigation -->
              <div class="bg-gray-50 px-8 py-6 border-t border-gray-200">
                <div class="flex items-center justify-between">
                  <button (click)="previousQuestion()"
                          [disabled]="currentQuestionIndex() === 0"
                          class="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Câu trước</span>
                  </button>
                  
                  <!-- Question Navigation Dots -->
                  <div class="flex space-x-2">
                    @for (question of questions(); track question.id; let i = $index) {
                      <button (click)="goToQuestion(i)"
                              [class]="getQuestionButtonClass(i)"
                              class="w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 hover:scale-110">
                        {{ i + 1 }}
                      </button>
                    }
                  </div>
                  
                  @if (currentQuestionIndex() === totalQuestions() - 1) {
                    <button (click)="submitQuiz()"
                            [disabled]="selectedAnswers()[currentQuestionIndex()] === undefined"
                            class="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      <span>Nộp bài</span>
                    </button>
                  } @else {
                    <button (click)="nextQuestion()"
                            [disabled]="selectedAnswers()[currentQuestionIndex()] === undefined"
                            class="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <span>Câu tiếp</span>
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- Enhanced Quiz Results -->
        <div class="min-h-screen flex items-center justify-center py-12">
          <div class="max-w-4xl mx-auto px-6">
            <div class="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <!-- Results Header -->
              <div class="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-12 text-white text-center">
                <div class="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <h1 class="text-4xl font-bold mb-4">Chúc mừng!</h1>
                <p class="text-xl text-green-100">Bạn đã hoàn thành bài kiểm tra</p>
              </div>
              
              <!-- Results Content -->
              <div class="p-8">
                <!-- Score Circle -->
                <div class="text-center mb-8">
                  <div class="relative inline-block">
                    <div class="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center"
                         [class]="getScoreCircleClass()">
                      <div class="text-center">
                        <div class="text-3xl font-bold" [class]="getScoreTextClass()">
                          {{ quizResult().score }}%
                        </div>
                        <div class="text-sm text-gray-600">Điểm số</div>
                      </div>
                    </div>
                  </div>
                  <h2 class="text-2xl font-bold text-gray-900 mt-4">{{ getScoreLabel() }}</h2>
                  <p class="text-gray-600 mt-2">{{ getScoreDescription() }}</p>
                </div>
                
                <!-- Detailed Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div class="text-center p-4 bg-blue-50 rounded-xl">
                    <div class="text-2xl font-bold text-blue-600">{{ quizResult().correctAnswers }}</div>
                    <div class="text-sm text-gray-600">Câu đúng</div>
                  </div>
                  <div class="text-center p-4 bg-red-50 rounded-xl">
                    <div class="text-2xl font-bold text-red-600">{{ quizResult().totalQuestions - quizResult().correctAnswers }}</div>
                    <div class="text-sm text-gray-600">Câu sai</div>
                  </div>
                  <div class="text-center p-4 bg-green-50 rounded-xl">
                    <div class="text-2xl font-bold text-green-600">{{ formatTime(quizResult().timeSpent) }}</div>
                    <div class="text-sm text-gray-600">Thời gian</div>
                  </div>
                  <div class="text-center p-4 bg-purple-50 rounded-xl">
                    <div class="text-2xl font-bold text-purple-600">{{ quizResult().totalQuestions }}</div>
                    <div class="text-sm text-gray-600">Tổng câu</div>
                  </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                  <button (click)="retakeQuiz()"
                          class="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Làm lại</span>
                  </button>
                  
                  <button (click)="continueLearning()"
                          class="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Tiếp tục học</span>
                  </button>
                  
                  <button (click)="viewDetailedResults()"
                          class="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <span>Xem chi tiết</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnhancedQuizComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  
  // Quiz data
  quizTitle = signal('Kiểm tra An toàn Hàng hải Nâng cao');
  quizDescription = signal('Bài kiểm tra kiến thức về an toàn hàng hải và quy định quốc tế');
  
  questions = signal<QuizQuestion[]>([
    {
      id: '1',
      question: 'Khi có tín hiệu báo động cháy trên tàu, hành động đầu tiên cần làm là gì?',
      options: [
        'Chạy ra ngoài ngay lập tức',
        'Báo cáo cho thuyền trưởng',
        'Kiểm tra vị trí cháy và báo động',
        'Lấy đồ đạc cá nhân'
      ],
      correctAnswer: 2,
      explanation: 'Khi có tín hiệu báo động cháy, cần kiểm tra vị trí cháy và báo động để xác định tình hình trước khi hành động.',
      points: 10,
      type: 'multiple-choice',
      timeLimit: 60
    },
    {
      id: '2',
      question: 'Trang bị bảo hộ cá nhân (PPE) nào là bắt buộc khi làm việc trên boong tàu?',
      options: [
        'Mũ bảo hiểm và găng tay',
        'Áo phao và giày chống trượt',
        'Kính bảo hộ và khẩu trang',
        'Tất cả các trang bị trên'
      ],
      correctAnswer: 3,
      explanation: 'Khi làm việc trên boong tàu, cần đầy đủ trang bị bảo hộ cá nhân để đảm bảo an toàn.',
      points: 10,
      type: 'multiple-choice',
      timeLimit: 45
    },
    {
      id: '3',
      question: 'Trong trường hợp khẩn cấp, thứ tự ưu tiên cứu hộ là gì?',
      options: [
        'Phụ nữ và trẻ em trước',
        'Người bị thương nặng trước',
        'Thuyền trưởng và sĩ quan',
        'Theo thứ tự gần nhất'
      ],
      correctAnswer: 1,
      explanation: 'Trong cứu hộ khẩn cấp, ưu tiên những người bị thương nặng cần được cứu chữa ngay lập tức.',
      points: 15,
      type: 'multiple-choice',
      timeLimit: 90
    },
    {
      id: '4',
      question: 'Khi tàu bị nghiêng, hành động nào là đúng?',
      options: [
        'Chạy về phía cao hơn',
        'Ở nguyên vị trí hiện tại',
        'Chạy về phía thấp hơn',
        'Nhảy xuống nước'
      ],
      correctAnswer: 0,
      explanation: 'Khi tàu bị nghiêng, cần di chuyển về phía cao hơn để tránh bị nước cuốn trôi.',
      points: 10,
      type: 'multiple-choice',
      timeLimit: 60
    },
    {
      id: '5',
      question: 'Tần suất kiểm tra thiết bị cứu sinh trên tàu là bao lâu?',
      options: [
        'Hàng tuần',
        'Hàng tháng',
        'Hàng quý',
        'Hàng năm'
      ],
      correctAnswer: 1,
      explanation: 'Thiết bị cứu sinh cần được kiểm tra hàng tháng để đảm bảo hoạt động tốt khi cần thiết.',
      points: 10,
      type: 'multiple-choice',
      timeLimit: 45
    }
  ]);
  
  // Quiz state
  currentQuestionIndex = signal(0);
  selectedAnswers = signal<(number | undefined)[]>([]);
  showResults = signal(false);
  timeRemaining = signal(1800); // 30 minutes in seconds
  startTime = signal(0);
  questionStartTime = signal(0);
  
  // Timer management
  private timerInterval?: NodeJS.Timeout;
  private questionTimerInterval?: NodeJS.Timeout;
  
  // Computed values
  currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()]);
  totalQuestions = computed(() => this.questions().length);
  progressPercentage = computed(() => 
    ((this.currentQuestionIndex() + 1) / this.totalQuestions()) * 100
  );
  
  answeredQuestions = computed(() => 
    this.selectedAnswers().filter(answer => answer !== undefined).length
  );
  
  quizResult = signal<QuizResult>({
    score: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    timeSpent: 0,
    passed: false,
    detailedResults: []
  });
  
  ngOnInit() {
    this.initializeQuiz();
    this.startTimer();
  }
  
  ngOnDestroy() {
    this.clearTimers();
  }
  
  initializeQuiz() {
    this.selectedAnswers.set(new Array(this.totalQuestions()).fill(undefined));
    this.startTime.set(Date.now());
    this.questionStartTime.set(Date.now());
  }
  
  startTimer() {
    this.clearTimers();
    
    // Main quiz timer
    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining() - 1;
      this.timeRemaining.set(remaining);
      
      if (remaining <= 0) {
        this.submitQuiz();
      }
    }, 1000);
    
    // Question timer (if question has time limit)
    this.startQuestionTimer();
  }
  
  startQuestionTimer() {
    const currentQuestion = this.currentQuestion();
    if (currentQuestion?.timeLimit) {
      this.questionStartTime.set(Date.now());
      
      this.questionTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.questionStartTime()) / 1000);
        if (elapsed >= currentQuestion.timeLimit!) {
          // Auto-advance to next question when time is up
          this.nextQuestion();
        }
      }, 1000);
    }
  }
  
  clearTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    if (this.questionTimerInterval) {
      clearInterval(this.questionTimerInterval);
      this.questionTimerInterval = undefined;
    }
  }
  
  selectAnswer(answerIndex: number) {
    const answers = [...this.selectedAnswers()];
    answers[this.currentQuestionIndex()] = answerIndex;
    this.selectedAnswers.set(answers);
  }
  
  nextQuestion() {
    this.clearTimers();
    
    if (this.currentQuestionIndex() < this.totalQuestions() - 1) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
      this.questionStartTime.set(Date.now());
      this.startQuestionTimer();
    }
  }
  
  previousQuestion() {
    this.clearTimers();
    
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() - 1);
      this.questionStartTime.set(Date.now());
      this.startQuestionTimer();
    }
  }
  
  goToQuestion(index: number) {
    this.clearTimers();
    this.currentQuestionIndex.set(index);
    this.questionStartTime.set(Date.now());
    this.startQuestionTimer();
  }
  
  submitQuiz() {
    this.clearTimers();
    
    const answers = this.selectedAnswers();
    const questions = this.questions();
    const detailedResults: QuestionResult[] = [];
    let correctAnswers = 0;
    
    answers.forEach((answer, index) => {
      const question = questions[index];
      const isCorrect = answer === question.correctAnswer;
      if (isCorrect) correctAnswers++;
      
      detailedResults.push({
        questionId: question.id,
        userAnswer: answer || -1,
        correctAnswer: question.correctAnswer,
        isCorrect,
        timeSpent: 0, // Could be calculated if needed
        points: isCorrect ? question.points : 0
      });
    });
    
    const score = Math.round((correctAnswers / this.totalQuestions()) * 100);
    const timeSpent = Math.floor((Date.now() - this.startTime()) / 1000);
    
    this.quizResult.set({
      score,
      totalQuestions: this.totalQuestions(),
      correctAnswers,
      timeSpent,
      passed: score >= 70,
      detailedResults
    });
    
    this.showResults.set(true);
  }
  
  retakeQuiz() {
    this.currentQuestionIndex.set(0);
    this.selectedAnswers.set(new Array(this.totalQuestions()).fill(undefined));
    this.showResults.set(false);
    this.timeRemaining.set(1800);
    this.startTime.set(Date.now());
    this.questionStartTime.set(Date.now());
    this.startTimer();
  }
  
  continueLearning() {
    this.router.navigate(['/learn']);
  }
  
  viewDetailedResults() {
    // Could navigate to a detailed results page
    console.log('Detailed results:', this.quizResult());
  }
  
  // Helper methods
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  getTimerClass(): string {
    const remaining = this.timeRemaining();
    if (remaining <= 60) return 'text-red-600 animate-pulse';
    if (remaining <= 300) return 'text-yellow-600';
    return 'text-green-600';
  }
  
  getQuestionButtonClass(index: number): string {
    const isCurrent = index === this.currentQuestionIndex();
    const isAnswered = this.selectedAnswers()[index] !== undefined;
    
    if (isCurrent) {
      return 'bg-blue-600 text-white shadow-lg';
    } else if (isAnswered) {
      return 'bg-green-100 text-green-800 border-2 border-green-300';
    } else {
      return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  }
  
  getScoreClass(): string {
    const score = this.quizResult().score;
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-poor';
  }
  
  getScoreCircleClass(): string {
    const score = this.quizResult().score;
    if (score >= 90) return 'border-green-500';
    if (score >= 70) return 'border-blue-500';
    if (score >= 50) return 'border-yellow-500';
    return 'border-red-500';
  }
  
  getScoreTextClass(): string {
    const score = this.quizResult().score;
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  getScoreLabel(): string {
    const score = this.quizResult().score;
    if (score >= 90) return 'Xuất sắc!';
    if (score >= 70) return 'Tốt!';
    if (score >= 50) return 'Trung bình';
    return 'Cần cải thiện';
  }
  
  getScoreDescription(): string {
    const score = this.quizResult().score;
    if (score >= 90) return 'Bạn đã nắm vững kiến thức về an toàn hàng hải!';
    if (score >= 70) return 'Bạn có kiến thức tốt về an toàn hàng hải!';
    if (score >= 50) return 'Bạn cần ôn tập thêm về an toàn hàng hải.';
    return 'Bạn cần học lại kiến thức về an toàn hàng hải.';
  }
}