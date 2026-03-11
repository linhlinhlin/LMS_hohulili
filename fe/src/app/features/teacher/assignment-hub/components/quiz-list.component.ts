import { Component, ChangeDetectionStrategy, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QuizApi } from '../../../../api/endpoints/quiz.api';

interface TeacherQuiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  assignmentScope?: 'LESSON' | 'COURSE' | 'CLASS';
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED' | string;
  classId?: string;
  className?: string;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  questionCount: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-quiz-list',
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3">
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">Theo lớp {{ classroomQuizzes().length }}</span>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-[#0056D2]">Toàn khóa học {{ coursewideQuizzes().length }}</span>
          @if (unassignedQuizzes().length > 0) {
            <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700">Chưa phân phối {{ unassignedQuizzes().length }}</span>
          }
        </div>
        <a routerLink="/teacher/assessments/classes/quizzes/create"
           class="h-8 px-3.5 bg-[#0056D2] text-white rounded-lg text-xs font-semibold hover:bg-[#004BB5] transition-colors flex items-center gap-1.5">
          <lucide-icon name="plus" [size]="14"></lucide-icon>
          Tạo bài kiểm tra
        </a>
      </div>

      <!-- Content -->
      @if (loading()) {
        <div class="space-y-2">
          @for (i of [1,2,3]; track i) {
            <div class="bg-white rounded-lg border border-slate-200 px-4 py-3 animate-pulse">
              <div class="flex items-center gap-4">
                <div class="h-4 bg-slate-100 rounded w-1/4"></div>
                <div class="h-4 bg-slate-50 rounded w-1/6"></div>
              </div>
            </div>
          }
        </div>
      } @else if (quizzes().length === 0) {
        <div class="bg-white rounded-lg border border-dashed border-slate-200 py-12 text-center">
          <lucide-icon name="clipboard-list" [size]="32" class="mx-auto mb-3 text-slate-300"></lucide-icon>
          <p class="text-sm font-medium text-slate-500 mb-4">Chưa có bài kiểm tra nào</p>
          <a routerLink="/teacher/assessments/classes/quizzes/create"
             class="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0056D2] text-white rounded-lg text-xs font-semibold hover:bg-[#004BB5] transition-colors">
            <lucide-icon name="plus" [size]="14"></lucide-icon>
            Tạo bài kiểm tra
          </a>
        </div>
      } @else {
        <div class="space-y-4">
          @if (classroomQuizzes().length > 0) {
            <section>
              <div class="flex items-center gap-2 py-1.5">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-emerald-600">Theo lớp</h3>
                <span class="text-xs text-slate-500">{{ classroomQuizzes().length }}</span>
              </div>
              <div class="space-y-1">
                @for (quiz of classroomQuizzes(); track quiz.id) {
                  <ng-container *ngTemplateOutlet="quizRow; context: { quiz: quiz }"></ng-container>
                }
              </div>
            </section>
          }

          @if (coursewideQuizzes().length > 0) {
            <section>
              <div class="flex items-center gap-2 py-1.5">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-[#0056D2]">Toàn khóa học</h3>
                <span class="text-xs text-slate-500">{{ coursewideQuizzes().length }}</span>
              </div>
              <div class="space-y-1">
                @for (quiz of coursewideQuizzes(); track quiz.id) {
                  <ng-container *ngTemplateOutlet="quizRow; context: { quiz: quiz }"></ng-container>
                }
              </div>
            </section>
          }

          @if (unassignedQuizzes().length > 0) {
            <section>
              <div class="flex items-center gap-2 py-1.5">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-amber-600">Chưa phân phối</h3>
                <span class="text-xs text-slate-500">{{ unassignedQuizzes().length }}</span>
              </div>
              <div class="space-y-1">
                @for (quiz of unassignedQuizzes(); track quiz.id) {
                  <ng-container *ngTemplateOutlet="quizRow; context: { quiz: quiz }"></ng-container>
                }
              </div>
            </section>
          }
        </div>
      }

      @if (error()) {
        <div class="mt-3 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg flex items-center gap-2 text-sm">
          <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
          {{ error() }}
        </div>
      }
    </div>

    <ng-template #quizRow let-quiz="quiz">
      <div class="bg-white rounded-lg border border-slate-200 hover:bg-slate-50/50 transition-colors group">
        <div class="flex items-center gap-4 px-4 py-2.5">
          <!-- Title + meta -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-semibold text-slate-900 truncate">{{ quiz.title || 'Không có tiêu đề' }}</h3>
              <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded shrink-0"
                    [ngClass]="getStatusClass(quiz.status)">
                {{ getStatusText(quiz.status) }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
              <span>{{ quiz.questionCount }} câu</span>
              <span class="text-slate-300">&middot;</span>
              <span>{{ quiz.timeLimitMinutes ? quiz.timeLimitMinutes + ' phút' : 'Không giới hạn' }}</span>
              <span class="hidden md:contents">
                <span class="text-slate-300">&middot;</span>
                <span class="font-medium" [ngClass]="getOperationalScopeClass(quiz).includes('emerald') ? 'text-emerald-600' : getOperationalScopeClass(quiz).includes('amber') ? 'text-amber-600' : 'text-[#0056D2]'">
                  {{ getOperationalAudienceLabel(quiz) }}
                </span>
              </span>
              @if (quiz.passingScore) {
                <span class="hidden md:contents">
                  <span class="text-slate-300">&middot;</span>
                  <span class="text-emerald-600">Đạt {{ quiz.passingScore }}%</span>
                </span>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1.5 shrink-0">
            <a [routerLink]="['/teacher/assessments/classes/quizzes', quiz.id, 'editor']"
               class="h-7 px-3 rounded-md bg-[#0056D2] text-white text-xs font-medium hover:bg-[#004BB5] transition-colors flex items-center gap-1">
              Editor
              <lucide-icon name="chevron-right" [size]="12"></lucide-icon>
            </a>
            <a [routerLink]="['/teacher/assessments/classes/quizzes', quiz.id, 'essay-grading']"
               class="h-7 px-3 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:border-[#0056D2] hover:text-[#0056D2] transition-colors flex items-center gap-1">
              Chấm tự luận
            </a>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private quizApi = inject(QuizApi);

  quizzes = signal<TeacherQuiz[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  publishedCount = signal(0);
  draftCount = signal(0);

  classroomQuizzes = computed(() =>
    this.quizzes().filter(quiz => this.getOperationalBucket(quiz) === 'CLASSROOM')
  );

  coursewideQuizzes = computed(() =>
    this.quizzes().filter(quiz => this.getOperationalBucket(quiz) === 'COURSE')
  );

  unassignedQuizzes = computed(() =>
    this.quizzes().filter(quiz => this.getOperationalBucket(quiz) === 'UNASSIGNED')
  );

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.quizApi.getTeacherQuizzes().subscribe({
      next: (response: any) => {
        const data: TeacherQuiz[] = response?.data ?? response ?? [];
        this.quizzes.set(data);
        this.publishedCount.set(data.filter(q => q.status?.toUpperCase() === 'PUBLISHED').length);
        this.draftCount.set(data.filter(q => q.status?.toUpperCase() === 'DRAFT').length);
      },
      error: () => {
        this.error.set('Không thể tải danh sách bài kiểm tra. Vui lòng thử lại.');
        this.quizzes.set([]);
      },
      complete: () => this.loading.set(false)
    });
  }

  getStatusClass(status: string): string {
    const s = status?.toUpperCase() || '';
    const classes: Record<string, string> = {
      'PUBLISHED': 'bg-blue-50 text-blue-700 border-blue-100',
      'DRAFT': 'bg-slate-50 text-slate-600 border-slate-200'
    };
    return classes[s] || 'bg-slate-50 text-slate-600 border-slate-200';
  }

  getStatusText(status: string): string {
    const s = status?.toUpperCase() || '';
    const texts: Record<string, string> = {
      'PUBLISHED': 'Đã xuất bản',
      'DRAFT': 'Bản nháp'
    };
    return texts[s] || status;
  }

  getOperationalScopeLabel(quiz: TeacherQuiz): string {
    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'Toàn khóa học';
    }

    switch (quiz.assignmentScope) {
      case 'CLASS':
        return 'Theo lớp';
      case 'COURSE':
        return 'Toàn khóa học';
      default:
        return 'Neo trong curriculum';
    }
  }

  getOperationalScopeClass(quiz: TeacherQuiz): string {
    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'bg-blue-50 text-[#0056D2] border-blue-100';
    }

    switch (quiz.assignmentScope) {
      case 'CLASS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'COURSE':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  }

  getOperationalAudienceLabel(quiz: TeacherQuiz): string {
    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'Toàn bộ học viên đã ghi danh';
    }

    if (quiz.assignmentScope === 'CLASS' && quiz.className) {
      return quiz.className;
    }

    if (quiz.assignmentScope === 'COURSE') {
      return 'Toàn bộ học viên trong khóa học';
    }

    return 'Chưa phân phối cho lớp';
  }

  getOperationalAudienceClass(quiz: TeacherQuiz): string {
    if (quiz.deliveryMode === 'SELF_PACED') {
      return 'bg-blue-50 text-[#0056D2] border-blue-100';
    }

    switch (quiz.assignmentScope) {
      case 'CLASS':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'COURSE':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  }

  private getOperationalBucket(quiz: TeacherQuiz): 'CLASSROOM' | 'COURSE' | 'UNASSIGNED' {
    if (quiz.deliveryMode === 'SELF_PACED' || quiz.assignmentScope === 'COURSE') {
      return 'COURSE';
    }

    if (quiz.assignmentScope === 'CLASS') {
      return 'CLASSROOM';
    }

    return 'UNASSIGNED';
  }
}
