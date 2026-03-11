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
    <div class="min-h-screen bg-slate-50/50">
      <!-- Header Section -->
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-[#0056D2]">Vận hành</p>
              <h1 class="text-2xl font-black text-slate-900 tracking-tight">Bài kiểm tra đang vận hành</h1>
              <p class="text-sm text-slate-500 font-medium">Theo dõi bài kiểm tra đang áp dụng theo lớp, theo toàn khóa học, hoặc còn neo trong curriculum nhưng chưa phân phối.</p>
              <p class="mt-2 text-xs font-semibold text-slate-400">Hub này dùng để nhìn đúng phạm vi vận hành rồi mở quiz gốc để chỉnh nội dung hoặc vào chấm tự luận khi cần.</p>
            </div>
            <a routerLink="/teacher/assessments/classes/quizzes/create"
               class="h-10 px-4 bg-[#0056D2] text-white rounded-xl font-bold text-sm hover:bg-[#004BB5] transition-all flex items-center gap-2 shadow-md shadow-blue-100">
              <lucide-icon name="plus" [size]="18"></lucide-icon>
              Tạo bài kiểm tra
            </a>
          </div>
        </div>
      </div>

      <div class="max-w-screen-2xl mx-auto px-3 sm:px-4 py-4">
        @if (loading()) {
          <div class="grid grid-cols-1 gap-4">
            @for (i of [1,2,3]; track i) {
              <div class="bg-white rounded-xl border border-slate-100 p-6 animate-pulse">
                <div class="flex gap-4">
                  <div class="w-12 h-12 bg-slate-100 rounded-xl"></div>
                  <div class="flex-grow space-y-3">
                    <div class="h-5 bg-slate-100 rounded-md w-1/4"></div>
                    <div class="h-3 bg-slate-50 rounded-md w-1/2"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (quizzes().length === 0) {
          <div class="bg-white rounded-2xl border border-slate-200 border-dashed p-16 text-center shadow-inner">
            <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
              <lucide-icon name="clipboard-list" [size]="40"></lucide-icon>
            </div>
            <h3 class="text-xl font-black text-slate-900 mb-2">Chưa có bài kiểm tra</h3>
            <p class="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Tạo bài kiểm tra trắc nghiệm đầu tiên cho khóa học để bắt đầu đánh giá học viên.</p>
            <a routerLink="/teacher/assessments/classes/quizzes/create"
               class="inline-flex items-center gap-2 px-6 py-3 bg-[#0056D2] text-white rounded-xl font-bold hover:bg-[#004BB5] transition-all shadow-lg shadow-blue-100">
              <lucide-icon name="plus" [size]="18"></lucide-icon>
              Tạo bài kiểm tra
            </a>
          </div>
        } @else {
          <div class="space-y-5">
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Ngữ cảnh vận hành</p>
                  <p class="mt-1 text-sm text-slate-600 font-medium">Danh sách được chia thành ba nhóm: đang áp dụng theo lớp, đang áp dụng cho toàn khóa học, và quiz mới chỉ neo trong curriculum nhưng chưa phân phối cho lớp.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-3 py-1.5 rounded-xl border border-emerald-100 bg-emerald-50 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                    Theo lớp {{ classroomQuizzes().length }}
                  </span>
                  <span class="px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50 text-[11px] font-black uppercase tracking-[0.14em] text-[#0056D2]">
                    Toàn khóa học {{ coursewideQuizzes().length }}
                  </span>
                  @if (unassignedQuizzes().length > 0) {
                    <span class="px-3 py-1.5 rounded-xl border border-amber-100 bg-amber-50 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">
                      Chưa phân phối {{ unassignedQuizzes().length }}
                    </span>
                  }
                </div>
              </div>
            </div>

            @if (classroomQuizzes().length > 0) {
              <section class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h2 class="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Theo lớp</h2>
                    <p class="text-sm text-slate-500 font-medium">Bài kiểm tra đã phân phối cho một lớp cụ thể và sẵn sàng theo dõi trong vận hành.</p>
                  </div>
                  <span class="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{{ classroomQuizzes().length }} mục</span>
                </div>
                <div class="grid grid-cols-1 gap-4">
                  @for (quiz of classroomQuizzes(); track quiz.id) {
                    <ng-container *ngTemplateOutlet="quizCard; context: { quiz: quiz }"></ng-container>
                  }
                </div>
              </section>
            }

            @if (coursewideQuizzes().length > 0) {
              <section class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h2 class="text-sm font-black uppercase tracking-[0.18em] text-[#0056D2]">Toàn khóa học</h2>
                    <p class="text-sm text-slate-500 font-medium">Bài kiểm tra đang áp dụng cho toàn bộ học viên trong khóa học hoặc toàn bộ người đã ghi danh.</p>
                  </div>
                  <span class="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{{ coursewideQuizzes().length }} mục</span>
                </div>
                <div class="grid grid-cols-1 gap-4">
                  @for (quiz of coursewideQuizzes(); track quiz.id) {
                    <ng-container *ngTemplateOutlet="quizCard; context: { quiz: quiz }"></ng-container>
                  }
                </div>
              </section>
            }

            @if (unassignedQuizzes().length > 0) {
              <section class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h2 class="text-sm font-black uppercase tracking-[0.18em] text-amber-700">Chưa phân phối</h2>
                    <p class="text-sm text-slate-500 font-medium">Quiz đã tạo và neo trong curriculum nhưng vẫn chưa áp dụng cho lớp cụ thể.</p>
                  </div>
                  <span class="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{{ unassignedQuizzes().length }} mục</span>
                </div>
                <div class="grid grid-cols-1 gap-4">
                  @for (quiz of unassignedQuizzes(); track quiz.id) {
                    <ng-container *ngTemplateOutlet="quizCard; context: { quiz: quiz }"></ng-container>
                  }
                </div>
              </section>
            }
          </div>
        }

        @if (error()) {
          <div class="mt-8 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-center gap-3 text-sm font-medium">
            <lucide-icon name="alert-circle" [size]="18"></lucide-icon>
            {{ error() }}
          </div>
        }
      </div>

      <ng-template #quizCard let-quiz="quiz">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all group overflow-hidden flex flex-col sm:flex-row">
          <div class="p-5 flex-grow min-w-0">
            <div class="flex flex-col h-full justify-between gap-4">
              <div>
                <div class="flex items-center gap-3 mb-1.5">
                  <h3 class="text-lg font-black text-slate-900 tracking-tight truncate group-hover:text-[#0056D2] transition-colors">{{ quiz.title || 'Không có tiêu đề' }}</h3>
                  <span class="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border shadow-sm"
                        [class]="getStatusClass(quiz.status)">
                    {{ getStatusText(quiz.status) }}
                  </span>
                  <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    <lucide-icon name="help-circle" [size]="12"></lucide-icon>
                    {{ quiz.questionCount }} Câu hỏi
                  </div>
                  <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 rounded-lg border border-blue-100/50 text-[11px] font-black text-blue-600 uppercase tracking-wider">
                    <lucide-icon name="clock" [size]="12"></lucide-icon>
                    {{ quiz.timeLimitMinutes ? quiz.timeLimitMinutes + ' phút' : 'Không giới hạn' }}
                  </div>
                  <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider"
                       [class]="getOperationalScopeClass(quiz)">
                    <lucide-icon name="layers" [size]="12"></lucide-icon>
                    {{ getOperationalScopeLabel(quiz) }}
                  </div>
                  <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-black tracking-[0.08em]"
                       [class]="getOperationalAudienceClass(quiz)">
                    <lucide-icon name="users" [size]="12"></lucide-icon>
                    {{ getOperationalAudienceLabel(quiz) }}
                  </div>
                  @if (quiz.passingScore) {
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100 text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                      <lucide-icon name="target" [size]="12"></lucide-icon>
                      Đạt: {{ quiz.passingScore }}%
                    </div>
                  }
                </div>
                @if (quiz.description) {
                  <p class="text-xs text-slate-500 font-medium line-clamp-1 italic">{{ quiz.description }}</p>
                }
              </div>
            </div>
          </div>

          <div class="p-6 sm:w-72 flex-shrink-0 flex flex-col sm:border-l border-slate-100 bg-slate-50/20 group-hover:bg-[#0056D2]/[0.02] transition-all gap-3">
                <a [routerLink]="['/teacher/assessments/classes/quizzes', quiz.id, 'editor']"
                   class="h-10 px-6 rounded-xl bg-[#0056D2] text-white font-black text-xs hover:bg-[#004BB5] shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2">
              Mở editor
              <lucide-icon name="chevron-right" [size]="14"></lucide-icon>
            </a>
            <a [routerLink]="['/teacher/assessments/classes/quizzes', quiz.id, 'essay-grading']"
               class="h-10 px-6 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-xs hover:border-[#0056D2] hover:text-[#0056D2] transition-all flex items-center justify-center gap-2">
              Chấm tự luận
              <lucide-icon name="clipboard-check" [size]="14"></lucide-icon>
            </a>
          </div>
        </div>
      </ng-template>
    </div>
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
