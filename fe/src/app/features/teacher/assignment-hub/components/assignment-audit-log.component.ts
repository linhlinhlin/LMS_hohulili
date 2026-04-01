import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AssignmentApi, AuditLogEntry as ApiAuditLogEntry } from '../../../../api/client/assignment.api';
import { SubmissionsStore } from '../stores/submissions.store';
import { SubmissionDetail } from '../../../../api/client/assignment.api';

interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  studentName: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  timestamp: string;
}

type ActionFilter = 'ALL' | 'GRADE_CREATED' | 'GRADE_UPDATED' | 'FEEDBACK_ADDED';

@Component({
  selector: 'app-assignment-audit-log',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-slate-50 -mx-4 sm:-mx-6 -my-6 px-4 sm:px-6 py-6 min-h-[60vh] space-y-4">

      <!-- Summary Stats Card -->
      @if (!loading() && auditLog().length > 0) {
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div class="flex items-center gap-1.5 text-sm">
            <span class="text-gray-600">Tổng thao tác</span>
            <span class="font-semibold text-gray-900">{{ auditLog().length }}</span>
          </div>
          <div class="w-px h-4 bg-gray-200"></div>
          <div class="flex items-center gap-1.5 text-sm">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="text-gray-600">Chấm điểm</span>
            <span class="font-semibold text-gray-900">{{ gradeCount() }}</span>
          </div>
          <div class="w-px h-4 bg-gray-200"></div>
          <div class="flex items-center gap-1.5 text-sm">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span class="text-gray-600">Sửa điểm</span>
            <span class="font-semibold text-gray-900">{{ updateCount() }}</span>
          </div>
          <div class="w-px h-4 bg-gray-200"></div>
          <div class="flex items-center gap-1.5 text-sm">
            <span class="text-gray-600">Lần cuối</span>
            <span class="font-semibold text-gray-900">{{ lastGradedRelative() }}</span>
          </div>
        </div>
      }

      <!-- Filter Bar -->
      @if (!loading() && auditLog().length > 5) {
        <div class="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-2.5 flex flex-wrap items-center gap-3">
          <!-- Student filter -->
          <select [ngModel]="studentFilter()" (ngModelChange)="studentFilter.set($event)"
                  class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-[#0056D2] focus:ring-2 focus:ring-blue-50 outline-none">
            <option value="">Tất cả học viên</option>
            @for (name of uniqueStudents(); track name) {
              <option [value]="name">{{ name }}</option>
            }
          </select>
          <!-- Action filter -->
          <div class="flex gap-1">
            @for (f of actionFilters; track f.key) {
              <button (click)="actionFilter.set(f.key)" type="button"
                      [class]="actionFilter() === f.key ? 'bg-[#0056D2]/10 text-[#0056D2] border-[#0056D2]/20' : 'text-gray-600 border-transparent hover:bg-gray-50'"
                      class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors">
                {{ f.label }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Main Content -->
      <div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-200">
          <h3 class="text-sm font-semibold text-gray-900">Lịch sử thao tác</h3>
          <p class="text-xs text-gray-500 mt-0.5">Ghi nhận theo chuẩn STCW — không thể chỉnh sửa hoặc xóa</p>
        </div>

        <div class="p-5">
          @if (loading()) {
            <div class="py-8 text-center">
              <div class="w-8 h-8 border-4 border-gray-100 border-t-[#0056D2] rounded-full animate-spin mx-auto"></div>
              <p class="text-xs text-gray-500 mt-3">Đang tải lịch sử...</p>
            </div>
          } @else if (filteredEntries().length > 0) {
            <div class="relative space-y-3 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-gray-200">
              @for (entry of visibleEntries(); track entry.id) {
                <!-- Compact Entry -->
                <div class="relative pl-8 group">
                  <!-- Timeline dot -->
                  <div class="absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 border-white"
                       [class]="getActionBgClass(entry.action)">
                    <svg class="w-3 h-3" [class]="getActionIconClass(entry.action)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      @switch (entry.action) {
                        @case ('GRADE_CREATED') { <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/> }
                        @case ('GRADE_UPDATED') { <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/> }
                        @case ('FEEDBACK_ADDED') { <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.862-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/> }
                        @default { <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/> }
                      }
                    </svg>
                  </div>

                  <!-- Compact single-line entry (expand on click) -->
                  <div class="rounded-lg border border-gray-100 bg-white px-3 py-2.5 hover:border-gray-200 transition-colors cursor-pointer"
                       (click)="toggleExpand(entry.id)">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-1.5 text-sm min-w-0">
                        <span class="font-medium text-gray-900 truncate">{{ entry.userName }}</span>
                        <span class="text-gray-500 flex-shrink-0">{{ getActionText(entry.action) }}</span>
                        <span class="font-medium text-[#0056D2] truncate">{{ entry.studentName }}</span>
                        @if (entry.newValue && entry.action !== 'FEEDBACK_ADDED') {
                          <span class="text-emerald-600 font-semibold flex-shrink-0">
                            @if (entry.oldValue && entry.action === 'GRADE_UPDATED') {
                              {{ entry.oldValue }} → {{ entry.newValue }}
                            } @else {
                              {{ entry.newValue }}
                            }
                          </span>
                        }
                      </div>
                      <span class="text-xs text-gray-400 flex-shrink-0">{{ relativeTime(entry.timestamp) }}</span>
                    </div>

                    <!-- Expanded detail (click to toggle) -->
                    @if (expandedIds().has(entry.id)) {
                      @if (entry.reason) {
                        <div class="mt-2 p-2 bg-amber-50 border-l-2 border-amber-200 rounded-r-md">
                          <p class="text-xs text-amber-700"><span class="font-medium">Nhận xét:</span> {{ entry.reason }}</p>
                        </div>
                      }
                      <p class="text-[10px] text-gray-400 mt-1.5">{{ formatDateFull(entry.timestamp) }}</p>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Load more -->
            @if (filteredEntries().length > displayLimit()) {
              <button (click)="displayLimit.set(displayLimit() + 20)" type="button"
                      class="w-full mt-4 py-2.5 text-sm font-medium text-[#0056D2] hover:bg-[#0056D2]/5 rounded-lg transition-colors">
                Xem thêm {{ filteredEntries().length - displayLimit() }} thao tác
              </button>
            }
          } @else if (auditLog().length > 0) {
            <div class="py-8 text-center">
              <p class="text-sm text-gray-600">Không có kết quả phù hợp bộ lọc</p>
              <button (click)="resetFilters()" class="text-sm text-[#0056D2] hover:underline mt-1">Xóa bộ lọc</button>
            </div>
          } @else {
            <div class="py-12 text-center">
              <svg class="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
              <p class="text-sm font-medium text-gray-600">Chưa có ghi nhận hoạt động</p>
              <p class="text-xs text-gray-500 mt-1">Các thao tác chấm điểm sẽ hiển thị tại đây sau khi có bài nộp được chấm.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AssignmentAuditLogComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private assignmentApi = inject(AssignmentApi);
  private submissionsStore = inject(SubmissionsStore);

  auditLog = signal<AuditLogEntry[]>([]);
  loading = signal(false);
  expandedIds = signal(new Set<string>());
  displayLimit = signal(20);

  // Filters
  studentFilter = signal('');
  actionFilter = signal<ActionFilter>('ALL');
  actionFilters: { key: ActionFilter; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'GRADE_CREATED', label: 'Chấm điểm' },
    { key: 'GRADE_UPDATED', label: 'Sửa điểm' },
    { key: 'FEEDBACK_ADDED', label: 'Nhận xét' }
  ];

  // Computed
  gradeCount = computed(() => this.auditLog().filter(e => e.action === 'GRADE_CREATED').length);
  updateCount = computed(() => this.auditLog().filter(e => e.action === 'GRADE_UPDATED').length);
  uniqueStudents = computed(() => [...new Set(this.auditLog().map(e => e.studentName))].sort());
  lastGradedRelative = computed(() => {
    const entries = this.auditLog();
    return entries.length > 0 ? this.relativeTime(entries[0].timestamp) : '-';
  });

  filteredEntries = computed(() => {
    let entries = this.auditLog();
    const student = this.studentFilter();
    const action = this.actionFilter();
    if (student) entries = entries.filter(e => e.studentName === student);
    if (action !== 'ALL') entries = entries.filter(e => e.action === action);
    return entries;
  });

  visibleEntries = computed(() => this.filteredEntries().slice(0, this.displayLimit()));

  ngOnInit(): void {
    const assignmentId = this.route.parent?.snapshot.paramMap.get('id') || '';
    if (!assignmentId) return;

    this.loading.set(true);
    this.assignmentApi.getAuditLog(assignmentId).subscribe({
      next: (response: { data?: ApiAuditLogEntry[] }) => {
        if (response.data && response.data.length > 0) {
          this.auditLog.set(response.data as AuditLogEntry[]);
          this.loading.set(false);
        } else {
          this.loadFromSubmissions(assignmentId);
        }
      },
      error: () => this.loadFromSubmissions(assignmentId)
    });
  }

  private loadFromSubmissions(assignmentId: string): void {
    this.submissionsStore.loadSubmissions(assignmentId).subscribe({
      next: () => {
        this.auditLog.set(this.deriveAuditEntries(this.submissionsStore.submissions()));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private deriveAuditEntries(submissions: SubmissionDetail[]): AuditLogEntry[] {
    const entries: AuditLogEntry[] = [];
    for (const sub of submissions) {
      const gradedAt = sub.grade?.gradedAt || sub.gradedAt;
      if (!gradedAt) continue;
      const score = sub.grade?.score ?? sub.score;
      const graderName = sub.gradedByName || sub.grade?.gradedBy || 'Giảng viên';
      if (score !== undefined && score !== null) {
        entries.push({
          id: `grade-${sub.id}`, action: 'GRADE_CREATED',
          userId: sub.grade?.gradedBy || '', userName: graderName,
          studentName: sub.studentName || sub.studentId,
          newValue: `${score}${sub.grade?.maxScore ? '/' + sub.grade.maxScore : ''}`,
          timestamp: gradedAt
        });
      }
      const feedback = sub.grade?.feedback || sub.feedback;
      if (feedback) {
        entries.push({
          id: `feedback-${sub.id}`, action: 'FEEDBACK_ADDED',
          userId: sub.grade?.gradedBy || '', userName: graderName,
          studentName: sub.studentName || sub.studentId,
          reason: feedback.length > 120 ? feedback.substring(0, 120) + '...' : feedback,
          timestamp: gradedAt
        });
      }
    }
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return entries;
  }

  toggleExpand(id: string): void {
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  resetFilters(): void {
    this.studentFilter.set('');
    this.actionFilter.set('ALL');
  }

  relativeTime(dateString: string): string {
    try {
      const diff = Date.now() - new Date(dateString).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Vừa xong';
      if (minutes < 60) return `${minutes} phút trước`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} giờ trước`;
      const days = Math.floor(hours / 24);
      if (days === 1) return 'Hôm qua ' + new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      if (days < 7) return `${days} ngày trước`;
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch { return dateString; }
  }

  formatDateFull(dateString: string): string {
    try { return new Date(dateString).toLocaleString('vi-VN'); } catch { return dateString; }
  }

  getActionBgClass(action: string): string {
    return ({ 'GRADE_CREATED': 'bg-emerald-100', 'GRADE_UPDATED': 'bg-amber-100', 'FEEDBACK_ADDED': 'bg-[#0056D2]/10' } as any)[action] || 'bg-gray-100';
  }

  getActionIconClass(action: string): string {
    return ({ 'GRADE_CREATED': 'text-emerald-600', 'GRADE_UPDATED': 'text-amber-600', 'FEEDBACK_ADDED': 'text-[#0056D2]' } as any)[action] || 'text-gray-600';
  }

  getActionText(action: string): string {
    return ({ 'GRADE_CREATED': 'chấm', 'GRADE_UPDATED': 'sửa điểm', 'FEEDBACK_ADDED': 'nhận xét' } as any)[action] || action;
  }
}
