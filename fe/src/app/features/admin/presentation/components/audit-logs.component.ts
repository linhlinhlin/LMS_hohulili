import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditApi, AuditLogEntry } from '../../../../api/endpoints/audit.api';

@Component({
  selector: 'app-audit-logs',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Nhật ký kiểm toán</h1>

      <!-- Filters -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div class="flex gap-4 items-end">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Bảng</label>
            <select [(ngModel)]="tableFilter" (ngModelChange)="loadLogs()"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#0056D2] focus:border-[#0056D2]">
              <option value="">Tất cả</option>
              <option value="courses">courses</option>
              <option value="users">users</option>
              <option value="enrollments">enrollments</option>
              <option value="submissions">submissions</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hành động</label>
            <select [(ngModel)]="actionFilter" (ngModelChange)="loadLogs()"
                    class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#0056D2] focus:border-[#0056D2]">
              <option value="">Tất cả</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bảng</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record ID</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chi tiết</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            @for (log of logs(); track log.id) {
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">{{ log.id }}</td>
                <td class="px-4 py-3 text-sm text-gray-900">{{ log.tableName }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 text-xs font-medium rounded-full"
                        [class]="getActionClass(log.action)">
                    {{ log.action }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 font-mono">{{ log.recordId | slice:0:8 }}...</td>
                <td class="px-4 py-3 text-sm text-gray-500">{{ log.changedAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="px-4 py-3">
                  <button (click)="toggleDetail(log.id)"
                          class="text-[#0056D2] hover:text-[#004BB5] text-sm font-medium">
                    {{ expandedId() === log.id ? 'Ẩn' : 'Xem' }}
                  </button>
                </td>
              </tr>
              @if (expandedId() === log.id) {
                <tr>
                  <td colspan="6" class="px-4 py-4 bg-gray-50">
                    <div class="grid grid-cols-2 gap-4">
                      @if (log.oldData) {
                        <div>
                          <h4 class="text-sm font-medium text-gray-700 mb-2">Dữ liệu cũ</h4>
                          <pre class="text-xs bg-white p-3 rounded border overflow-auto max-h-48">{{ formatJson(log.oldData) }}</pre>
                        </div>
                      }
                      @if (log.newData) {
                        <div>
                          <h4 class="text-sm font-medium text-gray-700 mb-2">Dữ liệu mới</h4>
                          <pre class="text-xs bg-white p-3 rounded border overflow-auto max-h-48">{{ formatJson(log.newData) }}</pre>
                        </div>
                      }
                    </div>
                  </td>
                </tr>
              }
            } @empty {
              <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                  Không có nhật ký kiểm toán
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="flex justify-center gap-2 mt-4">
          <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 0"
                  class="px-3 py-1 border rounded text-sm disabled:opacity-50">Trước</button>
          <span class="px-3 py-1 text-sm text-gray-600">
            Trang {{ currentPage() + 1 }} / {{ totalPages() }}
          </span>
          <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() >= totalPages() - 1"
                  class="px-3 py-1 border rounded text-sm disabled:opacity-50">Sau</button>
        </div>
      }
    </div>
  `
})
export class AuditLogsComponent implements OnInit {
  private auditApi = inject(AuditApi);

  logs = signal<AuditLogEntry[]>([]);
  currentPage = signal(0);
  totalPages = signal(0);
  expandedId = signal<number | null>(null);

  tableFilter = '';
  actionFilter = '';

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.auditApi.getAuditLogs(
      this.currentPage(),
      20,
      this.tableFilter || undefined,
      this.actionFilter || undefined
    ).subscribe({
      next: (response: any) => {
        const data = response?.data || response;
        this.logs.set(data?.content || []);
        this.totalPages.set(data?.totalPages || 0);
      },
      error: () => this.logs.set([])
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadLogs();
  }

  toggleDetail(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  getActionClass(action: string): string {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatJson(data: Record<string, unknown> | null): string {
    if (!data) return '{}';
    return JSON.stringify(data, null, 2);
  }
}
