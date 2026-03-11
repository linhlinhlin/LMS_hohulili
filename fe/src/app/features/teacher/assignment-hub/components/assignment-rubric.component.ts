import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { RubricApi, RubricDTO, RubricCriterionDTO } from '../../../../api/endpoints/rubric.api';

/**
 * Assignment Rubric Component
 *
 * Manages rubric for specific assignment (loaded from API or library).
 *
 * @requirements Expert feedback - Rubric per assignment (cloned)
 */
@Component({
  selector: 'app-assignment-rubric',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <!-- Header Area -->
      <div class="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/30">
        <div>
          <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <lucide-icon name="list-checks" [size]="16" class="text-[#0056D2]"></lucide-icon>
            Rubric & Tiêu chí chấm điểm
          </h3>
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">
            Sử dụng để đánh giá công bằng và chi tiết cho bài nộp của học viên
          </p>
        </div>
        
        <div class="flex items-center gap-3">
          @if (!rubric()) {
            <a routerLink="/teacher/assessments/shared/rubrics" 
               class="h-10 px-5 flex items-center justify-center rounded-xl bg-[#0056D2] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#004BB5] transition-all shadow-lg shadow-blue-100">
              <lucide-icon name="plus" [size]="14" class="mr-2"></lucide-icon>
              Chọn từ thư viện
            </a>
          } @else {
            <button (click)="removeRubric()" 
                    class="h-10 px-5 flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all">
              <lucide-icon name="trash-2" [size]="14" class="mr-2"></lucide-icon>
              Gỡ rubric khỏi bài tập
            </button>
          }
        </div>
      </div>

      <!-- Content Area -->
      <div class="p-0">
        @if (loading()) {
          <div class="p-20 flex flex-col items-center justify-center gap-4">
            <lucide-icon name="loader-2" [size]="32" class="text-[#0056D2] animate-spin"></lucide-icon>
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải cấu hình rubric...</span>
          </div>
        } @else if (rubric(); as r) {
          <!-- Rubric Info Header -->
          <div class="px-8 py-8 border-b border-slate-50 bg-white">
            <div class="flex items-start justify-between gap-6">
              <div class="space-y-2">
                <h4 class="text-lg font-black text-slate-900 tracking-tight">{{ r.title }}</h4>
                @if (r.description) {
                  <p class="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">{{ r.description }}</p>
                }
              </div>
              <div class="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-center shrink-0">
                <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tổng điểm</p>
                <p class="text-2xl font-black text-[#0056D2]">{{ r.maxPoints }}</p>
              </div>
            </div>
          </div>

          <!-- Criteria Table -->
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-slate-50/80">
                  <th class="px-8 py-4 text-left border-b border-slate-100">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiêu chí đánh giá</span>
                  </th>
                  @for (level of getLevelHeaders(r.criteria); track level) {
                    <th class="px-6 py-4 text-center border-b border-slate-100 min-w-[120px]">
                      <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ level }}</span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (criterion of r.criteria; track criterion.name) {
                  <tr class="hover:bg-slate-50/30 transition-colors group">
                    <td class="px-8 py-6 align-top">
                      <div class="flex items-start gap-4">
                        <div class="w-1 h-8 bg-slate-200 rounded-full group-hover:bg-[#0056D2] transition-colors shrink-0"></div>
                        <div>
                          <p class="text-sm font-black text-slate-800 tracking-tight mb-1">{{ criterion.name }}</p>
                          @if (criterion.maxPoints) {
                            <div class="inline-flex items-center px-2 py-0.5 bg-[#0056D2]/5 text-[#0056D2] rounded text-[9px] font-black uppercase tracking-wider">
                              Max {{ criterion.maxPoints }} đ
                            </div>
                          }
                        </div>
                      </div>
                    </td>
                    @for (level of criterion.levels; track level.label) {
                      <td class="px-6 py-6 text-center align-top border-l border-slate-50/50">
                        <div class="text-sm font-black text-slate-900 mb-2">{{ level.points ?? '-' }} đ</div>
                        @if (level.description) {
                          <p class="text-[11px] text-slate-400 font-medium leading-relaxed italic">{{ level.description }}</p>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <!-- Empty State -->
          <div class="py-24 flex flex-col items-center text-center px-8">
            <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-sm text-slate-300">
              <lucide-icon name="clipboard-list" [size]="40"></lucide-icon>
            </div>
            <h4 class="text-base font-black text-slate-800 uppercase tracking-widest mb-2">Chưa thiết lập Rubric</h4>
            <p class="text-sm text-slate-500 font-medium max-w-xs mb-8">
              Gắn Rubric vào bài tập để chuẩn hóa quy trình chấm điểm và cung cấp phản hồi minh bạch cho học viên.
            </p>
            <a routerLink="/teacher/assessments/shared/rubrics" 
               class="h-11 px-8 rounded-xl bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
              <lucide-icon name="search" [size]="14" class="text-blue-500"></lucide-icon>
              Duyệt thư viện Rubric
            </a>
          </div>
        }
      </div>

      <!-- Error Message -->
      @if (error()) {
        <div class="m-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-3 animate-in shake">
          <lucide-icon name="alert-circle" [size]="14"></lucide-icon>
          {{ error() }}
        </div>
      }
    </div>
  `
})
export class AssignmentRubricComponent implements OnInit {
  private rubricApi = inject(RubricApi);
  private route = inject(ActivatedRoute);

  private assignmentId = '';

  rubric = signal<RubricDTO | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.assignmentId = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (this.assignmentId) {
      this.loadRubric();
    }
  }

  loadRubric(): void {
    this.loading.set(true);
    this.error.set(null);

    this.rubricApi.getByAssignment(this.assignmentId).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        this.rubric.set(data || null);
      },
      error: () => {
        // 404 means no rubric assigned — not an error
        this.rubric.set(null);
      },
      complete: () => this.loading.set(false)
    });
  }

  removeRubric(): void {
    if (!this.assignmentId) return;
    this.loading.set(true);
    this.error.set(null);

    this.rubricApi.unassignFromAssignment(this.assignmentId).subscribe({
      next: () => {
        this.rubric.set(null);
      },
      error: () => {
        this.error.set('Không thể gỡ rubric. Vui lòng thử lại.');
      },
      complete: () => this.loading.set(false)
    });
  }

  getLevelHeaders(criteria: RubricCriterionDTO[]): string[] {
    if (!criteria || criteria.length === 0) return [];
    return criteria[0].levels.map(l => l.label);
  }
}
