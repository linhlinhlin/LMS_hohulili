import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

/**
 * Assignment Audit Log Component
 *
 * Displays history of grading actions for STCW compliance.
 *
 * @requirements Expert feedback - Audit Log for STCW compliance
 */

interface AuditLogEntry {
  id: string;
  action: 'GRADE_CREATED' | 'GRADE_UPDATED' | 'FEEDBACK_ADDED' | 'RUBRIC_CHANGED' | 'DEADLINE_EXTENDED' | 'ASSIGNMENT_DISTRIBUTED';
  userId: string;
  userName: string;
  studentName: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  timestamp: string;
}

@Component({
  selector: 'app-assignment-audit-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-200">
          <h3 class="text-sm font-semibold text-gray-900">Lịch sử thao tác</h3>
          <p class="text-xs text-gray-500 mt-0.5">Ghi lại mọi thay đổi phục vụ chuẩn đào tạo STCW và minh bạch điểm số</p>
        </div>

        <!-- Timeline -->
        <div class="p-5">
          @if (auditLog().length > 0) {
            <div class="relative space-y-6 before:absolute before:left-[15px] before:top-2 before:bottom-0 before:w-px before:bg-gray-200">
              @for (entry of auditLog(); track entry.id) {
                <div class="relative pl-10">
                  <!-- Timeline marker -->
                  <div class="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 border-white"
                       [class]="getActionBgClass(entry.action)">
                    <svg class="w-3.5 h-3.5" [class]="getActionIconClass(entry.action)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      @switch (entry.action) {
                        @case ('GRADE_CREATED') { <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/> }
                        @case ('GRADE_UPDATED') { <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/> }
                        @case ('FEEDBACK_ADDED') { <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.862-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/> }
                        @case ('RUBRIC_CHANGED') { <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"/> }
                        @case ('DEADLINE_EXTENDED') { <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/> }
                        @default { <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/> }
                      }
                    </svg>
                  </div>

                  <!-- Content -->
                  <div class="rounded-lg border border-gray-100 bg-white p-4 hover:border-gray-200 transition-colors">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <div class="flex items-center gap-1.5 text-sm">
                        <span class="font-medium text-gray-900">{{ entry.userName }}</span>
                        <span class="text-gray-500">{{ getActionText(entry.action) }}</span>
                        <span class="font-medium text-[#0056D2]">{{ entry.studentName }}</span>
                      </div>
                      <span class="text-xs text-gray-400">{{ formatDate(entry.timestamp) }}</span>
                    </div>

                    @if (entry.oldValue && entry.newValue) {
                      <div class="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-md mt-2">
                        <div>
                          <p class="text-xs text-gray-500">Điểm cũ</p>
                          <p class="text-sm text-gray-400 line-through">{{ entry.oldValue }}</p>
                        </div>
                        <svg class="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/>
                        </svg>
                        <div>
                          <p class="text-xs text-gray-500">Điểm mới</p>
                          <p class="text-sm font-semibold text-emerald-600">{{ entry.newValue }}</p>
                        </div>
                      </div>
                    }

                    @if (entry.reason) {
                      <div class="mt-2 p-2.5 bg-amber-50 border-l-2 border-amber-200 rounded-r-md">
                        <p class="text-xs text-amber-700">
                          <span class="font-medium mr-1">Lý do:</span>{{ entry.reason }}
                        </p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Empty state -->
            <div class="py-12 text-center">
              <svg class="mx-auto h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
              <p class="text-sm font-medium text-gray-600">Chưa có ghi nhận hoạt động</p>
              <p class="text-xs text-gray-500 mt-1">Các thao tác chấm điểm, rubric hoặc thay đổi thời hạn sẽ hiển thị tại đây.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class AssignmentAuditLogComponent {
  auditLog = signal<AuditLogEntry[]>([]);

  getActionBgClass(action: string): string {
    const classes: Record<string, string> = {
      'GRADE_CREATED': 'bg-emerald-100',
      'GRADE_UPDATED': 'bg-amber-100',
      'FEEDBACK_ADDED': 'bg-[#0056D2]/10',
      'RUBRIC_CHANGED': 'bg-[#0056D2]/10',
      'DEADLINE_EXTENDED': 'bg-[#0056D2]/10',
      'ASSIGNMENT_DISTRIBUTED': 'bg-gray-100'
    };
    return classes[action] || 'bg-gray-100';
  }

  getActionIconClass(action: string): string {
    const classes: Record<string, string> = {
      'GRADE_CREATED': 'text-emerald-600',
      'GRADE_UPDATED': 'text-amber-600',
      'FEEDBACK_ADDED': 'text-[#0056D2]',
      'RUBRIC_CHANGED': 'text-[#0056D2]',
      'DEADLINE_EXTENDED': 'text-[#0056D2]',
      'ASSIGNMENT_DISTRIBUTED': 'text-gray-600'
    };
    return classes[action] || 'text-gray-600';
  }

  getActionText(action: string): string {
    const texts: Record<string, string> = {
      'GRADE_CREATED': 'đã khởi tạo điểm cho',
      'GRADE_UPDATED': 'đã thay đổi điểm của',
      'FEEDBACK_ADDED': 'đã thêm nhận xét cho',
      'RUBRIC_CHANGED': 'đã điều chỉnh rubric của',
      'DEADLINE_EXTENDED': 'đã gia hạn thời gian cho',
      'ASSIGNMENT_DISTRIBUTED': 'đã phân phối tới'
    };
    return texts[action] || action;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }
}
