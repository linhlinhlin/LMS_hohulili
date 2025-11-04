import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface QuizResult {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  percentage: number;
  isPassed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  submittedAt: Date;
  showCorrectAnswers: boolean;
  questions: QuizResultQuestion[];
}

interface QuizResultQuestion {
  id: string;
  content: string;
  selectedOption?: string;
  correctOption: string;
  isCorrect: boolean;
  options: QuizResultOption[];
  explanation?: string;
}

interface QuizResultOption {
  key: string;
  content: string;
}

@Component({
  selector: 'app-quiz-results',
  imports: [CommonModule, RouterModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading
      [show]="isLoading()"
      text="Đang tải kết quả..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    @if (result(); as resultData) {
      <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
        <div class="max-w-4xl mx-auto px-6 py-8">
          <!-- Header -->
          <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-2xl font-bold text-gray-900 mb-2">Kết quả Quiz</h1>
                <p class="text-gray-600">{{ resultData.quizTitle }}</p>
              </div>
              <button routerLink="/student/courses"
                      class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                ← Quay lại khóa học
              </button>
            </div>
          </div>

          <!-- Score Overview -->
          <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div class="text-center">
              <div class="mb-6">
                <div class="inline-flex items-center justify-center w-24 h-24 rounded-full"
                     [class]="resultData.isPassed ? 'bg-green-100' : 'bg-red-100'">
                  <svg class="w-12 h-12" [class]="resultData.isPassed ? 'text-green-600' : 'text-red-600'"
                       fill="currentColor" viewBox="0 0 20 20">
                    @if (resultData.isPassed) {
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    } @else {
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    }
                  </svg>
                </div>
                <h2 class="text-3xl font-bold text-gray-900 mt-4">
                  {{ resultData.percentage.toFixed(1) }}%
                </h2>
                <p class="text-gray-600 mt-2">
                  {{ resultData.correctAnswers }}/{{ resultData.totalQuestions }} câu đúng
                </p>
                <div class="mt-4">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                        [class]="resultData.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                    @if (resultData.isPassed) {
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                      </svg>
                      Đạt
                    } @else {
                      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                      Chưa đạt
                    }
                  </span>
                </div>
              </div>

              <!-- Stats -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div class="bg-gray-50 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-gray-900">{{ formatTime(resultData.timeSpent) }}</div>
                  <div class="text-sm text-gray-600">Thời gian làm bài</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-gray-900">{{ resultData.correctAnswers }}</div>
                  <div class="text-sm text-gray-600">Câu đúng</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 text-center">
                  <div class="text-2xl font-bold text-gray-900">{{ resultData.totalQuestions - resultData.correctAnswers }}</div>
                  <div class="text-sm text-gray-600">Câu sai</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Questions Review -->
          @if (resultData.showCorrectAnswers) {
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-6">Xem lại câu hỏi</h2>

              <div class="space-y-6">
                @for (question of resultData.questions; track question.id; let i = $index) {
                  <div class="border border-gray-200 rounded-lg p-6">
                    <div class="flex items-start justify-between mb-4">
                      <h3 class="text-lg font-semibold text-gray-900">
                        Câu {{ i + 1 }}
                        @if (question.isCorrect) {
                          <span class="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            Đúng
                          </span>
                        } @else {
                          <span class="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                            Sai
                          </span>
                        }
                      </h3>
                    </div>

                    <div class="mb-4">
                      <p class="text-gray-800">{{ question.content }}</p>
                    </div>

                    <!-- Options -->
                    <div class="space-y-2 mb-4">
                      @for (option of question.options; track option.key) {
                        <div class="flex items-center space-x-3 p-3 rounded-lg"
                             [class]="getOptionClass(option.key, question)">
                          <span class="font-medium text-gray-600">{{ option.key }}.</span>
                          <span class="text-gray-900">{{ option.content }}</span>
                          @if (option.key === question.correctOption) {
                            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                          }
                          @if (option.key === question.selectedOption && option.key !== question.correctOption) {
                            <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                          }
                        </div>
                      }
                    </div>

                    <!-- Explanation -->
                    @if (question.explanation) {
                      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div class="flex items-start space-x-2">
                          <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                          </svg>
                          <div>
                            <h4 class="text-sm font-medium text-blue-900">Giải thích</h4>
                            <p class="text-sm text-blue-800 mt-1">{{ question.explanation }}</p>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizResultsComponent implements OnInit {
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  isLoading = signal(true);
  result = signal<QuizResult | null>(null);

  ngOnInit(): void {
    this.loadResults();
  }

  private async loadResults(): Promise<void> {
    try {
      const attemptId = this.route.snapshot.paramMap.get('attemptId');
      if (!attemptId) {
        this.router.navigate(['/student/courses']);
        return;
      }

      // TODO: Load results from API
      // For now, mock data
      const mockResult: QuizResult = {
        attemptId,
        quizId: 'quiz1',
        quizTitle: 'Quiz An toàn Hàng hải Cơ bản',
        score: 85,
        percentage: 85.0,
        isPassed: true,
        totalQuestions: 2,
        correctAnswers: 1,
        timeSpent: 15 * 60, // 15 minutes
        submittedAt: new Date(),
        showCorrectAnswers: true,
        questions: [
          {
            id: 'q1',
            content: 'An toàn hàng hải là gì?',
            selectedOption: 'A',
            correctOption: 'A',
            isCorrect: true,
            options: [
              { key: 'A', content: 'Bộ quy tắc đảm bảo an toàn cho tàu biển và thủy thủ' },
              { key: 'B', content: 'Công việc sửa chữa tàu biển' },
              { key: 'C', content: 'Thiết kế tàu biển' },
              { key: 'D', content: 'Điều khiển tàu biển' }
            ],
            explanation: 'An toàn hàng hải bao gồm tất cả các quy định và thực hành nhằm đảm bảo an toàn cho tàu biển, thủy thủ và môi trường biển.'
          },
          {
            id: 'q2',
            content: 'SOLAS là viết tắt của gì?',
            selectedOption: 'A',
            correctOption: 'B',
            isCorrect: false,
            options: [
              { key: 'A', content: 'Safety Of Life At Sea' },
              { key: 'B', content: 'Safety Of Life At Sea' },
              { key: 'C', content: 'Ship Operation And Loading Standard' },
              { key: 'D', content: 'Sea Operations And Logistics Agreement' }
            ],
            explanation: 'SOLAS (Safety Of Life At Sea) là Công ước Quốc tế về An toàn Sinh mạng trên Biển.'
          }
        ]
      };

      this.result.set(mockResult);

    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getOptionClass(optionKey: string, question: QuizResultQuestion): string {
    if (optionKey === question.correctOption) {
      return 'bg-green-100 border-green-300';
    } else if (optionKey === question.selectedOption && optionKey !== question.correctOption) {
      return 'bg-red-100 border-red-300';
    } else {
      return 'bg-gray-50';
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}