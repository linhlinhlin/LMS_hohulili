import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { QuizApi } from '../../../../api/endpoints/quiz.api';

interface QuizDetail {
  id: string;
  title: string;
  description?: string;
  quizType?: string;
  status: string;
  courseTitle?: string;
  className?: string;
  deliveryMode?: string;
  assignmentScope?: string;
  questionCount: number;
  timeLimitMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  essayQuestionCount?: number;
  pendingEssayCount?: number;
  attemptStudentCount?: number;
  averageScore?: number | null;
  passRate?: number | null;
}

@Component({
  selector: 'app-quiz-detail-layout',
  imports: [CommonModule, RouterModule, RouterOutlet, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen">
      <!-- Sticky Header -->
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div class="py-4">
            <!-- Breadcrumb -->
            <nav class="flex items-center gap-1.5 text-sm mb-2" aria-label="Breadcrumb">
              <a (click)="goBack()" (keydown.enter)="goBack()" tabindex="0"
                 class="text-gray-500 hover:text-[#0056D2] cursor-pointer transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0056D2]">
                Bài kiểm tra
              </a>
              <svg class="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              <span class="text-gray-600 truncate">{{ quiz()?.title || '...' }}</span>
            </nav>

            <!-- Title + Actions -->
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                @if (loading()) {
                  <div class="h-7 w-64 bg-gray-100 rounded animate-pulse"></div>
                } @else {
                  <h1 class="text-xl font-bold text-gray-900 truncate">{{ quiz()?.title }}</h1>
                  @if (quiz()?.courseTitle) {
                    <p class="text-sm text-gray-500 mt-0.5">{{ quiz()?.courseTitle }}
                      @if (quiz()?.className) { · {{ quiz()?.className }} }
                    </p>
                  }
                }
              </div>

              <div class="flex items-center gap-3 flex-shrink-0">
                @if ((quiz()?.pendingEssayCount ?? 0) > 0) {
                  <span class="rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700">
                    {{ quiz()?.pendingEssayCount }} cần chấm
                  </span>
                }
                <a [routerLink]="['/teacher/assessments/classes/quizzes', quizId(), 'editor']"
                   class="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-[#0056D2] hover:text-[#0056D2] transition-colors">
                  <lucide-icon name="settings" [size]="15"></lucide-icon>
                  Chỉnh sửa
                </a>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <nav class="flex gap-0 -mb-px overflow-x-auto" role="tablist" aria-label="Chi tiết bài kiểm tra">
            @for (tab of tabs; track tab.path) {
              <a [routerLink]="tab.path"
                 routerLinkActive="!border-[#0056D2] !text-[#0056D2]"
                 role="tab"
                 class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0056D2]">
                {{ tab.label }}
                @if (tab.count !== undefined && tab.count > 0) {
                  <span class="text-xs text-gray-400">({{ tab.count }})</span>
                }
              </a>
            }
          </nav>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class QuizDetailLayoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizApi = inject(QuizApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly quiz = signal<QuizDetail | null>(null);
  readonly loading = signal(true);
  readonly quizId = signal('');

  readonly tabs = [
    { path: 'results', label: 'Kết quả', count: undefined as number | undefined },
    { path: 'details', label: 'Chi tiết' },
    { path: 'history', label: 'Lịch sử' },
  ];

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(params => params.get('quizId') || ''),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(quizId => {
      this.quizId.set(quizId);
      if (quizId) this.loadQuiz(quizId);
    });
  }

  private loadQuiz(quizId: string): void {
    this.loading.set(true);
    this.quizApi.getQuizById(quizId).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        this.quiz.set(data);
        // Update attempt count on results tab
        if (data?.attemptStudentCount != null) {
          this.tabs[0].count = data.attemptStudentCount;
        }
      },
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false),
    });
  }

  goBack(): void {
    this.router.navigate(['/teacher/assessments/classes/quizzes']);
  }
}
