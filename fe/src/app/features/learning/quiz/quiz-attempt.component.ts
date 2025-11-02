import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService } from '../../../state/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { Quiz, Question, QuizAttempt, Answer, QuestionType, AttemptStatus } from '../../../shared/types/quiz.types';

@Component({
  selector: 'app-quiz-attempt',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Quiz Header -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ quiz()?.title }}</h1>
              <p class="text-gray-600">{{ quiz()?.description }}</p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-500 mb-1">Thời gian còn lại</div>
              <div class="text-2xl font-bold" [class]="getTimerClass()">
                {{ formatTime(timeRemaining()) }}
              </div>
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              [style.width.%]="getProgressPercentage()"
            ></div>
          </div>
          
          <div class="flex justify-between text-sm text-gray-600">
            <span>Câu hỏi {{ currentQuestionIndex() + 1 }} / {{ quiz()?.questions?.length || 0 }}</span>
            <span>{{ getProgressPercentage() }}% hoàn thành</span>
          </div>
        </div>

        <!-- Quiz Instructions -->
        @if (showInstructions()) {
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-blue-900 mb-2">Hướng dẫn làm bài</h3>
            <div class="text-blue-800 space-y-2">
              <p>{{ quiz()?.instructions }}</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Bạn có {{ quiz()?.timeLimit }} phút để hoàn thành bài quiz</li>
                <li>Trả lời tất cả các câu hỏi bắt buộc</li>
                <li>Bạn có thể quay lại sửa câu trả lời trước khi nộp bài</li>
                <li>Hệ thống sẽ tự động lưu câu trả lời của bạn</li>
              </ul>
            </div>
            <div class="mt-4 flex justify-end">
              <button 
                (click)="startQuiz()"
                class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Bắt đầu làm bài
              </button>
            </div>
          </div>
        }

        <!-- Quiz Content -->
        @if (!showInstructions() && quiz() && currentQuestion()) {
          <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
            <!-- Question Header -->
            <div class="flex items-start justify-between mb-6">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <span class="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                    Câu {{ currentQuestionIndex() + 1 }}
                  </span>
                  <span class="ml-2 text-sm text-gray-500">
                    {{ currentQuestion()?.points }} điểm
                  </span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">
                  {{ currentQuestion()?.text }}
                </h3>
                @if (currentQuestion()?.isRequired) {
                  <span class="text-red-500 text-sm">* Bắt buộc</span>
                }
              </div>
            </div>

            <!-- Question Content -->
            <div class="space-y-4">
              @switch (currentQuestion()?.type) {
                @case (QuestionType.MULTIPLE_CHOICE) {
                  <div class="space-y-3">
                    @for (option of currentQuestion()?.options; track $index) {
                      <label class="flex items-center p-3 border border-gray-800 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input 
                          type="radio" 
                          name="question-{{ currentQuestion()?.id }}"
                          [value]="option"
                          [ngModel]="currentAnswer()"
                          (ngModelChange)="currentAnswer.set($event)"
                          class="w-4 h-4 text-blue-600 border-gray-800 focus:ring-blue-500"
                        >
                        <span class="ml-3 text-gray-900">{{ option }}</span>
                      </label>
                    }
                  </div>
                }
                
                @case (QuestionType.TRUE_FALSE) {
                  <div class="space-y-3">
                    <label class="flex items-center p-3 border border-gray-800 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name="question-{{ currentQuestion()?.id }}"
                        value="true"
                        [ngModel]="currentAnswer()"
                        (ngModelChange)="currentAnswer.set($event)"
                        class="w-4 h-4 text-blue-600 border-gray-800 focus:ring-blue-500"
                      >
                      <span class="ml-3 text-gray-900">Đúng</span>
                    </label>
                    <label class="flex items-center p-3 border border-gray-800 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name="question-{{ currentQuestion()?.id }}"
                        value="false"
                        [ngModel]="currentAnswer()"
                        (ngModelChange)="currentAnswer.set($event)"
                        class="w-4 h-4 text-blue-600 border-gray-800 focus:ring-blue-500"
                      >
                      <span class="ml-3 text-gray-900">Sai</span>
                    </label>
                  </div>
                }
                
                @case (QuestionType.FILL_BLANK) {
                  <div>
                    <input 
                      type="text"
                      [ngModel]="currentAnswer()"
                      (ngModelChange)="currentAnswer.set($event)"
                      placeholder="Nhập câu trả lời của bạn..."
                      class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                  </div>
                }
                
                @case (QuestionType.SHORT_ANSWER) {
                  <div>
                    <textarea 
                      [ngModel]="currentAnswer()"
                      (ngModelChange)="currentAnswer.set($event)"
                      placeholder="Nhập câu trả lời của bạn..."
                      rows="3"
                      class="w-full px-3 py-2 border border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>
                }
              }
            </div>

            <!-- Question Navigation -->
            <div class="flex justify-between items-center mt-8 pt-6 border-t border-gray-800">
              <button 
                (click)="previousQuestion()"
                [disabled]="currentQuestionIndex() === 0"
                class="px-4 py-2 border border-gray-800 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-200"
              >
                ← Câu trước
              </button>
              
              <div class="flex space-x-2">
                @for (question of quiz()?.questions; track question.id; let i = $index) {
                  <button 
                    (click)="goToQuestion(i)"
                    [class]="getQuestionButtonClass(i)"
                    class="w-8 h-8 rounded-full text-sm font-medium transition-colors duration-200"
                  >
                    {{ i + 1 }}
                  </button>
                }
              </div>
              
              @if (currentQuestionIndex() === ((quiz()?.questions?.length || 0) - 1)) {
                <button 
                  (click)="submitQuiz()"
                  class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
                >
                  Nộp bài
                </button>
              } @else {
                <button 
                  (click)="nextQuestion()"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Câu tiếp →
                </button>
              }
            </div>
          </div>
        }

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 class="text-lg font-semibold text-red-900 mb-2">Có lỗi xảy ra</h3>
            <p class="text-red-800 mb-4">{{ error() }}</p>
            <button 
              (click)="goBack()"
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
            >
              Quay lại
            </button>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizAttemptComponent implements OnInit, OnDestroy {
  protected quizService = inject(QuizService);
  protected authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Signals
  quiz = signal<Quiz | undefined>(undefined);
  currentQuestion = signal<Question | undefined>(undefined);
  currentQuestionIndex = signal(0);
  currentAnswer = signal<string>('');
  answers = signal<Answer[]>([]);
  timeRemaining = signal(0);
  isLoading = signal(false);
  showInstructions = signal(true);
  error = signal<string | null>(null);
  attempt = signal<QuizAttempt | undefined>(undefined);

  // Timer
  private timerInterval: any;
  protected readonly QuestionType = QuestionType;

  ngOnInit(): void {
    this.loadQuiz();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private async loadQuiz(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const quizId = this.route.snapshot.paramMap.get('id');
      if (!quizId) {
        throw new Error('Quiz ID not found');
      }

      const user = this.authService.user();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Load quiz
      const quiz = await this.quizService.getQuiz(quizId).toPromise();
      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Check if user can attempt quiz
      const canAttempt = await this.quizService.canAttemptQuiz(quizId, user.id).toPromise();
      if (!canAttempt) {
        throw new Error('Bạn không thể làm quiz này hoặc đã hết số lần thử');
      }

      // Start quiz attempt
      const attempt = await this.quizService.startQuizAttempt(quizId, user.id).toPromise();
      if (!attempt) {
        throw new Error('Failed to start quiz attempt');
      }

      this.quiz.set(quiz);
      this.attempt.set(attempt);
      this.timeRemaining.set(quiz.timeLimit * 60); // Convert to seconds
      this.loadCurrentQuestion();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      this.isLoading.set(false);
    }
  }

  private loadCurrentQuestion(): void {
    const quiz = this.quiz();
    const index = this.currentQuestionIndex();
    
    if (quiz && quiz.questions[index]) {
      this.currentQuestion.set(quiz.questions[index]);
      
      // Load existing answer if any
      const existingAnswer = this.answers().find(a => a.questionId === quiz.questions[index].id);
      this.currentAnswer.set(existingAnswer?.answer as string || '');
    }
  }

  startQuiz(): void {
    this.showInstructions.set(false);
    this.startTimer();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining();
      if (remaining <= 0) {
        this.timeUp();
        return;
      }
      this.timeRemaining.set(remaining - 1);
    }, 1000);
  }

  private timeUp(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.submitQuiz();
  }

  nextQuestion(): void {
    this.saveCurrentAnswer();
    const nextIndex = this.currentQuestionIndex() + 1;
    if (nextIndex < (this.quiz()?.questions.length || 0)) {
      this.currentQuestionIndex.set(nextIndex);
      this.loadCurrentQuestion();
    }
  }

  previousQuestion(): void {
    this.saveCurrentAnswer();
    const prevIndex = this.currentQuestionIndex() - 1;
    if (prevIndex >= 0) {
      this.currentQuestionIndex.set(prevIndex);
      this.loadCurrentQuestion();
    }
  }

  goToQuestion(index: number): void {
    this.saveCurrentAnswer();
    this.currentQuestionIndex.set(index);
    this.loadCurrentQuestion();
  }

  private saveCurrentAnswer(): void {
    const question = this.currentQuestion();
    const answer = this.currentAnswer();
    
    if (question && answer) {
      const existingAnswerIndex = this.answers().findIndex(a => a.questionId === question.id);
      const newAnswer: Answer = {
        id: `answer-${Date.now()}`,
        questionId: question.id,
        attemptId: this.attempt()?.id || '',
        answer,
        isCorrect: false, // Will be calculated on submit
        points: 0,
        timeSpent: 0,
        submittedAt: new Date()
      };

      if (existingAnswerIndex >= 0) {
        const updatedAnswers = [...this.answers()];
        updatedAnswers[existingAnswerIndex] = newAnswer;
        this.answers.set(updatedAnswers);
      } else {
        this.answers.set([...this.answers(), newAnswer]);
      }
    }
  }

  async submitQuiz(): Promise<void> {
    this.saveCurrentAnswer();
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    try {
      const attempt = this.attempt();
      if (!attempt) {
        throw new Error('No active attempt found');
      }

      const result = await this.quizService.submitQuizAttempt(attempt.id, this.answers()).toPromise();
      if (result) {
        this.router.navigate(['/learn/quiz', this.quiz()?.id, 'result'], { 
          queryParams: { attemptId: result.attemptId } 
        });
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to submit quiz');
    }
  }

  getProgressPercentage(): number {
    const total = this.quiz()?.questions.length || 0;
    const answered = this.answers().length;
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  }

  getTimerClass(): string {
    const remaining = this.timeRemaining();
    if (remaining <= 60) return 'text-red-600';
    if (remaining <= 300) return 'text-yellow-600';
    return 'text-blue-600';
  }

  getQuestionButtonClass(index: number): string {
    const currentIndex = this.currentQuestionIndex();
    const isAnswered = this.answers().some(a => a.questionId === this.quiz()?.questions[index].id);
    
    if (index === currentIndex) {
      return 'bg-blue-600 text-white';
    } else if (isAnswered) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  goBack(): void {
    this.router.navigate(['/learn/quiz']);
  }
}
