import { Component, OnInit, OnDestroy, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { QuizService } from '../../../state/quiz.service';
import { QuizStateService } from '../state/quiz-state.service';
import { Quiz, Question, QuestionType } from '../../../shared/types/quiz.types';

@Component({
  selector: 'app-quiz-attempt-new',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Quiz Header -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">{{ quizStateService.currentQuiz()?.title }}</h1>
              <p class="text-gray-600 mt-2">{{ quizStateService.currentQuiz()?.description }}</p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-500 mb-1">Thời gian còn lại</div>
              <div class="text-3xl font-bold" [class]="getTimerClass()">
                {{ quizStateService.timeFormatted() }}
              </div>
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              class="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
              [style.width.%]="quizStateService.progress()"
            ></div>
          </div>
          
          <div class="flex justify-between text-sm text-gray-600">
            <span>Câu hỏi {{ quizStateService.currentQuestionIndex() + 1 }} / {{ quizStateService.totalQuestions() }}</span>
            <span>{{ quizStateService.progress() }}% hoàn thành</span>
            <span>{{ quizStateService.answeredQuestions() }} câu đã trả lời</span>
          </div>
        </div>

        <!-- Quiz Instructions -->
        @if (showInstructions()) {
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-blue-900 mb-2">Hướng dẫn làm bài</h3>
            <div class="text-blue-800 space-y-2">
              <p>{{ quizStateService.currentQuiz()?.instructions }}</p>
              <ul class="list-disc list-inside space-y-1">
                <li>Đọc kỹ câu hỏi trước khi trả lời</li>
                <li>Bạn có thể quay lại câu hỏi trước đó</li>
                <li>Hệ thống sẽ tự động nộp bài khi hết thời gian</li>
                <li>Chỉ có thể nộp bài khi đã trả lời ít nhất 1 câu hỏi</li>
              </ul>
            </div>
            <div class="mt-4">
              <button 
                (click)="startQuiz()"
                class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Bắt đầu làm bài
              </button>
            </div>
          </div>
        }

        <!-- Quiz Content -->
        @if (quizStateService.isQuizActive() && quizStateService.currentQuestion()) {
          <div class="grid grid-cols-12 gap-6">
            <!-- Question Content (8 columns) -->
            <div class="col-span-12 lg:col-span-8">
              <div class="bg-white rounded-xl shadow-lg p-6">
                <!-- Question Header -->
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-xl font-semibold text-gray-900">
                    Câu hỏi {{ quizStateService.currentQuestionIndex() + 1 }}
                  </h2>
                  <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {{ getQuestionTypeText(quizStateService.currentQuestion()!.type) }}
                  </span>
                </div>

                <!-- Question Text -->
                <div class="mb-6">
                  <p class="text-lg text-gray-800 leading-relaxed">
                    {{ quizStateService.currentQuestion()!.text }}
                  </p>
                </div>

                <!-- Question Options -->
                <div class="space-y-4">
                  @if (quizStateService.currentQuestion()!.type === QuestionType.MULTIPLE_CHOICE) {
                    <div class="space-y-3">
                      @for (option of quizStateService.currentQuestion()!.options; track $index) {
                        <label class="flex items-center p-4 border border-gray-800 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                               [class.bg-blue-50]="isOptionSelected(option)">
                          <input 
                            type="radio" 
                            [name]="'question_' + quizStateService.currentQuestion()!.id"
                            [value]="option"
                            [checked]="isOptionSelected(option)"
                            (change)="selectOption(option)"
                            class="w-4 h-4 text-blue-600 border-gray-800 focus:ring-blue-500">
                          <span class="ml-3 text-gray-800">{{ option }}</span>
                        </label>
                      }
                    </div>
                  }

                  @if (quizStateService.currentQuestion()!.type === QuestionType.TRUE_FALSE) {
                    <div class="space-y-3">
                      <label class="flex items-center p-4 border border-gray-800 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                             [class.bg-blue-50]="isTrueFalseSelected(true)">
                        <input 
                          type="radio" 
                          [name]="'question_' + quizStateService.currentQuestion()!.id"
                          [value]="true"
                          [checked]="isTrueFalseSelected(true)"
                          (change)="selectTrueFalse(true)"
                          class="w-4 h-4 text-blue-600 border-gray-800 focus:ring-blue-500">
                        <span class="ml-3 text-gray-800">Đúng</span>
                      </label>
                      <label class="flex items-center p-4 border border-gray-800 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                             [class.bg-blue-50]="isTrueFalseSelected(false)">
                        <input 
                          type="radio" 
                          [name]="'question_' + quizStateService.currentQuestion()!.id"
                          [value]="false"
                          [checked]="isTrueFalseSelected(false)"
                          (change)="selectTrueFalse(false)"
                          class="w-4 h-4 text-blue-600 border-gray-800 focus:ring-blue-500">
                        <span class="ml-3 text-gray-800">Sai</span>
                      </label>
                    </div>
                  }

                  @if (quizStateService.currentQuestion()!.type === QuestionType.FILL_BLANK) {
                    <div>
                      <input 
                        type="text" 
                        [value]="getFillBlankAnswer()"
                        (input)="updateFillBlankAnswer($event)"
                        placeholder="Nhập câu trả lời của bạn..."
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg">
                    </div>
                  }
                </div>

                <!-- Navigation Buttons -->
                <div class="flex justify-between mt-8">
                  <button 
                    (click)="previousQuestion()"
                    [disabled]="quizStateService.isFirstQuestion()"
                    class="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Câu trước
                  </button>

                  <div class="flex space-x-3">
                    @if (!quizStateService.isLastQuestion()) {
                      <button 
                        (click)="nextQuestion()"
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Câu tiếp
                        <svg class="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    }
                    
                    <button 
                      (click)="submitQuiz()"
                      [disabled]="!quizStateService.canSubmit()"
                      class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Nộp bài
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Question Navigation Sidebar (4 columns) -->
            <div class="col-span-12 lg:col-span-4">
              <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Danh sách câu hỏi</h3>
                
                <!-- Question Grid -->
                <div class="grid grid-cols-5 gap-2 mb-6">
                  @for (nav of getQuestionNavigation(); track nav.index) {
                    <button 
                      (click)="goToQuestion(nav.index)"
                      class="w-10 h-10 rounded-lg text-sm font-medium transition-colors"
                      [class]="getQuestionButtonClass(nav)">
                      {{ nav.index + 1 }}
                    </button>
                  }
                </div>

                <!-- Quiz Stats -->
                <div class="space-y-3">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Tổng câu hỏi:</span>
                    <span class="font-medium">{{ quizStateService.totalQuestions() }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Đã trả lời:</span>
                    <span class="font-medium text-green-600">{{ quizStateService.answeredQuestions() }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Chưa trả lời:</span>
                    <span class="font-medium text-red-600">{{ quizStateService.getUnansweredQuestions().length }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Thời gian còn lại:</span>
                    <span class="font-medium" [class]="getTimerClass()">{{ quizStateService.timeFormatted() }}</span>
                  </div>
                </div>

                <!-- Quick Actions -->
                <div class="mt-6 space-y-2">
                  <button 
                    (click)="submitQuiz()"
                    [disabled]="!quizStateService.canSubmit()"
                    class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Nộp bài ngay
                  </button>
                  <button 
                    (click)="exitQuiz()"
                    class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Thoát khỏi bài thi
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Quiz Completed -->
        @if (quizStateService.isQuizCompleted()) {
          <div class="bg-white rounded-xl shadow-lg p-8 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Hoàn thành bài thi!</h2>
            <p class="text-gray-600 mb-6">Bạn đã hoàn thành bài thi thành công. Kết quả sẽ được hiển thị trong giây lát.</p>
            <button 
              (click)="viewResults()"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Xem kết quả
            </button>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizAttemptNewComponent implements OnInit, OnDestroy {
  protected quizStateService = inject(QuizStateService);
  protected QuestionType = QuestionType;
  private quizService = inject(QuizService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  showInstructions = signal(true);
  quizForm: FormGroup;

  constructor() {
    this.quizForm = this.fb.group({});
  }

  ngOnInit(): void {
    const quizId = this.route.snapshot.paramMap.get('id');
    if (quizId) {
      this.loadQuiz(quizId);
    }
  }

  ngOnDestroy(): void {
    // Quiz state will be managed by the service
  }

  private loadQuiz(quizId: string): void {
    this.quizService.getQuiz(quizId).subscribe(quiz => {
      if (quiz) {
        this.quizStateService.startQuiz(quiz);
      } else {
        this.router.navigate(['/learn/quiz']);
      }
    });
  }

  startQuiz(): void {
    this.showInstructions.set(false);
  }

  selectOption(option: string): void {
    const question = this.quizStateService.currentQuestion();
    if (question) {
      this.quizStateService.answerQuestion(question.id, option);
    }
  }

  selectTrueFalse(value: boolean): void {
    const question = this.quizStateService.currentQuestion();
    if (question) {
      this.quizStateService.answerQuestion(question.id, value);
    }
  }

  updateFillBlankAnswer(event: Event): void {
    const target = event.target as HTMLInputElement;
    const question = this.quizStateService.currentQuestion();
    if (question) {
      this.quizStateService.answerQuestion(question.id, target.value);
    }
  }

  getFillBlankAnswer(): string {
    const question = this.quizStateService.currentQuestion();
    if (question) {
      return this.quizStateService.getAnswer(question.id) || '';
    }
    return '';
  }

  isOptionSelected(option: string): boolean {
    const question = this.quizStateService.currentQuestion();
    if (question) {
      return this.quizStateService.getAnswer(question.id) === option;
    }
    return false;
  }

  isTrueFalseSelected(value: boolean): boolean {
    const question = this.quizStateService.currentQuestion();
    if (question) {
      return this.quizStateService.getAnswer(question.id) === value;
    }
    return false;
  }

  nextQuestion(): void {
    this.quizStateService.nextQuestion();
  }

  previousQuestion(): void {
    this.quizStateService.previousQuestion();
  }

  goToQuestion(index: number): void {
    this.quizStateService.goToQuestion(index);
  }

  submitQuiz(): void {
    this.quizStateService.submitQuiz();
  }

  exitQuiz(): void {
    if (confirm('Bạn có chắc chắn muốn thoát khỏi bài thi? Tiến độ hiện tại sẽ bị mất.')) {
      this.quizStateService.resetQuiz();
      this.router.navigate(['/learn/quiz']);
    }
  }

  viewResults(): void {
    this.router.navigate(['/learn/quiz/result']);
  }

  getQuestionTypeText(type: QuestionType): string {
    switch (type) {
      case QuestionType.MULTIPLE_CHOICE:
        return 'Trắc nghiệm';
      case QuestionType.TRUE_FALSE:
        return 'Đúng/Sai';
      case QuestionType.FILL_BLANK:
        return 'Điền từ';
      default:
        return 'Không xác định';
    }
  }

  getQuestionNavigation() {
    return this.quizStateService.getQuestionNavigation();
  }

  getQuestionButtonClass(nav: { index: number; answered: boolean; current: boolean }): string {
    if (nav.current) {
      return 'bg-blue-600 text-white';
    } else if (nav.answered) {
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    } else {
      return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  }

  getTimerClass(): string {
    const time = this.quizStateService.timeRemaining();
    if (time <= 300) { // 5 minutes
      return 'text-red-600';
    } else if (time <= 600) { // 10 minutes
      return 'text-yellow-600';
    } else {
      return 'text-green-600';
    }
  }
}
