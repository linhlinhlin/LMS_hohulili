import { Component, inject, OnInit, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-submission-list',
  imports: [RouterLink, FormsModule, LucideAngularModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">

      <!-- Unified Stats + Filter Bar (Canvas pattern: click stat = filter toggle) -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 bg-white shadow-sm px-4 py-3">
        <div class="flex flex-wrap items-center gap-1" role="tablist">
          <button (click)="setFilter('ALL')" role="tab"
                  [class]="filter() === 'ALL' ? 'bg-[#0056D2]/10 text-[#0056D2] border-[#0056D2]/20' : 'text-gray-600 border-transparent hover:bg-gray-50'"
                  class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors">
            <span class="font-bold">{{ store.totalCount() }}</span> Tất cả
          </button>
          <button (click)="setFilter('PENDING')" role="tab"
                  [class]="filter() === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-gray-600 border-transparent hover:bg-gray-50'"
                  class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span class="font-bold">{{ store.pendingCount() }}</span> Chờ chấm
          </button>
          <button (click)="setFilter('GRADED')" role="tab"
                  [class]="filter() === 'GRADED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-gray-600 border-transparent hover:bg-gray-50'"
                  class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="font-bold">{{ store.gradedCount() }}</span> Đã chấm
          </button>
          <button (click)="setFilter('LATE')" role="tab"
                  [class]="filter() === 'LATE' ? 'bg-red-50 text-red-700 border-red-200' : 'text-gray-600 border-transparent hover:bg-gray-50'"
                  class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors">
            <span class="w-2 h-2 rounded-full bg-red-400"></span>
            <span class="font-bold">{{ store.lateCount() }}</span> Muộn
          </button>
        </div>

        <div class="flex items-center gap-2">
          @if (stats().averageScore > 0) {
            <span class="text-xs text-gray-500">TB <span class="font-semibold text-gray-900">{{ stats().averageScore | number:'1.0-0' }}%</span></span>
          }
          @if (selectedIds().length > 0) {
            <button (click)="openBatchGrade()"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-[#0056D2]/20 bg-[#0056D2]/5 px-3 py-1.5 text-sm font-medium text-[#0056D2] hover:bg-[#0056D2]/10 transition-colors">
              {{ selectedIds().length }} chọn — Chấm hàng loạt
            </button>
          }
          <button (click)="reload()" title="Tải lại"
                  class="p-2 rounded-md text-gray-400 hover:text-[#0056D2] transition-colors">
            <lucide-icon name="rotate-cw" [size]="15" [class.animate-spin]="store.loading()"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Loading -->
      @if (store.loading() && store.filteredSubmissions().length === 0) {
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4 px-5 py-4 border-b border-gray-100 animate-pulse">
              <div class="h-4 w-4 rounded bg-gray-200"></div>
              <div class="h-8 w-8 rounded-full bg-gray-200"></div>
              <div class="h-4 flex-1 rounded bg-gray-200"></div>
              <div class="h-4 w-16 rounded bg-gray-100"></div>
            </div>
          }
        </div>
      }

      <!-- Error -->
      @if (store.error()) {
        <div class="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p class="text-sm font-medium text-red-700 mb-2">Đã xảy ra lỗi</p>
          <p class="text-xs text-red-500 mb-4">{{ store.error() }}</p>
          <button (click)="reload()" class="rounded-md bg-[#0056D2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004BB5] transition-colors">
            Thử lại
          </button>
        </div>
      }

      <!-- Submissions Table -->
      @if (!store.error()) {
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="px-5 py-3 w-10">
                    <input type="checkbox" (change)="toggleSelectAll($event)"
                           [checked]="isAllSelected()"
                           class="h-4 w-4 rounded border-gray-300 text-[#0056D2] focus:ring-[#0056D2]/20 cursor-pointer"/>
                  </th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Học viên</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời gian nộp</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44">Điểm số</th>
                  <th class="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (sub of store.filteredSubmissions(); track sub.id) {
                  <tr class="hover:bg-gray-50 transition-colors group cursor-pointer" (click)="openSpeedGrader(sub.id, $event)">
                    <td class="px-5 py-3">
                      <input type="checkbox" [checked]="isSelected(sub.id)"
                             (change)="toggleSelect(sub.id)"
                             class="h-4 w-4 rounded border-gray-300 text-[#0056D2] focus:ring-[#0056D2]/20 cursor-pointer"/>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                          {{ getInitials(sub.studentName) }}
                        </div>
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{{ sub.studentName }}</p>
                          <p class="text-xs text-gray-500 truncate">{{ sub.studentEmail }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                      {{ formatDate(sub.submittedAt) }}
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                            [class]="getStatusClass(sub.status, sub.isLate)">
                        {{ getStatusText(sub.status, sub.isLate) }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      @if (getGradeScore(sub.grade) !== undefined) {
                        <span class="text-sm font-semibold text-[#0056D2]">{{ getGradeScore(sub.grade) }}<span class="text-gray-400 font-normal">/{{ sub.maxScore || 100 }}</span></span>
                      } @else {
                        <span class="text-sm text-gray-400">—</span>
                      }
                    </td>
                    <td class="px-5 py-3 text-right">
                      <a [routerLink]="['..', 'grade', sub.id]"
                         class="inline-flex items-center gap-1.5 text-sm font-medium text-[#0056D2] hover:text-[#004BB5] transition-colors">
                        @if (getGradeScore(sub.grade) !== undefined) {
                          Xem
                        } @else {
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/></svg>
                          Chấm
                        }
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (store.filteredSubmissions().length === 0 && !store.loading()) {
            <div class="py-16 text-center">
              <svg class="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
              </svg>
              @if (filter() !== 'ALL' && store.totalCount() > 0) {
                <p class="text-sm font-medium text-gray-600">Không có bài nộp phù hợp bộ lọc</p>
                <p class="text-xs text-gray-500 mt-1">
                  <button (click)="setFilter('ALL')" class="text-[#0056D2] hover:underline">Xem tất cả {{ store.totalCount() }} bài nộp</button>
                </p>
              } @else {
                <p class="text-sm font-medium text-gray-600">Chưa có học viên nào nộp bài</p>
                <p class="text-xs text-gray-500 mt-1">Bài nộp sẽ hiển thị tại đây khi học viên nộp bài.</p>
              }
            </div>
          }
        </div>
      }

      <!-- Batch Grade Modal -->
      @if (showBatchModal()) {
        <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div class="bg-white rounded-lg border border-gray-200 shadow-lg max-w-md w-full overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-900">Chấm điểm hàng loạt</h3>
              <button (click)="closeBatchModal()" class="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <lucide-icon name="x" [size]="16"></lucide-icon>
              </button>
            </div>

            <div class="p-5 space-y-4">
              <p class="text-sm text-gray-600">Áp dụng cho <span class="font-semibold text-gray-900">{{ selectedIds().length }}</span> bài nộp đã chọn</p>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Điểm số</label>
                <div class="relative">
                  <input type="number" [(ngModel)]="batchScore"
                         [max]="assignmentStore.assignment()?.maxScore || 100"
                         class="w-full h-10 pl-4 pr-14 border border-gray-300 rounded-md text-sm focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/20 outline-none"/>
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">/ {{ assignmentStore.assignment()?.maxScore || 100 }}</span>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nhận xét (tùy chọn)</label>
                <textarea [(ngModel)]="batchFeedback" rows="3"
                          placeholder="Nhận xét chung cho các bài nộp..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-400 focus:border-[#0056D2] focus:ring-2 focus:ring-[#0056D2]/20 outline-none resize-none"></textarea>
              </div>
            </div>

            <div class="px-5 py-3 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button (click)="closeBatchModal()"
                      class="flex-1 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button (click)="submitBatchGrade()"
                      class="flex-1 rounded-md bg-[#0056D2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004BB5] transition-colors">
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
  private router = inject(Router);
  store = inject(SubmissionsStore);
  assignmentStore = inject(AssignmentDetailStore);
  private toast = inject(ToastService);

  filter = this.store.filter;
  stats = this.assignmentStore.stats;
  selectedIds = signal<string[]>([]);
  inlineGrades = signal<Record<string, number>>({});
  showBatchModal = signal(false);
  batchScore = 0;
  batchFeedback = '';

  ngOnInit(): void {
    // Read ID from route (not store — store may be cleared by parent layout)
    const assignmentId = this.route.parent?.snapshot.paramMap.get('id')
                      || this.assignmentStore.assignmentId();
    if (assignmentId) {
      this.store.loadSubmissions(assignmentId, true).subscribe({
        next: () => {
          this.assignmentStore.updateStatsFromSubmissions(this.store.submissions());
        },
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
    const assignmentId = this.route.parent?.snapshot.paramMap.get('id')
                      || this.assignmentStore.assignmentId();
    if (assignmentId) {
      this.store.loadSubmissions(assignmentId, true).subscribe({
        next: () => {
          this.assignmentStore.updateStatsFromSubmissions(this.store.submissions());
        },
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
    if (isLate || normalizedStatus === 'late' || normalizedStatus === 'late_submission') return 'bg-red-50 text-red-700';
    if (normalizedStatus === 'graded') return 'bg-emerald-50 text-emerald-700';
    return 'bg-amber-50 text-amber-700';
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

  openSpeedGrader(submissionId: string, event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest('a')) return;
    const assignmentId = this.route.parent?.snapshot.paramMap.get('id')
                      || this.assignmentStore.assignmentId();
    if (assignmentId) {
      this.router.navigate(['/teacher/assessments/classes/assignments', assignmentId, 'grade', submissionId]);
    }
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
