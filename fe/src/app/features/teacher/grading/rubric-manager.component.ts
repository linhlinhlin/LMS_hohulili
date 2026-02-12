import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';

import { RouterLink } from '@angular/router';
import { Rubric, validateRubricDeletion } from './utils/rubric-calculator';
import { RubricApi } from '../../../api/endpoints/rubric.api';

/**
 * Rubric Manager Component
 * 
 * Displays and manages rubrics for grading.
 * Features: list view, create/edit/delete actions, usage statistics.
 * 
 * @requirements 6.2, 6.5
 */
@Component({
  selector: 'app-rubric-manager',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-6xl mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Quản lý Rubric</h1>
          <p class="text-gray-600 mt-1">Tạo và quản lý các bảng tiêu chí chấm điểm</p>
        </div>
        <a routerLink="create" class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Tạo Rubric mới
        </a>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div class="text-2xl font-bold text-[#0056D2]">{{ totalRubrics() }}</div>
          <div class="text-sm text-gray-500">Tổng số Rubric</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div class="text-2xl font-bold text-green-600">{{ inUseCount() }}</div>
          <div class="text-sm text-gray-500">Đang sử dụng</div>
        </div>
        <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div class="text-2xl font-bold text-gray-600">{{ unusedCount() }}</div>
          <div class="text-sm text-gray-500">Chưa sử dụng</div>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
        </div>
      } @else if (rubrics().length === 0) {
        <!-- Empty State -->
        <div class="bg-white rounded-xl shadow-sm border p-12 text-center">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có Rubric nào</h3>
          <p class="text-gray-500 mb-4">Tạo rubric đầu tiên để bắt đầu chấm điểm theo tiêu chí</p>
          <a routerLink="create" class="inline-flex items-center gap-2 px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Tạo Rubric mới
          </a>
        </div>
      } @else {
        <!-- Rubric List -->
        <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Rubric</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiêu chí</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng điểm</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đang dùng</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              @for (rubric of rubrics(); track rubric.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <div class="font-medium text-gray-900">{{ rubric.name }}</div>
                    @if (rubric.description) {
                      <div class="text-sm text-gray-500 truncate max-w-xs">{{ rubric.description }}</div>
                    }
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ rubric.criteria.length }} tiêu chí</td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ rubric.totalPoints }} điểm</td>
                  <td class="px-6 py-4">
                    @if (rubric.usageCount && rubric.usageCount > 0) {
                      <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {{ rubric.usageCount }} bài tập
                      </span>
                    } @else {
                      <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        Chưa dùng
                      </span>
                    }
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(rubric.createdAt || '') }}</td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <a [routerLink]="['edit', rubric.id]" class="p-2 text-gray-400 hover:text-[#0056D2] hover:bg-blue-50 rounded-lg" title="Sửa">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </a>
                      <button (click)="confirmDelete(rubric)" [disabled]="rubric.usageCount && rubric.usageCount > 0"
                              class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" title="Xóa">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Xác nhận xóa</h3>
            <p class="text-gray-600 mb-4">
              Bạn có chắc chắn muốn xóa rubric "{{ rubricToDelete()?.name }}"? Hành động này không thể hoàn tác.
            </p>
            @if (deleteError()) {
              <div class="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {{ deleteError() }}
              </div>
            }
            <div class="flex justify-end gap-3">
              <button (click)="cancelDelete()" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Hủy
              </button>
              <button (click)="deleteRubric()" [disabled]="deleting()" 
                      class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {{ deleting() ? 'Đang xóa...' : 'Xóa' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Error Message -->
      @if (error()) {
        <div class="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {{ error() }}
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
  inUseCount = computed(() => this.rubrics().filter((r: Rubric) => r.usageCount && r.usageCount > 0).length);
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
    // Validate deletion
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
