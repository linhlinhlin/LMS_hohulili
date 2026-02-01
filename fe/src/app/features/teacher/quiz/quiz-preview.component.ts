import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';

interface QuizQuestion {
  id: string;
  content: string;
  difficulty: string;
  options: { key: string; content: string }[];
  correctOption: string;
}

@Component({
  selector: 'app-quiz-preview',
  standalone: true,
  imports: [CommonModule],
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

  lessonId = '';
  quizTitle = signal('BĂ i kiá»ƒm tra');
  returnUrl = '';

  loading = signal(true);
  error = signal<string | null>(null);
  questions = signal<QuizQuestion[]>([]);
  answers = signal<Record<string, string>>({});
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
    return this.questions().filter(q => ans[q.id] === q.correctOption).length;
  });

  wrongCount = computed(() => {
    const ans = this.answers();
    return this.questions().filter(q => ans[q.id] && ans[q.id] !== q.correctOption).length;
  });

  unansweredCount = computed(() => {
    return this.questions().length - Object.keys(this.answers()).length;
  });

  scorePercent = computed(() => {
    if (this.questions().length === 0) return 0;
    return Math.round((this.correctCount() / this.questions().length) * 100);
  });

  ngOnInit() {
    this.lessonId = this.route.snapshot.paramMap.get('lessonId') || '';
    this.quizTitle.set(this.route.snapshot.queryParamMap.get('title') || 'BĂ i kiá»ƒm tra');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/teacher/courses';
    this.loadQuiz();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  async loadQuiz() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(this.quizApi.getQuizQuestions(this.lessonId));
      const questions = Array.isArray(response) ? response : (response as any).data || [];
      if (questions.length === 0) {
        this.error.set('BĂ i kiá»ƒm tra nĂ y chÆ°a cĂ³ cĂ¢u há»i nĂ o.');
        return;
      }
      this.questions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty,
        correctOption: q.correctOption,
        options: (q.options || []).map((opt: any) => ({
          key: opt.optionKey || opt.key,
          content: opt.content
        })).sort((a: any, b: any) => a.key.localeCompare(b.key))
      })));
      this.startTimer();
    } catch (err: any) {
      console.error('Error loading quiz:', err);
      this.error.set(err?.message || 'KhĂ´ng thá»ƒ táº£i bĂ i kiá»ƒm tra');
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
      this.router.navigate(['/teacher/courses']);
    }
  }
}

