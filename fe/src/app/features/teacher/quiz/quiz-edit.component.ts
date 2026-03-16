import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuizApi, QuizAssessmentType, QuizResponse } from '../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-quiz-edit',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './quiz-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizEditComponent implements OnInit {
  readonly quizTypeOptions: Array<{ value: QuizAssessmentType; label: string; hint: string }> = [
    { value: 'PRACTICE', label: 'Luyện tập', hint: 'Phù hợp cho quiz ôn tập và có thể hỗ trợ ngoại tuyến.' },
    { value: 'ASSESSMENT', label: 'Bài kiểm tra', hint: 'Dùng cho kiểm tra online trong lesson.' },
    { value: 'EXAM', label: 'Bài thi', hint: 'Dùng cho đánh giá nghiêm túc hoặc điều kiện chứng chỉ.' },
  ];

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly quizApi = inject(QuizApi);
  private readonly questionApi = inject(QuestionApi);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly questionBankWarning = signal('');
  readonly quiz = signal<QuizResponse | null>(null);
  readonly quizQuestions = signal<Question[]>([]);
  readonly availableQuestions = signal<Question[]>([]);
  readonly selectedQuestionIds = signal<string[]>([]);
  readonly questionSearchTerm = signal('');
  readonly quizId = signal<string | null>(null);
  readonly lessonId = signal<string | null>(null);
  private readonly originalFormSnapshot = signal('');
  private readonly originalQuestionSnapshot = signal('');
  private readonly formRevision = signal(0);

  readonly questionCount = computed(() => this.selectedQuestionIds().length);
  readonly hasChanges = computed(() => {
    this.formRevision();
    const currentFormSnapshot = JSON.stringify(this.quizForm.getRawValue());
    const currentQuestionSnapshot = JSON.stringify([...this.selectedQuestionIds()].sort());

    return currentFormSnapshot !== this.originalFormSnapshot()
      || currentQuestionSnapshot !== this.originalQuestionSnapshot();
  });
  readonly selectedQuestionIdSet = computed(() => new Set(this.selectedQuestionIds()));
  readonly allSelectableQuestions = computed(() => {
    const deduped = new Map<string, Question>();

    for (const question of this.quizQuestions()) {
      deduped.set(question.id, question);
    }

    for (const question of this.availableQuestions()) {
      if (!deduped.has(question.id)) {
        deduped.set(question.id, question);
      }
    }

    return Array.from(deduped.values());
  });
  readonly filteredQuestions = computed(() => {
    const term = this.questionSearchTerm().trim().toLowerCase();
    const selectedIds = this.selectedQuestionIdSet();
    const questions = [...this.allSelectableQuestions()];

    const filtered = term
      ? questions.filter((question) => {
          const content = question.content?.toLowerCase() ?? '';
          const tags = question.tags?.toLowerCase() ?? '';
          return content.includes(term) || tags.includes(term);
        })
      : questions;

    return filtered.sort((left, right) => {
      const leftSelected = selectedIds.has(left.id) ? 1 : 0;
      const rightSelected = selectedIds.has(right.id) ? 1 : 0;
      return rightSelected - leftSelected;
    });
  });
  readonly deliveryModeLabel = computed(() => {
    switch (this.quiz()?.deliveryMode) {
      case 'INSTRUCTOR_LED':
        return 'Lớp học';
      case 'SELF_PACED':
        return 'Khóa học';
      default:
        return 'Chưa xác định';
    }
  });
  readonly quizStatusLabel = computed(() => {
    switch ((this.quiz()?.status || '').toUpperCase()) {
      case 'PUBLISHED':
        return 'Xuất bản';
      case 'ARCHIVED':
        return 'Lưu trữ';
      case 'DRAFT':
        return 'Nháp';
      default:
        return this.quiz()?.status || 'Nháp';
    }
  });
  readonly assignmentScopeLabel = computed(() => {
    if (this.quiz()?.deliveryMode === 'SELF_PACED') {
      return 'Toàn khóa học';
    }

    switch (this.quiz()?.assignmentScope) {
      case 'CLASS':
        return 'Theo lớp';
      case 'COURSE':
        return 'Toàn bộ khóa học';
      case 'LESSON':
        return 'Theo bài học';
      default:
        return 'Chưa xác định';
    }
  });
  readonly contentPlacementLabel = computed(() => {
    if (!this.quiz()) {
      return 'Chưa xác định';
    }

    return 'Bài học trong chương trình';
  });
  readonly assignmentTargetLabel = computed(() => {
    const quiz = this.quiz();

    if (!quiz) {
      return 'Chưa xác định';
    }

    if (quiz.assignmentScope === 'CLASS') {
      return quiz.className || 'Lớp học chưa được đặt tên';
    }

    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'Toàn bộ học viên đã ghi danh';
    }

    if (quiz.assignmentScope === 'COURSE') {
      return 'Toàn bộ học viên trong khóa học';
    }

    return quiz.courseTitle || 'Chưa xác định';
  });
  readonly defaultSettingsTitle = computed(() =>
    this.quiz()?.deliveryMode === 'INSTRUCTOR_LED'
      ? 'Mặc định toàn khóa học'
      : 'Thiết lập áp dụng cho toàn khóa học'
  );
  readonly defaultSettingsHint = computed(() => {
    if (this.quiz()?.deliveryMode === 'INSTRUCTOR_LED') {
      return 'Thiết lập ở đây thuộc về bài kiểm tra chuẩn của bài học trong khóa học. Nếu cần giao theo lớp, hệ thống chỉ thay đổi phạm vi áp dụng thay vì nhân bản bài học.';
    }

    return 'Thiết lập ở đây áp dụng trực tiếp cho toàn bộ học viên đã ghi danh trong khóa học tự học.';
  });
  readonly distributionScopeTitle = computed(() =>
    this.quiz()?.deliveryMode === 'INSTRUCTOR_LED'
      ? 'Phạm vi phân phối'
      : 'Phạm vi áp dụng'
  );
  readonly distributionHint = computed(() => {
    if (this.quiz()?.assignmentScope === 'CLASS') {
      return 'Bài kiểm tra này dùng cùng một nội dung chuẩn của khóa học, nhưng hiện đang được giao cho một lớp cụ thể.';
    }

    if (this.quiz()?.deliveryMode === 'INSTRUCTOR_LED') {
      return 'Nếu giáo viên giao theo lớp hoặc nhóm học viên, hệ thống chỉ đổi đối tượng nhận bài thay vì tạo một bài học mới.';
    }

    return 'Khóa học tự học chỉ có một phạm vi duy nhất: toàn bộ học viên đã ghi danh trong khóa học.';
  });
  readonly openedFromAssessmentsHub = computed(() => this.router.url.includes('/teacher/assessments/'));
  readonly backButtonLabel = computed(() =>
    this.openedFromAssessmentsHub()
      ? 'Quay lại vận hành bài kiểm tra'
      : 'Quay lại chương trình học'
  );
  readonly isLessonOwnedQuiz = computed(() => (this.quiz()?.assignmentScope ?? 'LESSON') === 'LESSON');
  readonly availableQuizTypes = computed(() =>
    this.isLessonOwnedQuiz()
      ? this.quizTypeOptions
      : this.quizTypeOptions.filter(option => option.value !== 'PRACTICE')
  );
  readonly canCountTowardCertificate = computed(() =>
    this.isLessonOwnedQuiz() && this.quizForm.get('quizType')?.value === 'EXAM'
  );

  readonly quizForm = this.fb.group({
    quizType: ['ASSESSMENT' as QuizAssessmentType, Validators.required],
    countsTowardCertificate: [false],
    timeLimitMinutes: [30, [Validators.min(5), Validators.max(120)]],
    maxAttempts: [1, [Validators.min(1), Validators.max(10)]],
    passingScore: [70, [Validators.min(0), Validators.max(100)]],
    shuffleQuestions: [false],
    shuffleOptions: [false],
    showCorrectAnswers: [true],
    showResultsImmediately: [true],
  });

  constructor() {
    this.quizForm.get('quizType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((quizType) => {
        if (quizType !== 'EXAM' && this.quizForm.get('countsTowardCertificate')?.value) {
          this.quizForm.patchValue({ countsTowardCertificate: false }, { emitEvent: false });
        }
      });

    this.quizForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formRevision.update(value => value + 1);
      });
  }

  ngOnInit(): void {
    this.quizId.set(this.resolveRouteParam('quizId'));
    this.lessonId.set(this.resolveRouteParam('lessonId'));
    void this.initialize();
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasChanges() && !this.saving()) {
      return true;
    }

    return this.confirmDialog.confirm({
      title: 'Rời màn chỉnh sửa bài kiểm tra',
      message: 'Bạn có thay đổi chưa lưu trong bài kiểm tra này. Nếu rời màn này, các chỉnh sửa hiện tại sẽ bị mất.',
      variant: 'warning',
      confirmText: 'Rời màn này',
      cancelText: 'Ở lại'
    });
  }

  async onSubmit(): Promise<void> {
    const quizId = this.quizId();

    if (this.quizForm.invalid || this.questionCount() === 0 || !quizId) {
      this.quizForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const formValue = this.quizForm.getRawValue();
    try {
      await firstValueFrom(
        this.quizApi.updateQuizSettings(quizId, {
          quizType: (formValue.quizType as QuizAssessmentType) ?? 'ASSESSMENT',
          countsTowardCertificate: this.isLessonOwnedQuiz()
            && formValue.quizType === 'EXAM'
            && formValue.countsTowardCertificate === true,
          timeLimitMinutes: formValue.timeLimitMinutes ?? 30,
          maxAttempts: formValue.maxAttempts ?? 1,
          passingScore: formValue.passingScore ?? 70,
          shuffleQuestions: formValue.shuffleQuestions ?? false,
          shuffleOptions: formValue.shuffleOptions ?? false,
          showCorrectAnswers: formValue.showCorrectAnswers ?? true,
          showResultsImmediately: formValue.showResultsImmediately ?? true,
        })
      );

      await firstValueFrom(
        this.quizApi.updateQuizQuestions(quizId, {
          questionIds: [...this.selectedQuestionIds()],
        })
      );

      await this.loadQuizData();
    } catch {
      this.error.set('Không thể lưu thay đổi bài kiểm tra');
    } finally {
      this.saving.set(false);
    }
  }

  onCancel(): void {
    if (this.openedFromAssessmentsHub()) {
      void this.router.navigate(['/teacher/assessments', 'classes', 'quizzes']);
      return;
    }

    const quiz = this.quiz();

    if (quiz?.courseId) {
      void this.router.navigate(['/teacher/courses', quiz.courseId, 'editor', 'curriculum']);
      return;
    }

    void this.router.navigate(['/teacher/assessments', 'classes', 'quizzes']);
  }

  toggleQuestion(questionId: string, checked: boolean): void {
    const current = new Set(this.selectedQuestionIds());

    if (checked) {
      current.add(questionId);
    } else {
      current.delete(questionId);
    }

    this.selectedQuestionIds.set(Array.from(current));
  }

  setQuestionSearchTerm(term: string): void {
    this.questionSearchTerm.set(term);
  }

  isQuestionSelected(questionId: string): boolean {
    return this.selectedQuestionIdSet().has(questionId);
  }

  getDifficultyText(difficulty: string): string {
    const difficultyMap: Record<string, string> = {
      EASY: 'Dễ',
      MEDIUM: 'Trung bình',
      HARD: 'Khó',
    };

    return difficultyMap[difficulty] || difficulty;
  }

  getQuestionUsageCount(question: Question): number {
    return question.usageCount ?? 0;
  }

  private async initialize(): Promise<void> {
    if (!this.quizId() && !this.lessonId()) {
      this.error.set('Không tìm thấy bài kiểm tra để chỉnh sửa');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.questionBankWarning.set('');

    await Promise.allSettled([this.loadQuizData(), this.loadAvailableQuestions()]);
    this.loading.set(false);
  }

  private async loadQuizData(): Promise<void> {
    try {
      const referenceId = this.quizId() || this.lessonId();
      if (!referenceId) {
        throw new Error('Khong tim thay quiz de chinh sua');
      }

      const quiz = await firstValueFrom(this.quizApi.getQuizByReference(referenceId));
      this.quiz.set(quiz);
      this.quizId.set(quiz.id);
      this.lessonId.set(quiz.lessonId || this.lessonId());
      this.updateFormWithQuiz(quiz);

      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(quiz.id));
      this.quizQuestions.set(questions);
      this.selectedQuestionIds.set(questions.map((question) => question.id));
      this.captureOriginalState();
    } catch {
      this.error.set('Không thể tải thông tin bài kiểm tra');
    }
  }

  private async loadAvailableQuestions(): Promise<void> {
    try {
      const questions = await firstValueFrom(this.questionApi.getMyQuestions());
      this.availableQuestions.set(questions ?? []);
    } catch {
      this.availableQuestions.set([]);
      this.questionBankWarning.set(
        'Không thể tải ngân hàng câu hỏi của bạn. Bạn vẫn có thể chỉnh sửa thiết lập và danh sách câu hỏi hiện tại.'
      );
    }
  }

  private updateFormWithQuiz(quiz: QuizResponse): void {
    this.quizForm.patchValue({
      quizType: (quiz.quizType as QuizAssessmentType) || 'ASSESSMENT',
      countsTowardCertificate: quiz.quizType === 'EXAM' && quiz.countsTowardCertificate === true,
      timeLimitMinutes: quiz.timeLimitMinutes,
      maxAttempts: quiz.maxAttempts,
      passingScore: quiz.passingScore,
      shuffleQuestions: quiz.shuffleQuestions,
      shuffleOptions: quiz.shuffleOptions,
      showCorrectAnswers: quiz.showCorrectAnswers,
      showResultsImmediately: quiz.showResultsImmediately,
    });
  }

  private captureOriginalState(): void {
    this.originalFormSnapshot.set(JSON.stringify(this.quizForm.getRawValue()));
    this.originalQuestionSnapshot.set(JSON.stringify([...this.selectedQuestionIds()].sort()));
  }

  private resolveRouteParam(paramName: 'quizId' | 'lessonId'): string | null {
    const currentValue = this.route.snapshot.paramMap.get(paramName);
    if (currentValue) {
      return currentValue;
    }

    for (const route of [...this.route.pathFromRoot].reverse()) {
      const value = route.snapshot.paramMap.get(paramName);
      if (value) {
        return value;
      }
    }

    const url = this.router.url;
    if (paramName === 'quizId') {
      const match = url.match(/\/quizzes\/([^/?#]+)/i);
      return match?.[1] ?? null;
    }

    if (paramName === 'lessonId') {
      const match = url.match(/\/lessons\/([^/?#]+)/i);
      return match?.[1] ?? null;
    }

    return null;
  }
}
