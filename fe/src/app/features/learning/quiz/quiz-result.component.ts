import { Component, signal, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorHandlingService } from '../../../shared/services/error-handling.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  isPassed: boolean;
  timeSpent: number; // in minutes
  completedAt: Date;
  answers: QuizAnswerResult[];
}

interface QuizAnswerResult {
  questionId: string;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  explanation?: string;
}

@Component({
  selector: 'app-quiz-result',
  imports: [CommonModule, RouterModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải kết quả quiz..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>

    <div class="bg-gray-50 min-h-screen">
      <!-- Result Header -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="text-center">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Kết quả Quiz</h1>
            <p class="text-lg text-gray-600">{{ quizTitle() }}</p>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Score Summary -->
        <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div class="text-center">
            <!-- Score Circle -->
            <div class="relative inline-flex items-center justify-center w-32 h-32 mb-6">
              <svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <!-- Background circle -->
                <circle cx="50" cy="50" r="40" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                <!-- Progress circle -->
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="currentColor" 
                  stroke-width="8" 
                  fill="none"
                  [class]="getScoreColorClass()"
                  [style.stroke-dasharray]="getScoreDashArray()"
                  [style.stroke-dashoffset]="getScoreDashOffset()"
                  stroke-linecap="round">
                </circle>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                  <div class="text-3xl font-bold" [class]="getScoreColorClass()">{{ quizResult()?.percentage }}%</div>
                  <div class="text-sm text-gray-600">{{ quizResult()?.score }}/{{ quizResult()?.totalPoints }}</div>
                </div>
              </div>
            </div>

            <!-- Result Status -->
            <div class="mb-6">
              @if (quizResult()?.isPassed) {
                <div class="inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-semibold">
                  <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  Đã đậu
                </div>
              } @else {
                <div class="inline-flex items-center px-6 py-3 bg-red-100 text-red-800 rounded-full text-lg font-semibold">
                  <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                  Chưa đậu
                </div>
              }
            </div>

            <!-- Quiz Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-900">{{ quizResult()?.timeSpent }} phút</div>
                <div class="text-sm text-gray-600">Thời gian làm bài</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-900">{{ correctAnswersCount() }}</div>
                <div class="text-sm text-gray-600">Câu trả lời đúng</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-gray-900">{{ totalQuestions() }}</div>
                <div class="text-sm text-gray-600">Tổng số câu hỏi</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Results -->
        <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 class="text-xl font-semibold text-gray-900 mb-6">Chi tiết câu trả lời</h2>
          <div class="space-y-6">
            @for (answer of quizResult()?.answers; track answer.questionId) {
              <div class="border border-gray-200 rounded-lg p-6">
                <div class="flex items-start justify-between mb-4">
                  <h3 class="text-lg font-medium text-gray-900">{{ answer.question }}</h3>
                  <div class="flex items-center space-x-2">
                    @if (answer.isCorrect) {
                      <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        +{{ answer.points }} điểm
                      </span>
                    } @else {
                      <span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        0 điểm
                      </span>
                    }
                  </div>
                </div>

                <div class="space-y-3">
                  <!-- Student Answer -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Câu trả lời của bạn:</label>
                    <div class="p-3 bg-gray-50 rounded-lg">
                      <span [class]="answer.isCorrect ? 'text-green-800' : 'text-red-800'">
                        {{ answer.studentAnswer }}
                      </span>
                    </div>
                  </div>

                  <!-- Correct Answer -->
                  @if (!answer.isCorrect) {
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Đáp án đúng:</label>
                      <div class="p-3 bg-green-50 rounded-lg">
                        <span class="text-green-800">{{ answer.correctAnswer }}</span>
                      </div>
                    </div>
                  }

                  <!-- Explanation -->
                  @if (answer.explanation) {
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Giải thích:</label>
                      <div class="p-3 bg-blue-50 rounded-lg">
                        <span class="text-blue-800">{{ answer.explanation }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-center space-x-4">
          <button 
            (click)="retakeQuiz()"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
            </svg>
            Làm lại
          </button>
          
          <button 
            (click)="goToQuizList()"
            class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
            </svg>
            Về danh sách quiz
          </button>

          <button 
            (click)="downloadCertificate()"
            [disabled]="!quizResult()?.isPassed"
            class="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
            <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
            </svg>
            Tải chứng chỉ
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizResultComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private errorService = inject(ErrorHandlingService);

  // Signals
  isLoading = signal<boolean>(true);
  quizResult = signal<QuizResult | null>(null);
  quizTitle = signal<string>('');

  ngOnInit(): void {
    this.loadQuizResult();
  }

  private async loadQuizResult(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Get quiz ID from route
      const quizId = this.route.snapshot.paramMap.get('id');
      if (!quizId) {
        throw new Error('Quiz ID not found');
      }

      // Simulate loading quiz result
      await this.simulateResultLoading(quizId);
      
      console.log('🔧 Quiz Result - Result loaded successfully');
      this.errorService.showSuccess('Kết quả quiz đã được tải thành công!', 'quiz');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'quiz');
      this.router.navigate(['/student/quiz']).catch(() => {});
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateResultLoading(quizId: string): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock quiz result data
    const mockResult: QuizResult = {
      id: 'result-1',
      quizId: quizId,
      studentId: 'student-1',
      score: 85,
      totalPoints: 100,
      percentage: 85,
      isPassed: true,
      timeSpent: 25,
      completedAt: new Date(),
      answers: [
        {
          questionId: '1',
          question: 'Tàu container có những đặc điểm chính nào?',
          studentAnswer: 'Tất cả các đáp án trên',
          correctAnswer: 'Tất cả các đáp án trên',
          isCorrect: true,
          points: 20,
          explanation: 'Tàu container có tất cả các đặc điểm trên.'
        },
        {
          questionId: '2',
          question: 'Hệ thống động lực chính của tàu biển thường sử dụng động cơ diesel.',
          studentAnswer: 'true',
          correctAnswer: 'true',
          isCorrect: true,
          points: 15,
          explanation: 'Đúng, hầu hết tàu biển hiện đại sử dụng động cơ diesel.'
        },
        {
          questionId: '3',
          question: 'Mô tả ngắn gọn về quy trình bảo trì định kỳ của tàu biển.',
          studentAnswer: 'Bảo trì định kỳ bao gồm kiểm tra, sửa chữa và thay thế các bộ phận.',
          correctAnswer: 'Quy trình bảo trì bao gồm kiểm tra, sửa chữa và thay thế các bộ phận.',
          isCorrect: true,
          points: 25,
          explanation: 'Quy trình bảo trì bao gồm kiểm tra, sửa chữa và thay thế các bộ phận.'
        },
        {
          questionId: '4',
          question: 'Phân tích tầm quan trọng của việc tuân thủ các quy định an toàn hàng hải quốc tế.',
          studentAnswer: 'Việc tuân thủ quy định an toàn rất quan trọng để đảm bảo tính mạng và tài sản.',
          correctAnswer: 'Việc tuân thủ quy định an toàn đảm bảo tính mạng và tài sản.',
          isCorrect: true,
          points: 40,
          explanation: 'Việc tuân thủ quy định an toàn đảm bảo tính mạng và tài sản.'
        }
      ]
    };

    this.quizResult.set(mockResult);
    this.quizTitle.set('Quiz Kỹ thuật Tàu biển - Chương 1');
  }

  getScoreColorClass(): string {
    const percentage = this.quizResult()?.percentage || 0;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getScoreDashArray(): string {
    const circumference = 2 * Math.PI * 40; // radius = 40
    return `${circumference}`;
  }

  getScoreDashOffset(): string {
    const percentage = this.quizResult()?.percentage || 0;
    const circumference = 2 * Math.PI * 40; // radius = 40
    const offset = circumference - (percentage / 100) * circumference;
    return `${offset}`;
  }

  correctAnswersCount(): number {
    const answers = this.quizResult()?.answers || [];
    return answers.filter(answer => answer.isCorrect).length;
  }

  totalQuestions(): number {
    return this.quizResult()?.answers.length || 0;
  }

  retakeQuiz(): void {
    const quizId = this.route.snapshot.paramMap.get('id');
    if (quizId) {
      this.router.navigate(['/student/quiz/take', quizId]).catch(error => {
        this.errorService.handleNavigationError(error, `/student/quiz/take/${quizId}`);
      });
    }
  }

  goToQuizList(): void {
    this.router.navigate(['/student/quiz']).catch(error => {
      this.errorService.handleNavigationError(error, '/student/quiz');
    });
  }

  downloadCertificate(): void {
    if (this.quizResult()?.isPassed) {
      // Simulate certificate download
      const link = document.createElement('a');
      link.href = `/certificates/quiz-${this.quizResult()?.quizId}.pdf`;
      link.download = `quiz-certificate-${this.quizResult()?.quizId}.pdf`;
      link.click();
      this.errorService.showSuccess('Chứng chỉ đang được tải xuống', 'certificate');
    } else {
      this.errorService.showWarning('Bạn cần đậu quiz để tải chứng chỉ', 'certificate');
    }
  }
}
