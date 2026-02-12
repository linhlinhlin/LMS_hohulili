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
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded shadow">
      <div class="px-6 py-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">Lịch sử thao tác</h3>
        <p class="text-sm text-gray-500 mt-1">Ghi lại tất cả thay đổi điểm số theo chuẩn STCW</p>
      </div>
      
      <div class="divide-y">
        @for (entry of auditLog(); track entry.id) {
          <div class="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-full flex items-center justify-center" [class]="getActionBgClass(entry.action)">
                <svg class="w-5 h-5" [class]="getActionIconClass(entry.action)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  @switch (entry.action) {
                    @case ('GRADE_CREATED') {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    }
                    @case ('GRADE_UPDATED') {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    }
                    @case ('DEADLINE_EXTENDED') {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    }
                    @case ('ASSIGNMENT_DISTRIBUTED') {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    }
                    @default {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    }
                  }
                </svg>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">{{ entry.userName }}</span>
                  <span class="text-gray-500">{{ getActionText(entry.action) }}</span>
                  <span class="font-medium text-gray-900">{{ entry.studentName }}</span>
                </div>
                @if (entry.oldValue && entry.newValue) {
                  <div class="text-sm text-gray-600 mt-1">
                    Điểm: <span class="line-through text-red-500">{{ entry.oldValue }}</span> → 
                    <span class="text-green-600 font-medium">{{ entry.newValue }}</span>
                  </div>
                }
                @if (entry.reason) {
                  <div class="text-sm text-gray-500 mt-1">Lý do: {{ entry.reason }}</div>
                }
                <div class="text-xs text-gray-400 mt-1">{{ formatDate(entry.timestamp) }}</div>
              </div>
            </div>
          </div>
        }
        
        @if (auditLog().length === 0) {
          <div class="py-12 text-center text-gray-500">
            <p>Chưa có thao tác nào được ghi lại</p>
          </div>
        }
      </div>
    </div>
  `
})
export class AssignmentAuditLogComponent {
  auditLog = signal<AuditLogEntry[]>(this.getMockAuditLog());

  getActionBgClass(action: string): string {
    const classes: Record<string, string> = {
      'GRADE_CREATED': 'bg-green-100',
      'GRADE_UPDATED': 'bg-yellow-100',
      'FEEDBACK_ADDED': 'bg-blue-100',
      'RUBRIC_CHANGED': 'bg-purple-100',
      'DEADLINE_EXTENDED': 'bg-orange-100',
      'ASSIGNMENT_DISTRIBUTED': 'bg-indigo-100'
    };
    return classes[action] || 'bg-gray-100';
  }

  getActionIconClass(action: string): string {
    const classes: Record<string, string> = {
      'GRADE_CREATED': 'text-green-600',
      'GRADE_UPDATED': 'text-yellow-600',
      'FEEDBACK_ADDED': 'text-[#0056D2]',
      'RUBRIC_CHANGED': 'text-purple-600',
      'DEADLINE_EXTENDED': 'text-orange-600',
      'ASSIGNMENT_DISTRIBUTED': 'text-indigo-600'
    };
    return classes[action] || 'text-gray-600';
  }

  getActionText(action: string): string {
    const texts: Record<string, string> = {
      'GRADE_CREATED': 'đã chấm điểm cho',
      'GRADE_UPDATED': 'đã sửa điểm của',
      'FEEDBACK_ADDED': 'đã thêm nhận xét cho',
      'RUBRIC_CHANGED': 'đã thay đổi rubric cho',
      'DEADLINE_EXTENDED': 'đã gia hạn deadline cho',
      'ASSIGNMENT_DISTRIBUTED': 'đã giao bài tập cho'
    };
    return texts[action] || action;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }

  private getMockAuditLog(): AuditLogEntry[] {
    return [
      { id: '1', action: 'ASSIGNMENT_DISTRIBUTED', userId: 't1', userName: 'GV. Nguyen Van X', studentName: '25 học viên', timestamp: '2025-11-20T09:00:00Z' },
      { id: '2', action: 'DEADLINE_EXTENDED', userId: 't1', userName: 'GV. Nguyen Van X', studentName: 'Nguyen Van A', oldValue: '25/11/2025', newValue: '30/11/2025', reason: 'Học viên ốm', timestamp: '2025-11-24T10:00:00Z' },
      { id: '3', action: 'GRADE_CREATED', userId: 't1', userName: 'GV. Nguyen Van X', studentName: 'Nguyen Van A', newValue: '85', timestamp: '2025-11-25T14:30:00Z' },
      { id: '4', action: 'GRADE_UPDATED', userId: 't1', userName: 'GV. Nguyen Van X', studentName: 'Tran Thi B', oldValue: '70', newValue: '75', reason: 'Phuc khao', timestamp: '2025-11-25T15:00:00Z' },
      { id: '5', action: 'GRADE_CREATED', userId: 't1', userName: 'GV. Nguyen Van X', studentName: 'Le Van C', newValue: '92', timestamp: '2025-11-25T15:30:00Z' },
      { id: '6', action: 'FEEDBACK_ADDED', userId: 't1', userName: 'GV. Nguyen Van X', studentName: 'Pham Thi D', timestamp: '2025-11-25T16:00:00Z' }
    ];
  }
}
