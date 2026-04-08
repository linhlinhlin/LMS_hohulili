import { Component, OnInit, OnDestroy, signal, inject, computed, ChangeDetectionStrategy, HostListener, effect } from '@angular/core';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../shared/components/ui/icon/icon.component';
import { BlockRendererComponent } from '../../../shared/blocks/block-renderer/block-renderer.component';
import { NetworkStatusService } from '../../../core/services/network-status.service';
import { OfflineQuizService } from '../../../core/services/offline-quiz.service';
import { CourseDownloadService } from '../../../core/services/course-download.service';
import { getOfflineCourseStaleCopy } from '../../../core/utils/offline-course-staleness';
import { ToastService } from '../../../core/services/toast.service';

type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'SHORT_ANSWER' | 'ESSAY';

interface QuizQuestion {
  id: string;
  content: string;
  contentBlocks: any[];
  difficulty: string;
  questionType: QuestionType;
  options: { key: string; content: string; contentBlocks?: any[] }[];
  correctOption: string | null;
  answerKey: Record<string, unknown> | null;
}

interface QuizSettings {
  timeLimitMinutes: number | null;
  maxAttempts: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
}

type QuizPhase = 'loading' | 'confirmation' | 'resume-prompt' | 'password' | 'in-progress' | 'review' | 'submitting' | 'results' | 'error';

