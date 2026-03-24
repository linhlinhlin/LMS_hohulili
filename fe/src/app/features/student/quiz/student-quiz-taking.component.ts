import { Component, OnInit, OnDestroy, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-student-quiz-taking',
  imports: [IconComponent, BlockRendererComponent, FormsModule, CommonModule],
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

  loading = signal(true);
  error = signal<string | null>(null);
  questions = signal<QuizQuestion[]>([]);
  answers = signal<Record<string, string | string[]>>({});
  showResults = signal(false);
  showResultsModal = signal(true);
  serverScore = signal<number | null>(null);
  serverCorrectCount = signal<number | null>(null);
  serverPassed = signal<boolean | null>(null);
  /** Map of questionId → isCorrect from server grading (for review highlighting) */
  serverIsCorrectMap = signal<Record<string, boolean>>({});
  submitting = signal(false);

  quizSettings = signal<QuizSettings>({
    timeLimitMinutes: null,
    maxAttempts: 1,
    passingScore: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultsImmediately: true,
    showCorrectAnswers: true,
  });

  sidebarVisible = signal(true);

  readonly QUESTIONS_PER_PAGE = 10;
  currentPage = signal(0);

  timeRemaining = signal(30 * 60);
  timeSpent = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;

  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  private readonly AUTO_SAVE_INTERVAL_MS = 60_000;

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
    if (this.serverScore() !== null) return Math.round(this.serverScore()!);
    if (this.questions().length === 0) return 0;
    return Math.round((this.correctCount() / this.questions().length) * 100);
  });

  ngOnInit() {
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
    this.stopTimer();
    this.stopAutoSave();
  }

  async loadQuiz(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.stalePackageBlocked.set(false);

    if (await this.blockIfStalePackageDisallowsAssessment(this.allowOfflineQuiz())) {
      this.loading.set(false);
      return;
    }

    // Offline mode: load quiz from IndexedDB
    if (!this.network.online()) {
      if (this.lessonId) {
        this.allowOfflineQuiz.set(true);
      }
      await this.loadOfflineQuiz();
      return;
    }

    try {
      if (this.isSectionQuizMode()) {
        await this.loadOnlineSectionQuiz();
        return;
      }

      const quiz = await firstValueFrom(this.quizApi.getQuizByReference(this.quizReferenceId));
      this.applyQuizSettings(quiz);
      if (await this.blockIfStalePackageDisallowsAssessment(this.allowOfflineQuiz())) {
        return;
      }

      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(this.quizId));

      if (questions.length === 0) {
        this.error.set('Bài kiểm tra này chưa có câu hỏi nào.');
        return;
      }

      let mappedQuestions = this.mapQuestions(questions);

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

      this.questions.set(mappedQuestions);

      try {
        const attemptResponse: any = await firstValueFrom(this.quizApi.startAttempt(this.quizId));
        const attempt = attemptResponse?.data || attemptResponse;
        if (attempt?.id) {
          this.attemptId = attempt.id;
        }
      } catch (attemptErr: any) {
        const msg = attemptErr?.error?.message || attemptErr?.message || '';
        if (msg.includes('tối đa') || msg.includes('max') || attemptErr?.status === 400) {
          this.error.set('Bạn đã sử dụng hết số lần làm bài cho phép.');
          return;
        }
      }

      this.startTimer();
      this.startAutoSave();
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải bài kiểm tra');
    } finally {
      this.loading.set(false);
    }
  }

  private isSectionQuizMode(): boolean {
    return this.quizMode === 'section';
  }

  private applyQuizSettings(quiz: {
    id: string;
    title?: string;
    quizType?: string;
    allowOffline?: boolean;
    timeLimitMinutes?: number | null;
    maxAttempts?: number;
    passingScore?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResultsImmediately?: boolean;
    showCorrectAnswers?: boolean;
  }): void {
    this.quizId = quiz.id;
    this.quizType.set(this.normalizeAssessmentType(quiz.quizType));
    this.allowOfflineQuiz.set(quiz.allowOffline === true);

    if (quiz.title) this.quizTitle.set(quiz.title);
    if (quiz.timeLimitMinutes) this.timeRemaining.set(quiz.timeLimitMinutes * 60);

    this.quizSettings.set({
      timeLimitMinutes: quiz.timeLimitMinutes || null,
      maxAttempts: quiz.maxAttempts || 1,
      passingScore: quiz.passingScore || 60,
      shuffleQuestions: quiz.shuffleQuestions || false,
      shuffleOptions: quiz.shuffleOptions || false,
      showResultsImmediately: quiz.showResultsImmediately !== false,
      showCorrectAnswers: quiz.showCorrectAnswers !== false,
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
      this.startTimer();
    } catch {
      this.error.set('Không thể tải dữ liệu bài kiểm tra ngoại tuyến.');
    } finally {
      this.loading.set(false);
    }
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      this.timeRemaining.update(t => Math.max(0, t - 1));
      this.timeSpent.set(Math.floor((Date.now() - this.startTime) / 1000));

      if (this.timeRemaining() === 0) {
        this.submitQuiz();
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

  /** In review mode: is this option the one student selected AND it was correct? */
  isOptCorrectInReview(question: QuizQuestion, optKey: string): boolean {
    if (!this.showResults() || !this.quizSettings().showCorrectAnswers) return false;
    const selected = this.answers()[question.id];
    const serverMap = this.serverIsCorrectMap();
    // Option is green if: it's the known correct answer, OR the student selected it and server says correct
    if (question.correctOption != null) return optKey === question.correctOption;
    if (typeof selected === 'string' && selected === optKey && question.id in serverMap) {
      return serverMap[question.id] === true;
    }
    return false;
  }

  /** In review mode: is this option the one student selected AND it was wrong? */
  isOptWrongInReview(question: QuizQuestion, optKey: string): boolean {
    if (!this.showResults() || !this.quizSettings().showCorrectAnswers) return false;
    const selected = this.answers()[question.id];
    if (typeof selected !== 'string' || selected !== optKey) return false;
    const serverMap = this.serverIsCorrectMap();
    if (question.id in serverMap) return serverMap[question.id] === false;
    return question.correctOption != null && optKey !== question.correctOption;
  }

  isQuestionCorrect(question: QuizQuestion): boolean | null {
    const ans = this.answers()[question.id];
    if (!ans || (Array.isArray(ans) && ans.length === 0)) return null;

    // Prefer server-graded result (student API strips correctOption)
    const serverMap = this.serverIsCorrectMap();
    if (question.id in serverMap) return serverMap[question.id];

    switch (question.questionType) {
      case 'SINGLE_CHOICE':
      case 'TRUE_FALSE':
        return ans === question.correctOption;
      case 'MULTIPLE_CHOICE': {
        if (!question.answerKey) return null;
        const correct = (question.answerKey['correctOptions'] as string[]) || [];
        const selected = Array.isArray(ans) ? ans : [];
        return correct.length === selected.length &&
          correct.every((c: string) => selected.includes(c.toUpperCase()));
      }
      default:
        return null;
    }
  }

  prevPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(p => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToPage(pageIndex: number) {
    if (pageIndex >= 0 && pageIndex < this.totalPages()) {
      this.currentPage.set(pageIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToQuestion(index: number) {
    const page = Math.floor(index / this.QUESTIONS_PER_PAGE);
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async submitQuiz() {
    if (this.submitting()) return;
    this.submitting.set(true);
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
    if (this.quizSettings().showResultsImmediately) {
      this.showResultsModal.set(true);
    }
    this.submitting.set(false);
  }

  private handleSubmitFailure(message: string): void {
    this.submitting.set(false);
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
      const map: Record<string, boolean> = {};
      for (const item of data.items as any[]) {
        if (item.questionId != null && item.isCorrect != null) {
          map[item.questionId] = item.isCorrect;
        }
      }
      this.serverIsCorrectMap.set(map);
    }
  }

  closeResults() {
    this.showResultsModal.set(false);
  }

  resetQuiz() {
    this.answers.set({});
    this.currentPage.set(0);
    this.showResults.set(false);
    this.showResultsModal.set(false);
    this.serverScore.set(null);
    this.serverCorrectCount.set(null);
    this.serverPassed.set(null);
    this.serverIsCorrectMap.set({});
    this.timeRemaining.set((this.quizSettings().timeLimitMinutes || 30) * 60);
    this.timeSpent.set(0);
    this.startTimer();
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
