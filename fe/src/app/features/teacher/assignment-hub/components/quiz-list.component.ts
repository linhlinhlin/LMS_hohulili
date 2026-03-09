import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QuizApi } from '../../../../api/endpoints/quiz.api';

interface TeacherQuiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
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
              <h1 class="text-2xl font-black text-slate-900 tracking-tight">Bài kiểm tra trắc nghiệm</h1>
            </div>
            <a routerLink="/teacher/assessments/quizzes/create"
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
            <a routerLink="/teacher/assessments/quizzes/create"
               class="inline-flex items-center gap-2 px-6 py-3 bg-[#0056D2] text-white rounded-xl font-bold hover:bg-[#004BB5] transition-all shadow-lg shadow-blue-100">
              <lucide-icon name="plus" [size]="18"></lucide-icon>
              Tạo bài kiểm tra
            </a>
          </div>
        } @else {
          <!-- Quiz Cards -->
          <div class="grid grid-cols-1 gap-4">
            @for (quiz of quizzes(); track quiz.id) {
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all group overflow-hidden flex flex-col sm:flex-row cursor-pointer"
                   [routerLink]="['/teacher/courses/quizzes', quiz.id]">

                <!-- Main Info -->
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

                <!-- Right Side Actions -->
                <div class="p-6 sm:w-56 flex-shrink-0 flex items-center justify-end sm:border-l border-slate-100 bg-slate-50/20 group-hover:bg-[#0056D2]/[0.02] transition-all">
                  <a [routerLink]="['/teacher/courses/quizzes', quiz.id]"
                     class="h-10 px-6 rounded-xl bg-[#0056D2] text-white font-black text-xs hover:bg-[#004BB5] shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2">
                    Chi tiết
                    <lucide-icon name="chevron-right" [size]="14"></lucide-icon>
                  </a>
                </div>
              </div>
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
}
