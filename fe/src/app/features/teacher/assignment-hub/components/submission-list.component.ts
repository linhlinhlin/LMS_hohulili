import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore, SubmissionFilter } from '../stores/submissions.store';
import { SubmissionGrade } from '../../../../api/client/assignment.api';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * Submission List Component
 * 
 * Displays submissions with inline grading support and batch operations.
 * 
 * @requirements Expert feedback - Inline grading, Batch grading
 */
@Component({
  selector: 'app-submission-list',
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Toolbar -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button (click)="setFilter('ALL')" 
                  [class]="filter() === 'ALL' ? 'bg-[#0056D2]/10 text-[#004BB5]' : 'bg-white'"
                  class="px-3 py-1.5 border rounded-lg text-sm transition-colors">Tất cả</button>
          <button (click)="setFilter('PENDING')"
                  [class]="filter() === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-white'"
                  class="px-3 py-1.5 border rounded-lg text-sm transition-colors">Chờ chấm ({{ store.pendingCount() }})</button>
          <button (click)="setFilter('GRADED')"
                  [class]="filter() === 'GRADED' ? 'bg-green-100 text-green-700' : 'bg-white'"
                  class="px-3 py-1.5 border rounded-lg text-sm transition-colors">Đã chấm ({{ store.gradedCount() }})</button>
          <button (click)="setFilter('LATE')"
                  [class]="filter() === 'LATE' ? 'bg-red-100 text-red-700' : 'bg-white'"
                  class="px-3 py-1.5 border rounded-lg text-sm transition-colors">Nộp muộn ({{ store.lateCount() }})</button>
        </div>
        
        <!-- Batch Actions -->
        @if (selectedIds().length > 0) {
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">{{ selectedIds().length }} đã chọn</span>
            <button (click)="openBatchGrade()" class="px-3 py-1.5 bg-[#0056D2] text-white rounded-lg text-sm transition-colors hover:bg-[#004BB5]">
              Chấm hàng loạt
            </button>
          </div>
        }
      </div>

      <!-- Loading -->
      @if (store.loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
        </div>
      }

      <!-- Error -->
      @if (store.error()) {
        <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg class="w-12 h-12 mx-auto text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-red-600 font-medium">{{ store.error() }}</p>
          <button (click)="reload()" class="mt-3 px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
            Thử lại
          </button>
        </div>
      }

      <!-- Table -->
      @if (!store.loading() && !store.error()) {
        <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 w-10">
                  <input type="checkbox" (change)="toggleSelectAll($event)" 
                         [checked]="isAllSelected()" class="rounded"/>
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Học viên</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nộp lúc</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Điểm</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              @for (sub of store.filteredSubmissions(); track sub.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <input type="checkbox" [checked]="isSelected(sub.id)" 
                           (change)="toggleSelect(sub.id)" class="rounded"/>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-[#0056D2]/10 flex items-center justify-center text-[#0056D2] text-sm font-medium">
                        {{ getInitials(sub.studentName) }}
                      </div>
                      <div>
                        <div class="font-medium text-gray-900">{{ sub.studentName }}</div>
                        <div class="text-xs text-gray-500">{{ sub.studentEmail }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ formatDate(sub.submittedAt) }}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs font-medium rounded-full" [class]="getStatusClass(sub.status, sub.isLate)">
                      {{ getStatusText(sub.status, sub.isLate) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <!-- Inline Grade Input -->
                    @if (getGradeScore(sub.grade) !== undefined) {
                      <span class="font-medium text-gray-900">{{ getGradeScore(sub.grade) }}/{{ sub.maxScore || 100 }}</span>
                    } @else {
                      <div class="flex items-center gap-1">
                        <input type="number" [value]="inlineGrades()[sub.id] || ''" 
                               (input)="setInlineGrade(sub.id, $event)"
                               class="w-16 px-2 py-1 border rounded text-sm" placeholder="--"
                               [min]="0" [max]="sub.maxScore || 100"/>
                        @if (inlineGrades()[sub.id]) {
                          <button (click)="saveInlineGrade(sub.id, sub.maxScore || 100)" 
                                  [disabled]="store.savingGrade() === sub.id"
                                  class="p-1 text-green-600 hover:bg-green-50 rounded">
                            @if (store.savingGrade() === sub.id) {
                              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                              </svg>
                            } @else {
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                              </svg>
                            }
                          </button>
                        }
                      </div>
                    }
                  </td>
                  <td class="px-4 py-3 text-right">
                    <a [routerLink]="['..', 'grade', sub.id]" 
                       class="text-[#0056D2] hover:text-[#004BB5] text-sm font-medium">
                      {{ getGradeScore(sub.grade) !== undefined ? 'Xem/Sửa' : 'Chấm điểm' }} →
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          
          @if (store.filteredSubmissions().length === 0) {
            <div class="py-12 text-center text-gray-500">
              Không có bài nộp phù hợp với bộ lọc
            </div>
          }
        </div>
      }

      <!-- Batch Grade Modal -->
      @if (showBatchModal()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6">
            <h3 class="text-lg font-semibold mb-4">Chấm điểm hàng loạt</h3>
            <p class="text-sm text-gray-600 mb-4">Áp dụng cho {{ selectedIds().length }} bài nộp đã chọn</p>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Điểm</label>
                <input type="number" [(ngModel)]="batchScore" class="w-full px-3 py-2 border rounded-lg"
                       [min]="0" [max]="assignmentStore.assignment()?.maxScore || 100"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nhận xét (tùy chọn)</label>
                <textarea [(ngModel)]="batchFeedback" rows="3" class="w-full px-3 py-2 border rounded-lg"
                          placeholder="Nhận xét chung cho tất cả..."></textarea>
              </div>
            </div>
            <div class="flex gap-2 mt-6">
              <button (click)="closeBatchModal()" class="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors">Hủy</button>
              <button (click)="submitBatchGrade()" class="flex-1 px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors">
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class SubmissionListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  store = inject(SubmissionsStore);
  assignmentStore = inject(AssignmentDetailStore);
  private toast = inject(ToastService);

  filter = this.store.filter;
  selectedIds = signal<string[]>([]);
  inlineGrades = signal<Record<string, number>>({});
  showBatchModal = signal(false);
  batchScore = 0;
  batchFeedback = '';

  ngOnInit(): void {
    const assignmentId = this.assignmentStore.assignmentId();
    if (assignmentId) {
      this.store.loadSubmissions(assignmentId).subscribe({
        error: () => this.toast.error('Không thể tải danh sách bài nộp')
      });
    }
    // Check for filter query param
    const filterParam = this.route.snapshot.queryParamMap.get('filter');
    if (filterParam) {
      this.store.setFilter(filterParam as SubmissionFilter);
    }
  }

  setFilter(filter: SubmissionFilter): void {
    this.store.setFilter(filter);
  }

  reload(): void {
    const assignmentId = this.assignmentStore.assignmentId();
    if (assignmentId) {
      this.store.loadSubmissions(assignmentId, true).subscribe({
        error: () => this.toast.error('Không thể tải lại danh sách bài nộp')
      });
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  getStatusClass(status: string, isLate?: boolean): string {
    const normalizedStatus = status?.toLowerCase();
    if (isLate || normalizedStatus === 'late' || normalizedStatus === 'late_submission') return 'bg-red-100 text-red-700';
    if (normalizedStatus === 'graded') return 'bg-green-100 text-green-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  getStatusText(status: string, isLate?: boolean): string {
    const normalizedStatus = status?.toLowerCase();
    if (isLate || normalizedStatus === 'late' || normalizedStatus === 'late_submission') return 'Nộp muộn';
    if (normalizedStatus === 'graded') return 'Đã chấm';
    return 'Chờ chấm';
  }

  getGradeScore(grade: number | SubmissionGrade | undefined): number | undefined {
    return this.store.getGradeScore(grade);
  }

  // Selection
  toggleSelect(id: string): void {
    this.selectedIds.update(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.set(this.store.filteredSubmissions().map(s => s.id));
    } else {
      this.selectedIds.set([]);
    }
  }

  isAllSelected(): boolean {
    const filtered = this.store.filteredSubmissions();
    return filtered.length > 0 && this.selectedIds().length === filtered.length;
  }

  // Inline Grading
  setInlineGrade(id: string, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.inlineGrades.update(grades => ({ ...grades, [id]: value }));
  }

  saveInlineGrade(id: string, maxScore: number): void {
    const score = this.inlineGrades()[id];
    if (score !== undefined && score >= 0 && score <= maxScore) {
      this.store.updateInlineGrade({ submissionId: id, score }).subscribe({
        next: () => this.inlineGrades.update(grades => { const g = { ...grades }; delete g[id]; return g; }),
        error: () => this.toast.error('Không thể lưu điểm')
      });
    }
  }

  // Batch Grading
  openBatchGrade(): void {
    this.showBatchModal.set(true);
  }

  closeBatchModal(): void {
    this.showBatchModal.set(false);
    this.batchScore = 0;
    this.batchFeedback = '';
  }

  submitBatchGrade(): void {
    this.store.batchGrade(this.selectedIds(), this.batchScore, this.batchFeedback).subscribe({
      next: () => {
        this.selectedIds.set([]);
        this.closeBatchModal();
      },
      error: () => this.toast.error('Không thể chấm điểm hàng loạt')
    });
  }
}
