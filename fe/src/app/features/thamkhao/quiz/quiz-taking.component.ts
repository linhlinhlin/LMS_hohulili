import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TeacherService } from '../services/teacher.service';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

interface QuizQuestion {
  id: string;
  questionId: string;
  content: string;
  options: QuizOption[];
  selectedOption?: string;
}

interface QuizOption {
  key: string;
  content: string;
  displayOrder: number;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  questions: QuizQuestion[];
  timeLimit?: number; // in minutes
  timeRemaining: number; // in seconds
  startTime: Date;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

@Component({
  selector: 'app-quiz-taking',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading
      [show]="isLoading()"
      text="Đang tải quiz..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>

    @if (attempt(); as attemptData) {
      <div class="bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 min-h-screen">
        <div class="max-w-4xl mx-auto px-6 py-8">
          <!-- Header -->
          <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h1 class="text-2xl font-bold text-gray-900 mb-2">{{ quizTitle() }}</h1>
                <div class="flex items-center space-x-6 text-sm text-gray-600">
                  <span>Câu hỏi: {{ currentQuestionIndex() + 1 }}/{{ attemptData.questions.length }}</span>
                  @if (attemptData.timeLimit) {
                    <div class="flex items-center space-x-2">
                      <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clip-rule="evenodd"></path>
                      </svg>
                      <span class="font-mono text-red-600">{{ formatTime(timeRemaining()) }}</span>
                    </div>
                  }
                  <div class="flex items-center space-x-1">
                    @for (i of attemptData.questions; track $index) {
                      <button
                        (click)="goToQuestion($index)"
                        [class]="getQuestionButtonClass($index)"
                        class="w-8 h-8 rounded-full text-xs font-medium transition-colors">
                        {{ $index + 1 }}
                      </button>
                    }
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-3">
                <button
                  (click)="saveProgress()"
                  class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                  Lưu tạm
                </button>
                <button
                  (click)="submitQuiz()"
                  [disabled]="!canSubmit()"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Nộp bài
                </button>
              </div>
            </div>
          </div>

          <!-- Question Content -->
          @if (currentQuestion(); as question) {
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div class="mb-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">
                  Câu hỏi {{ currentQuestionIndex() + 1 }}
                </h2>
                <p class="text-gray-800 text-lg leading-relaxed">{{ question.content }}</p>
              </div>

              <!-- Options -->
              <div class="space-y-3">
                @for (option of question.options; track option.key) {
                  <label class="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      [name]="'question_' + question.id"
                      [value]="option.key"
                      [(ngModel)]="question.selectedOption"
                      (change)="onOptionSelected(question.id, option.key)"
                      class="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300">
                    <span class="text-gray-900">{{ option.key }}. {{ option.content }}</span>
                  </label>
                }
              </div>
            </div>
          }

          <!-- Navigation -->
          <div class="flex items-center justify-between">
            <button
              (click)="previousQuestion()"
              [disabled]="currentQuestionIndex() === 0"
              class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              ← Câu trước
            </button>

            @if (currentQuestionIndex() < attemptData.questions.length - 1) {
              <button
                (click)="nextQuestion()"
                class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Câu tiếp →
              </button>
            } @else {
              <button
                (click)="submitQuiz()"
                [disabled]="!canSubmit()"
                class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Hoàn thành
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizTakingComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private teacherService = inject(TeacherService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  isLoading = signal(true);
  attempt = signal<QuizAttempt | null>(null);
  currentQuestionIndex = signal(0);
  timeRemaining = signal(0);
  quizTitle = signal('');
  private timer: any;

  // Computed
  currentQuestion = computed(() => {
    const attemptData = this.attempt();
    if (!attemptData) return null;
    return attemptData.questions[this.currentQuestionIndex()] || null;
  });

  canSubmit = computed(() => {
    const attemptData = this.attempt();
    if (!attemptData) return false;
    return attemptData.questions.every(q => q.selectedOption);
  });

  ngOnInit(): void {
    this.loadQuiz();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async loadQuiz(): Promise<void> {
    try {
      const lessonId = this.route.snapshot.paramMap.get('lessonId');
      if (!lessonId) {
        this.router.navigate(['/student/courses']);
        return;
      }

      // TODO: Load quiz attempt from API
      // For now, mock data
      const mockAttempt: QuizAttempt = {
        id: 'attempt1',
        quizId: 'quiz1',
        timeLimit: 30, // 30 minutes
        timeRemaining: 30 * 60, // 30 minutes in seconds
        startTime: new Date(),
        shuffleQuestions: true,
        shuffleOptions: false,
        questions: [
          {
            id: 'q1',
            questionId: 'question1',
            content: 'An toàn hàng hải là gì?',
            selectedOption: undefined,
            options: [
              { key: 'A', content: 'Bộ quy tắc đảm bảo an toàn cho tàu biển và thủy thủ', displayOrder: 0 },
              { key: 'B', content: 'Công việc sửa chữa tàu biển', displayOrder: 1 },
              { key: 'C', content: 'Thiết kế tàu biển', displayOrder: 2 },
              { key: 'D', content: 'Điều khiển tàu biển', displayOrder: 3 }
            ]
          },
          {
            id: 'q2',
            questionId: 'question2',
            content: 'SOLAS là viết tắt của gì?',
            selectedOption: undefined,
            options: [
              { key: 'A', content: 'Safety Of Life At Sea', displayOrder: 0 },
              { key: 'B', content: 'Safety Of Life At Sea', displayOrder: 1 },
              { key: 'C', content: 'Ship Operation And Loading Standard', displayOrder: 2 },
              { key: 'D', content: 'Sea Operations And Logistics Agreement', displayOrder: 3 }
            ]
          }
        ]
      };

      this.attempt.set(mockAttempt);
      this.timeRemaining.set(mockAttempt.timeRemaining);
      this.quizTitle.set('Quiz An toàn Hàng hải Cơ bản');

      // Start timer if time limit exists
      if (mockAttempt.timeLimit) {
        this.startTimer();
      }

    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      this.timeRemaining.update(remaining => {
        if (remaining <= 1) {
          this.submitQuiz();
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < (this.attempt()?.questions.length || 0)) {
      this.currentQuestionIndex.set(index);
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(index => index - 1);
    }
  }

  nextQuestion(): void {
    const attemptData = this.attempt();
    if (attemptData && this.currentQuestionIndex() < attemptData.questions.length - 1) {
      this.currentQuestionIndex.update(index => index + 1);
    }
  }

  onOptionSelected(questionId: string, optionKey: string): void {
    const attemptData = this.attempt();
    if (attemptData) {
      const updatedQuestions = attemptData.questions.map(q =>
        q.id === questionId ? { ...q, selectedOption: optionKey } : q
      );
      this.attempt.update(attempt => attempt ? { ...attempt, questions: updatedQuestions } : null);
    }
  }

  saveProgress(): void {
    // TODO: Save progress to server
    console.log('Saving progress...');
  }

  async submitQuiz(): Promise<void> {
    if (!this.canSubmit()) {
      if (!confirm('Bạn chưa trả lời hết các câu hỏi. Bạn có muốn nộp bài không?')) {
        return;
      }
    }

    try {
      // TODO: Submit quiz to server
      const attemptData = this.attempt();
      if (attemptData) {
        const answers = attemptData.questions.map(q => ({
          questionId: q.questionId,
          selectedOption: q.selectedOption || ''
        }));

        console.log('Submitting quiz:', { attemptId: attemptData.id, answers });

        // Navigate to results
        this.router.navigate(['/student/quiz/result', attemptData.id]);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  }

  getQuestionButtonClass(index: number): string {
    const attemptData = this.attempt();
    if (!attemptData) return 'bg-gray-100 text-gray-600';

    const question = attemptData.questions[index];
    const isCurrent = index === this.currentQuestionIndex();
    const isAnswered = question.selectedOption;

    if (isCurrent) {
      return 'bg-purple-600 text-white';
    } else if (isAnswered) {
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    } else {
      return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}