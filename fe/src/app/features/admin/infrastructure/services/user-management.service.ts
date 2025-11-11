import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from '../../../../api/client/api-client';
import { ADMIN_ENDPOINTS } from '../../../../api/endpoints/admin.endpoints';

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends UserSummary {}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  role?: string;
  enabled?: boolean;
}

export interface BulkImportResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiClient = inject(ApiClient);

  getUsers(params: any = {}): Observable<{ data: UserSummary[]; pagination: any }> {
    return this.apiClient.getWithResponse<UserSummary[]>(ADMIN_ENDPOINTS.USERS, { params }).pipe(
      map(response => ({
        data: response.data || [],
        pagination: response.pagination
      }))
    );
  }

  getAllUsers(): Observable<{ data: UserSummary[] }> {
    return this.apiClient.getWithResponse<UserSummary[]>(`${ADMIN_ENDPOINTS.USERS}/list/all`).pipe(
      map(response => ({
        data: response.data || []
      }))
    );
  }

  getUserById(userId: string): Observable<{ data: UserDetail }> {
    return this.apiClient.getWithResponse<UserDetail>(ADMIN_ENDPOINTS.USER_DETAIL(userId)).pipe(
      map(response => ({
        data: response.data!
      }))
    );
  }

  createUser(userData: CreateUserRequest): Observable<{ data: UserDetail }> {
    return this.apiClient.postWithResponse<UserDetail>(ADMIN_ENDPOINTS.CREATE_USER, userData).pipe(
      map(response => ({
        data: response.data!
      }))
    );
  }

  updateUser(userId: string, userData: UpdateUserRequest): Observable<{ data: UserDetail }> {
    return this.apiClient.putWithResponse<UserDetail>(ADMIN_ENDPOINTS.UPDATE_USER(userId), userData).pipe(
      map(response => ({
        data: response.data!
      }))
    );
  }

  deleteUser(userId: string): Observable<{ message: string }> {
    return this.apiClient.deleteWithResponse<string>(ADMIN_ENDPOINTS.DELETE_USER(userId)).pipe(
      map(response => ({
        message: response.message || 'User deleted successfully'
      }))
    );
  }

  bulkImportUsers(file: File): Observable<{ data: BulkImportResult }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiClient.postWithResponse<BulkImportResult>(ADMIN_ENDPOINTS.BULK_IMPORT_USERS, formData).pipe(
      map(response => ({
        data: response.data!
      }))
    );
  }

  getImportTemplate(): Observable<{ data: string }> {
    return this.apiClient.getWithResponse<string>(ADMIN_ENDPOINTS.IMPORT_TEMPLATE).pipe(
      map(response => ({
        data: response.data || ''
      }))
    );
  }
}