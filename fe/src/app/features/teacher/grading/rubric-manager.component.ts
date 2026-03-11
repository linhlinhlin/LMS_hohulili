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
  imports: [CommonModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3">
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-3 mb-3">
        <span class="text-xs text-slate-500 font-medium">{{ totalRubrics() }} rubric · {{ inUseCount() }} đang dùng</span>
        <a routerLink="create"
           class="h-8 px-3.5 bg-[#0056D2] text-white rounded-lg text-xs font-semibold hover:bg-[#004BB5] transition-colors flex items-center gap-1.5">
          <lucide-icon name="plus" [size]="14"></lucide-icon>
          Tạo Rubric
        </a>
      </div>

      <!-- Content -->
      @if (loading()) {
        <div class="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div class="w-8 h-8 border-2 border-slate-200 border-t-[#0056D2] rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-sm text-slate-400">Đang tải...</p>
        </div>
      } @else if (rubrics().length === 0) {
        <div class="bg-white rounded-lg border border-dashed border-slate-200 py-12 text-center">
          <lucide-icon name="file-text" [size]="32" class="mx-auto mb-3 text-slate-300"></lucide-icon>
          <p class="text-sm font-medium text-slate-500 mb-4">Chưa có rubric dùng chung</p>
          <a routerLink="create" class="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0056D2] text-white rounded-lg text-xs font-semibold hover:bg-[#004BB5] transition-colors">
            <lucide-icon name="plus" [size]="14"></lucide-icon>
            Tạo Rubric đầu tiên
          </a>
        </div>
      } @else {
        <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th scope="col" class="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rubric</th>
                <th scope="col" class="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cấu trúc</th>
                <th scope="col" class="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sử dụng</th>
                <th scope="col" class="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cập nhật</th>
                <th scope="col" class="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (rubric of rubrics(); track rubric.id) {
                <tr class="group hover:bg-slate-50/50 transition-colors">
                  <td class="px-4 py-2.5">
                    <div class="font-semibold text-sm text-slate-900 group-hover:text-[#0056D2] transition-colors">{{ rubric.name }}</div>
                    <div class="text-xs text-slate-500 line-clamp-1">{{ rubric.description || 'Không có mô tả' }}</div>
                  </td>
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-3 text-xs">
                      <span class="font-semibold text-slate-700">{{ rubric.criteria.length }} tiêu chí</span>
                      <span class="text-slate-300">&middot;</span>
                      <span class="font-semibold text-emerald-600">{{ rubric.totalPoints }} điểm</span>
                    </div>
                  </td>
                  <td class="px-4 py-2.5">
                    @if (rubric.usageCount && rubric.usageCount > 0) {
                      <span class="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700">{{ rubric.usageCount }} bài tập</span>
                    } @else {
                      <span class="text-xs text-slate-500">Chưa dùng</span>
                    }
                  </td>
                  <td class="px-4 py-2.5 text-xs text-slate-500">
                    {{ formatDate(rubric.createdAt || '') }}
                  </td>
                  <td class="px-4 py-2.5">
                    <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a [routerLink]="['edit', rubric.id]"
                         aria-label="Chỉnh sửa rubric"
                         class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-[#0056D2] hover:bg-blue-50 focus:ring-2 focus:ring-[#0056D2]/20 focus:outline-none transition-colors">
                        <lucide-icon name="edit-3" [size]="14"></lucide-icon>
                      </a>
                      <button (click)="confirmDelete(rubric)" [disabled]="rubric.usageCount && rubric.usageCount > 0"
                              aria-label="Xóa rubric"
                              class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 focus:ring-2 focus:ring-rose-200 focus:outline-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Delete Modal -->
      @if (showDeleteModal()) {
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-rubric-title" class="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-6">
            <h3 id="delete-rubric-title" class="text-base font-semibold text-slate-900 mb-2">Xóa rubric?</h3>
            <p class="text-sm text-slate-500 mb-4">
              <span class="font-semibold text-slate-700">"{{ rubricToDelete()?.name }}"</span> sẽ bị xóa vĩnh viễn.
            </p>

            @if (deleteError()) {
              <div class="mb-4 p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-sm flex items-center gap-2">
                <lucide-icon name="alert-circle" [size]="14"></lucide-icon>
                {{ deleteError() }}
              </div>
            }

            <div class="flex items-center justify-end gap-3">
              <button (click)="cancelDelete()" class="h-8 px-3.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Hủy
              </button>
              <button (click)="deleteRubric()" [disabled]="deleting()"
                      class="h-8 px-3.5 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                @if (deleting()) {
                  <lucide-icon name="loader-2" [size]="14" class="animate-spin"></lucide-icon>
                }
                Xóa
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Error toast -->
      @if (error()) {
        <div class="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-slate-900 text-white rounded-lg shadow-lg flex items-center gap-3 z-[200] text-sm">
          <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
          {{ error() }}
          <button (click)="error.set(null)" class="text-slate-400 hover:text-white">
            <lucide-icon name="x" [size]="14"></lucide-icon>
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
