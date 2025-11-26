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
  selector: 'app-student-quiz-taking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-quiz-taking.component.html',
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
export class StudentQuizTakingComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizApi = inject(QuizApi);

  lessonId = '';
  quizTitle = signal('Bài kiểm tra');
  returnUrl = '';

  loading = signal(true);
  error = signal<string | null>(null);
  questions = signal<QuizQuestion[]>([]);
  currentIndex = signal(0);
  answers = signal<Record<string, string>>({});
  showResults = signal(false);
  showResultsModal = signal(true);

  // Timer
  timeRemaining = signal(30 * 60); // 30 minutes default
  timeSpent = signal(0);
  private timerInterval: any;
  private startTime = 0;

  currentQuestion = computed(() => this.questions()[this.currentIndex()]);
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
        console.log('🔍 Attempting to auto-populate quiz questions...');
        await firstValueFrom(this.quizApi.autoPopulateQuizQuestions(this.lessonId));
        console.log('✅ Quiz auto-populated');
      } catch (err: any) {
        console.log('⚠️ Auto-populate failed (may already have questions):', err?.message);
        // Continue anyway - quiz might already have questions
      }

      const response = await firstValueFrom(this.quizApi.getQuizQuestions(this.lessonId));
      const questions = Array.isArray(response) ? response : (response as any).data || [];

      if (questions.length === 0) {
        console.log('⚠️ No questions found, creating sample questions...');
        try {
          await firstValueFrom(this.quizApi.createSampleQuestions(this.lessonId));
          console.log('✅ Sample questions created, reloading...');
          // Reload quiz after creating sample questions
          return this.loadQuiz();
        } catch (err: any) {
          console.error('❌ Failed to create sample questions:', err);
          this.error.set('Bài kiểm tra này chưa có câu hỏi nào.');
          return;
        }
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

  prevQuestion() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  nextQuestion() {
    if (this.currentIndex() < this.questions().length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  goToQuestion(index: number) {
    this.currentIndex.set(index);
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
    this.currentIndex.set(0);
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
      this.router.navigate(['/student/my-courses']);
    }
  }
}
