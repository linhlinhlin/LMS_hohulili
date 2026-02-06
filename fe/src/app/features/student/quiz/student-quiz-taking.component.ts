import { Component, OnInit, OnDestroy, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { QuizApi } from '../../../api/endpoints/quiz.api';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../shared/components/ui/icon/icon.component';
import { BlockRendererComponent } from '../../../shared/blocks/block-renderer/block-renderer.component';

interface QuizQuestion {
  id: string;
  content: string;
  contentBlocks: any[];
  difficulty: string;
  options: { key: string; content: string; contentBlocks?: any[] }[];
  correctOption: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-student-quiz-taking',
  imports: [IconComponent, BlockRendererComponent],
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

  // Expose Math for template
  Math = Math;

  lessonId = '';
  quizTitle = signal('Bài kiểm tra');
  returnUrl = '';

  loading = signal(true);
  error = signal<string | null>(null);
  questions = signal<QuizQuestion[]>([]);
  answers = signal<Record<string, string>>({});
  showResults = signal(false);
  showResultsModal = signal(true);

  // Sidebar visibility
  sidebarVisible = signal(true);

  // Pagination - 10 questions per page
  readonly QUESTIONS_PER_PAGE = 10;
  currentPage = signal(0);

  // Timer
  timeRemaining = signal(30 * 60); // 30 minutes default
  timeSpent = signal(0);
  private timerInterval: any;
  private startTime = 0;

  // Computed for pagination
  totalPages = computed(() => Math.ceil(this.questions().length / this.QUESTIONS_PER_PAGE));

  currentPageQuestions = computed(() => {
    const start = this.currentPage() * this.QUESTIONS_PER_PAGE;
    const end = start + this.QUESTIONS_PER_PAGE;
    return this.questions().slice(start, end);
  });

  // Get question index in full list
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
    this.lessonId = this.route.snapshot.paramMap.get('id') || '';
    this.quizTitle.set(this.route.snapshot.queryParamMap.get('title') || 'Bài kiểm tra');
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/student/learn/course';

    if (this.lessonId) {
      this.loadQuiz();
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  async loadQuiz(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // First, try to auto-populate quiz if it has no questions
      try {
        await firstValueFrom(this.quizApi.autoPopulateQuizQuestions(this.lessonId));
      } catch (err: any) {
        // Continue anyway - quiz might already have questions
      }

      const response = await firstValueFrom(this.quizApi.getQuizQuestions(this.lessonId));
      const questions = Array.isArray(response) ? response : (response as any).data || [];

      if (questions.length === 0) {
        try {
          await firstValueFrom(this.quizApi.createSampleQuestions(this.lessonId));
          // Reload quiz after creating sample questions
          return this.loadQuiz();
        } catch (err: any) {
          this.error.set('Bài kiểm tra này chưa có câu hỏi nào.');
          return;
        }
      }

      this.questions.set(questions.map((q: any) => ({
        id: q.id,
        content: q.content,
        contentBlocks: q.contentBlocks || q.structuredContent || [],
        difficulty: q.difficulty,
        correctOption: q.correctOption,
        options: (q.options || []).map((opt: any) => {
          let blocks = opt.contentBlocks || [];

          // Fallback: Try parsing content if blocks are empty and content looks like JSON
          if (!blocks.length && typeof opt.content === 'string' && opt.content.trim().startsWith('[')) {
            try {
              blocks = JSON.parse(opt.content);
            } catch (e) {
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

  toggleSidebar() {
    this.sidebarVisible.update(v => !v);
  }

  goBack() {
    this.stopTimer();
    if (this.returnUrl && this.returnUrl !== '/student/learn/course') {
      // Navigate back to the specific lesson/course page
      this.router.navigateByUrl(this.returnUrl);
    } else {
      // Fallback: go to my courses page
      this.router.navigate(['/student/my-courses']);
    }
  }
}
