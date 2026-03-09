import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

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
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      <!-- Header Area -->
      <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div>
          <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <lucide-icon name="history" [size]="16" class="text-[#0056D2]"></lucide-icon>
            Lịch sử thao tác (Audit Log)
          </h3>
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">
            Ghi lại mọi thay đổi phục vụ chuẩn đào đạo STCW và minh bạch điểm số
          </p>
        </div>
      </div>
      
      <!-- Timeline Content -->
      <div class="p-8">
        <div class="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-[2px] before:bg-slate-100">
          
          @for (entry of auditLog(); track entry.id) {
            <div class="relative pl-14 group">
              <!-- Timeline Marker -->
              <div class="absolute left-0 top-0 w-10 h-10 rounded-2xl flex items-center justify-center z-10 border-4 border-white shadow-sm transition-transform group-hover:scale-110" 
                   [class]="getActionBgClass(entry.action)">
                <lucide-icon [name]="getActionIconName(entry.action)" [size]="16" [class]="getActionIconClass(entry.action)"></lucide-icon>
              </div>

              <!-- Content Card -->
              <div class="p-5 rounded-2xl border border-slate-100 bg-white group-hover:border-[#0056D2]/30 group-hover:shadow-md transition-all duration-300">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black text-slate-900">{{ entry.userName }}</span>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ getActionText(entry.action) }}</span>
                    <span class="text-xs font-black text-[#0056D2]">{{ entry.studentName }}</span>
                  </div>
                  <span class="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{{ formatDate(entry.timestamp) }}</span>
                </div>

                @if (entry.oldValue && entry.newValue) {
                  <div class="flex items-center gap-4 py-3 px-4 bg-slate-50/50 rounded-xl border border-slate-50 mb-3">
                    <div class="flex flex-col gap-1">
                      <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Điểm cũ</span>
                      <span class="text-xs font-black text-slate-400 line-through">{{ entry.oldValue }}</span>
                    </div>
                    <lucide-icon name="arrow-right" [size]="14" class="text-slate-300"></lucide-icon>
                    <div class="flex flex-col gap-1">
                      <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Điểm mới</span>
                      <span class="text-xs font-black text-emerald-600">{{ entry.newValue }}</span>
                    </div>
                  </div>
                }

                @if (entry.reason) {
                  <div class="p-3 bg-amber-50/50 border-l-2 border-amber-200 rounded-r-lg">
                    <p class="text-[11px] text-amber-700 font-medium leading-relaxed italic">
                      <span class="font-black text-[9px] uppercase tracking-widest mr-1 opacity-70">Lý do:</span>
                      {{ entry.reason }}
                    </p>
                  </div>
                }
              </div>
            </div>
          }
          
          @if (auditLog().length === 0) {
            <div class="py-20 flex flex-col items-center text-center">
              <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 text-slate-300">
                <lucide-icon name="activity" [size]="32"></lucide-icon>
              </div>
              <h4 class="text-base font-black text-slate-800 uppercase tracking-widest mb-2">Chưa có ghi nhận hoạt động</h4>
              <p class="text-sm text-slate-500 font-medium max-w-[280px]">
                Các thao tác chấm điểm, chỉnh sửa rubric hoặc thay đổi thời hạn sẽ được hiển thị tại đây.
              </p>
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
      'FEEDBACK_ADDED': 'bg-blue-100',
      'RUBRIC_CHANGED': 'bg-purple-100',
      'DEADLINE_EXTENDED': 'bg-indigo-100',
      'ASSIGNMENT_DISTRIBUTED': 'bg-slate-100'
    };
    return classes[action] || 'bg-slate-100';
  }

  getActionIconName(action: string): string {
    const icons: Record<string, string> = {
      'GRADE_CREATED': 'plus-circle',
      'GRADE_UPDATED': 'edit-3',
      'FEEDBACK_ADDED': 'message-square',
      'RUBRIC_CHANGED': 'layout',
      'DEADLINE_EXTENDED': 'calendar-clock',
      'ASSIGNMENT_DISTRIBUTED': 'users'
    };
    return icons[action] || 'check-circle';
  }

  getActionIconClass(action: string): string {
    const classes: Record<string, string> = {
      'GRADE_CREATED': 'text-emerald-600',
      'GRADE_UPDATED': 'text-amber-600',
      'FEEDBACK_ADDED': 'text-blue-600',
      'RUBRIC_CHANGED': 'text-purple-600',
      'DEADLINE_EXTENDED': 'text-indigo-600',
      'ASSIGNMENT_DISTRIBUTED': 'text-slate-600'
    };
    return classes[action] || 'text-slate-600';
  }

  getActionText(action: string): string {
    const texts: Record<string, string> = {
      'GRADE_CREATED': 'đã khởi tạo điểm cho',
      'GRADE_UPDATED': 'đã thay đổi điểm của',
      'FEEDBACK_ADDED': 'đã thêm nhận xét cho',
      'RUBRIC_CHANGED': 'đã điều chỉnh rubric của',
      'DEADLINE_EXTENDED': 'đã gia hạn thời gian cho',
      'ASSIGNMENT_DISTRIBUTED': 'đã thực hiện phân phối tới'
    };
    return texts[action] || action;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }

}
