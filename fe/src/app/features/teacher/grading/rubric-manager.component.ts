import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Rubric, validateRubricDeletion } from './utils/rubric-calculator';
import { RubricApi } from '../../../api/endpoints/rubric.api';

/**
 * Rubric Manager Component
 * 
 * Displays and manages rubrics for grading.
 * Features: list view, create/edit/delete actions, usage statistics.
 */
@Component({
  selector: 'app-rubric-manager',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-50/50">
      <!-- Header Section -->
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-[#0056D2]">Dùng chung</p>
              <h1 class="text-2xl font-black text-slate-900 tracking-tight">Thư viện Rubric dùng chung</h1>
              <p class="text-sm text-slate-500 font-medium">Thiết kế rubric tái sử dụng cho cả khóa học tự học và lớp học có giảng viên.</p>
            </div>
            <div class="flex items-center gap-3">
              <a routerLink="create" 
                class="h-14 px-8 bg-[#0056D2] text-white rounded-2xl hover:bg-[#004BB5] hover:shadow-xl hover:shadow-blue-200 transition-all flex items-center gap-3 font-black text-xs uppercase tracking-widest group shadow-lg shadow-blue-100">
                <lucide-icon name="plus" [size]="20" class="group-hover:rotate-90 transition-transform duration-300"></lucide-icon>
                Tạo Rubric mới
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-screen-2xl mx-auto p-3 sm:px-4">      

      <!-- Content Area -->
      @if (loading()) {
        <div class="bg-white rounded-[2.5rem] border border-slate-200 p-24 text-center shadow-sm">
          <div class="w-16 h-16 border-4 border-slate-100 border-t-[#0056D2] rounded-full animate-spin mx-auto mb-6"></div>
          <p class="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Đang đồng bộ dữ liệu...</p>
        </div>
      } @else if (rubrics().length === 0) {
        <div class="bg-white rounded-[2.5rem] border border-slate-200 p-24 text-center shadow-sm">
          <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 transition-transform hover:scale-105 duration-500">
            <lucide-icon name="file-question" [size]="48" class="text-slate-300"></lucide-icon>
          </div>
          <h3 class="text-2xl font-black text-slate-900 tracking-tight mb-3">Thư viện trống</h3>
          <p class="text-slate-500 font-medium mb-10 max-w-sm mx-auto text-lg leading-relaxed">
            Bạn chưa tạo bất kỳ tiêu chí chấm điểm nào. Hãy bắt đầu chuẩn hóa việc đánh giá tại đây.
          </p>
          <a routerLink="create" class="inline-flex h-12 px-8 bg-slate-900 text-white rounded-2xl hover:bg-[#0056D2] hover:shadow-xl hover:shadow-blue-100 transition-all items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-200">
            <lucide-icon name="plus" [size]="16"></lucide-icon>
            Tạo Rubric đầu tiên
          </a>
        </div>
      } @else {
        <!-- Enhanced Table List -->
        <div class="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100">
                <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin Rubric</th>
                <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cấu trúc</th>
                <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sử dụng</th>
                <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cập nhật</th>
                <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Hành động</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (rubric of rubrics(); track rubric.id) {
                <tr class="group hover:bg-slate-50/30 transition-colors">
                  <td class="px-8 py-6">
                    <div class="flex items-start gap-4">
                      <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#0056D2]/10 group-hover:text-[#0056D2] transition-all">
                        <lucide-icon name="file-text" [size]="18"></lucide-icon>
                      </div>
                      <div class="max-w-md">
                        <div class="font-black text-slate-900 tracking-tight group-hover:text-[#0056D2] transition-colors mb-1">{{ rubric.name }}</div>
                        <div class="text-xs font-medium text-slate-400 line-clamp-1 italic">{{ rubric.description || 'Không có mô tả chi tiết' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-8 py-6">
                    <div class="flex items-center gap-4">
                      <div class="text-center">
                        <div class="text-sm font-black text-slate-900">{{ rubric.criteria.length }}</div>
                        <div class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiêu chí</div>
                      </div>
                      <div class="w-px h-6 bg-slate-200"></div>
                      <div class="text-center">
                        <div class="text-sm font-black text-emerald-600">{{ rubric.totalPoints }}</div>
                        <div class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Điểm tối đa</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-8 py-6">
                    @if (rubric.usageCount && rubric.usageCount > 0) {
                      <div class="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl w-fit border border-emerald-100">
                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span class="text-[10px] font-black uppercase tracking-widest">{{ rubric.usageCount }} Bài tập</span>
                      </div>
                    } @else {
                      <div class="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl w-fit border border-slate-200">
                        <span class="text-[10px] font-black uppercase tracking-widest">Lưu trữ</span>
                      </div>
                    }
                  </td>
                  <td class="px-8 py-6">
                    <div class="flex items-center gap-2 text-slate-400 font-medium text-xs">
                      <lucide-icon name="calendar" [size]="12"></lucide-icon>
                      {{ formatDate(rubric.createdAt || '') }}
                    </div>
                  </td>
                  <td class="px-8 py-6">
                    <div class="flex items-center justify-end gap-2">
                      <a [routerLink]="['edit', rubric.id]" 
                         class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#0056D2] hover:border-[#0056D2] transition-all shadow-sm group/btn">
                        <lucide-icon name="edit-3" [size]="16" class="group-hover/btn:scale-110 transition-transform"></lucide-icon>
                      </a>
                      <button (click)="confirmDelete(rubric)" [disabled]="rubric.usageCount && rubric.usageCount > 0"
                              class="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed group/btn2">
                        <lucide-icon name="trash-2" [size]="16" class="group-hover/btn2:rotate-6 transition-transform"></lucide-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Slender Modal Deletion Confirmation -->
      @if (showDeleteModal()) {
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
          <div class="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-md w-full p-10 transform scale-100 animate-in fade-in zoom-in duration-300">
            <div class="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500 mb-8 mx-auto">
              <lucide-icon name="alert-triangle" [size]="40"></lucide-icon>
            </div>
            
            <h3 class="text-2xl font-black text-slate-900 tracking-tight text-center mb-4">Xác nhận xóa Rubric?</h3>
            <p class="text-slate-500 font-medium text-center mb-10 leading-relaxed">
              Bạn đang chuẩn bị xóa rubric <span class="text-slate-900 font-bold">"{{ rubricToDelete()?.name }}"</span>. 
              Hành động này sẽ xóa vĩnh viễn và không thể khôi phục.
            </p>

            @if (deleteError()) {
              <div class="mb-8 p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3">
                <lucide-icon name="alert-octagon" [size]="16" class="flex-shrink-0"></lucide-icon>
                {{ deleteError() }}
              </div>
            }

            <div class="flex flex-col gap-3">
              <button (click)="deleteRubric()" [disabled]="deleting()" 
                      class="h-12 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-700 hover:shadow-xl hover:shadow-rose-100 transition-all shadow-lg shadow-rose-50 flex items-center justify-center">
                @if (deleting()) {
                  <lucide-icon name="loader-2" [size]="14" class="mr-2 animate-spin"></lucide-icon>
                  ĐANG XỬ LÝ...
                } @else {
                  XÓA VĨNH VIỄN
                }
              </button>
              <button (click)="cancelDelete()" class="h-12 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-colors">
                HỦY BỎ
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Global Error Notification -->
      @if (error()) {
        <div class="fixed bottom-10 left-1/2 -translate-x-1/2 p-5 bg-slate-900 text-white border border-slate-800 rounded-2xl shadow-2xl flex items-center gap-4 z-[200] animate-in slide-in-from-bottom duration-500">
          <div class="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center text-white">
            <lucide-icon name="alert-circle" [size]="18"></lucide-icon>
          </div>
          <span class="text-xs font-black uppercase tracking-widest">{{ error() }}</span>
          <button (click)="error.set(null)" class="text-slate-400 hover:text-white transition-colors">
            <lucide-icon name="x" [size]="16"></lucide-icon>
          </button>
        </div>
      }
    </div>
  `
})
export class RubricManagerComponent implements OnInit {
  private rubricApi = inject(RubricApi);

  // State signals
  rubrics = signal<Rubric[]>([]);
  assignmentRubricIds = signal<string[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Delete modal state
  showDeleteModal = signal(false);
  rubricToDelete = signal<Rubric | null>(null);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  // Computed signals
  totalRubrics = computed(() => this.rubrics().length);
  inUseCount = computed(() => this.rubrics().filter((r: Rubric) => (r.usageCount && r.usageCount > 0)).length);
  unusedCount = computed(() => this.rubrics().filter((r: Rubric) => !r.usageCount || r.usageCount === 0).length);

  ngOnInit(): void {
    this.loadRubrics();
  }

  loadRubrics(): void {
    this.loading.set(true);
    this.error.set(null);

    this.rubricApi.list().subscribe({
      next: (response: any) => {
        const data = response?.data || [];
        const mapped: Rubric[] = data.map((r: any) => ({
          id: r.id,
          name: r.title,
          description: r.description || '',
          criteria: (r.criteria || []).map((c: any, ci: number) => ({
            id: `c${ci}`,
            name: c.name,
            description: c.description || '',
            weight: c.maxPoints || 0,
            levels: (c.levels || []).map((l: any, li: number) => ({
              id: `l${li}`,
              name: l.label,
              description: l.description || '',
              points: l.points || 0
            }))
          })),
          totalPoints: r.maxPoints || 100,
          usageCount: r.assignmentId ? 1 : 0,
          createdAt: r.createdAt
        }));
        this.rubrics.set(mapped);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Không thể tải danh sách rubric');
        this.loading.set(false);
      }
    });
  }

  confirmDelete(rubric: Rubric): void {
    const validation = validateRubricDeletion(rubric, this.assignmentRubricIds());
    if (!validation.isValid) {
      this.error.set(validation.errors[0]?.message || 'Không thể xóa rubric này');
      return;
    }
    
    this.rubricToDelete.set(rubric);
    this.showDeleteModal.set(true);
    this.deleteError.set(null);
  }
  
  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.rubricToDelete.set(null);
    this.deleteError.set(null);
  }
  
  deleteRubric(): void {
    const rubric = this.rubricToDelete();
    if (!rubric) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.rubricApi.delete(rubric.id).subscribe({
      next: () => {
        this.rubrics.update((list: Rubric[]) => list.filter((r: Rubric) => r.id !== rubric.id));
        this.cancelDelete();
        this.deleting.set(false);
      },
      error: (err: any) => {
        this.deleteError.set(err?.error?.message || 'Không thể xóa rubric. Vui lòng thử lại.');
        this.deleting.set(false);
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
