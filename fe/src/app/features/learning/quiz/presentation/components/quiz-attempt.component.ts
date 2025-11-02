import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TakeQuizUseCase } from '../../application/use-cases/take-quiz.use-case';
import { GetQuizListUseCase } from '../../application/use-cases/get-quiz-list.use-case';
import { Quiz, QuizAttempt, QuestionType } from '../../types';
import { QuestionType as QType } from '../../types';
import { AuthService } from '../../../../../core/services/auth.service';
import { ErrorHandlingService } from '../../../../../shared/services/error-handling.service';
import { LoadingComponent } from '../../../../../shared/components/loading/loading.component';

/**
 * Quiz Attempt Component - DDD Refactored
 *
 * Handles the quiz taking experience using clean architecture
 */
@Component({
  selector: 'app-quiz-attempt',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading
      [show]="isLoading()"
      text="Đang tải quiz..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>

    <!-- Quiz Instructions (shown initially) -->
    @if (showInstructions() && quiz()) {
      <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="bg-white rounded-xl shadow-lg p-8">
            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold text-gray-900 mb-4">{{ quiz()!.title }}</h1>
              <p class="text-lg text-gray-600">{{ quiz()!.description }}</p>
            </div>

            <!-- Quiz Info -->
            <div class="bg-blue-50 rounded-lg p-6 mb-8">
              <h3 class="text-lg font-semibold text-blue-900 mb-4">Thông tin bài thi</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div class="text-2xl font-bold text-blue-600">{{ quiz()!.questions.length }}</div>
                  <div class="text-sm text-blue-700">Câu hỏi</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-blue-600">{{ quiz()!.timeLimit || 'N/A' }}</div>
                  <div class="text-sm text-blue-700">Phút</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-blue-600">{{ quiz()!.passingScore }}</div>
                  <div class="text-sm text-blue-700">Điểm đậu (%)</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-blue-600">{{ quiz()!.totalPoints }}</div>
                  <div class="text-sm text-blue-700">Tổng điểm</div>
                </div>
              </div>
            </div>

            <!-- Instructions -->
            @if (quiz()!.instructions) {
              <div class="bg-yellow-50 rounded-lg p-6 mb-8">
                <h3 class="text-lg font-semibold text-yellow-900 mb-4">Hướng dẫn</h3>
                <div class="text-yellow-800 whitespace-pre-line">{{ quiz()!.instructions }}</div>
              </div>
            }

            <!-- Action Buttons -->
            <div class="flex justify-center space-x-4">
              <button
                (click)="startQuiz()"
                [disabled]="isStarting()"
                class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium">
                @if (isStarting()) {
                  <span class="inline-flex items-center">
                    <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang bắt đầu...
                  </span>
                } @else {
                  Bắt đầu làm bài
                }
              </button>
              <button
                (click)="goBack()"
                class="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Quiz Taking Interface -->
    @if (!showInstructions() && quiz() && attempt()) {
      <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="grid grid-cols-12 gap-6">
            <!-- Main Quiz Content -->
            <div class="col-span-12 lg:col-span-8">
              <div class="bg-white rounded-xl shadow-lg p-6">
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h1 class="text-2xl font-bold text-gray-900">{{ quiz()!.title }}</h1>
                    <p class="text-gray-600">Câu hỏi {{ currentQuestionIndex() + 1 }} / {{ quiz()!.questions.length }}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-mono text-red-600" [class]="getTimerClass()">
                      {{ formatTime(timeRemaining()) }}
                    </div>
                    <div class="text-sm text-gray-500">Thời gian còn lại</div>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-gray-200 rounded-full h-2 mb-6">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    [style.width.%]="progressPercentage()">
                  </div>
                </div>

                <!-- Current Question -->
                @if (currentQuestion()) {
                  <div class="mb-8">
                    <h2 class="text-xl font-semibold text-gray-900 mb-4">
                      {{ currentQuestion()!.text }}
                    </h2>

                    <!-- Question Options -->
                    @if (currentQuestion()!.type === QuestionType.MULTIPLE_CHOICE) {
                      <div class="space-y-3">
                        @for (option of currentQuestion()!.options; track $index) {
                          <label class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="radio"
                              [name]="'question_' + currentQuestion()!.id"
                              [value]="option"
                              [checked]="isOptionSelected(option)"
                              (change)="selectAnswer(option)"
                              class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                            <span class="ml-3 text-gray-800">{{ option }}</span>
                          </label>
                        }
                      </div>
                    }

                    @if (currentQuestion()!.type === QuestionType.TRUE_FALSE) {
                      <div class="space-y-3">
                        <label class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            [name]="'question_' + currentQuestion()!.id"
                            value="true"
                            [checked]="isTrueFalseSelected(true)"
                            (change)="selectAnswer('true')"
                            class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                          <span class="ml-3 text-gray-800">Đúng</span>
                        </label>
                        <label class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            [name]="'question_' + currentQuestion()!.id"
                            value="false"
                            [checked]="isTrueFalseSelected(false)"
                            (change)="selectAnswer('false')"
                            class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                          <span class="ml-3 text-gray-800">Sai</span>
                        </label>
                      </div>
                    }

                    @if (currentQuestion()!.type === QuestionType.FILL_BLANK) {
                      <div>
                        <input
                          type="text"
                          [value]="getFillBlankAnswer()"
                          (input)="updateFillBlankAnswer($event)"
                          placeholder="Nhập câu trả lời của bạn..."
                          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg">
                      </div>
                    }
                  </div>
                }

                <!-- Navigation Buttons -->
                <div class="flex justify-between">
                  <button
                    (click)="previousQuestion()"
                    [disabled]="currentQuestionIndex() === 0"
                    class="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Câu trước
                  </button>

                  <div class="flex space-x-3">
                    @if (currentQuestionIndex() < quiz()!.questions.length - 1) {
                      <button
                        (click)="nextQuestion()"
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Câu tiếp
                        <svg class="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    } @else {
                      <button
                        (click)="submitQuiz()"
                        [disabled]="isSubmitting()"
                        class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        @if (isSubmitting()) {
                          <span class="inline-flex items-center">
                            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang nộp...
                          </span>
                        } @else {
                          Nộp bài
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Question Navigation Sidebar -->
            <div class="col-span-12 lg:col-span-4">
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Danh sách câu hỏi</h3>

                <!-- Question Grid -->
                <div class="grid grid-cols-5 gap-2 mb-6">
                  @for (question of quiz()!.questions; track question.id; let i = $index) {
                    <button
                      (click)="goToQuestion(i)"
                      class="w-10 h-10 rounded-lg text-sm font-medium transition-colors"
                      [class]="getQuestionButtonClass(i)">
                      {{ i + 1 }}
                    </button>
                  }
                </div>

                <!-- Quiz Stats -->
                <div class="space-y-3">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Hoàn thành:</span>
                    <span class="font-medium">{{ answeredQuestions() }}/{{ quiz()!.questions.length }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Thời gian:</span>
                    <span class="font-medium">{{ formatTime(timeRemaining()) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizAttemptComponent implements OnInit, OnDestroy {
  protected authService = inject(AuthService);
  private takeQuizUseCase = inject(TakeQuizUseCase);
  private getQuizListUseCase = inject(GetQuizListUseCase);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private errorService = inject(ErrorHandlingService);

  // Expose QuestionType for template
  protected QuestionType = QuestionType;

  // Signals
  quiz = signal<Quiz | null>(null);
  attempt = signal<QuizAttempt | null>(null);
  currentQuestionIndex = signal(0);
  timeRemaining = signal(0);
  answers = signal<Map<string, string>>(new Map());
  showInstructions = signal(true);
  isLoading = signal(false);
  isStarting = signal(false);
  isSubmitting = signal(false);

  // Timer
  private timerInterval?: NodeJS.Timeout;

  ngOnInit(): void {
    const quizId = this.route.snapshot.params['id'];
    if (quizId) {
      this.loadQuiz(quizId);
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private loadQuiz(quizId: string): void {
    this.isLoading.set(true);

    this.getQuizListUseCase.execute().subscribe({
      next: (quizzes) => {
        const quiz = quizzes.find(q => q.id === quizId);
        if (quiz) {
          this.quiz.set(quiz);
          // Initialize time remaining (convert minutes to seconds)
          this.timeRemaining.set((quiz.timeLimit || 30) * 60);
        } else {
          this.errorService.addError({
            message: 'Không tìm thấy quiz',
            type: 'error',
            context: 'quiz'
          });
          this.goBack();
        }
      },
      error: (error) => {
        this.errorService.handleApiError(error, 'quiz');
        this.goBack();
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  startQuiz(): void {
    if (!this.quiz()) return;

    this.isStarting.set(true);
    const studentId = this.authService.userEmail(); // Using email as student ID

    this.takeQuizUseCase.startQuiz(this.quiz()!.id, studentId).subscribe({
      next: ({ quiz, attempt }) => {
        this.quiz.set(quiz);
        this.attempt.set(attempt);
        this.showInstructions.set(false);
        this.startTimer();
        this.errorService.showSuccess('Bắt đầu làm bài thi!', 'quiz');
      },
      error: (error) => {
        this.errorService.handleApiError(error, 'quiz');
      },
      complete: () => {
        this.isStarting.set(false);
      }
    });
  }

  private startTimer(): void {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining() - 1;
      this.timeRemaining.set(remaining);

      if (remaining <= 0) {
        this.submitQuiz();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  selectAnswer(answer: string): void {
    if (!this.attempt() || !this.currentQuestion()) return;

    const questionId = this.currentQuestion()!.id;
    const answers = new Map(this.answers());
    answers.set(questionId, answer);
    this.answers.set(answers);

    // Submit answer to use case
    this.takeQuizUseCase.submitAnswer(
      this.attempt()!.id,
      questionId,
      answer,
      30 // Mock time spent per question
    ).subscribe({
      next: () => {
        // Answer submitted successfully
      },
      error: (error) => {
        console.error('Error submitting answer:', error);
      }
    });
  }

  updateFillBlankAnswer(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectAnswer(target.value);
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex() < this.quiz()!.questions.length - 1) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() - 1);
    }
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.quiz()!.questions.length) {
      this.currentQuestionIndex.set(index);
    }
  }

  submitQuiz(): void {
    if (!this.attempt()) return;

    this.isSubmitting.set(true);
    this.clearTimer();

    this.takeQuizUseCase.completeQuiz(this.attempt()!.id).subscribe({
      next: (result) => {
        this.errorService.showSuccess('Nộp bài thành công!', 'quiz');
        this.router.navigate(['/student/quiz/result'], {
          queryParams: { attemptId: result.attemptId }
        });
      },
      error: (error) => {
        this.errorService.handleApiError(error, 'quiz');
      },
      complete: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/learn/quiz']);
  }

  // Computed values
  currentQuestion = () => {
    const quiz = this.quiz();
    const index = this.currentQuestionIndex();
    return quiz?.questions[index] || null;
  };

  progressPercentage = () => {
    const quiz = this.quiz();
    if (!quiz) return 0;
    return ((this.currentQuestionIndex() + 1) / quiz.questions.length) * 100;
  };

  answeredQuestions = () => {
    return this.answers().size;
  };

  // Helper methods
  isOptionSelected(option: string): boolean {
    const question = this.currentQuestion();
    if (!question) return false;
    return this.answers().get(question.id) === option;
  }

  isTrueFalseSelected(value: boolean): boolean {
    const question = this.currentQuestion();
    if (!question) return false;
    return this.answers().get(question.id) === value.toString();
  }

  getFillBlankAnswer(): string {
    const question = this.currentQuestion();
    if (!question) return '';
    return this.answers().get(question.id) || '';
  }

  getQuestionButtonClass(index: number): string {
    const isCurrent = index === this.currentQuestionIndex();
    const question = this.quiz()?.questions[index];
    const isAnswered = question ? this.answers().has(question.id) : false;

    if (isCurrent) {
      return 'bg-blue-600 text-white shadow-lg';
    } else if (isAnswered) {
      return 'bg-green-100 text-green-800 border-2 border-green-300';
    } else {
      return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  }

  getTimerClass(): string {
    const remaining = this.timeRemaining();
    if (remaining <= 60) return 'text-red-600 animate-pulse';
    if (remaining <= 300) return 'text-yellow-600';
    return 'text-green-600';
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}