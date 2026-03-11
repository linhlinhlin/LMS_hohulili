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

  Math = Math;

  quizReferenceId = '';
  quizId = '';
  attemptId = '';
  lessonId = '';
  courseId = '';
  quizTitle = signal('Bài kiểm tra');
  returnUrl = '';
  /** True when taking quiz from offline IndexedDB (no server connection) */
  isOfflineMode = signal(false);

  loading = signal(true);
  error = signal<string | null>(null);
  questions = signal<QuizQuestion[]>([]);
  answers = signal<Record<string, string | string[]>>({});
  showResults = signal(false);
  showResultsModal = signal(true);
  serverScore = signal<number | null>(null);
  serverCorrectCount = signal<number | null>(null);
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

    // Offline mode: load quiz from IndexedDB
    if (!this.network.online()) {
      await this.loadOfflineQuiz();
      return;
    }

    try {
      const quiz = await firstValueFrom(this.quizApi.getQuizByReference(this.quizReferenceId));
      this.quizId = quiz.id;

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

      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(this.quizId));

      if (questions.length === 0) {
        this.error.set('Bài kiểm tra này chưa có câu hỏi nào.');
        return;
      }

      let mappedQuestions: QuizQuestion[] = questions.map((q: any) => {
        let qBlocks = q.contentBlocks || q.structuredContent || [];
        if (!qBlocks.length && q.content) {
          qBlocks = [{ type: 'text', data: { text: q.content } }];
        }

        return {
          id: q.id,
          content: q.content,
          contentBlocks: qBlocks,
          difficulty: q.difficulty,
          questionType: q.questionType || 'SINGLE_CHOICE',
          correctOption: q.correctOption,
          answerKey: q.answerKey || null,
          options: (q.options || []).map((opt: any) => {
            let blocks = opt.contentBlocks || [];

            if (!blocks.length && typeof opt.content === 'string' && opt.content.trim().startsWith('[')) {
              try {
                blocks = JSON.parse(opt.content);
              } catch {
                blocks = [{ type: 'text', data: { text: opt.content } }];
              }
            } else if (!blocks.length && opt.content) {
              blocks = [{ type: 'text', data: { text: opt.content } }];
            }

            return {
              key: opt.optionKey || opt.key,
              content: opt.content,
              contentBlocks: blocks
            };
          }).sort((a: any, b: any) => a.key.localeCompare(b.key))
        };
      });

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

  /**
   * Load quiz from offline IndexedDB (no network required).
   * Questions are downloaded during course download (without correct answers).
   * Submission is queued for server-side grading when back online.
   */
  private async loadOfflineQuiz(): Promise<void> {
    try {
      const offlineQuiz = this.lessonId
        ? await this.offlineQuizService.getQuizForLesson(this.lessonId)
        : await this.offlineQuizService.getQuizById(this.quizReferenceId);

      if (!offlineQuiz || offlineQuiz.questions.length === 0) {
        this.error.set('Bài kiểm tra không có sẵn ngoại tuyến. Vui lòng kết nối mạng để làm bài.');
        return;
      }

      this.quizId = offlineQuiz.quizId;
      this.quizTitle.set(offlineQuiz.title);
      this.isOfflineMode.set(true);

      if (offlineQuiz.timeLimit) {
        this.timeRemaining.set(offlineQuiz.timeLimit * 60);
      }

      this.quizSettings.set({
        timeLimitMinutes: offlineQuiz.timeLimit || null,
        maxAttempts: 1,
        passingScore: offlineQuiz.passingScore,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResultsImmediately: true,
        showCorrectAnswers: false, // Correct answers not stored offline (academic integrity)
      });

      const questions: QuizQuestion[] = offlineQuiz.questions.map(q => ({
        id: q.id,
        content: q.content,
        contentBlocks: [{ type: 'text', data: { text: q.content } }],
        difficulty: 'MEDIUM',
        questionType: q.questionType as QuestionType,
        correctOption: null,
        answerKey: null,
        options: q.options.map(o => ({
          key: o.optionKey,
          content: o.content,
          contentBlocks: [{ type: 'text', data: { text: o.content } }],
        })).sort((a, b) => a.key.localeCompare(b.key)),
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
        localAttemptId: crypto.randomUUID(),
        answers: this.answers() as Record<string, string | number>,
        submittedAt: new Date(),
      });
      this.showResults.set(true);
      this.showResultsModal.set(true);
      this.submitting.set(false);
      return;
    }

    if (this.attemptId && this.quizId) {
      try {
        const answersArray = this.buildAnswersForSubmission();
        const result: any = await firstValueFrom(this.quizApi.submitAttempt(this.attemptId, answersArray));
        const data = result?.data || result;
        if (data?.score != null) {
          this.serverScore.set(data.score);
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
      } catch {
        // Non-blocking: show local results if server fails
      }
    }

    this.showResults.set(true);
    if (this.quizSettings().showResultsImmediately) {
      this.showResultsModal.set(true);
    }
    this.submitting.set(false);
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
    this.serverIsCorrectMap.set({});
    this.timeRemaining.set((this.quizSettings().timeLimitMinutes || 30) * 60);
    this.timeSpent.set(0);
    this.startTimer();
  }

  toggleSidebar() {
    this.sidebarVisible.update(v => !v);
  }

  startAutoSave() {
    if (!this.attemptId) return;
    this.autoSaveInterval = setInterval(() => this.doAutoSave(), this.AUTO_SAVE_INTERVAL_MS);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  private async doAutoSave() {
    if (!this.attemptId || this.showResults() || this.submitting()) return;
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
      const url = this.showResults() && this.attemptId
        ? `${this.returnUrl}${separator}quizCompleted=true&attemptId=${this.attemptId}`
        : this.returnUrl;
      this.router.navigateByUrl(url);
    } else {
      this.router.navigate(['/student/courses']);
    }
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
