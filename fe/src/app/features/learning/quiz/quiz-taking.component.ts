import { Component, signal, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'essay';
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  explanation?: string;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  answers: QuizAnswer[];
  score?: number;
  isCompleted: boolean;
  timeSpent: number; // in minutes
}

interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  points?: number;
}

@Component({
  selector: 'app-quiz-taking',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải quiz..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>

    <div class="bg-gray-50 min-h-screen">
      <!-- Quiz Header -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ currentQuiz()?.title }}</h1>
              <p class="text-gray-600">{{ currentQuiz()?.description }}</p>
            </div>
            <div class="flex items-center space-x-4">
              <!-- Timer -->
              <div class="flex items-center space-x-2">
                <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-lg font-semibold" [class]="getTimerClass()">{{ formatTime(timeRemaining()) }}</span>
              </div>
              
              <!-- Progress -->
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600">{{ currentQuestionIndex() + 1 }}/{{ totalQuestions }}</span>
                <div class="w-24 bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                       [style.width.%]="getProgressPercentage()"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quiz Content -->
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if (currentQuestion) {
          <div class="bg-white rounded-xl shadow-lg p-8">
            <!-- Question Header -->
            <div class="mb-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-gray-900">
                  Câu hỏi {{ currentQuestionIndex() + 1 }}
                </h2>
                <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {{ currentQuestion.points }} điểm
                </span>
              </div>
              <p class="text-lg text-gray-800 leading-relaxed">{{ currentQuestion.question }}</p>
            </div>

            <!-- Question Content -->
            <div class="space-y-4">
              @if (currentQuestion.type === 'multiple-choice') {
                <div class="space-y-3">
                  @for (option of currentQuestion.options; track $index) {
                    <label class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input 
                        type="radio" 
                        name="answer" 
                        [value]="option"
                        [ngModel]="currentAnswer()"
                        (ngModelChange)="currentAnswer.set($event)"
                        class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                      <span class="ml-3 text-gray-800">{{ option }}</span>
                    </label>
                  }
                </div>
              } @else if (currentQuestion.type === 'true-false') {
                <div class="space-y-3">
                  <label class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="answer" 
                      value="true"
                      [ngModel]="currentAnswer()"
                      (ngModelChange)="currentAnswer.set($event)"
                      class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-3 text-gray-800">Đúng</span>
                  </label>
                  <label class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input 
                      type="radio" 
                      name="answer" 
                      value="false"
                      [ngModel]="currentAnswer()"
                      (ngModelChange)="currentAnswer.set($event)"
                      class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                    <span class="ml-3 text-gray-800">Sai</span>
                  </label>
                </div>
              } @else if (currentQuestion.type === 'fill-blank') {
                <div class="space-y-3">
                  <textarea 
                    [ngModel]="currentAnswer()"
                    (ngModelChange)="currentAnswer.set($event)"
                    placeholder="Nhập câu trả lời của bạn..."
                    class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows="4"></textarea>
                </div>
              } @else if (currentQuestion.type === 'essay') {
                <div class="space-y-3">
                  <textarea 
                    [ngModel]="currentAnswer()"
                    (ngModelChange)="currentAnswer.set($event)"
                    placeholder="Viết câu trả lời chi tiết của bạn..."
                    class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows="6"></textarea>
                </div>
              }
            </div>

            <!-- Navigation Buttons -->
            <div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button 
                (click)="previousQuestion()"
                [disabled]="currentQuestionIndex() === 0"
                class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Câu trước
              </button>

              <div class="flex items-center space-x-3">
                <!-- Save Progress -->
                <button 
                  (click)="saveProgress()"
                  class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                  <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                  </svg>
                  Lưu tiến độ
                </button>

                <!-- Next/Submit Button -->
                @if (currentQuestionIndex() === totalQuestions - 1) {
                  <button 
                    (click)="submitQuiz()"
                    class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    Nộp bài
                  </button>
                } @else {
                  <button 
                    (click)="nextQuestion()"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Câu tiếp theo
                    <svg class="w-5 h-5 inline ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                    </svg>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- Question Navigation -->
        <div class="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Điều hướng câu hỏi</h3>
          <div class="grid grid-cols-5 md:grid-cols-10 gap-2">
            @for (question of questions(); track question.id; let i = $index) {
              <button 
                (click)="goToQuestion(i)"
                class="w-10 h-10 rounded-lg text-sm font-medium transition-colors"
                [class]="getQuestionButtonClass(i)">
                {{ i + 1 }}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizTakingComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private errorService = inject(ErrorHandlingService);

  // Signals
  isLoading = signal<boolean>(true);
  currentQuiz = signal<any>(null);
  questions = signal<QuizQuestion[]>([]);
  currentQuestionIndex = signal<number>(0);
  currentAnswer = signal<string>('');
  answers = signal<QuizAnswer[]>([]);
  timeRemaining = signal<number>(0);
  isQuizCompleted = signal<boolean>(false);

  // Timer
  private timerInterval?: number;

  ngOnInit(): void {
    this.loadQuiz();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private async loadQuiz(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Get quiz ID from route
      const quizId = this.route.snapshot.paramMap.get('id');
      if (!quizId) {
        throw new Error('Quiz ID not found');
      }

      // Simulate loading quiz data
      await this.simulateQuizLoading(quizId);
      
      console.log('🔧 Quiz Taking - Quiz loaded successfully');
      this.errorService.showSuccess('Quiz đã được tải thành công!', 'quiz');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'quiz');
      this.router.navigate(['/student/quiz']).catch(() => {});
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateQuizLoading(quizId: string): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Mock quiz data
    const mockQuiz = {
      id: quizId,
      title: 'Quiz Kỹ thuật Tàu biển - Chương 1',
      description: 'Kiểm tra kiến thức về cấu trúc tàu biển cơ bản',
      timeLimit: 30, // 30 minutes
      totalPoints: 100,
      passingScore: 70
    };

    const mockQuestions: QuizQuestion[] = [
      {
        id: '1',
        question: 'Tàu container có những đặc điểm chính nào?',
        type: 'multiple-choice',
        options: [
          'Có cấu trúc mở, dễ dàng xếp dỡ hàng hóa',
          'Có hệ thống làm lạnh tích hợp',
          'Có khả năng chở hàng hóa đa dạng',
          'Tất cả các đáp án trên'
        ],
        correctAnswer: 'Tất cả các đáp án trên',
        points: 20,
        explanation: 'Tàu container có tất cả các đặc điểm trên.'
      },
      {
        id: '2',
        question: 'Hệ thống động lực chính của tàu biển thường sử dụng động cơ diesel.',
        type: 'true-false',
        correctAnswer: 'true',
        points: 15,
        explanation: 'Đúng, hầu hết tàu biển hiện đại sử dụng động cơ diesel.'
      },
      {
        id: '3',
        question: 'Mô tả ngắn gọn về quy trình bảo trì định kỳ của tàu biển.',
        type: 'fill-blank',
        points: 25,
        explanation: 'Quy trình bảo trì bao gồm kiểm tra, sửa chữa và thay thế các bộ phận.'
      },
      {
        id: '4',
        question: 'Phân tích tầm quan trọng của việc tuân thủ các quy định an toàn hàng hải quốc tế.',
        type: 'essay',
        points: 40,
        explanation: 'Việc tuân thủ quy định an toàn đảm bảo tính mạng và tài sản.'
      }
    ];

    this.currentQuiz.set(mockQuiz);
    this.questions.set(mockQuestions);
    this.timeRemaining.set(mockQuiz.timeLimit * 60); // Convert to seconds

    // Start timer
    this.startTimer();
  }

  private startTimer(): void {
    this.timerInterval = window.setInterval(() => {
      const remaining = this.timeRemaining();
      if (remaining > 0) {
        this.timeRemaining.set(remaining - 1);
      } else {
        this.submitQuiz();
      }
    }, 1000);
  }

  get currentQuestion(): QuizQuestion | null {
    const questions = this.questions();
    const index = this.currentQuestionIndex();
    return questions[index] || null;
  }

  get totalQuestions(): number {
    return this.questions().length;
  }

  getProgressPercentage(): number {
    return ((this.currentQuestionIndex() + 1) / this.totalQuestions) * 100;
  }

  getTimerClass(): string {
    const remaining = this.timeRemaining();
    if (remaining <= 300) { // 5 minutes
      return 'text-red-600';
    } else if (remaining <= 600) { // 10 minutes
      return 'text-orange-600';
    }
    return 'text-gray-900';
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getQuestionButtonClass(index: number): string {
    const currentIndex = this.currentQuestionIndex();
    const answers = this.answers();
    const hasAnswer = answers.some(answer => answer.questionId === this.questions()[index]?.id);

    if (index === currentIndex) {
      return 'bg-blue-600 text-white';
    } else if (hasAnswer) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  }

  nextQuestion(): void {
    this.saveCurrentAnswer();
    const nextIndex = this.currentQuestionIndex() + 1;
    if (nextIndex < this.totalQuestions) {
      this.currentQuestionIndex.set(nextIndex);
      this.loadCurrentAnswer();
    }
  }

  previousQuestion(): void {
    this.saveCurrentAnswer();
    const prevIndex = this.currentQuestionIndex() - 1;
    if (prevIndex >= 0) {
      this.currentQuestionIndex.set(prevIndex);
      this.loadCurrentAnswer();
    }
  }

  goToQuestion(index: number): void {
    this.saveCurrentAnswer();
    this.currentQuestionIndex.set(index);
    this.loadCurrentAnswer();
  }

  private saveCurrentAnswer(): void {
    const currentQuestion = this.currentQuestion;
    const currentAnswer = this.currentAnswer();
    
    if (currentQuestion && currentAnswer) {
      const answers = this.answers();
      const existingAnswerIndex = answers.findIndex(answer => answer.questionId === currentQuestion.id);
      
      const newAnswer: QuizAnswer = {
        questionId: currentQuestion.id,
        answer: currentAnswer
      };

      if (existingAnswerIndex >= 0) {
        answers[existingAnswerIndex] = newAnswer;
      } else {
        answers.push(newAnswer);
      }
      
      this.answers.set([...answers]);
    }
  }

  private loadCurrentAnswer(): void {
    const currentQuestion = this.currentQuestion;
    if (currentQuestion) {
      const answers = this.answers();
      const existingAnswer = answers.find(answer => answer.questionId === currentQuestion.id);
      this.currentAnswer.set(existingAnswer?.answer as string || '');
    }
  }

  saveProgress(): void {
    this.saveCurrentAnswer();
    this.errorService.showSuccess('Tiến độ đã được lưu thành công!', 'quiz');
  }

  async submitQuiz(): Promise<void> {
    try {
      this.saveCurrentAnswer();
      
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }

      // Calculate score
      const score = this.calculateScore();
      const isPassed = score >= (this.currentQuiz()?.passingScore || 0);

      this.errorService.showSuccess(
        `Quiz đã được nộp thành công! Điểm số: ${score}/${this.currentQuiz()?.totalPoints}`,
        'quiz'
      );

      // Navigate to results
      this.router.navigate(['/student/quiz/result', this.currentQuiz()?.id]).catch(error => {
        this.errorService.handleNavigationError(error, `/student/quiz/result/${this.currentQuiz()?.id}`);
      });

    } catch (error) {
      this.errorService.handleApiError(error, 'quiz');
    }
  }

  private calculateScore(): number {
    const answers = this.answers();
    const questions = this.questions();
    let totalScore = 0;

    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question) {
        // Simple scoring logic - in real app, this would be more sophisticated
        if (question.type === 'multiple-choice' || question.type === 'true-false') {
          if (answer.answer === question.correctAnswer) {
            totalScore += question.points;
          }
        } else {
          // For fill-blank and essay, give partial credit
          totalScore += question.points * 0.8;
        }
      }
    });

    return Math.round(totalScore);
  }
}