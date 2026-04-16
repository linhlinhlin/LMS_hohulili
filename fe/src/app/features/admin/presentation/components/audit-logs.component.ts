import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditApi, AuditLogEntry } from '../../../../api/endpoints/audit.api';

@Component({
  selector: 'app-audit-logs',
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
}
