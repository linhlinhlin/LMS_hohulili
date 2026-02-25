import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../client/api-client';

export interface AuditLogEntry {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedBy: string | null;
  changedAt: string;
}

export interface AuditLogPage {
  content: AuditLogEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly apiClient = inject(ApiClient);

  getAuditLogs(page = 0, size = 20, table?: string, action?: string) {
    let params = `?page=${page}&size=${size}`;
    if (table) params += `&table=${table}`;
    if (action) params += `&action=${action}`;
    return this.apiClient.get<AuditLogPage>(`/api/v3/admin/audit-logs${params}`);
  }

  getAuditLogDetail(id: number) {
    return this.apiClient.get<AuditLogEntry>(`/api/v3/admin/audit-logs/${id}`);
  }
}
