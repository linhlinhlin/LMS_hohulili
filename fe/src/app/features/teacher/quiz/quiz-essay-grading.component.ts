import { Component, OnInit, signal, inject, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';

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
  imports: [RouterModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quiz-essay-grading.component.html',
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
