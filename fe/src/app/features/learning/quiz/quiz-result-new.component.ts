import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { QuizService } from '../../../state/quiz.service';
import { QuizStateService } from '../state/quiz-state.service';
import { Quiz, QuizResult, QuestionType } from '../../../shared/types/quiz.types';

@Component({
  selector: 'app-quiz-result-new',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Result Header -->
        <div class="bg-white rounded-xl shadow-lg p-8 mb-6 text-center">
          <div class="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
               [class]="getResultIconClass()">
            <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
              <path [attr.d]="getResultIconPath()"></path>
            </svg>
          </div>
          
          <h1 class="text-3xl font-bold mb-2" [class]="getResultTitleClass()">
            {{ getResultTitle() }}
          </h1>
          
          <p class="text-lg text-gray-600 mb-6">
            {{ getResultMessage() }}
          </p>

          <!-- Score Display -->
          <div class="bg-gray-50 rounded-lg p-6 mb-6">
            <div class="text-6xl font-bold mb-2" [class]="getScoreClass()">
              {{ quizStateService.quizResult()?.percentage || 0 }}%
            </div>
            <div class="text-gray-600">
              {{ quizStateService.quizResult()?.correctAnswers || 0 }} / {{ quizStateService.quizResult()?.totalQuestions || 0 }} câu đúng
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              (click)="retakeQuiz()"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Làm lại bài thi
            </button>
            <button 
              (click)="goToQuizList()"
              class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
              <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Danh sách bài thi
            </button>
          </div>
        </div>

        <!-- Detailed Results -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- Quiz Information -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Thông tin bài thi</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600">Tên bài thi:</span>
                <span class="font-medium">{{ quizStateService.currentQuiz()?.title }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Tổng câu hỏi:</span>
                <span class="font-medium">{{ quizStateService.quizResult()?.totalQuestions }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Thời gian làm bài:</span>
                <span class="font-medium">{{ formatTime(quizStateService.quizResult()?.timeSpent || 0) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Hoàn thành lúc:</span>
                <span class="font-medium">{{ formatDateTime(quizStateService.quizResult()?.submittedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Performance Stats -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Thống kê hiệu suất</h3>
            <div class="space-y-4">
              <!-- Accuracy -->
              <div>
                <div class="flex justify-between mb-2">
                  <span class="text-gray-600">Độ chính xác</span>
                  <span class="font-medium">{{ getAccuracyPercentage() }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-green-600 h-2 rounded-full" [style.width.%]="getAccuracyPercentage()"></div>
                </div>
              </div>

              <!-- Speed -->
              <div>
                <div class="flex justify-between mb-2">
                  <span class="text-gray-600">Tốc độ làm bài</span>
                  <span class="font-medium">{{ getAverageTimePerQuestion() }}s/câu</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="getSpeedPercentage()"></div>
                </div>
              </div>

              <!-- Completion -->
              <div>
                <div class="flex justify-between mb-2">
                  <span class="text-gray-600">Tỷ lệ hoàn thành</span>
                  <span class="font-medium">100%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-purple-600 h-2 rounded-full" style="width: 100%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Question Review -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Xem lại câu trả lời</h3>
          <div class="space-y-4">
            @for (question of quizStateService.currentQuiz()?.questions || []; track question.id; let i = $index) {
              <div class="border border-gray-800 rounded-lg p-4">
                <div class="flex items-start justify-between mb-3">
                  <h4 class="font-medium text-gray-900">Câu {{ i + 1 }}: {{ question.text }}</h4>
                  <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="getQuestionStatusClass(question.id)">
                    {{ getQuestionStatusText(question.id) }}
                  </span>
                </div>
                
                <div class="space-y-2">
                  @if (question.type === QuestionType.MULTIPLE_CHOICE) {
                    <div class="space-y-1">
                      @for (option of question.options; track $index) {
                        <div class="flex items-center space-x-2">
                          <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                               [class]="getOptionClass(question, option)">
                            @if (isOptionSelected(question.id, option)) {
                              <div class="w-2 h-2 rounded-full bg-white"></div>
                            }
                          </div>
                          <span [class]="getOptionTextClass(question, option)">{{ option }}</span>
                          @if (option === question.correctAnswer) {
                            <span class="text-green-600 text-sm">(Đáp án đúng)</span>
                          }
                        </div>
                      }
                    </div>
                  }

                  @if (question.type === QuestionType.TRUE_FALSE) {
                    <div class="space-y-1">
                      <div class="flex items-center space-x-2">
                        <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                             [class]="getTrueFalseClass(question, true)">
                          @if (isTrueFalseSelected(question.id, true)) {
                            <div class="w-2 h-2 rounded-full bg-white"></div>
                          }
                        </div>
                        <span [class]="getTrueFalseTextClass(question, true)">Đúng</span>
                        @if (question.correctAnswer === 'true') {
                          <span class="text-green-600 text-sm">(Đáp án đúng)</span>
                        }
                      </div>
                      <div class="flex items-center space-x-2">
                        <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                             [class]="getTrueFalseClass(question, false)">
                          @if (isTrueFalseSelected(question.id, false)) {
                            <div class="w-2 h-2 rounded-full bg-white"></div>
                          }
                        </div>
                        <span [class]="getTrueFalseTextClass(question, false)">Sai</span>
                        @if (question.correctAnswer === 'false') {
                          <span class="text-green-600 text-sm">(Đáp án đúng)</span>
                        }
                      </div>
                    </div>
                  }

                  @if (question.type === QuestionType.FILL_BLANK) {
                    <div class="space-y-2">
                      <div class="p-3 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-600">Câu trả lời của bạn:</span>
                        <div class="font-medium" [class]="getFillBlankTextClass(question)">
                          "{{ getUserAnswer(question.id) || 'Không trả lời' }}"
                        </div>
                      </div>
                      <div class="p-3 bg-green-50 rounded-lg">
                        <span class="text-sm text-gray-600">Đáp án đúng:</span>
                        <div class="font-medium text-green-800">"{{ question.correctAnswer }}"</div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizResultNewComponent implements OnInit {
  protected quizStateService = inject(QuizStateService);
  protected QuestionType = QuestionType;
  private quizService = inject(QuizService);
  private router = inject(Router);

  ngOnInit(): void {
    // Check if there's a quiz result available
    if (!this.quizStateService.quizResult()) {
      this.router.navigate(['/learn/quiz']);
    }
  }

  retakeQuiz(): void {
    const quiz = this.quizStateService.currentQuiz();
    if (quiz) {
      this.quizStateService.resetQuiz();
      this.router.navigate(['/learn/quiz/attempt', quiz.id]);
    }
  }

  goToQuizList(): void {
    this.quizStateService.resetQuiz();
    this.router.navigate(['/learn/quiz']);
  }

  getResultTitle(): string {
    const result = this.quizStateService.quizResult();
    if (!result) return 'Kết quả bài thi';
    
    if (result.isPassed) {
      return 'Chúc mừng! Bạn đã vượt qua bài thi';
    } else {
      return 'Rất tiếc! Bạn chưa đạt yêu cầu';
    }
  }

  getResultMessage(): string {
    const result = this.quizStateService.quizResult();
    if (!result) return '';
    
    if (result.isPassed) {
      return `Bạn đã hoàn thành bài thi với điểm số ${result.percentage}%. Hãy tiếp tục phát huy!`;
    } else {
      return `Bạn cần đạt ít nhất 70% để vượt qua bài thi. Hãy ôn tập và thử lại!`;
    }
  }

  getResultTitleClass(): string {
    const result = this.quizStateService.quizResult();
    if (!result) return 'text-gray-900';
    
    return result.isPassed ? 'text-green-600' : 'text-red-600';
  }

  getResultMessageClass(): string {
    const result = this.quizStateService.quizResult();
    if (!result) return 'text-gray-600';
    
    return result.isPassed ? 'text-green-700' : 'text-red-700';
  }

  getResultIconClass(): string {
    const result = this.quizStateService.quizResult();
    if (!result) return 'bg-gray-100 text-gray-600';
    
    return result.isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
  }

  getResultIconPath(): string {
    const result = this.quizStateService.quizResult();
    if (!result) return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    
    if (result.isPassed) {
      return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    } else {
      return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getScoreClass(): string {
    const result = this.quizStateService.quizResult();
    if (!result) return 'text-gray-600';
    
    if (result.percentage >= 80) return 'text-green-600';
    if (result.percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getAccuracyPercentage(): number {
    const result = this.quizStateService.quizResult();
    if (!result || result.totalQuestions === 0) return 0;
    
    return Math.round((result.correctAnswers / result.totalQuestions) * 100);
  }

  getAverageTimePerQuestion(): number {
    const result = this.quizStateService.quizResult();
    if (!result || result.totalQuestions === 0) return 0;
    
    return Math.round(result.timeSpent / result.totalQuestions);
  }

  getSpeedPercentage(): number {
    const avgTime = this.getAverageTimePerQuestion();
    // Assuming 60 seconds per question is optimal
    return Math.min(100, Math.max(0, 100 - (avgTime - 60) / 60 * 100));
  }

  getQuestionStatusClass(questionId: string): string {
    const isCorrect = this.isQuestionCorrect(questionId);
    return isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getQuestionStatusText(questionId: string): string {
    const isCorrect = this.isQuestionCorrect(questionId);
    return isCorrect ? 'Đúng' : 'Sai';
  }

  isQuestionCorrect(questionId: string): boolean {
    const question = this.quizStateService.currentQuiz()?.questions.find(q => q.id === questionId);
    if (!question) return false;
    
    const userAnswer = this.quizStateService.getAnswer(questionId);
    return userAnswer === question.correctAnswer;
  }

  isOptionSelected(questionId: string, option: string): boolean {
    const userAnswer = this.quizStateService.getAnswer(questionId);
    return userAnswer === option;
  }

  isTrueFalseSelected(questionId: string, value: boolean): boolean {
    const userAnswer = this.quizStateService.getAnswer(questionId);
    return userAnswer === value;
  }

  getUserAnswer(questionId: string): string {
    return this.quizStateService.getAnswer(questionId) || '';
  }

  getOptionClass(question: any, option: string): string {
    const isCorrect = option === question.correctAnswer;
    const isSelected = this.isOptionSelected(question.id, option);
    
    if (isCorrect && isSelected) return 'border-green-500 bg-green-500';
    if (isCorrect) return 'border-green-500 bg-green-100';
    if (isSelected) return 'border-red-500 bg-red-500';
    return 'border-gray-800 bg-white';
  }

  getOptionTextClass(question: any, option: string): string {
    const isCorrect = option === question.correctAnswer;
    const isSelected = this.isOptionSelected(question.id, option);
    
    if (isCorrect && isSelected) return 'text-white font-medium';
    if (isCorrect) return 'text-green-800 font-medium';
    if (isSelected) return 'text-white font-medium';
    return 'text-gray-700';
  }

  getTrueFalseClass(question: any, value: boolean): string {
    const isCorrect = value === question.correctAnswer;
    const isSelected = this.isTrueFalseSelected(question.id, value);
    
    if (isCorrect && isSelected) return 'border-green-500 bg-green-500';
    if (isCorrect) return 'border-green-500 bg-green-100';
    if (isSelected) return 'border-red-500 bg-red-500';
    return 'border-gray-800 bg-white';
  }

  getTrueFalseTextClass(question: any, value: boolean): string {
    const isCorrect = value === question.correctAnswer;
    const isSelected = this.isTrueFalseSelected(question.id, value);
    
    if (isCorrect && isSelected) return 'text-white font-medium';
    if (isCorrect) return 'text-green-800 font-medium';
    if (isSelected) return 'text-white font-medium';
    return 'text-gray-700';
  }

  getFillBlankTextClass(question: any): string {
    const isCorrect = this.isQuestionCorrect(question.id);
    return isCorrect ? 'text-green-800' : 'text-red-800';
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDateTime(date: Date | undefined): string {
    if (!date) return 'N/A';
    
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  }
}
