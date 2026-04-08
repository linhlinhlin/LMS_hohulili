import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { TakeQuizUseCase } from '../../application/use-cases/take-quiz.use-case';
import { ErrorHandlingService } from '../../../../../shared/services/error-handling.service';
import { QuizApi } from '../../../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';

interface QuizQuestionResult {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean | null | undefined;
  points: number;
  pointsEarned: number | null | undefined;
}

interface QuizResultData {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  scorePercent: number;
  passingScore: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: string;
  completedAt: string;
  showCorrectAnswers: boolean;
  pendingReview: boolean;
  questionResults: QuizQuestionResult[];
  maxAttempts: number | null;
  attemptCount: number;
  canRetake: boolean;
}

@Component({
  selector: 'app-quiz-result',
  imports: [RouterModule],
  template: `
    <div class="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <!-- Breadcrumb — navigation context -->
      <nav class="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <a routerLink="/student/tasks" [queryParams]="{tab: 'quizzes'}" class="hover:text-[#0056D2] transition-colors">Bài cần làm</a>
        <svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
        <span class="text-gray-900 font-medium truncate">{{ result()?.quizTitle || 'Kết quả bài kiểm tra' }}</span>
      </nav>

      @if (isLoading()) {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div class="lg:col-span-4 xl:col-span-3">
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-5 animate-pulse">
              <div class="h-4 w-24 bg-gray-200 rounded mb-3"></div>
              <div class="h-3 w-40 bg-gray-100 rounded mb-6"></div>
              <div class="h-8 w-20 bg-gray-200 rounded mb-3"></div>
              <div class="h-2 w-full bg-gray-100 rounded-full mb-4"></div>
              <div class="flex justify-between">
                <div class="h-3 w-12 bg-gray-100 rounded"></div>
                <div class="h-3 w-12 bg-gray-100 rounded"></div>
                <div class="h-3 w-12 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
          <div class="lg:col-span-8 xl:col-span-9">
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm animate-pulse">
              <div class="px-5 py-3 border-b border-gray-100 flex justify-between">
                <div class="h-4 w-28 bg-gray-200 rounded"></div>
                <div class="h-3 w-20 bg-gray-100 rounded"></div>
              </div>
              @for (i of [1,2,3,4]; track i) {
                <div class="px-5 py-3 border-b border-gray-50 flex gap-3">
                  <div class="h-4 w-5 bg-gray-100 rounded"></div>
                  <div class="flex-1 space-y-1.5">
                    <div class="h-3.5 w-4/5 bg-gray-200 rounded"></div>
                    <div class="h-3 w-1/3 bg-gray-100 rounded"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else if (result()) {

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          <!-- LEFT: Score Summary (sticky) -->
          <div class="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6">
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm">

              <!-- Status Badge + Title -->
              <div class="px-5 pt-5 pb-4">
                <div class="mb-3">
                  @if (result()!.pendingReview) {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                      </svg>
                      Chưa công bố điểm
                    </span>
                  } @else if (result()!.passed) {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      </svg>
                      Đạt yêu cầu
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 102 0V5zm-1 8a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/>
                      </svg>
                      Chưa đạt
                    </span>
                  }
                </div>
                <h1 class="text-sm font-medium text-gray-900 leading-snug">{{ result()!.quizTitle }}</h1>
              </div>

              <!-- Score -->
              <div class="px-5 pb-4">
                @if (result()!.pendingReview) {
                  <p class="text-sm text-gray-500 py-3">Giáo viên chưa công bố điểm. Bạn sẽ thấy kết quả khi giáo viên mở công bố.</p>
                } @else {
                <div class="flex items-baseline gap-1 mb-3">
                  <span class="text-3xl font-bold text-gray-900 tabular-nums">{{ result()!.score }}</span>
                  <span class="text-sm text-gray-400">/{{ result()!.maxScore }}</span>
                  <span class="ml-auto text-sm font-medium tabular-nums"
                    [class.text-green-600]="result()!.passed"
                    [class.text-red-500]="!result()!.passed">{{ result()!.scorePercent }}%</span>
                </div>

                <!-- Progress bar -->
                <div class="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700 ease-out"
                    [class.bg-green-500]="result()!.passed"
                    [class.bg-red-400]="!result()!.passed"
                    [style.width.%]="result()!.scorePercent"></div>
                </div>
                @if (result()!.passingScore > 0 && result()!.passingScore < 100) {
                  <div class="relative h-0">
                    <div class="absolute -top-2 h-2 w-px bg-gray-800/40"
                      [style.left.%]="result()!.passingScore"></div>
                  </div>
                  <p class="text-[10px] text-gray-400 mt-1.5 text-right">Cần ≥{{ result()!.passingScore }}%</p>
                }
              }
              </div>

              <!-- Compact Stats Row -->
              @if (!result()!.pendingReview) {
              <div class="mx-5 mb-4 flex items-center justify-between py-2.5 px-3.5 bg-slate-50 rounded-lg text-xs">
                <div class="text-center">
                  <span class="font-semibold text-green-600">{{ result()!.correctAnswers }}</span>
                  <span class="text-gray-400 ml-0.5">đúng</span>
                </div>
                <div class="w-px h-3 bg-gray-200"></div>
                <div class="text-center">
                  <span class="font-semibold text-red-500">{{ result()!.incorrectAnswers }}</span>
                  <span class="text-gray-400 ml-0.5">sai</span>
                </div>
                <div class="w-px h-3 bg-gray-200"></div>
                <div class="text-center">
                  <span class="font-semibold text-gray-700">{{ result()!.timeSpent }}</span>
                </div>
              </div>
              }

              <!-- Timestamp -->
              <div class="px-5 pb-3">
                <p class="text-xs text-gray-400">{{ result()!.completedAt }}</p>
              </div>

              <!-- Actions -->
              <div class="px-5 py-3 border-t border-gray-100 space-y-2">
                @if (result()!.quizId && result()!.canRetake) {
                  <button (click)="retakeQuiz()"
                    class="w-full px-4 py-2.5 bg-[#0056D2] text-white text-sm font-medium rounded-lg hover:bg-[#004BB5] transition-colors">
                    Làm lại bài kiểm tra
                  </button>
                  @if (result()!.maxAttempts) {
                    <p class="text-xs text-gray-400 text-center">Còn {{ result()!.maxAttempts! - result()!.attemptCount }} / {{ result()!.maxAttempts }} lượt</p>
                  }
                } @else if (result()!.quizId && !result()!.canRetake) {
                  <div class="text-center py-1">
                    <p class="text-xs text-gray-500">Đã sử dụng hết {{ result()!.maxAttempts }} lượt làm bài</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- RIGHT: Question Breakdown -->
          <div class="lg:col-span-8 xl:col-span-9">
            @if (result()!.showCorrectAnswers && result()!.questionResults.length > 0) {
              <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
                <!-- Header -->
                <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 class="text-sm font-semibold text-gray-900">Chi tiết từng câu</h2>
                  <span class="text-xs text-gray-400 tabular-nums">
                    {{ result()!.correctAnswers }}/{{ result()!.totalQuestions }} đúng · {{ result()!.scorePercent }}%
                  </span>
                </div>

                <!-- Question Rows -->
                @for (q of result()!.questionResults; track q.questionId; let i = $index) {
                  <div class="flex items-start gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/60 transition-colors">

                    <!-- Number -->
                    <span class="flex-shrink-0 w-5 text-right text-xs text-gray-400 pt-0.5 tabular-nums">{{ i + 1 }}</span>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <p class="text-[13px] text-gray-800 leading-relaxed line-clamp-2">{{ q.questionText || 'Câu hỏi ' + (i + 1) }}</p>
                      <div class="flex items-center gap-2 mt-1 text-xs">
                        <span class="text-gray-400">Chọn:</span>
                        <span class="font-medium"
                          [class.text-green-600]="q.isCorrect === true"
                          [class.text-red-500]="q.isCorrect === false"
                          [class.text-gray-600]="q.isCorrect === null || q.isCorrect === undefined">
                          {{ q.userAnswer || '—' }}
                        </span>
                        @if (q.isCorrect === false && q.correctAnswer) {
                          <svg class="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/>
                          </svg>
                          <span class="font-medium text-green-600">{{ q.correctAnswer }}</span>
                        }
                      </div>
                    </div>

                    <!-- Points -->
                    @if (q.points > 0) {
                      <span class="flex-shrink-0 text-xs text-gray-400 tabular-nums pt-0.5">
                        {{ q.pointsEarned ?? 0 }}/{{ q.points }}
                      </span>
                    }
                  </div>
                }

              </div>
            } @else if (!result()!.showCorrectAnswers) {
              <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <svg class="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/>
                </svg>
                <p class="text-sm text-gray-500">Đáp án không được hiển thị cho bài kiểm tra này.</p>
                <p class="text-xs text-gray-400 mt-1">Giáo viên đã tắt tính năng xem lại đáp án.</p>
              </div>
            } @else {
              <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                <p class="text-sm text-gray-400">Không có dữ liệu chi tiết.</p>
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- Error -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center max-w-md mx-auto">
          <div class="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 102 0V5zm-1 8a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/>
            </svg>
          </div>
          <h2 class="text-base font-semibold text-gray-900 mb-1">Không tìm thấy kết quả</h2>
          <p class="text-sm text-gray-500 mb-5">{{ error() || 'Không thể tải kết quả bài kiểm tra.' }}</p>
          <div class="flex gap-3 justify-center">
            @if (currentAttemptId) {
              <button (click)="retryLoad()"
                class="px-5 py-2 bg-[#0056D2] text-white text-sm font-medium rounded-lg hover:bg-[#004BB5] transition-colors">
                Thử lại
              </button>
            }
            <button (click)="goToQuizList()"
              class="px-5 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Quay lại
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizResultComponent implements OnInit {
  private takeQuizUseCase = inject(TakeQuizUseCase);
  private quizApi = inject(QuizApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private errorService = inject(ErrorHandlingService);

  result = signal<QuizResultData | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  currentAttemptId = '';
  private returnUrl = '/student/tasks';

  // Progressive disclosure
  displayLimit = signal(10);

  visibleQuestions = computed(() => {
    const r = this.result();
    if (!r) return [];
    return r.questionResults.slice(0, this.displayLimit());
  });

  hasMoreQuestions = computed(() => {
    const r = this.result();
    if (!r) return false;
    return r.questionResults.length > this.displayLimit();
  });

  remainingCount = computed(() => {
    const r = this.result();
    if (!r) return 0;
    return Math.max(0, r.questionResults.length - this.displayLimit());
  });

  showMore(): void {
    this.displayLimit.update(v => v + 10);
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const attemptId = params['attemptId'];
    this.returnUrl = params['returnUrl'] || '/student/tasks';
    if (attemptId) {
      this.currentAttemptId = attemptId;
      this.loadResult(attemptId);
    } else {
      this.errorService.addError({
        message: 'Không tìm thấy ID bài kiểm tra',
        type: 'error',
        context: 'quiz-result'
      });
      this.goToQuizList();
    }
  }

  retryLoad(): void {
    if (this.currentAttemptId) {
      this.error.set(null);
      this.loadResult(this.currentAttemptId);
    }
  }

  private async loadResult(attemptId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.displayLimit.set(10);

    try {
      const response = await firstValueFrom(this.quizApi.getQuizResult(attemptId));
      const data = (response as any)?.data || response;
      if (!data) {
        this.result.set(null);
        return;
      }

      const items: any[] = data.items || data.resultItems || [];
      const totalQuestions = data.totalQuestions || items.length;
      const correctAnswers = data.correctAnswers ?? items.filter((i: any) => i.isCorrect === true).length;
      const incorrectAnswers = data.incorrectAnswers ?? (totalQuestions - correctAnswers);

      const pendingReview = data.score === null || data.score === undefined;
      const score = data.score ?? 0;
      const maxScore = data.maxScore ?? data.maxScoreScale ?? totalQuestions;
      const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      const passingScore = data.passingScore ?? 60;

      let timeSeconds = data.timeSpentSeconds || 0;
      if (!timeSeconds && data.startTime && data.endTime) {
        timeSeconds = Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 1000);
      }
      const minutes = Math.floor(timeSeconds / 60);
      const seconds = timeSeconds % 60;

      const completedDate = data.endTime ? new Date(data.endTime) : new Date();
      const completedAt = completedDate.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const maxAttempts = data.maxAttempts ?? null;
      const attemptCount = data.attemptCount ?? data.attemptNumber ?? 1;
      // Only allow retake when we KNOW there are remaining attempts
      // When maxAttempts is unknown (null), don't assume retakeable
      const canRetake = maxAttempts != null && maxAttempts > 0 && attemptCount < maxAttempts;

      this.result.set({
        attemptId: data.attemptId || data.id || attemptId,
        quizId: data.quizId || '',
        quizTitle: data.quizTitle || 'Bài kiểm tra',
        score: Math.round(score * 100) / 100,
        maxScore: Math.round(maxScore * 100) / 100,
        scorePercent,
        passingScore,
        passed: pendingReview ? false : (data.isPassed ?? scorePercent >= passingScore),
        pendingReview,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        timeSpent: `${minutes}:${String(seconds).padStart(2, '0')}`,
        completedAt,
        showCorrectAnswers: data.showCorrectAnswers ?? true,
        maxAttempts,
        attemptCount,
        canRetake,
        questionResults: items.map((item: any) => ({
          questionId: item.questionId,
          questionText: item.questionContent || '',
          userAnswer: item.selectedOption || '',
          correctAnswer: item.correctOption || '',
          isCorrect: item.isCorrect,
          points: item.maxPoints || 1,
          pointsEarned: item.pointsEarned ?? (item.isCorrect ? 1 : 0)
        }))
      });
    } catch {
      this.error.set('Không thể tải kết quả. Vui lòng thử lại.');
      this.result.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  retakeQuiz(): void {
    const r = this.result();
    if (!r?.quizId || !r.canRetake) {
      this.goToQuizList();
      return;
    }
    this.router.navigate(['/student/quiz/take', r.quizId], {
      queryParams: { returnUrl: this.returnUrl },
    });
  }

  goToQuizList(): void {
    this.router.navigateByUrl(this.returnUrl);
  }
}
