import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditApi, AuditLogEntry } from '../../../../api/endpoints/audit.api';
import { ToastService } from '../../../../core/services/toast.service';

// F-L1 — map raw DB-level operation names to Vietnamese label.
// "Auth0 Logs" precedent: surface human-readable verb, keep machine
// name accessible (we render Vietnamese in the badge, raw still in JSON
// detail panel).
const ACTION_LABELS: Readonly<Record<string, string>> = {
  INSERT: 'Thêm mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xoá',
};

const TABLE_LABELS: Readonly<Record<string, string>> = {
  courses:     'Khóa học',
  users:       'Người dùng',
  enrollments: 'Đăng ký học',
  submissions: 'Bài nộp',
};

@Component({
  selector: 'app-audit-logs',
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogsComponent implements OnInit {
  private auditApi = inject(AuditApi);
  private toast = inject(ToastService);

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

  onFilterChange(): void {
    this.currentPage.set(0);
    this.loadLogs();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadLogs();
  }

  toggleDetail(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  // F-L1 helpers.
  getActionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
  }

  getTableLabel(tableName: string): string {
    return TABLE_LABELS[tableName] ?? tableName;
  }

  getActionClass(action: string): string {
    switch (action) {
      case 'INSERT': return 'badge badge-insert';
      case 'UPDATE': return 'badge badge-update';
      case 'DELETE': return 'badge badge-delete';
      default: return 'badge badge-default';
    }
  }

  formatJson(data: Record<string, unknown> | null): string {
    if (!data) return '{}';
    return JSON.stringify(data, null, 2);
  }

  // F-L4 — CSV export of the rows currently rendered (audit page-by-page).
  // Full-history export needs a BE endpoint streaming the whole table
  // (compliance asks SOC2 / ISO27001) — tracked separately.
  exportCsvCurrentPage(): void {
    const rows = this.logs();
    if (rows.length === 0) {
      this.toast.warning('Không có nhật ký để xuất.');
      return;
    }

    const header = ['ID', 'Bảng', 'Hành động', 'Record ID', 'Người thực hiện', 'Thời gian'];
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      // RFC 4180: quote when content has comma/quote/newline; escape inner quotes.
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [
      header.join(','),
      ...rows.map(r => [
        r.id,
        this.getTableLabel(r.tableName),
        this.getActionLabel(r.action),
        r.recordId,
        r.changedBy ?? '',
        r.changedAt
      ].map(escape).join(','))
    ];

    // BOM for Excel UTF-8 friendliness.
    const blob = new Blob(['' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-page-${this.currentPage() + 1}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.toast.success(`Đã xuất ${rows.length} dòng CSV.`);
  }
}
