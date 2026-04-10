import { Component, OnInit, OnDestroy, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { BlockRendererComponent } from '../../../shared/blocks/block-renderer/block-renderer.component';
import { firstValueFrom } from 'rxjs';

interface QuizQuestion {
  id: string;
  content: string;
  contentBlocks: any[];
  difficulty: string;
  questionType: string;
  options: { key: string; content: string; contentBlocks: any[] }[];
  correctOption: string;
  answerKey: Record<string, any> | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quiz-preview',
  imports: [BlockRendererComponent],
  templateUrl: './quiz-preview.component.html',
  styles: [`
    @keyframes scale-in {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-in {
      animation: scale-in 0.3s ease-out;
    }
  `]
})

export class QuizPreviewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizApi = inject(QuizApi);
  
  Math = Math;

  quizReferenceId = '';
  quizId = '';
  quizTitle = signal('Bài kiểm tra');
  returnUrl = '';

  loading = signal(true);
  error = signal<string | null>(null);
  questions = signal<QuizQuestion[]>([]);
  answers = signal<Record<string, string | string[]>>({});
  showResults = signal(false);
  showResultsModal = signal(true);

  readonly QUESTIONS_PER_PAGE = 10;
  currentPage = signal(0);

  timeRemaining = signal(30 * 60);
  timeSpent = signal(0);
  private timerInterval: any;
  private startTime = 0;

  totalPages = computed(() => Math.ceil(this.questions().length / this.QUESTIONS_PER_PAGE));
  
  currentPageQuestions = computed(() => {
    const start = this.currentPage() * this.QUESTIONS_PER_PAGE;
    const end = start + this.QUESTIONS_PER_PAGE;
    return this.questions().slice(start, end);
  });

  getQuestionIndex(pageIndex: number): number {
    return this.currentPage() * this.QUESTIONS_PER_PAGE + pageIndex;
  }

  answeredCount = computed(() => Object.keys(this.answers()).length);
  
  correctCount = computed(() => {
    const ans = this.answers();
    return this.questions().filter(q => this.isQuestionCorrect(q, ans[q.id])).length;
  });

  wrongCount = computed(() => {
    const ans = this.answers();
    return this.questions().filter(q => ans[q.id] && !this.isQuestionCorrect(q, ans[q.id])).length;
  });

  unansweredCount = computed(() => {
    return this.questions().length - Object.keys(this.answers()).length;
  });

  scorePercent = computed(() => {
    if (this.questions().length === 0) return 0;
    return Math.round((this.correctCount() / this.questions().length) * 100);
  });

  ngOnInit() {
    this.quizReferenceId =
      this.route.snapshot.paramMap.get('quizId')
      || this.route.snapshot.paramMap.get('lessonId')
      || '';
    this.quizTitle.set(this.route.snapshot.queryParamMap.get('title') || 'Bài kiểm tra');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/teacher/courses/library';
    this.loadQuiz();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  async loadQuiz() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const quiz = await firstValueFrom(this.quizApi.getQuizByReference(this.quizReferenceId));
      this.quizId = quiz.id;
      if (quiz.title) {
        this.quizTitle.set(quiz.title);
      }
      if (quiz.timeLimitMinutes) {
        this.timeRemaining.set(quiz.timeLimitMinutes * 60);
      }

      const questions = await firstValueFrom(this.quizApi.getQuizQuestions(this.quizId));
      if (questions.length === 0) {
        this.error.set('Bài kiểm tra này chưa có câu hỏi nào.');
        return;
      }
      this.questions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content || '',
        contentBlocks: q.contentBlocks || [],
        difficulty: q.difficulty,
        questionType: q.questionType || 'SINGLE_CHOICE',
        correctOption: q.correctOption,
        answerKey: q.answerKey || null,
        options: (q.options || []).map((opt: any) => ({
          key: opt.optionKey || opt.key,
          content: opt.content || '',
          contentBlocks: opt.contentBlocks || []
        })).sort((a: any, b: any) => a.key.localeCompare(b.key))
      })));
      this.startTimer();
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải bài kiểm tra');
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
      if (selected.length === 0) {
        const { [questionId]: _, ...rest } = ans;
        return rest;
      }
      return { ...ans, [questionId]: selected };
    });
  }

  isMultipleChoiceSelected(questionId: string, optionKey: string): boolean {
    const current = this.answers()[questionId];
    return Array.isArray(current) && current.includes(optionKey);
  }

  isQuestionCorrectById(q: QuizQuestion): boolean {
    return this.isQuestionCorrect(q, this.answers()[q.id]);
  }

  private isQuestionCorrect(q: QuizQuestion, answer: string | string[] | undefined): boolean {
    if (!answer) return false;
    if (q.questionType === 'MULTIPLE_CHOICE') {
      const correctKeys = q.answerKey?.['correctOptions'] as string[]
        || q.correctOption?.split(',').map((k: string) => k.trim()) || [];
      const selected = Array.isArray(answer) ? [...answer].sort() : [answer].sort();
      return JSON.stringify(selected) === JSON.stringify([...correctKeys].sort());
    }
    return answer === q.correctOption;
  }

  isOptionCorrectInReview(q: QuizQuestion, optionKey: string): boolean {
    if (!this.showResults()) return false;
    if (q.questionType === 'MULTIPLE_CHOICE') {
      const correctKeys = q.answerKey?.['correctOptions'] as string[]
        || q.correctOption?.split(',').map((k: string) => k.trim()) || [];
      return correctKeys.includes(optionKey);
    }
    return optionKey === q.correctOption;
  }

  isOptionWrongInReview(q: QuizQuestion, optionKey: string): boolean {
    if (!this.showResults()) return false;
    const answer = this.answers()[q.id];
    if (q.questionType === 'MULTIPLE_CHOICE') {
      const selected = Array.isArray(answer) ? answer : [];
      const correctKeys = q.answerKey?.['correctOptions'] as string[]
        || q.correctOption?.split(',').map((k: string) => k.trim()) || [];
      return selected.includes(optionKey) && !correctKeys.includes(optionKey);
    }
    return answer === optionKey && optionKey !== q.correctOption;
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

  submitQuiz() {
    this.stopTimer();
    this.showResults.set(true);
    this.showResultsModal.set(true);
  }

  closeResults() {
    this.showResultsModal.set(false);
  }

  resetQuiz() {
    this.answers.set({});
    this.currentPage.set(0);
    this.showResults.set(false);
    this.showResultsModal.set(false);
    this.timeRemaining.set(30 * 60);
    this.timeSpent.set(0);
    this.startTimer();
  }

  goBack() {
    this.stopTimer();
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/teacher/courses/library']);
    }
  }

  private extractText(content: string | null | undefined, contentBlocks: any[] | null | undefined): string {
    if (content) return content;
    if (contentBlocks != null && contentBlocks.length > 0) {
      return contentBlocks
        .map((b: any) => b.data?.html || b.data?.text || (b.data?.latex ? `[${b.data.latex}]` : ''))
        .filter(Boolean)
        .join(' ');
    }
    return '(Chưa có nội dung)';
  }
}
