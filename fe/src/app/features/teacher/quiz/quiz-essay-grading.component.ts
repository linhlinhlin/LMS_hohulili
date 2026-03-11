import { Component, OnInit, signal, inject, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface EssayItem {
  attemptId: string;
  studentId: string;
  questionId: string;
  questionText: string;
  studentAnswer: string;
  currentScore: number | null;
  maxPoints: number;
  feedback: string;
  graded: boolean;
}

interface AttemptSummary {
  id: string;
  studentId: string;
  status: string;
  score: number | null;
  items: {
    questionId: string;
    studentAnswer: Record<string, unknown> | null;
    isCorrect: boolean | null;
    pointsEarned: number | null;
    feedback: string | null;
  }[];
}

interface QuizGradingContext {
  id: string;
  title: string;
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED' | string;
  assignmentScope?: 'CLASS' | 'COURSE' | 'LESSON' | string;
  className?: string | null;
  courseTitle?: string | null;
}

@Component({
  selector: 'app-quiz-essay-grading',
  imports: [RouterModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <button
            type="button"
            (click)="goBack()"
            class="text-[#0056D2] hover:text-[#004BB5] text-sm mb-2 inline-block"
          >&larr; {{ backButtonLabel() }}</button>
          <h1 class="text-2xl font-bold text-gray-900">Chấm điểm tự luận</h1>
          <p class="text-gray-600 mt-1">{{ quizTitle() }}</p>
          @if (quizContext()) {
            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Chế độ triển khai</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ deliveryModeLabel() }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{{ scopeTitle() }}</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ scopeLabel() }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Đối tượng đang nhận</p>
                <p class="mt-1 text-sm font-semibold text-slate-900">{{ targetLabel() }}</p>
              </div>
            </div>
            <p class="mt-3 text-sm font-medium leading-6 text-slate-600">{{ gradingContextHint() }}</p>
          }
        </div>

        @if (loading()) {
          <div class="bg-white rounded-xl shadow-sm p-8 text-center">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0056D2] mx-auto mb-4"></div>
            <p class="text-gray-600">Đang tải bài làm cần chấm...</p>
          </div>
        } @else if (essayItems().length === 0) {
          <div class="bg-white rounded-xl shadow-sm p-8 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có bài tự luận cần chấm</h3>
            <p class="text-gray-600">{{ emptyStateMessage() }}</p>
          </div>
        } @else {
          <!-- Stats -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
              <div class="text-2xl font-bold text-[#0056D2]">{{ essayItems().length }}</div>
              <div class="text-sm text-gray-600">Tổng câu tự luận</div>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
              <div class="text-2xl font-bold text-amber-600">{{ pendingCount() }}</div>
              <div class="text-sm text-gray-600">Chưa chấm</div>
            </div>
            <div class="bg-white rounded-xl shadow-sm p-4 text-center">
              <div class="text-2xl font-bold text-green-600">{{ gradedCount() }}</div>
              <div class="text-sm text-gray-600">Đã chấm</div>
            </div>
          </div>

          <!-- Essay Items -->
          <div class="space-y-6">
            @for (item of essayItems(); track item.attemptId + item.questionId) {
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-6">
                  <!-- Question -->
                  <div class="mb-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                            [class]="item.graded ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">
                        {{ item.graded ? 'Đã chấm' : 'Chưa chấm' }}
                      </span>
                      <span class="text-xs text-gray-500">Học viên: {{ item.studentId.substring(0, 8) }}...</span>
                    </div>
                    <h3 class="text-base font-medium text-gray-900">{{ item.questionText || 'Câu hỏi tự luận' }}</h3>
                  </div>

                  <!-- Student Answer -->
                  <div class="bg-gray-50 rounded-lg p-4 mb-4">
                    <div class="text-sm font-medium text-gray-700 mb-1">Bài làm của học viên:</div>
                    <p class="text-gray-800 whitespace-pre-wrap">{{ item.studentAnswer || 'Không có nội dung' }}</p>
                  </div>

                  <!-- Grading Form -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Điểm (0 - {{ item.maxPoints }})
                      </label>
                      <input type="number"
                             [min]="0"
                             [max]="item.maxPoints"
                             step="0.5"
                             [(ngModel)]="item.currentScore"
                             class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                             placeholder="Nhập điểm">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Nhận xét</label>
                      <input type="text"
                             [(ngModel)]="item.feedback"
                             class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                             placeholder="Nhận xét cho học viên">
                    </div>
                  </div>

                  <!-- Submit Button -->
                  <div class="mt-4 flex justify-end">
                    <button
                      (click)="gradeItem(item)"
                      [disabled]="item.currentScore === null || item.currentScore === undefined || grading()"
                      class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium">
                      {{ grading() ? 'Đang chấm...' : 'Chấm điểm' }}
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class QuizEssayGradingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizApi = inject(QuizApi);
  private destroyRef = inject(DestroyRef);

  quizId = '';
  quizTitle = signal('');
  quizContext = signal<QuizGradingContext | null>(null);
  loading = signal(true);
  grading = signal(false);
  essayItems = signal<EssayItem[]>([]);

  pendingCount = computed(() => this.essayItems().filter(i => !i.graded).length);
  gradedCount = computed(() => this.essayItems().filter(i => i.graded).length);
  readonly deliveryModeLabel = computed(() => {
    switch (this.quizContext()?.deliveryMode) {
      case 'INSTRUCTOR_LED':
        return 'Lớp học';
      case 'SELF_PACED':
        return 'Khóa học';
      default:
        return 'Chưa xác định';
    }
  });
  readonly scopeTitle = computed(() =>
    this.quizContext()?.deliveryMode === 'INSTRUCTOR_LED'
      ? 'Phạm vi phân phối'
      : 'Phạm vi áp dụng'
  );
  readonly scopeLabel = computed(() => {
    const quiz = this.quizContext();

    if (!quiz) {
      return 'Chưa xác định';
    }

    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'Toàn khóa học';
    }

    switch (quiz.assignmentScope) {
      case 'CLASS':
        return 'Theo lớp';
      case 'COURSE':
        return 'Toàn khóa học';
      default:
        return 'Chưa xác định';
    }
  });
  readonly targetLabel = computed(() => {
    const quiz = this.quizContext();

    if (!quiz) {
      return 'Chưa xác định';
    }

    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'Toàn bộ học viên đã ghi danh';
    }

    if (quiz.assignmentScope === 'CLASS') {
      return quiz.className || 'Lớp học chưa được đặt tên';
    }

    return 'Toàn bộ học viên trong khóa học';
  });
  readonly gradingContextHint = computed(() => {
    const quiz = this.quizContext();

    if (!quiz) {
      return 'Đây là nơi chấm các câu tự luận của bài kiểm tra đang vận hành.';
    }

    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'Các bài tự luận trên màn này thuộc về bài kiểm tra đang áp dụng cho toàn bộ học viên đã ghi danh trong khóa học.';
    }

    if (quiz.assignmentScope === 'CLASS') {
      return 'Các bài tự luận trên màn này thuộc về một bài kiểm tra đang được giao cho lớp học cụ thể trong không gian vận hành.';
    }

    return 'Các bài tự luận trên màn này thuộc về một bài kiểm tra đang áp dụng cho toàn bộ học viên trong khóa học.';
  });
  readonly emptyStateMessage = computed(() => {
    const quiz = this.quizContext();

    if (!quiz) {
      return 'Tất cả bài tự luận đã được chấm điểm.';
    }

    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'Tất cả bài tự luận trong toàn khóa học đã được chấm điểm.';
    }

    if (quiz.assignmentScope === 'CLASS') {
      return `Tất cả bài tự luận trong ${quiz.className || 'lớp học này'} đã được chấm điểm.`;
    }

    return 'Tất cả bài tự luận trong khóa học đã được chấm điểm.';
  });
  readonly openedFromAssessmentsHub = computed(() => this.router.url.includes('/teacher/assessments/'));
  readonly backButtonLabel = computed(() =>
    this.openedFromAssessmentsHub() ? 'Quay lại vận hành bài kiểm tra' : 'Quay lại'
  );

  ngOnInit(): void {
    this.quizId = this.resolveQuizId();
    if (this.quizId) {
      this.loadAttempts();
    }
  }

  goBack(): void {
    if (this.openedFromAssessmentsHub()) {
      void this.router.navigate(['/teacher/assessments', 'classes', 'quizzes']);
      return;
    }

    void this.router.navigate(['..'], { relativeTo: this.route });
  }

  private resolveQuizId(): string {
    const currentValue = this.route.snapshot.paramMap.get('quizId');
    if (currentValue) {
      return currentValue;
    }

    for (const route of [...this.route.pathFromRoot].reverse()) {
      const value = route.snapshot.paramMap.get('quizId');
      if (value) {
        return value;
      }
    }

    return this.router.url.match(/\/quizzes\/([^/?#]+)/i)?.[1] || '';
  }

  private async loadAttempts(): Promise<void> {
    this.loading.set(true);
    try {
      // Get quiz info
      const quizRes = await firstValueFrom(this.quizApi.getQuizById(this.quizId));
      const quiz = (quizRes as any)?.data || quizRes;
      this.quizTitle.set(quiz?.title || 'Quiz');
      this.quizContext.set({
        id: quiz?.id || this.quizId,
        title: quiz?.title || 'Quiz',
        deliveryMode: quiz?.deliveryMode,
        assignmentScope: quiz?.assignmentScope,
        className: quiz?.className ?? null,
        courseTitle: quiz?.courseTitle ?? null,
      });

      // Get quiz questions to identify essay types
      const questionsRes = await firstValueFrom(this.quizApi.getQuizQuestions(this.quizId));
      const questions: any[] = ((questionsRes as any)?.data || questionsRes) as any[];
      const essayQuestionIds = new Set(
        questions.filter((q: any) => q.questionType === 'ESSAY').map((q: any) => q.id)
      );

      if (essayQuestionIds.size === 0) {
        this.essayItems.set([]);
        return;
      }

      // Get all attempts for this quiz
      const attemptsRes = await firstValueFrom(this.quizApi.getStudentAttempts(this.quizId, 0, 100));
      const attemptsData = (attemptsRes as any)?.data || attemptsRes;
      const attempts: any[] = attemptsData?.content || attemptsData || [];

      // For each attempt with SUBMITTED status, load detail and extract essay items
      const items: EssayItem[] = [];
      for (const attempt of attempts) {
        if (attempt.status !== 'SUBMITTED' && attempt.status !== 'GRADED') continue;

        try {
          const detailRes = await firstValueFrom(this.quizApi.getQuizResult(attempt.id));
          const detail = (detailRes as any)?.data || detailRes;
          const attemptItems: any[] = detail?.items || [];

          for (const item of attemptItems) {
            if (!essayQuestionIds.has(item.questionId)) continue;

            const question = questions.find((q: any) => q.id === item.questionId);
            const textAnswer = item.studentAnswer?.textAnswer || item.selectedOption || '';

            items.push({
              attemptId: attempt.id,
              studentId: attempt.studentId || detail?.studentId || '',
              questionId: item.questionId,
              questionText: question?.content || '',
              studentAnswer: typeof textAnswer === 'string' ? textAnswer : JSON.stringify(textAnswer),
              currentScore: item.pointsEarned ?? null,
              maxPoints: 10,
              feedback: item.feedback || '',
              graded: item.pointsEarned != null && item.pointsEarned > 0
            });
          }
        } catch {
          // Skip attempts we can't load
        }
      }

      this.essayItems.set(items);
    } catch {
      this.quizContext.set(null);
      this.essayItems.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async gradeItem(item: EssayItem): Promise<void> {
    if (item.currentScore === null || item.currentScore === undefined) return;
    this.grading.set(true);

    try {
      await firstValueFrom(
        this.quizApi.manualGradeQuestion(item.attemptId, item.questionId, item.currentScore, item.feedback)
      );
      item.graded = true;
      // Trigger signal update
      this.essayItems.set([...this.essayItems()]);
    } catch {
      // Error handled silently — user sees no change
    } finally {
      this.grading.set(false);
    }
  }
}
