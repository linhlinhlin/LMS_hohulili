import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TakeQuizUseCase } from '../../application/use-cases/take-quiz.use-case';
import { AuthService } from '../../../../../core/services/auth.service';
import { ErrorHandlingService } from '../../../../../shared/services/error-handling.service';

/**
 * Quiz Result Component - Shows quiz completion results
 */
@Component({
  selector: 'app-quiz-result',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if (isLoading()) {
          <div class="bg-white rounded-xl shadow-lg p-8 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Đang tải kết quả...</p>
          </div>
        } @else if (result()) {
          <div class="space-y-6">
            <!-- Result Header -->
            <div class="bg-white rounded-xl shadow-lg p-8 text-center">
              <div class="mb-6">
                @if (result()!.passed) {
                  <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <h1 class="text-3xl font-bold text-green-600 mb-2">Chúc mừng! Bạn đã đậu</h1>
                } @else {
                  <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <h1 class="text-3xl font-bold text-red-600 mb-2">Không đạt yêu cầu</h1>
                }
                <p class="text-lg text-gray-600">{{ result()!.quizTitle }}</p>
              </div>

              <!-- Score Display -->
              <div class="bg-gray-50 rounded-lg p-6 mb-6">
                <div class="text-6xl font-bold text-gray-900 mb-2">{{ result()!.score }}%</div>
                <div class="text-lg text-gray-600">
                  Điểm của bạn: {{ result()!.pointsEarned }}/{{ result()!.totalPoints }}
                </div>
                <div class="text-sm text-gray-500 mt-2">
                  Điểm đậu: {{ result()!.passingScore }}%
                </div>
              </div>

              <!-- Stats -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-600">{{ result()!.totalQuestions }}</div>
                  <div class="text-sm text-gray-600">Tổng câu hỏi</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">{{ result()!.correctAnswers }}</div>
                  <div class="text-sm text-gray-600">Đúng</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-red-600">{{ result()!.incorrectAnswers }}</div>
                  <div class="text-sm text-gray-600">Sai</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-600">{{ result()!.timeSpent }}</div>
                  <div class="text-sm text-gray-600">Thời gian</div>
                </div>
              </div>
            </div>

            <!-- Detailed Results -->
            @if (result()!.questionResults && result()!.questionResults.length > 0) {
              <div class="bg-white rounded-xl shadow-lg p-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Chi tiết kết quả</h2>
                <div class="space-y-4">
                  @for (questionResult of result()!.questionResults; track questionResult.questionId) {
                    <div class="border border-gray-200 rounded-lg p-4">
                      <div class="flex items-start justify-between mb-2">
                        <h3 class="text-lg font-medium text-gray-900 flex-1">{{ questionResult.questionText }}</h3>
                        <div class="ml-4">
                          @if (questionResult.isCorrect) {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                              </svg>
                              Đúng
                            </span>
                          } @else {
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                              </svg>
                              Sai
                            </span>
                          }
                        </div>
                      </div>

                      <div class="text-sm text-gray-600 mb-2">
                        <strong>Câu trả lời của bạn:</strong> {{ questionResult.userAnswer || 'Không trả lời' }}
                      </div>

                      @if (!questionResult.isCorrect) {
                        <div class="text-sm text-green-600">
                          <strong>Đáp án đúng:</strong> {{ questionResult.correctAnswer }}
                        </div>
                      }

                      @if (questionResult.points > 0) {
                        <div class="text-sm text-blue-600 mt-1">
                          <strong>Điểm:</strong> {{ questionResult.pointsEarned }}/{{ questionResult.points }}
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Actions -->
            <div class="bg-white rounded-xl shadow-lg p-8">
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  (click)="retakeQuiz()"
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Làm lại bài thi
                </button>
                <button
                  (click)="goToQuizList()"
                  class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  Danh sách Quiz
                </button>
                <button
                  (click)="goToDashboard()"
                  class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  Về Dashboard
                </button>
              </div>
            </div>
          </div>
        } @else {
          <div class="bg-white rounded-xl shadow-lg p-8 text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy kết quả</h2>
            <p class="text-gray-600 mb-6">Không thể tải kết quả bài thi. Vui lòng thử lại.</p>
            <button
              (click)="goToQuizList()"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Quay lại danh sách Quiz
            </button>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizResultComponent implements OnInit {
  private takeQuizUseCase = inject(TakeQuizUseCase);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private errorService = inject(ErrorHandlingService);

  result = signal<any>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    const attemptId = this.route.snapshot.queryParams['attemptId'];
    if (attemptId) {
      this.loadResult(attemptId);
    } else {
      this.errorService.addError({
        message: 'Không tìm thấy ID bài thi',
        type: 'error',
        context: 'quiz-result'
      });
      this.goToQuizList();
    }
  }

  private loadResult(attemptId: string): void {
    this.isLoading.set(true);

    // Mock result data - in real app this would come from the use case
    setTimeout(() => {
      const mockResult = {
        attemptId,
        quizTitle: 'Quiz Cơ bản về An toàn Thực phẩm',
        score: 85,
        pointsEarned: 17,
        totalPoints: 20,
        passingScore: 70,
        passed: true,
        totalQuestions: 10,
        correctAnswers: 8,
        incorrectAnswers: 2,
        timeSpent: '25:30',
        completedAt: new Date(),
        questionResults: [
          {
            questionId: 'q1',
            questionText: 'Thực phẩm nguy cơ cao bao gồm?',
            userAnswer: 'Thịt, sữa, trứng',
            correctAnswer: 'Thịt, sữa, trứng',
            isCorrect: true,
            points: 2,
            pointsEarned: 2
          },
          {
            questionId: 'q2',
            questionText: 'Nhiệt độ bảo quản lạnh đúng là?',
            userAnswer: '10°C',
            correctAnswer: '4°C',
            isCorrect: false,
            points: 2,
            pointsEarned: 0
          }
          // Add more mock results as needed
        ]
      };

      this.result.set(mockResult);
      this.isLoading.set(false);
    }, 1000);
  }

  retakeQuiz(): void {
    // Navigate back to quiz attempt - in real app would create new attempt
    this.router.navigate(['/learn/quiz']);
  }

  goToQuizList(): void {
    this.router.navigate(['/learn/quiz']);
  }

  goToDashboard(): void {
    this.router.navigate(['/student/dashboard']);
  }
}