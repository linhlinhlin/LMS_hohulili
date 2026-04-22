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
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuizApi, QuizAssessmentType, QuizResponse } from '../../../api/endpoints/quiz.api';
import { QuestionApi, Question } from '../../../api/endpoints/question.api';
import { QuestionBankApi } from '../../../api/endpoints/question-bank.api';
import { QuestionBankDTO, BankQuestionDTO } from '../../../api/types/question-bank.types';
import { BlockRendererComponent } from '../../../shared/blocks/block-renderer/block-renderer.component';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-quiz-edit',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, BlockRendererComponent],
  templateUrl: './quiz-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizEditComponent implements OnInit {
  readonly quizTypeOptions: Array<{ value: QuizAssessmentType; label: string; hint: string }> = [
    { value: 'PRACTICE', label: 'Luyện tập', hint: 'Ôn tập, làm lại nhiều lần' },
    { value: 'ASSESSMENT', label: 'Bài kiểm tra', hint: 'Kiểm tra online, ghi điểm' },
    { value: 'EXAM', label: 'Bài thi', hint: 'Đánh giá chính thức, chứng chỉ' },
  ];

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly quizApi = inject(QuizApi);
  private readonly questionApi = inject(QuestionApi);
  private readonly questionBankApi = inject(QuestionBankApi);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly activeTab = signal<'questions' | 'settings'>('questions');
  readonly showBankDrawer = signal(false);

  // Bank selection — drawer
  readonly banks = signal<QuestionBankDTO[]>([]);
  readonly selectedBankId = signal<string>('');
  readonly bankQuestions = signal<BankQuestionDTO[]>([]);
  readonly loadingBank = signal(false);
  // Community banks (lazy-loaded on first tab switch)
  readonly drawerBankSource = signal<'my' | 'public'>('my');
  readonly publicBanks = signal<QuestionBankDTO[]>([]);
  readonly loadingPublicBanks = signal(false);

  readonly drawerBankSearch = signal('');

  readonly activeBanks = computed(() => {
    const all = this.drawerBankSource() === 'public' ? this.publicBanks() : this.banks();
    const term = this.drawerBankSearch().trim().toLowerCase();
    return term ? all.filter(b => b.name.toLowerCase().includes(term)) : all;
  });

  // Question preview (accordion — allow multiple open)
  readonly expandedQuestionIds = signal<Set<string>>(new Set());
  // Cache full question data loaded on demand (for preview with options)
  readonly questionDetailCache = signal<Map<string, Question>>(new Map());
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

  // All selected questions with data — merges from quizQuestions, availableQuestions, bankQuestions, and cache
  readonly selectedQuestionsForDisplay = computed(() => {
    const ids = this.selectedQuestionIds();
    const lookup = new Map<string, any>();

    // Priority 1: cached details (loaded on demand, full data)
    for (const [id, q] of this.questionDetailCache()) lookup.set(id, q);
    // Priority 2: quizQuestions (full Question with options)
    for (const q of this.quizQuestions()) if (!lookup.has(q.id)) lookup.set(q.id, q);
    // Priority 3: availableQuestions (full Question with options)
    for (const q of this.availableQuestions()) if (!lookup.has(q.id)) lookup.set(q.id, q);
    // Priority 4: bankQuestions (BankQuestionDTO, no options)
    for (const q of this.bankQuestions()) if (!lookup.has(q.id)) lookup.set(q.id, q);

    return ids.map(id => lookup.get(id)).filter(Boolean);
  });

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

    // Use bank questions if a bank is selected, otherwise all selectable
    const source: Array<{ id: string; content: string; tags?: string | null; questionType?: string; difficulty?: string }> =
      this.selectedBankId() ? this.bankQuestions() : this.allSelectableQuestions();

    const filtered = term
      ? source.filter((question) => {
          const content = question.content?.toLowerCase() ?? '';
          const tags = (question.tags ?? '').toLowerCase();
          return content.includes(term) || tags.includes(term);
        })
      : [...source];

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
  readonly availableQuizTypes = computed(() => this.quizTypeOptions);
  readonly canCountTowardCertificate = computed(() =>
    this.isLessonOwnedQuiz() && this.quizForm.get('quizType')?.value === 'EXAM'
  );

  readonly quizForm = this.fb.group({
    quizType: ['ASSESSMENT' as QuizAssessmentType, Validators.required],
    countsTowardCertificate: [false],
    timeLimitMinutes: [30, [Validators.min(5), Validators.max(120)]],
    maxAttempts: [1, [Validators.min(1), Validators.max(10)]],
    passingScore: [70, [Validators.min(0), Validators.max(100)]],
    maxScoreScale: [10, [Validators.required, Validators.min(1)]],
    shuffleQuestions: [false],
    shuffleOptions: [false],
    showCorrectAnswers: [false],
    showResultsImmediately: [true],
    accessPassword: [''],
    /** datetime-local string (browser local time) — converted to/from ISO UTC on load/save */
    availableFrom: [''],
    dueAt: [''],
    lockAt: [''],
  });

  constructor() {
    // Cross-field availability date validator
    this.quizForm.addValidators(this.availabilityDatesValidator.bind(this));

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

  /**
   * Cross-field validator: enforces availableFrom ≤ dueAt ≤ lockAt (Canvas SOTA pattern).
   * All fields are optional — only validated when two or more are set.
   */
  private availabilityDatesValidator(control: AbstractControl): Record<string, boolean> | null {
    const af  = (control as any).get?.('availableFrom')?.value as string | null | undefined;
    const due = (control as any).get?.('dueAt')?.value as string | null | undefined;
    const lock = (control as any).get?.('lockAt')?.value as string | null | undefined;

    const errors: Record<string, boolean> = {};
    if (af && due && new Date(af) >= new Date(due))   errors['dueBeforeAvailable'] = true;
    if (due && lock && new Date(due) >= new Date(lock)) errors['lockBeforeDue']      = true;
    if (af && lock && new Date(af) >= new Date(lock))  errors['lockBeforeAvailable'] = true;
    return Object.keys(errors).length ? errors : null;
  }

  /**
   * Convert ISO UTC string → datetime-local value for <input type="datetime-local">.
   * Adjusts to browser local timezone so what the teacher set in UTC+7 appears as UTC+7.
   */
  isoToLocalInput(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const offsetMs = d.getTimezoneOffset() * 60000; // minutes → ms (negative for UTC+7)
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  /**
   * Convert datetime-local input value → ISO UTC string for the API.
   * JS Date constructor interprets bare datetime strings as local time.
   */
  localInputToIso(local: string | null | undefined): string | null {
    if (!local) return null;
    const d = new Date(local);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  ngOnInit(): void {
    this.quizId.set(this.resolveRouteParam('quizId'));
    this.lessonId.set(this.resolveRouteParam('lessonId'));

    // Open settings tab if redirected from quiz creation
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'settings') {
      this.activeTab.set('settings');
    }

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
          maxScoreScale: formValue.maxScoreScale ?? 10,
          shuffleQuestions: formValue.shuffleQuestions ?? false,
          shuffleOptions: formValue.shuffleOptions ?? false,
          showCorrectAnswers: formValue.showCorrectAnswers ?? false,
          showResultsImmediately: formValue.showResultsImmediately ?? true,
          accessPassword: formValue.accessPassword || null,
          availableFrom: this.localInputToIso(formValue.availableFrom),
          dueAt: this.localInputToIso(formValue.dueAt),
          lockAt: this.localInputToIso(formValue.lockAt),
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

    const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    const returnCourseId = this.route.snapshot.queryParamMap.get('returnCourseId');
    const returnChapterId = this.route.snapshot.queryParamMap.get('returnChapterId');
    const returnLessonId = this.route.snapshot.queryParamMap.get('returnLessonId');
    const returnSectionId = this.route.snapshot.queryParamMap.get('returnSectionId');

    if (returnTo === 'curriculum' && returnCourseId) {
      const queryParams: Record<string, string> = {};
      if (returnChapterId) {
        queryParams['chapterId'] = returnChapterId;
      }
      if (returnLessonId) {
        queryParams['lessonId'] = returnLessonId;
      }
      if (returnSectionId) {
        queryParams['sectionId'] = returnSectionId;
      }
      void this.router.navigate(
        ['/teacher/courses', returnCourseId, 'editor', 'curriculum'],
        { queryParams }
      );
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

  getQuestionText(question: any): string {
    if (question.content) return question.content;
    if (question.contentBlocks?.length > 0) {
      return question.contentBlocks
        .map((b: any) => b.data?.html || b.data?.text || '')
        .filter(Boolean)
        .join(' ');
    }
    return '(Chưa có nội dung)';
  }

  getOptionText(option: any): string {
    // Option content may be empty — fallback to contentBlocks
    if (option.content) return option.content;
    if (option.contentBlocks?.length > 0) {
      return option.contentBlocks
        .map((b: any) => b.data?.html || b.data?.text || b.data?.latex || '')
        .filter(Boolean)
        .join(' ');
    }
    return '(Không có nội dung)';
  }

  getQuestionUsageCount(question: Question): number {
    return question.usageCount ?? 0;
  }

  getQuestionTypeLabel(type?: string): string {
    const labels: Record<string, string> = {
      SINGLE_CHOICE: 'Trắc nghiệm',
      MULTIPLE_CHOICE: 'Nhiều đáp án',
      TRUE_FALSE: 'Đúng/Sai',
      ESSAY: 'Tự luận',
      SHORT_ANSWER: 'Trả lời ngắn',
      FILL_IN_BLANK: 'Điền khuyết',
      MATCHING: 'Nối cặp'
    };
    return labels[type || ''] || type || 'Câu hỏi';
  }

  toggleQuestionPreview(questionId: string): void {
    const isExpanding = !this.expandedQuestionIds().has(questionId);

    this.expandedQuestionIds.update(set => {
      const next = new Set(set);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });

    // Load full question data if not cached (for preview with options)
    if (isExpanding && !this.questionDetailCache().has(questionId)) {
      this.questionApi.getQuestionById(questionId).subscribe({
        next: (question) => {
          if (question) {
            this.questionDetailCache.update(cache => {
              const next = new Map(cache);
              next.set(questionId, question);
              return next;
            });
          }
        }
      });
    }
  }

  isQuestionExpanded(questionId: string): boolean {
    return this.expandedQuestionIds().has(questionId);
  }

  getCorrectOptionKey(question: any): string | null {
    return question?.correctOption || null;
  }

  selectBank(bankId: string): void {
    this.selectedBankId.set(bankId);
    this.questionSearchTerm.set('');
    if (bankId) {
      this.loadingBank.set(true);
      this.questionBankApi.getBankQuestions(bankId).subscribe({
        next: (questions) => this.bankQuestions.set(questions),
        error: () => this.bankQuestions.set([]),
        complete: () => this.loadingBank.set(false),
      });
    } else {
      this.bankQuestions.set([]);
    }
  }

  async switchDrawerSource(source: 'my' | 'public'): Promise<void> {
    if (this.drawerBankSource() === source) return;
    this.drawerBankSource.set(source);
    // Reset bank selection when switching source
    this.selectedBankId.set('');
    this.bankQuestions.set([]);
    this.questionSearchTerm.set('');
    this.drawerBankSearch.set('');

    // Lazy-load public banks on first visit
    if (source === 'public' && this.publicBanks().length === 0) {
      this.loadingPublicBanks.set(true);
      try {
        const banks = await firstValueFrom(this.questionBankApi.getPublicBanks());
        this.publicBanks.set(banks);
      } catch {
        this.publicBanks.set([]);
      } finally {
        this.loadingPublicBanks.set(false);
      }
    }
  }

  removeQuestion(questionId: string): void {
    const current = this.selectedQuestionIds();
    this.selectedQuestionIds.set(current.filter(id => id !== questionId));
  }

  getStatusBadgeClass(): Record<string, boolean> {
    const status = this.quiz()?.status?.toUpperCase();
    return {
      'bg-emerald-50 text-emerald-700 border border-emerald-200': status === 'PUBLISHED',
      'bg-amber-50 text-amber-700 border border-amber-200': status === 'DRAFT',
      'bg-gray-100 text-gray-600 border border-gray-200': status === 'CLOSED'
    };
  }

  onPublish(): void {
    const quizId = this.quizId();
    if (!quizId) return;
    this.saving.set(true);
    this.quizApi.publishQuiz(quizId).subscribe({
      next: () => {
        this.quiz.update(q => q ? { ...q, status: 'PUBLISHED' } : q);
        this.saving.set(false);
      },
      error: () => { this.error.set('Không thể xuất bản'); this.saving.set(false); }
    });
  }

  onUnpublish(): void {
    const quizId = this.quizId();
    if (!quizId) return;
    this.saving.set(true);
    // Unpublish = update settings with current values (status managed server-side)
    this.quizApi.updateQuizSettings(quizId, {
      ...this.quizForm.getRawValue(),
      status: 'DRAFT'
    } as any).subscribe({
      next: () => {
        this.quiz.update(q => q ? { ...q, status: 'DRAFT' } : q);
        this.saving.set(false);
      },
      error: () => { this.error.set('Không thể hủy xuất bản'); this.saving.set(false); }
    });
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

    await Promise.allSettled([this.loadQuizData(), this.loadAvailableQuestions(), this.loadBanks()]);
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

  private async loadBanks(): Promise<void> {
    try {
      const banks = await firstValueFrom(this.questionBankApi.getMyBanks());
      this.banks.set((banks ?? []).filter(b => b.status === 'ACTIVE'));
    } catch {
      this.banks.set([]);
    }
  }

  private updateFormWithQuiz(quiz: QuizResponse): void {
    this.quizForm.patchValue({
      quizType: (quiz.quizType as QuizAssessmentType) || 'ASSESSMENT',
      countsTowardCertificate: quiz.quizType === 'EXAM' && quiz.countsTowardCertificate === true,
      timeLimitMinutes: quiz.timeLimitMinutes,
      maxAttempts: quiz.maxAttempts,
      passingScore: quiz.passingScore,
      maxScoreScale: (quiz as any).maxScoreScale ?? 10,
      shuffleQuestions: quiz.shuffleQuestions,
      shuffleOptions: quiz.shuffleOptions,
      showCorrectAnswers: quiz.showCorrectAnswers,
      showResultsImmediately: quiz.showResultsImmediately,
      accessPassword: (quiz as any).accessPassword || '',
      availableFrom: this.isoToLocalInput(quiz.availableFrom),
      dueAt: this.isoToLocalInput(quiz.dueAt),
      lockAt: this.isoToLocalInput(quiz.lockAt),
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