interface PreflightData {
  quizId: string;
  quizTitle: string;
  description: string;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  passingScore: number | null;
  maxScoreScale: number;
  questionCount: number;
  completedAttempts: number;
  attemptsRemaining: number | null;
  requiresPassword: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** ISO 8601 UTC — when quiz becomes accessible */
  availableFrom?: string | null;
  /** ISO 8601 UTC — soft deadline shown to students */
  dueAt?: string | null;
  /** ISO 8601 UTC — hard cutoff; server also enforces this */
  lockAt?: string | null;
  /**
   * Server-computed effective time limit in seconds for a NEW attempt.
   * = min(timeLimitMinutes*60, secondsUntilLockAt). null if unlimited.
   */
  effectiveTimeLimitSeconds?: number | null;
  inProgressAttempt: {
    attemptId: string;
    startedAt: string;
    /** Server-calculated: min(timeLimitRemaining, secondsUntilLockAt) */
    timeRemainingSeconds?: number;
    savedAnswers: { questionId: string; selectedOption?: string; studentAnswer?: Record<string, unknown> }[];
    answeredCount: number;
  } | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-student-quiz-taking',
  imports: [IconComponent, BlockRendererComponent, FormsModule, CommonModule, RouterModule],
  templateUrl: './student-quiz-taking.component.html',
  styles: [`
    @keyframes scale-in {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-in {
      animation: scale-in 0.3s ease-out;
    }
    :host ::ng-deep .sidebar-container,
    :host ::ng-deep .sidebar-student,
    :host ::ng-deep aside,
    :host ::ng-deep [class*="sidebar"],
    :host ::ng-deep [class*="nav-sidebar"] {
      display: none !important;
    }
  `]
})
export class StudentQuizTakingComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizApi = inject(QuizApi);
  private network = inject(NetworkStatusService);
  private offlineQuizService = inject(OfflineQuizService);
  private courseDownloadService = inject(CourseDownloadService);
  private toast = inject(ToastService);

  Math = Math;

  quizReferenceId = '';
  quizId = '';
  attemptId = '';
  lessonId = '';
  courseId = '';
  sectionId = '';
  quizMode: 'lesson' | 'section' = 'lesson';
  quizTitle = signal('Bài kiểm tra');
  quizType = signal<'PRACTICE' | 'ASSESSMENT' | 'EXAM'>('ASSESSMENT');
  allowOfflineQuiz = signal(false);
  returnUrl = '';
  /** True when taking quiz from offline IndexedDB (no server connection) */
  isOfflineMode = signal(false);
  stalePackageBlocked = signal(false);

  // Phase state machine (Canvas SOTA: confirmation → in-progress → results)
  quizPhase = signal<QuizPhase>('loading');
  preflightData = signal<PreflightData | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);
  questions = signal<QuizQuestion[]>([]);
  answers = signal<Record<string, string | string[]>>({});
  showResults = signal(false);
  showResultsModal = signal(true);
  serverScore = signal<number | null>(null);
  serverMaxScore = signal<number>(10);
  serverCorrectCount = signal<number | null>(null);
  serverPassed = signal<boolean | null>(null);
  /** Map of questionId → isCorrect from server grading (for review highlighting) */
  serverIsCorrectMap = signal<Record<string, boolean>>({});
  /** Map of questionId → correctOption key (SINGLE_CHOICE/TRUE_FALSE), revealed by server when showCorrectAnswers=true */
  serverCorrectOptionsMap = signal<Record<string, string>>({});
  /** Map of questionId → correctOptions array (MULTIPLE_CHOICE), revealed by server when showCorrectAnswers=true */
  serverCorrectOptionsArrayMap = signal<Record<string, string[]>>({});
  submitting = signal(false);
  showSubmitConfirmModal = signal(false);

  // Access password (Canvas "access code" pattern)
  requiresPassword = signal(false);
  showPasswordPrompt = signal(false);
  passwordInput = signal('');
  passwordError = signal('');

  quizSettings = signal<QuizSettings>({
    timeLimitMinutes: null,
    maxAttempts: 1,
    passingScore: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultsImmediately: true,
    showCorrectAnswers: false,
  });

  sidebarVisible = signal(true);

  readonly QUESTIONS_PER_PAGE = 10;
  currentPage = signal(0);

  timeRemaining = signal(30 * 60);
  timeSpent = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;

  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  /** 5-min backup interval; the answerAutoSaveEffect handles incremental saves on answer change */
  private readonly AUTO_SAVE_INTERVAL_MS = 300_000;

  totalPages = computed(() => Math.ceil(this.questions().length / this.QUESTIONS_PER_PAGE));

  currentPageQuestions = computed(() => {
    const start = this.currentPage() * this.QUESTIONS_PER_PAGE;
    const end = start + this.QUESTIONS_PER_PAGE;
    return this.questions().slice(start, end);
  });

  getQuestionIndex(pageIndex: number): number {
    return this.currentPage() * this.QUESTIONS_PER_PAGE + pageIndex;
  }

  answeredCount = computed(() => {
    const ans = this.answers();
    return Object.keys(ans).filter(key => {
      const val = ans[key];
      if (Array.isArray(val)) return val.length > 0;
      return val !== undefined && val !== '';
    }).length;
  });

  correctCount = computed(() => {
    if (this.serverCorrectCount() !== null) return this.serverCorrectCount()!;

    const ans = this.answers();
    return this.questions().filter(q => {
      if (q.questionType === 'SINGLE_CHOICE' || q.questionType === 'TRUE_FALSE') {
        return typeof ans[q.id] === 'string' && ans[q.id] === q.correctOption;
      }
      return false;
    }).length;
  });

  wrongCount = computed(() => {
    const total = this.questions().length;
    return total - this.correctCount() - this.unansweredCount();
  });

  unansweredCount = computed(() => {
    return this.questions().length - this.answeredCount();
  });

  scorePercent = computed(() => {
    if (this.serverScore() !== null) {
      const maxScore = this.serverMaxScore();
      return maxScore > 0 ? Math.round((this.serverScore()! / maxScore) * 100) : 0;
    }
    if (this.questions().length === 0) return 0;
    return Math.round((this.correctCount() / this.questions().length) * 100);
  });

  /** True when quiz is passed — uses server result first, falls back to local score */
  isPassed = computed(() => {
    if (this.serverPassed() !== null) return this.serverPassed()!;
    return this.scorePercent() >= this.quizSettings().passingScore;
  });

  /** Timer warn threshold: 25% of total time, max 5 min */
  timerWarnThreshold = computed(() => {
    const total = (this.quizSettings().timeLimitMinutes || 30) * 60;
    return Math.min(Math.round(total * 0.25), 300);
  });

  /** Timer danger threshold: 10% of total time, max 2 min */
  timerDangerThreshold = computed(() => {
    const total = (this.quizSettings().timeLimitMinutes || 30) * 60;
    return Math.min(Math.round(total * 0.10), 120);
  });

  /** Index of the question currently highlighted in the sidebar */
  currentQuestionIndex = signal(0);

  /** Controls the mobile question-navigator drawer (visible on small screens) */
  mobileNavDrawerOpen = signal(false);

  /** Set of question IDs the student has flagged for later review */
  flaggedQuestions = signal<Set<string>>(new Set());
  flaggedCount = computed(() => this.flaggedQuestions().size);

  /**
   * Wall-clock epoch ms for the hard lockAt deadline.
   * Set when a timed quiz starts/resumes. The timer tick checks this
   * and force-submits if the real clock has passed the lockAt boundary.
   * null = no hard deadline.
   */
  lockAtMs = signal<number | null>(null);

  /**
   * True when there is any time constraint on the active quiz —
   * either a per-attempt timeLimitMinutes, or a hard lockAt deadline.
   * Used to show/hide the countdown timer in the header.
   */
  hasActiveTimeConstraint = computed(() =>
    !!this.quizSettings().timeLimitMinutes || this.lockAtMs() !== null
  );

  /**
   * Event-driven auto-save: debounced 5 s after every answer change.
   * The 5-min interval in startAutoSave() remains as a safety-net backup.
   */
  private readonly answerAutoSaveEffect = effect(() => {
    const _answers = this.answers(); // reactive dep
    const phase = this.quizPhase();  // reactive dep
    if (phase !== 'in-progress') return;
    if (this.isSectionQuizMode() || !this.attemptId) return;
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(() => this.doAutoSave(), 5_000);
  });

  ngOnInit() {
    document.body.classList.add('quiz-taking-mode');
    this.quizReferenceId = this.route.snapshot.paramMap.get('id') || '';
    this.quizTitle.set(this.route.snapshot.queryParamMap.get('title') || 'Bài kiểm tra');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/student/learn/course';
    this.lessonId = this.route.snapshot.queryParamMap.get('lessonId') || '';
    this.courseId = this.route.snapshot.queryParamMap.get('courseId') || '';
    this.sectionId = this.route.snapshot.queryParamMap.get('sectionId') || this.quizReferenceId;
    this.quizMode = this.route.snapshot.queryParamMap.get('mode') === 'section' ? 'section' : 'lesson';
    this.quizType.set(this.normalizeAssessmentType(this.route.snapshot.queryParamMap.get('quizType')));
    this.allowOfflineQuiz.set(this.route.snapshot.queryParamMap.get('allowOffline') === 'true');

    if (this.quizReferenceId) {
      this.loadQuiz();
    }
  }

  ngOnDestroy() {
    document.body.classList.remove('quiz-taking-mode');
    this.stopTimer();
    this.stopAutoSave();
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
  }

  /** Page leave protection: browser warns before closing tab during quiz */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    const phase = this.quizPhase();
    if (phase === 'in-progress' || phase === 'review') {
      event.preventDefault();
      this.doAutoSave();
    }
  }

  /** Route guard: confirm navigation away during quiz + auto-save */
  async canDeactivate(): Promise<boolean> {
    const phase = this.quizPhase();
    if (phase !== 'in-progress' && phase !== 'review') return true;

    // Auto-save before leaving
    await this.doAutoSave();

    return confirm('Bạn đang làm bài kiểm tra. Bài làm đã được lưu tự động và bạn có thể quay lại tiếp tục. Bạn có chắc muốn thoát?');
  }

  async loadQuiz(): Promise<void> {
    this.loading.set(true);
    this.quizPhase.set('loading');
    this.error.set(null);
    this.stalePackageBlocked.set(false);

    if (await this.blockIfStalePackageDisallowsAssessment(this.allowOfflineQuiz())) {
      this.loading.set(false);
      this.quizPhase.set('error');
      return;
    }

    // Offline mode: load quiz from IndexedDB (no preflight available)
    if (!this.network.online()) {
      if (this.lessonId) {
        this.allowOfflineQuiz.set(true);
      }
      await this.loadOfflineQuiz();
      return;
    }

    try {
      // Section quizzes bypass preflight (inline quiz, no attempt tracking)
      if (this.isSectionQuizMode()) {
        await this.loadOnlineSectionQuiz();
        return;
      }

      // Step 1: Fetch quiz metadata
      const quiz = await firstValueFrom(this.quizApi.getQuizByReference(this.quizReferenceId));
      this.applyQuizSettings(quiz);
      if (await this.blockIfStalePackageDisallowsAssessment(this.allowOfflineQuiz())) {
        this.quizPhase.set('error');
        return;
      }

      // Step 2: Fetch preflight info (confirmation screen + resume check)
      const preflight: PreflightData = await firstValueFrom(this.quizApi.getAttemptPreflight(this.quizId));
      this.preflightData.set(preflight);
      if (preflight.maxScoreScale) {
        this.serverMaxScore.set(preflight.maxScoreScale);
      }

      // Step 3: Decide phase based on preflight response
      if (preflight.inProgressAttempt) {
        // Resume: there's an in-progress attempt — start countdown immediately
        if (preflight.inProgressAttempt.timeRemainingSeconds != null) {
          this.timeRemaining.set(preflight.inProgressAttempt.timeRemainingSeconds);
          this.startTimer();
        }
        this.quizPhase.set('resume-prompt');
      } else if (preflight.attemptsRemaining !== null && preflight.attemptsRemaining <= 0) {
        // No attempts remaining
        this.error.set('Bạn đã sử dụng hết số lần làm bài cho phép.');
        this.quizPhase.set('error');
      } else if (preflight.lockAt && new Date(preflight.lockAt).getTime() <= Date.now()) {
        // Quiz locked — hard cutoff has passed
        this.error.set('Bài kiểm tra đã đóng.');
        this.quizPhase.set('error');
      } else if (preflight.availableFrom && new Date(preflight.availableFrom).getTime() > Date.now()) {
        // Quiz not yet open
        this.error.set('Bài kiểm tra chưa mở. Thời gian mở: ' + new Date(preflight.availableFrom).toLocaleString('vi-VN'));
        this.quizPhase.set('error');
      } else {
        // Normal: show confirmation screen
        this.quizPhase.set('confirmation');
      }
    } catch (err: any) {
      if (!this.error()) {
        this.error.set(err?.message || 'Không thể tải bài kiểm tra');
      }
      this.quizPhase.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  /** User confirmed — fetch questions, create attempt, start timer */
  async confirmAndStart(accessPassword?: string): Promise<void> {
    this.loading.set(true);
    this.quizPhase.set('loading');

    try {
      // Fetch questions NOW (not during preflight)
      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(this.quizId));

      if (questions.length === 0) {
        this.error.set('Bài kiểm tra này chưa có câu hỏi nào.');
        this.quizPhase.set('error');
        return;
      }

      this.questions.set(this.mapQuestions(questions));

      // Create attempt on server
      await this.doStartAttempt(accessPassword);

      // Use server-computed effectiveTimeLimitSeconds if available (accounts for lockAt proximity)
      const preflight = this.preflightData();
      if (preflight?.effectiveTimeLimitSeconds != null) {
        this.timeRemaining.set(preflight.effectiveTimeLimitSeconds);
      }
      // Set lockAtMs for wall-clock enforcement during the timer tick
      this.lockAtMs.set(preflight?.lockAt ? new Date(preflight.lockAt).getTime() : null);

      this.quizPhase.set('in-progress');
      this.startTimer();
      this.startAutoSave();
    } catch (err: any) {
      if (!this.error()) {
        const msg = err?.error?.message || err?.message || '';
        if (msg.toLowerCase().includes('mật khẩu') || msg.toLowerCase().includes('password') || msg.includes('QUIZ_PASSWORD_REQUIRED')) {
          this.passwordError.set('Mật khẩu không đúng. Vui lòng thử lại.');
          this.quizPhase.set('password');
        } else {
          this.error.set(msg || 'Không thể bắt đầu bài kiểm tra');
          this.quizPhase.set('error');
        }
      } else {
        this.quizPhase.set('error');
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Resume an in-progress attempt — restore answers + server-calculated timer */
  async resumeAttempt(): Promise<void> {
    this.loading.set(true);
    this.quizPhase.set('loading');

    try {
      const preflight = this.preflightData();
      const resume = preflight?.inProgressAttempt;
      if (!resume) {
        this.error.set('Không tìm thấy bài đang làm dở.');
        this.quizPhase.set('error');
        return;
      }

      // Set attemptId from resume (DON'T call startAttempt — reuse existing)
      this.attemptId = resume.attemptId;

      // Fetch questions
      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(this.quizId));
      this.questions.set(this.mapQuestions(questions));

      // Restore saved answers (all question types)
      const restored: Record<string, string | string[]> = {};
      for (const ans of resume.savedAnswers || []) {
        if (ans.selectedOption) {
          restored[ans.questionId] = ans.selectedOption;
        } else if (Array.isArray((ans.studentAnswer as any)?.selectedOptions)) {
          restored[ans.questionId] = (ans.studentAnswer as any).selectedOptions as string[];
        } else if ((ans.studentAnswer as any)?.textAnswer != null) {
          restored[ans.questionId] = String((ans.studentAnswer as any).textAnswer);
        }
      }
      this.answers.set(restored);

      // If timer is already running from resume-prompt countdown, keep the accurate value
      // Only set from server if timer wasn't started yet
      if (!this.timerInterval && resume.timeRemainingSeconds != null) {
        this.timeRemaining.set(resume.timeRemainingSeconds);
      }

      // Set lockAtMs for wall-clock enforcement (server already accounted for lockAt in timeRemainingSeconds,
      // but we still need the wall-clock check in case the student keeps the tab open past lockAt)
      this.lockAtMs.set(preflight?.lockAt ? new Date(preflight.lockAt).getTime() : null);

      this.quizPhase.set('in-progress');
      this.startTimer();
      this.startAutoSave();
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tiếp tục bài làm');
      this.quizPhase.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  /** Open password modal overlay on top of confirmation screen */
  openPasswordModal(): void {
    this.passwordInput.set('');
    this.passwordError.set('');
    this.quizPhase.set('password');
  }

  /** Cancel password modal — go back to confirmation screen */
  cancelPassword(): void {
    this.passwordInput.set('');
    this.passwordError.set('');
    this.quizPhase.set('confirmation');
  }

  /** Submit password then start the attempt */
  async submitPassword(): Promise<void> {
    const pw = this.passwordInput().trim();
    if (!pw) {
      this.passwordError.set('Vui lòng nhập mật khẩu.');
      return;
    }
    this.passwordError.set('');
    await this.confirmAndStart(pw);
  }

  private async doStartAttempt(accessPassword?: string): Promise<void> {
    try {
      const attemptResponse: any = await firstValueFrom(this.quizApi.startAttempt(this.quizId, accessPassword));
      const attempt = attemptResponse?.data || attemptResponse;
      if (attempt?.id) {
        this.attemptId = attempt.id;
      }
    } catch (attemptErr: any) {
      const msg = attemptErr?.error?.message || attemptErr?.message || '';
      const msgLower = msg.toLowerCase();
      if (msgLower.includes('mật khẩu') || msgLower.includes('password') || msg.includes('QUIZ_PASSWORD_REQUIRED')) {
        throw attemptErr;
      }
      if (msg.includes('tối đa') || msg.includes('max')) {
        this.error.set('Bạn đã sử dụng hết số lần làm bài cho phép.');
        throw attemptErr;
      }
      // Re-throw all other errors (QUIZ_LOCKED, QUIZ_NOT_YET_AVAILABLE, etc.)
      throw attemptErr;
    }
  }

  private isSectionQuizMode(): boolean {
    return this.quizMode === 'section';
  }

  /** Toggle a question's flag/bookmark state */
  toggleFlag(questionId: string): void {
    this.flaggedQuestions.update(set => {
      const next = new Set(set);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  isFlagged(questionId: string): boolean {
    return this.flaggedQuestions().has(questionId);
  }

  private applyQuizSettings(quiz: {
    id: string;
    title?: string;
    quizType?: string;
    allowOffline?: boolean;
    requiresPassword?: boolean;
    timeLimitMinutes?: number | null;
    maxAttempts?: number;
    passingScore?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResultsImmediately?: boolean;
    showCorrectAnswers?: boolean;
    availableFrom?: string | null;
    dueAt?: string | null;
    lockAt?: string | null;
  }): void {
    this.quizId = quiz.id;
    this.quizType.set(this.normalizeAssessmentType(quiz.quizType));
    this.allowOfflineQuiz.set(quiz.allowOffline === true);
    this.requiresPassword.set(quiz.requiresPassword === true);

    if (quiz.title) this.quizTitle.set(quiz.title);
    if (quiz.timeLimitMinutes) this.timeRemaining.set(quiz.timeLimitMinutes * 60);

    // Pre-populate lockAtMs from quiz metadata so the wall-clock check is ready
    // before preflight completes (e.g. section quiz mode which skips preflight)
    if (quiz.lockAt) {
      this.lockAtMs.set(new Date(quiz.lockAt).getTime());
    }

    this.quizSettings.set({
      timeLimitMinutes: quiz.timeLimitMinutes || null,
      maxAttempts: quiz.maxAttempts || 1,
      passingScore: quiz.passingScore || 60,
      shuffleQuestions: quiz.shuffleQuestions || false,
      shuffleOptions: quiz.shuffleOptions || false,
      showResultsImmediately: quiz.showResultsImmediately !== false,
      showCorrectAnswers: quiz.showCorrectAnswers === true,
    });
  }

  private async blockIfStalePackageDisallowsAssessment(allowOffline: boolean): Promise<boolean> {
    if (!this.courseId || allowOffline) {
      return false;
    }

    const downloadedCourse = await this.courseDownloadService.getDownloadedCourse(this.courseId);
    if (!downloadedCourse?.isStale) {
      return false;
    }

    this.stalePackageBlocked.set(true);
    this.error.set(getOfflineCourseStaleCopy(downloadedCourse.staleReason).assessmentBlockedMessage);
    return true;
  }

  private mapQuestions(rawQuestions: any[]): QuizQuestion[] {
    let mappedQuestions = rawQuestions.map(q => this.mapQuestion(q));

    const settings = this.quizSettings();
    if (settings.shuffleQuestions) {
      mappedQuestions = this.shuffleArray(mappedQuestions);
    }
    if (settings.shuffleOptions) {
      mappedQuestions = mappedQuestions.map(q => ({
        ...q,
        options: q.questionType !== 'TRUE_FALSE' ? this.shuffleArray([...q.options]) : q.options
      }));
    }

    return mappedQuestions;
  }

  private mapQuestion(question: any): QuizQuestion {
    return {
      id: question.id,
      content: question.content,
      contentBlocks: this.normalizeContentBlocks(
        question.contentBlocks || question.structuredContent,
        question.content,
      ),
      difficulty: question.difficulty,
      questionType: question.questionType || 'SINGLE_CHOICE',
      correctOption: question.correctOption,
      answerKey: question.answerKey || null,
      options: (question.options || [])
        .map((option: any) => ({
          key: option.optionKey || option.key,
          content: option.content,
          contentBlocks: this.normalizeOptionBlocks(option),
        }))
        .sort((a: any, b: any) => a.key.localeCompare(b.key)),
    };
  }

  private normalizeOptionBlocks(option: any): any[] {
    return this.normalizeContentBlocks(option.contentBlocks, option.content);
  }

  private normalizeContentBlocks(rawBlocks: unknown, fallbackContent?: string): any[] {
    let blocks = rawBlocks;

    if (typeof blocks === 'string' && blocks.trim().startsWith('[')) {
      try {
        blocks = JSON.parse(blocks);
      } catch {
        blocks = [];
      }
    }

    if (!Array.isArray(blocks)) {
      blocks = [];
    }

    const normalized = (blocks as any[])
      .map((block: any) => this.normalizeTextLikeBlock(block))
      .filter(Boolean);

    if (normalized.length > 0) {
      return normalized;
    }

    if (fallbackContent) {
      return [this.buildTextBlock(fallbackContent)];
    }

    return [];
  }

  private normalizeTextLikeBlock(block: any): any {
    if (!block || typeof block !== 'object') {
      return block;
    }

    if (block.type !== 'text' || !block.data || typeof block.data !== 'object') {
      return block;
    }

    const value = block.data.html ?? block.data.text ?? block.data.content;
    if (typeof value !== 'string' || !value.trim()) {
      return block;
    }

    if (block.data.html != null || block.data.text != null) {
      return block;
    }

    return {
      ...block,
      data: {
        ...block.data,
        text: value,
      },
    };
  }

  private buildTextBlock(content: string): any {
    return {
      type: 'text',
      data: {
        text: content,
      },
    };
  }

  private async loadOnlineSectionQuiz(): Promise<void> {
    if (!this.lessonId || !this.sectionId) {
      throw new Error('Thiếu thông tin section quiz');
    }

    const quiz = await firstValueFrom(this.quizApi.getSectionQuiz(this.lessonId, this.sectionId));
    this.applyQuizSettings(quiz);
    if (await this.blockIfStalePackageDisallowsAssessment(this.allowOfflineQuiz())) {
      return;
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      this.error.set('Bài kiểm tra này chưa có câu hỏi nào.');
      return;
    }

    this.questions.set(this.mapQuestions(quiz.questions));
    this.quizPhase.set('in-progress');
    this.startTimer();
  }

  /**
   * Load quiz from offline IndexedDB (no network required).
   * Questions are downloaded during course download (without correct answers).
   * Submission is queued for server-side grading when back online.
   */
  private async loadOfflineQuiz(): Promise<void> {
    try {
      if (!this.allowOfflineQuiz()) {
        this.error.set('Bài kiểm tra này chỉ hỗ trợ trực tuyến để bảo toàn tính nghiêm túc của đánh giá.');
        return;
      }

      const offlineQuiz = this.lessonId
        ? await this.offlineQuizService.getQuizForLesson(
            this.lessonId,
            this.isSectionQuizMode() ? this.sectionId : undefined,
          )
        : await this.offlineQuizService.getQuizById(
            this.quizReferenceId,
            this.isSectionQuizMode() ? this.sectionId : undefined,
          );

      if (!offlineQuiz || offlineQuiz.questions.length === 0) {
        this.error.set('Bài kiểm tra không có sẵn ngoại tuyến. Vui lòng kết nối mạng để làm bài.');
        return;
      }

      this.quizId = offlineQuiz.quizId;
      this.quizTitle.set(offlineQuiz.title);
      this.isOfflineMode.set(true);
      this.quizType.set(this.normalizeAssessmentType(offlineQuiz.quizType));
      this.allowOfflineQuiz.set(offlineQuiz.allowOffline === true);

      if (offlineQuiz.timeLimit) {
        this.timeRemaining.set(offlineQuiz.timeLimit * 60);
      }

      this.quizSettings.set({
        timeLimitMinutes: offlineQuiz.timeLimit || null,
        maxAttempts: offlineQuiz.maxAttempts || 1,
        passingScore: offlineQuiz.passingScore,
        shuffleQuestions: offlineQuiz.shuffleQuestions === true,
        shuffleOptions: offlineQuiz.shuffleOptions === true,
        showResultsImmediately: offlineQuiz.showResultsImmediately !== false,
        showCorrectAnswers: offlineQuiz.showCorrectAnswers === true,
      });

      const questions: QuizQuestion[] = offlineQuiz.questions.map(q => ({
        id: q.id,
        content: q.content,
        contentBlocks: this.normalizeContentBlocks(q.contentBlocks, q.content),
        difficulty: 'MEDIUM',
        questionType: q.questionType as QuestionType,
        correctOption: null,
        answerKey: null,
        options: q.options
          .map(o => ({
            key: o.optionKey,
            content: o.content,
            contentBlocks: this.normalizeContentBlocks(o.contentBlocks, o.content),
          }))
          .sort((a, b) => a.key.localeCompare(b.key)),
      }));

      this.questions.set(questions);
      this.quizPhase.set('in-progress');
      this.startTimer();
    } catch {
      this.error.set('Không thể tải dữ liệu bài kiểm tra ngoại tuyến.');
      this.quizPhase.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  startTimer() {
    this.stopTimer(); // Clear any existing timer to prevent double intervals
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.timeRemaining.update(t => Math.max(0, t - 1));
      this.timeSpent.set(Math.floor((Date.now() - this.startTime) / 1000));

      // Wall-clock lockAt enforcement: force-submit the moment real time passes lockAt,
      // even if the countdown hasn't reached zero yet (e.g. system clock skew / tab sleep)
      const lockAt = this.lockAtMs();
      if (lockAt !== null && Date.now() >= lockAt) {
        const phase = this.quizPhase();
        if (phase === 'in-progress' || phase === 'review') {
          this.toast.warning('Đã hết hạn nộp bài! Bài làm đang được nộp tự động...');
          this.showSubmitConfirmModal.set(false);
          this.lockAtMs.set(null); // prevent re-trigger on next tick
          this.submitQuiz();
          return;
        }
      }

      if (this.timeRemaining() === 0) {
        const phase = this.quizPhase();
        if (phase === 'resume-prompt') {
          this.forceResumeAndSubmit();
        } else if (phase === 'in-progress' || phase === 'review') {
          this.toast.warning('Hết thời gian! Bài làm đang được nộp tự động...');
          this.showSubmitConfirmModal.set(false);
          this.submitQuiz();
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  selectAnswer(questionId: string, optionKey: string) {
    if (this.showResults()) return;
    this.answers.update(ans => ({ ...ans, [questionId]: optionKey }));
  }

  toggleMultipleChoice(questionId: string, optionKey: string) {
    if (this.showResults()) return;
    this.answers.update(ans => {
      const current = ans[questionId];
      const selected = Array.isArray(current) ? [...current] : [];
      const idx = selected.indexOf(optionKey);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else {
        selected.push(optionKey);
      }
      return { ...ans, [questionId]: selected };
    });
  }

  isMultipleChoiceSelected(questionId: string, optionKey: string): boolean {
    const val = this.answers()[questionId];
    return Array.isArray(val) && val.includes(optionKey);
  }

  updateTextAnswer(questionId: string, text: string) {
    if (this.showResults()) return;
    this.answers.update(ans => ({ ...ans, [questionId]: text }));
  }

  getTextAnswer(questionId: string): string {
    const val = this.answers()[questionId];
    return typeof val === 'string' ? val : '';
  }

  isAnswered(questionId: string): boolean {
    const val = this.answers()[questionId];
    if (val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    return val !== '';
  }

  getQuestionTypeLabel(type: string): string {
    switch (type) {
      case 'SINGLE_CHOICE': return 'Một đáp án';
      case 'MULTIPLE_CHOICE': return 'Nhiều đáp án';
      case 'TRUE_FALSE': return 'Đúng/Sai';
      case 'FILL_IN_BLANK': return 'Điền khuyết';
      case 'SHORT_ANSWER': return 'Trả lời ngắn';
      case 'ESSAY': return 'Tự luận';
      default: return '';
    }
  }

  /** In review mode: is this option the one student selected AND server confirmed correct? */
  isOptCorrectInReview(question: QuizQuestion, optKey: string): boolean {
    if (!this.showResults() || !this.quizSettings().showCorrectAnswers) return false;
    const selected = this.answers()[question.id];
    const wasSelected = Array.isArray(selected) ? selected.includes(optKey) : selected === optKey;
    if (!wasSelected) return false;
    // MULTIPLE_CHOICE: per-option grading using server-provided correctOptions list
    if (question.questionType === 'MULTIPLE_CHOICE') {
      const correctOptions = this.serverCorrectOptionsArrayMap()[question.id];
      if (correctOptions) return correctOptions.includes(optKey);
      return false; // no server data — don't guess
    }
    // SINGLE_CHOICE / TRUE_FALSE: whole-question correctness
    const serverMap = this.serverIsCorrectMap();
    return question.id in serverMap && serverMap[question.id] === true;
  }

  /** In review mode: is this option the one student selected AND it was wrong? */
  isOptWrongInReview(question: QuizQuestion, optKey: string): boolean {
    if (!this.showResults() || !this.quizSettings().showCorrectAnswers) return false;
    const selected = this.answers()[question.id];
    const wasSelected = Array.isArray(selected) ? selected.includes(optKey) : selected === optKey;
    if (!wasSelected) return false;
    // MULTIPLE_CHOICE: this selected option is wrong if it is NOT in the correct options list
    if (question.questionType === 'MULTIPLE_CHOICE') {
      const correctOptions = this.serverCorrectOptionsArrayMap()[question.id];
      if (correctOptions) return !correctOptions.includes(optKey);
      return false;
    }
    // SINGLE_CHOICE / TRUE_FALSE: whole-question wrong → the selected option was wrong
    const serverMap = this.serverIsCorrectMap();
    return question.id in serverMap && serverMap[question.id] === false;
  }

  /**
   * In review mode (showCorrectAnswers=true): is this the correct option but student did NOT select it?
   * Uses server-provided correctOption / correctOptions.
   */
  isOptCorrectUnselected(question: QuizQuestion, optKey: string): boolean {
    if (!this.showResults() || !this.quizSettings().showCorrectAnswers) return false;
    const selected = this.answers()[question.id];
    const wasSelected = Array.isArray(selected) ? selected.includes(optKey) : selected === optKey;
    if (wasSelected) return false; // Already handled by isOptCorrectInReview
    // MULTIPLE_CHOICE: reveal correct options that the student did not select
    if (question.questionType === 'MULTIPLE_CHOICE') {
      const correctOptions = this.serverCorrectOptionsArrayMap()[question.id];
      if (!correctOptions) return false;
      return correctOptions.includes(optKey);
    }
    // SINGLE_CHOICE / TRUE_FALSE: only reveal when question was answered wrong
    const serverMap = this.serverIsCorrectMap();
    const questionWrong = question.id in serverMap && serverMap[question.id] === false;
    if (!questionWrong) return false;
    const serverCorrectOption = this.serverCorrectOptionsMap()[question.id];
    const effectiveCorrectOption = serverCorrectOption ?? question.correctOption;
    return effectiveCorrectOption === optKey;
  }

  isQuestionCorrect(question: QuizQuestion): boolean | null {
    // SECURITY: Hide correct/wrong indicators unless teacher explicitly allows
    if (!this.quizSettings().showCorrectAnswers) return null;
    const serverMap = this.serverIsCorrectMap();
    if (question.id in serverMap) return serverMap[question.id];
    return null;
  }

  prevPage() {
    if (this.currentPage() > 0) {
      const newPage = this.currentPage() - 1;
      this.currentPage.set(newPage);
      this.currentQuestionIndex.set(newPage * this.QUESTIONS_PER_PAGE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      const newPage = this.currentPage() + 1;
      this.currentPage.set(newPage);
      this.currentQuestionIndex.set(newPage * this.QUESTIONS_PER_PAGE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToPage(pageIndex: number) {
    if (pageIndex >= 0 && pageIndex < this.totalPages()) {
      this.currentPage.set(pageIndex);
      this.currentQuestionIndex.set(pageIndex * this.QUESTIONS_PER_PAGE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToQuestion(index: number) {
    const page = Math.floor(index / this.QUESTIONS_PER_PAGE);
    this.currentPage.set(page);
    this.currentQuestionIndex.set(index);
    if (this.showResults() && !this.showResultsModal()) {
      // Review mode (after submit): scroll to the specific question card
      setTimeout(() => {
        const el = document.getElementById(`quiz-question-${index}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async submitQuiz() {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.quizPhase.set('submitting');
    this.stopTimer();
    this.stopAutoSave();

    // Offline mode: queue submission for later sync; no client-side grading
    if (this.isOfflineMode()) {
      await this.offlineQuizService.queueOfflineSubmission({
        quizId: this.quizId,
        lessonId: this.lessonId,
        courseId: this.courseId,
        sectionId: this.isSectionQuizMode() ? this.sectionId : undefined,
        mode: this.quizMode,
        localAttemptId: crypto.randomUUID(),
        answers: this.answers() as Record<string, string | number | string[]>,
        submittedAt: new Date(),
      });
      this.showResults.set(true);
      this.showResultsModal.set(true);
      this.quizPhase.set('results');
      this.submitting.set(false);
      return;
    }

    if (this.isSectionQuizMode()) {
      try {
        const answersArray = this.buildAnswersForSubmission();
        const result: any = await firstValueFrom(
          this.quizApi.submitSectionQuiz(this.lessonId, this.sectionId, answersArray)
        );
        const data = result?.data || result;
        this.applySubmissionResult(data);
      } catch {
        this.handleSubmitFailure('Không thể nộp bài kiểm tra này. Vui lòng thử lại.');
        return;
      }

      this.showResults.set(true);
      this.quizPhase.set('results');
      if (this.quizSettings().showResultsImmediately) {
        this.showResultsModal.set(true);
      }
      this.submitting.set(false);
      return;
    }

    if (!this.attemptId || !this.quizId) {
      this.handleSubmitFailure('Phiên làm bài chưa sẵn sàng để nộp. Vui lòng thử lại.');
      return;
    }

    try {
      const answersArray = this.buildAnswersForSubmission();
      const result: any = await firstValueFrom(this.quizApi.submitAttempt(this.attemptId, answersArray));
      const data = result?.data || result;
      this.applySubmissionResult(data);
    } catch {
      this.handleSubmitFailure('Không thể nộp bài kiểm tra này. Vui lòng thử lại.');
      return;
    }

    this.showResults.set(true);
    this.quizPhase.set('results');
    if (this.quizSettings().showResultsImmediately) {
      this.showResultsModal.set(true);
    }
    this.submitting.set(false);
  }

  private handleSubmitFailure(message: string): void {
    this.submitting.set(false);
    this.quizPhase.set('in-progress');
    this.toast.error(message);

    if (this.timeRemaining() > 0) {
      this.startTimer();
    }

    if (!this.isSectionQuizMode()) {
      this.startAutoSave();
    }
  }

  private buildAnswersForSubmission(): any[] {
    const ans = this.answers();
    const questions = this.questions();

    return questions
      .filter(q => ans[q.id] !== undefined)
      .map(q => {
        const answer = ans[q.id];
        let selectedOption: string | undefined;
        let studentAnswer: Record<string, unknown> = {};

        switch (q.questionType) {
          case 'SINGLE_CHOICE':
            selectedOption = answer as string;
            studentAnswer = { selectedOption: answer };
            break;
          case 'TRUE_FALSE':
            selectedOption = answer as string;
            studentAnswer = { selectedOption: answer };
            break;
          case 'MULTIPLE_CHOICE':
            studentAnswer = { selectedOptions: Array.isArray(answer) ? answer : [answer] };
            break;
          case 'FILL_IN_BLANK':
          case 'SHORT_ANSWER':
          case 'ESSAY':
            studentAnswer = { textAnswer: answer };
            break;
        }

        return {
          questionId: q.id,
          selectedOption: selectedOption || null,
          studentAnswer
        };
      });
  }

  private applySubmissionResult(data: any): void {
    if (data?.score != null) {
      this.serverScore.set(data.score);
    }
    if (data?.maxScore != null) {
      this.serverMaxScore.set(data.maxScore);
    }
    if (data?.isPassed != null) {
      this.serverPassed.set(Boolean(data.isPassed));
    }
    if (data?.correctAnswers != null) {
      this.serverCorrectCount.set(data.correctAnswers);
    } else if (Array.isArray(data?.items) && data.items.length > 0) {
      const correct = (data.items as any[]).filter(i => i.isCorrect === true).length;
      this.serverCorrectCount.set(correct);
    }
    if (Array.isArray(data?.items)) {
      const isCorrectMap: Record<string, boolean> = {};
      const correctOptionsMap: Record<string, string> = {};
      const correctOptionsArrayMap: Record<string, string[]> = {};
      for (const item of data.items as any[]) {
        if (item.questionId != null && item.isCorrect != null) {
          isCorrectMap[item.questionId] = item.isCorrect;
        }
        if (item.questionId != null && item.correctOption != null) {
          correctOptionsMap[item.questionId] = item.correctOption;
        }
        if (item.questionId != null && Array.isArray(item.correctOptions) && item.correctOptions.length > 0) {
          correctOptionsArrayMap[item.questionId] = item.correctOptions as string[];
        }
      }
      this.serverIsCorrectMap.set(isCorrectMap);
      this.serverCorrectOptionsMap.set(correctOptionsMap);
      this.serverCorrectOptionsArrayMap.set(correctOptionsArrayMap);
    }
    // Decrement attemptsRemaining after successful submission so the retake
    // button shows the correct remaining count without a second preflight fetch.
    const pd = this.preflightData();
    if (pd?.attemptsRemaining != null && pd.attemptsRemaining > 0) {
      this.preflightData.set({ ...pd, attemptsRemaining: pd.attemptsRemaining - 1 });
    }
  }

  closeResults() {
    this.showResultsModal.set(false);
  }

  /**
   * Retake quiz — Canvas SOTA: goes through full preflight → confirmation → new attempt.
   * Never reuses the old attemptId (which would cause 409 Conflict).
   */
  retakeQuiz(): void {
    this.stopTimer();
    this.stopAutoSave();

    // Reset all result state
    this.answers.set({});
    this.currentPage.set(0);
    this.showResults.set(false);
    this.showResultsModal.set(false);
    this.showSubmitConfirmModal.set(false);
    this.serverScore.set(null);
    this.serverMaxScore.set(10);
    this.serverCorrectCount.set(null);
    this.serverPassed.set(null);
    this.serverIsCorrectMap.set({});
    this.serverCorrectOptionsMap.set({});
    this.serverCorrectOptionsArrayMap.set({});
    this.submitting.set(false);
    this.timeSpent.set(0);

    // Section quiz (no attempt tracking): simple client-side reset
    if (this.isSectionQuizMode()) {
      this.timeRemaining.set((this.quizSettings().timeLimitMinutes || 30) * 60);
      this.quizPhase.set('in-progress');
      this.startTimer();
      return;
    }

    // Tracked quiz: clear attempt + reload full flow (preflight checks attempts remaining)
    this.attemptId = '';
    this.questions.set([]);
    this.loadQuiz();
  }

  toggleSidebar() {
    this.sidebarVisible.update(v => !v);
  }

  startAutoSave() {
    if (this.isSectionQuizMode() || !this.attemptId) return;
    this.autoSaveInterval = setInterval(() => this.doAutoSave(), this.AUTO_SAVE_INTERVAL_MS);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  private async doAutoSave() {
    if (this.isSectionQuizMode() || !this.attemptId || this.showResults() || this.submitting()) return;
    const answersArray = this.buildAnswersForSubmission();
    if (answersArray.length === 0) return;

    this.autoSaveStatus.set('saving');
    try {
      await firstValueFrom(this.quizApi.saveAttemptProgress(this.attemptId, answersArray));
      this.autoSaveStatus.set('saved');
      setTimeout(() => {
        if (this.autoSaveStatus() === 'saved') this.autoSaveStatus.set('idle');
      }, 3000);
    } catch {
      this.autoSaveStatus.set('error');
    }
  }

  /** Navigate to review/summary page before submitting (Canvas/Moodle SOTA) */
  goToReview(): void {
    this.doAutoSave();
    this.quizPhase.set('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Return from review page to continue answering */
  backToQuiz(): void {
    this.quizPhase.set('in-progress');
  }

  openSubmitConfirm(): void {
    this.showSubmitConfirmModal.set(true);
  }

  cancelSubmitConfirm(): void {
    this.showSubmitConfirmModal.set(false);
  }

  async doConfirmedSubmit(): Promise<void> {
    this.showSubmitConfirmModal.set(false);
    await this.submitQuiz();
  }

  /** Force resume and submit when time expires on resume-prompt screen */
  private async forceResumeAndSubmit(): Promise<void> {
    this.stopTimer();
    this.quizPhase.set('loading');

    try {
      const preflight = this.preflightData();
      const resume = preflight?.inProgressAttempt;
      if (!resume) {
        this.error.set('Hết thời gian làm bài.');
        this.quizPhase.set('error');
        return;
      }

      this.attemptId = resume.attemptId;

      // Fetch questions to build submission payload
      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(this.quizId));
      this.questions.set(this.mapQuestions(questions));

      // Restore saved answers (all question types)
      const restored: Record<string, string | string[]> = {};
      for (const ans of resume.savedAnswers || []) {
        if (ans.selectedOption) {
          restored[ans.questionId] = ans.selectedOption;
        } else if (Array.isArray((ans.studentAnswer as any)?.selectedOptions)) {
          restored[ans.questionId] = (ans.studentAnswer as any).selectedOptions as string[];
        } else if ((ans.studentAnswer as any)?.textAnswer != null) {
          restored[ans.questionId] = String((ans.studentAnswer as any).textAnswer);
        }
      }
      this.answers.set(restored);

      this.toast.warning('Hết thời gian! Bài làm đang được nộp tự động...');
      await this.submitQuiz();
    } catch {
      this.error.set('Hết thời gian làm bài.');
      this.quizPhase.set('error');
    }
  }

  goBack() {
    this.stopTimer();
    if (this.returnUrl && this.returnUrl !== '/student/learn/course') {
      const separator = this.returnUrl.includes('?') ? '&' : '?';
      let url = this.returnUrl;
      if (this.showResults()) {
        if (this.isSectionQuizMode() && !this.isOfflineMode()) {
          const passed = this.serverPassed() ?? (this.scorePercent() >= this.quizSettings().passingScore);
          url = `${this.returnUrl}${separator}sectionQuizCompleted=true&completedSectionId=${encodeURIComponent(this.sectionId)}&passed=${passed}`;
        } else if (this.attemptId) {
          url = `${this.returnUrl}${separator}quizCompleted=true&attemptId=${this.attemptId}`;
        }
      }
      this.router.navigateByUrl(url);
    } else {
      this.router.navigate(['/student/courses']);
    }
  }

  openStorageManagement(): void {
    this.stopTimer();
    this.router.navigate(['/student/storage']);
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private normalizeAssessmentType(value: string | null | undefined): 'PRACTICE' | 'ASSESSMENT' | 'EXAM' {
    const normalized = (value || '').toUpperCase();
    if (normalized === 'PRACTICE' || normalized === 'EXAM') {
      return normalized;
    }
    return 'ASSESSMENT';
  }
}
