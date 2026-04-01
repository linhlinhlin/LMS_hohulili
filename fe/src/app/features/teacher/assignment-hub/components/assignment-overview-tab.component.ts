import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AssignmentDetailStore } from '../stores/assignment-detail.store';
import { SubmissionsStore } from '../stores/submissions.store';

/**
 * Assignment Overview Tab — Read-only summary for quick scanning.
 * Contains: description, metadata, rubric preview, score distribution.
 * Edit actions redirect to "Cài đặt" tab.
 */
@Component({
  selector: 'app-assignment-overview-tab',
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">

      @if (assignmentStore.loading()) {
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0056D2] border-t-transparent"></div>
          <p class="mt-3 text-sm text-gray-600">Đang tải...</p>
        </div>
      }

      @if (!assignmentStore.loading() && assignment()) {

        <!-- Overview Card -->
        <section class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900">Thông tin bài tập</h3>
            <a routerLink="../settings" class="text-sm font-medium text-[#0056D2] hover:text-[#004BB5] transition-colors">Chỉnh sửa</a>
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between gap-4 mb-4">
              <div class="min-w-0 flex-1">
                <div class="prose prose-sm prose-slate max-w-none" [innerHTML]="assignment()?.description || 'Không có mô tả'"></div>
                @if (assignment()?.instructions && assignment()?.instructions !== assignment()?.description) {
                  <div class="mt-3 pt-3 border-t border-gray-100">
                    <p class="text-xs font-medium text-gray-600 mb-1">Hướng dẫn thực hiện</p>
                    <div class="prose prose-sm prose-slate max-w-none text-gray-600" [innerHTML]="assignment()?.instructions"></div>
                  </div>
                }
              </div>
              <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0" [class]="getStatusBadgeClass()">
                {{ getStatusLabel() }}
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-gray-100">
              <div>
                <p class="text-xs text-gray-600">Hạn nộp</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(assignment()?.dueDate) || 'Không giới hạn' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600">Điểm tối đa</p>
                <p class="text-sm font-medium text-gray-900">{{ assignment()?.maxScore || 100 }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600">Bài nộp</p>
                <p class="text-sm font-medium text-gray-900">{{ assignment()?.submissionsCount || 0 }}/{{ assignment()?.totalStudents || 0 }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600">Cập nhật</p>
                <p class="text-sm font-medium text-gray-900">{{ formatDate(assignment()?.updatedAt) }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Rubric quick link -->
        <section class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div class="px-5 py-4 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900">Tiêu chí đánh giá</h3>
              <p class="text-xs text-gray-600 mt-0.5">Quản lý rubric trong tab Cài đặt</p>
            </div>
            <a routerLink="../settings" class="text-sm font-medium text-[#0056D2] hover:text-[#004BB5] transition-colors">Xem & quản lý</a>
          </div>
        </section>

        <!-- Score Distribution -->
        @if (hasAnyScores()) {
          <section class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200">
              <h3 class="text-sm font-semibold text-gray-900">Phân bố điểm</h3>
            </div>
            <div class="p-5">
              <div class="max-w-lg">
                <div class="flex items-end gap-2 h-32">
                  @for (item of stats().scoreDistribution; track item.range) {
                    <div class="flex-1 flex flex-col items-center gap-1">
                      <span class="text-[10px] font-semibold text-gray-900 tabular-nums">{{ item.count || '' }}</span>
                      <div class="w-full bg-gray-100 rounded-t-md overflow-hidden relative" style="min-height: 4px"
                           [style.height.%]="getBarWidth(item.count)">
                        <div class="absolute inset-0 rounded-t-md transition-all duration-500"
                             [class.bg-[#0056D2]]="item.count > 0"
                             [class.bg-gray-200]="item.count === 0"></div>
                      </div>
                    </div>
                  }
                </div>
                <div class="flex gap-2 mt-2 border-t border-gray-100 pt-2">
                  @for (item of stats().scoreDistribution; track item.range) {
                    <div class="flex-1 text-center">
                      <span class="text-[10px] text-gray-600 tabular-nums">{{ item.range }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </section>
        }

      }
    </div>
  `
})
export class AssignmentOverviewTabComponent {
  assignmentStore = inject(AssignmentDetailStore);
  private submissionsStore = inject(SubmissionsStore);

  assignment = this.assignmentStore.assignment;
  stats = this.assignmentStore.stats;

  hasAnyScores(): boolean {
    return this.stats().scoreDistribution?.some((d: { count: number }) => d.count > 0) ?? false;
  }

  getBarWidth(count: number): number {
    const max = Math.max(...(this.stats().scoreDistribution?.map((d: { count: number }) => d.count) || [1]));
    return max > 0 ? (count / max) * 100 : 0;
  }

  getStatusBadgeClass(): string {
    const status = this.assignment()?.status?.toLowerCase();
    if (status === 'published') return 'bg-emerald-50 text-emerald-700';
    if (status === 'closed') return 'bg-gray-100 text-gray-600';
    return 'bg-amber-50 text-amber-700';
  }

  getStatusLabel(): string {
    const status = this.assignment()?.status?.toLowerCase();
    if (status === 'published') return 'Đã xuất bản';
    if (status === 'closed') return 'Đã đóng';
    return 'Nháp';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }
}
