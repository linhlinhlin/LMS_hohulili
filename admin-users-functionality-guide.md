# Hướng Dẫn Tích Hợp Giao Diện Admin Users

## Tổng Quan

File này chứa code và hướng dẫn chi tiết để tạo trang admin users tại `http://localhost:4200/admin/users` với đầy đủ chức năng quản lý người dùng.

## 1. Cấu Trúc File Cần Thiết

### 1.1 Service: `user-management.service.ts`

```typescript
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, firstValueFrom } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorHandlingService } from '../../../../shared/services/error-handling.service';
import { environment } from '../../../../../environments/environment';
import * as XLSX from 'xlsx';

// Define UserRole enum locally to avoid import issues
export enum UserRole {
  ADMIN = "admin",
  TEACHER = "teacher",
  STUDENT = "student",
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  studentId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastLogin: Date;
  loginCount: number;
  coursesCreated?: number;
  coursesEnrolled?: number;
  totalSpent?: number;
  permissions: string[];
}

export interface PaginationInfo {
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface BulkImportProgress {
  isImporting: boolean;
  progress: number;
  currentStep: string;
  result?: BulkImportResult;
}

export interface BulkImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: string[];
  importedUsers: AdminUser[];
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: PaginationInfo | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private errorService = inject(ErrorHandlingService);

  // API Configuration
  private readonly API_BASE_URL = `${environment.apiUrl}/api/v1`;
  private readonly ENDPOINTS = {
    users: '/users',
    bulkImport: '/users/bulk-import',
    bulkImportTemplate: '/users/bulk-import/template'
  };

  // Signals for reactive state management
  private _users = signal<AdminUser[]>([]);
  private _isLoading = signal<boolean>(false);
  private _pagination = signal<PaginationInfo | null>(null);
  private _bulkImportProgress = signal<BulkImportProgress>({
    isImporting: false,
    progress: 0,
    currentStep: ''
  });

  // Readonly signals for external consumption
  readonly users = this._users.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly bulkImportProgress = this._bulkImportProgress.asReadonly();

  // Computed signals
  readonly totalUsers = computed(() => {
    const pagination = this._pagination();
    return pagination?.totalElements || this._users().length;
  });

  readonly totalTeachers = computed(() => {
    const pagination = this._pagination();
    if (pagination && pagination.totalElements > pagination.size) {
      const currentPageTeachers = this._users().filter(user => user.role === 'teacher').length;
      const ratio = currentPageTeachers / Math.max(this._users().length, 1);
      return Math.max(0, Math.round(pagination.totalElements * ratio));
    }
    return this._users().filter(user => user.role === 'teacher').length;
  });

  readonly totalStudents = computed(() => {
    const pagination = this._pagination();
    if (pagination && pagination.totalElements > pagination.size) {
      const currentPageStudents = this._users().filter(user => user.role === 'student').length;
      const ratio = currentPageStudents / Math.max(this._users().length, 1);
      return Math.max(0, Math.round(pagination.totalElements * ratio));
    }
    return this._users().filter(user => user.role === 'student').length;
  });

  readonly totalAdmins = computed(() => {
    const pagination = this._pagination();
    if (pagination && pagination.totalElements > pagination.size) {
      const currentPageAdmins = this._users().filter(user => user.role === 'admin').length;
      const ratio = currentPageAdmins / Math.max(this._users().length, 1);
      return Math.max(0, Math.round(pagination.totalElements * ratio));
    }
    return this._users().filter(user => user.role === 'admin').length;
  });

  readonly activeUsers = computed(() => {
    const pagination = this._pagination();
    if (pagination && pagination.totalElements > pagination.size) {
      const currentPageActive = this._users().filter(user => user.isActive).length;
      const ratio = currentPageActive / Math.max(this._users().length, 1);
      return Math.max(0, Math.round(pagination.totalElements * ratio));
    }
    return this._users().filter(user => user.isActive).length;
  });

  // User Management Methods
  async getUsers(page: number = 1, limit: number = 10, search?: string): Promise<UsersResponse> {
    this._isLoading.set(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const response = await firstValueFrom(this.http.get<any>(`${this.API_BASE_URL}${this.ENDPOINTS.users}?${params}`));

      if (response?.success && response?.data) {
        if (Array.isArray(response.data)) {
          const users: AdminUser[] = response.data.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.fullName || user.username,
            role: user.role.toLowerCase() as UserRole,
            avatar: this.getDefaultAvatar(user.email),
            department: this.getDepartmentFromRole(user.role.toLowerCase()),
            studentId: user.role === 'STUDENT' ? this.generateStudentId() : undefined,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt || user.createdAt),
            isActive: user.enabled,
            lastLogin: new Date(),
            loginCount: 0,
            permissions: this.getDefaultPermissions(user.role.toLowerCase() as UserRole)
          }));

          let pagination: PaginationInfo;
          if (response.pagination) {
            pagination = {
              totalElements: response.pagination.totalItems,
              totalPages: response.pagination.totalPages,
              size: response.pagination.limit,
              number: response.pagination.page - 1,
              first: response.pagination.page === 1,
              last: response.pagination.page === response.pagination.totalPages
            };
          } else {
            pagination = {
              totalElements: users.length,
              totalPages: 1,
              size: users.length,
              number: 0,
              first: true,
              last: true
            };
          }

          this._users.set(users);
          this._pagination.set(pagination);

          return { users, pagination };
        } else {
          throw new Error('Invalid API response format: expected array in data field');
        }
      } else {
        throw new Error('Invalid API response format: missing data');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.errorService.addError({
        message: 'Không thể tải danh sách người dùng. Vui lòng thử lại.',
        type: 'error',
        context: 'user'
      });
      this._users.set([]);
      this._pagination.set(null);
      return { users: [], pagination: null };
    } finally {
      this._isLoading.set(false);
    }
  }

  async createUser(userData: Partial<AdminUser>): Promise<AdminUser> {
    this._isLoading.set(true);
    try {
      this.validateUserData(userData);

      const backendUserData = {
        username: userData.name?.toLowerCase().replace(/\s+/g, '') || '',
        email: userData.email || '',
        password: '123456',
        fullName: userData.name || '',
        role: userData.role?.toUpperCase() || 'STUDENT'
      };

      const response = await firstValueFrom(this.http.post<any>(`${this.API_BASE_URL}${this.ENDPOINTS.users}`, backendUserData));

      if (response && response.data) {
        const newUser: AdminUser = {
          id: response.data.id,
          email: response.data.email,
          name: response.data.fullName,
          role: response.data.role.toLowerCase(),
          avatar: this.getDefaultAvatar(response.data.email),
          department: this.getDepartmentFromRole(response.data.role.toLowerCase()),
          studentId: response.data.role === 'STUDENT' ? this.generateStudentId() : undefined,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
          isActive: response.data.enabled,
          lastLogin: new Date(),
          loginCount: 0,
          permissions: this.getDefaultPermissions(response.data.role.toLowerCase())
        };

        this._users.update(users => [...users, newUser]);
        this.errorService.showSuccess('Người dùng đã được tạo thành công!', 'user');
        return newUser;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      this.errorService.addError({
        message: 'Tạo người dùng thất bại. Vui lòng thử lại.',
        type: 'error',
        context: 'user'
      });
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateUser(userId: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    this._isLoading.set(true);
    try {
      const backendUpdates = {
        email: updates.email,
        fullName: updates.name,
        role: updates.role?.toUpperCase(),
        enabled: updates.isActive
      };

      const response = await firstValueFrom(this.http.put<any>(`${this.API_BASE_URL}${this.ENDPOINTS.users}/${userId}`, backendUpdates));

      if (response && response.data) {
        const updatedUser: AdminUser = {
          id: response.data.id,
          email: response.data.email,
          name: response.data.fullName,
          role: response.data.role.toLowerCase(),
          avatar: this.getDefaultAvatar(response.data.email),
          department: this.getDepartmentFromRole(response.data.role.toLowerCase()),
          studentId: response.data.role === 'STUDENT' ? this.generateStudentId() : undefined,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
          isActive: response.data.enabled,
          lastLogin: new Date(),
          loginCount: 0,
          permissions: this.getDefaultPermissions(response.data.role.toLowerCase())
        };

        this._users.update(users =>
          users.map(user => user.id === userId ? updatedUser : user)
        );

        this.errorService.showSuccess('Người dùng đã được cập nhật thành công!', 'user');
        return updatedUser;
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      this.errorService.addError({
        message: 'Cập nhật người dùng thất bại. Vui lòng thử lại.',
        type: 'error',
        context: 'user'
      });
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      await firstValueFrom(this.http.delete(`${this.API_BASE_URL}${this.ENDPOINTS.users}/${userId}`));

      this._users.update(users => users.filter(user => user.id !== userId));
      this.errorService.showSuccess('Người dùng đã được xóa thành công!', 'user');
    } catch (error) {
      console.error('Failed to delete user:', error);
      this.errorService.addError({
        message: 'Xóa người dùng thất bại. Vui lòng thử lại.',
        type: 'error',
        context: 'user'
      });
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  async toggleUserStatus(userId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      const currentUser = this._users().find(u => u.id === userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      const newStatus = !currentUser.isActive;

      const response = await firstValueFrom(this.http.put<any>(
        `${this.API_BASE_URL}${this.ENDPOINTS.users}/${userId}`,
        { enabled: newStatus }
      ));

      if (response && response.data) {
        this._users.update(users =>
          users.map(user =>
            user.id === userId
              ? { ...user, isActive: newStatus, updatedAt: new Date() }
              : user
          )
        );

        this.errorService.showSuccess(
          `Người dùng đã được ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} thành công!`,
          'user'
        );
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      this.errorService.addError({
        message: 'Cập nhật trạng thái người dùng thất bại. Vui lòng thử lại.',
        type: 'error',
        context: 'user'
      });
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // Bulk Import Methods
  async bulkImportUsers(file: File, defaultRole: UserRole = UserRole.STUDENT): Promise<BulkImportResult> {
    this._bulkImportProgress.set({
      isImporting: true,
      progress: 0,
      currentStep: 'Đang chuẩn bị file...'
    });

    try {
      this.validateImportFile(file);

      this._bulkImportProgress.update(p => ({ ...p, progress: 20, currentStep: 'Đang upload file...' }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('defaultRole', defaultRole.toUpperCase());

      this._bulkImportProgress.update(p => ({ ...p, progress: 40, currentStep: 'Đang xử lý dữ liệu...' }));

      const response = await firstValueFrom(this.http.post<any>(
        `${this.API_BASE_URL}${this.ENDPOINTS.bulkImport}`,
        formData,
        { headers: this.getAuthHeaders() }
      ));

      this._bulkImportProgress.update(p => ({ ...p, progress: 80, currentStep: 'Đang hoàn tất...' }));

      if (response?.success && response?.data) {
        const result: BulkImportResult = {
          totalRows: response.data.totalRows,
          successfulImports: response.data.successfulImports,
          failedImports: response.data.failedImports,
          errors: response.data.errors || [],
          importedUsers: response.data.importedUsers?.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role.toLowerCase() as UserRole,
            avatar: this.getDefaultAvatar(user.email),
            department: '',
            createdAt: new Date(user.createdAt),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(user.createdAt),
            isActive: user.enabled,
            lastLogin: new Date(),
            loginCount: 0,
            permissions: this.getDefaultPermissions(user.role.toLowerCase() as UserRole)
          })) || []
        };

        this._users.update(users => [...users, ...result.importedUsers]);

        this._bulkImportProgress.set({
          isImporting: false,
          progress: 100,
          currentStep: 'Hoàn thành',
          result
        });

        this.errorService.showSuccess(
          `Import hoàn thành! ${result.successfulImports}/${result.totalRows} người dùng đã được thêm thành công.`,
          'bulk-import'
        );

        return result;
      } else {
        throw new Error(response?.message || 'Invalid API response format');
      }
    } catch (error: any) {
      console.error('Bulk import failed:', error);

      this._bulkImportProgress.set({
        isImporting: false,
        progress: 0,
        currentStep: 'Lỗi khi import'
      });

      const errorMessage = error?.error?.message || error?.message || 'Import thất bại. Vui lòng thử lại.';
      this.errorService.addError({
        message: errorMessage,
        type: 'error',
        context: 'bulk-import'
      });

      throw error;
    }
  }

  resetBulkImportProgress(): void {
    this._bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: ''
    });
  }

  // Helper Methods
  private getAuthHeaders(): { [header: string]: string } {
    const token = this.authService.getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private validateUserData(userData: Partial<AdminUser>): void {
    const requiredFields = ['email', 'name', 'role'];
    const missingFields = requiredFields.filter(field => !userData[field as keyof AdminUser]);

    if (missingFields.length > 0) {
      throw new Error(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`);
    }
  }

  private getDefaultAvatar(email: string): string {
    const name = email.split('@')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc2626&color=ffffff&size=150`;
  }

  private getDepartmentFromRole(role: UserRole): string {
    switch (role) {
      case 'student':
        return 'Khoa Hàng hải';
      case 'teacher':
        return 'Khoa Hàng hải';
      case 'admin':
        return 'Phòng Quản trị';
      default:
        return 'Khoa Hàng hải';
    }
  }

  private generateStudentId(): string {
    return 'SV' + new Date().getFullYear() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  private getDefaultPermissions(role: UserRole): string[] {
    switch (role) {
      case 'admin':
        return ['read', 'write', 'delete', 'manage_users', 'manage_courses', 'manage_system'];
      case 'teacher':
        return ['read', 'write', 'manage_courses', 'manage_students'];
      case 'student':
        return ['read', 'enroll_courses'];
      default:
        return ['read'];
    }
  }

  private validateImportFile(file: File): void {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Chỉ chấp nhận file Excel (.xlsx hoặc .xls)');
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('Kích thước file không được vượt quá 10MB');
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      throw new Error('Tên file phải có đuôi .xlsx hoặc .xls');
    }
  }

  downloadExcelTemplate(): void {
    try {
      // Create sample data for template
      const templateData = [
        {
          'Username': 'nguyenvana',
          'Email': 'nguyenvana@student.edu.vn',
          'Full Name': 'Nguyễn Văn A',
          'Department': 'Khoa Hàng hải'
        },
        {
          'Username': 'tranthib',
          'Email': 'tranthib@student.edu.vn',
          'Full Name': 'Trần Thị B',
          'Department': 'Khoa Hàng hải'
        }
      ];

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `user_import_template_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      this.errorService.showSuccess('Template đã được tải xuống thành công!', 'template');
    } catch (error) {
      console.error('Failed to download template:', error);
      this.errorService.addError({
        message: 'Không thể tải template. Vui lòng thử lại.',
        type: 'error',
        context: 'template'
      });
    }
  }
}
```

### 1.2 Component: `user-management.component.ts`

```typescript
import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserManagementService, AdminUser, UserRole } from '../../infrastructure/services/user-management.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading
      [show]="userManagementService.isLoading()"
      text="Đang tải dữ liệu người dùng..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="red">
    </app-loading>

    <div class="bg-gray-50 min-h-screen">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-auto">
        <!-- Header with Actions -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-2xl lg:text-3xl font-bold text-gray-900">👥 Quản lý người dùng</h1>
              <p class="text-gray-600 mt-1">Quản lý và theo dõi tất cả người dùng trong hệ thống</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <button (click)="openCreateUserModal()"
                      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                Thêm người dùng
              </button>
              <button (click)="openBulkImportModal()"
                      class="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-200">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
                Import Excel
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng người dùng</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalUsers() }}</p>
                <p class="text-sm text-red-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +{{ activeUsers() }} đang hoạt động
                </p>
              </div>
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Giảng viên</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalTeachers() }}</p>
                <p class="text-sm text-purple-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Hoạt động
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Học viên</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalStudents() }}</p>
                <p class="text-sm text-blue-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Đang học
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Quản trị viên</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalAdmins() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Quản lý hệ thống
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter and Search -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
              <input type="text"
                     [(ngModel)]="searchQuery"
                     placeholder="Tìm kiếm người dùng..."
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
            </div>
            <div class="flex gap-4">
              <select [(ngModel)]="roleFilter"
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option value="">Tất cả vai trò</option>
                <option value="admin">Quản trị viên</option>
                <option value="teacher">Giảng viên</option>
                <option value="student">Học viên</option>
              </select>
              <select [(ngModel)]="statusFilter"
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <div class="overflow-x-auto w-full">
            <table class="min-w-full divide-y divide-gray-200 table-fixed">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/6">
                    Người dùng
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Vai trò
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Trạng thái
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Hoạt động cuối
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Thống kê
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (user of filteredUsers(); track user.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-4">
                      <div class="flex items-center">
                        <img [src]="user.avatar"
                             [alt]="user.name"
                             class="w-10 h-10 rounded-full flex-shrink-0">
                        <div class="ml-3 min-w-0 flex-1">
                          <div class="text-sm font-medium text-gray-900 truncate">{{ user.name }}</div>
                          <div class="text-sm text-gray-500 truncate">{{ user.email }}</div>
                          @if (user.studentId) {
                            <div class="text-xs text-gray-400 truncate">{{ user.studentId }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-4">
                      <span class="px-2 py-1 text-xs font-medium rounded-full"
                            [class]="getRoleClass(user.role)">
                        {{ getRoleText(user.role) }}
                      </span>
                    </td>
                    <td class="px-4 py-4">
                      <span class="px-2 py-1 text-xs font-medium rounded-full"
                            [class]="user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        {{ user.isActive ? 'Hoạt động' : 'Không hoạt động' }}
                      </span>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-500">
                      {{ formatDate(user.lastLogin) }}
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-500">
                      @if (user.role === 'teacher') {
                        <div>{{ user.coursesCreated }} khóa học</div>
                      } @else if (user.role === 'student') {
                        <div>{{ user.coursesEnrolled }} khóa học</div>
                        <div>{{ formatCurrency(user.totalSpent || 0) }}</div>
                      } @else {
                        <div>{{ user.loginCount }} lần đăng nhập</div>
                      }
                    </td>
                    <td class="px-4 py-4 text-right">
                      <div class="flex items-center justify-end space-x-1">
                        <button (click)="editUser(user)"
                                class="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                                title="Chỉnh sửa">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                          </svg>
                        </button>
                        <button (click)="toggleUserStatus(user.id)"
                                [class]="user.isActive ? 'p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded' : 'p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded'"
                                [title]="user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'">
                          @if (user.isActive) {
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"></path>
                            </svg>
                          } @else {
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                          }
                        </button>
                        <button (click)="deleteUser(user.id)"
                                class="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                title="Xóa">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (userManagementService.pagination() && userManagementService.pagination()!.totalPages > 1) {
            <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="text-sm text-gray-700">
                  <p>
                    Hiển thị
                    <span class="font-medium">{{ (userManagementService.pagination()!.number * userManagementService.pagination()!.size) + 1 }}</span>
                    đến
                    <span class="font-medium">{{ getMinValue((userManagementService.pagination()!.number + 1) * userManagementService.pagination()!.size, userManagementService.pagination()!.totalElements) }}</span>
                    trong tổng số
                    <span class="font-medium">{{ userManagementService.pagination()!.totalElements }}</span>
                    kết quả
                  </p>
                </div>
                <div class="flex items-center space-x-1">
                  <!-- Mobile pagination -->
                  <div class="flex sm:hidden">
                    <button
                    <button (click)="goToPage(userManagementService.pagination()!.number)"
                            [disabled]="userManagementService.pagination()!.first"
                            class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      Trước
                    </button>
                    <button (click)="goToPage(userManagementService.pagination()!.number + 2)"
                            [disabled]="userManagementService.pagination()!.last"
                            class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      Sau
                    </button>
                  </div>

                  <!-- Desktop pagination -->
                  <nav class="hidden sm:inline-flex rounded-md shadow-sm" aria-label="Pagination">
                    <button (click)="goToPage(userManagementService.pagination()!.number)"
                            [disabled]="userManagementService.pagination()!.first"
                            class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span class="sr-only">Previous</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>

                    @for (page of getVisiblePages(); track page) {
                      <button (click)="goToPage(page)"
                              [class]="page === userManagementService.pagination()!.number + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium'"
                              class="relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                        {{ page }}
                      </button>
                    }

                    <button (click)="goToPage(userManagementService.pagination()!.number + 2)"
                            [disabled]="userManagementService.pagination()!.last"
                            class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span class="sr-only">Next</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (filteredUsers().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có người dùng nào</h3>
            <p class="text-gray-500 mb-6">Bắt đầu thêm người dùng đầu tiên</p>
            <button (click)="openCreateUserModal()"
                    class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Thêm người dùng
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Create User Modal -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto" (click)="closeCreateUserModal()">
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" (click)="$event.stopPropagation()">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Thêm người dùng mới
                </h3>

                <form (ngSubmit)="createUser()" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tên người dùng *</label>
                    <input type="text"
                           [ngModel]="newUser().name || ''"
                           (ngModelChange)="updateNewUser('name', $event)"
                           name="name"
                           required
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email"
                           [ngModel]="newUser().email || ''"
                           (ngModelChange)="updateNewUser('email', $event)"
                           name="email"
                           required
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                    <select [ngModel]="newUser().role || ''"
                            (ngModelChange)="updateNewUser('role', $event)"
                            name="role"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                      <option value="">Chọn vai trò</option>
                      <option value="admin">Quản trị viên</option>
                      <option value="teacher">Giảng viên</option>
                      <option value="student">Học viên</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                    <input type="text"
                           [ngModel]="newUser().department || ''"
                           (ngModelChange)="updateNewUser('department', $event)"
                           name="department"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button (click)="createUser()"
                    [disabled]="!newUser().name || !newUser().email || !newUser().role"
                    class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Tạo người dùng
            </button>
            <button (click)="closeCreateUserModal()"
                    class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Hủy
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit User Modal -->
    @if (isEditModalOpen()) {
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Chỉnh sửa người dùng</h3>
              <button (click)="closeEditModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                <input type="text"
                       [ngModel]="editingUser()?.name"
                       (ngModelChange)="updateEditingUser('name', $event)"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email"
                       [ngModel]="editingUser()?.email"
                       (ngModelChange)="updateEditingUser('email', $event)"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select [ngModel]="editingUser()?.role"
                        (ngModelChange)="updateEditingUser('role', $event)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option [ngValue]="UserRole.STUDENT">Học viên</option>
                  <option [ngValue]="UserRole.TEACHER">Giảng viên</option>
                  <option [ngValue]="UserRole.ADMIN">Quản trị</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Khoa/Phòng ban</label>
                <input type="text"
                       [ngModel]="editingUser()?.department"
                       (ngModelChange)="updateEditingUser('department', $event)"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              </div>

              @if (editingUser()?.role === UserRole.STUDENT) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Mã sinh viên</label>
                  <input type="text"
                         [ngModel]="editingUser()?.studentId"
                         (ngModelChange)="updateEditingUser('studentId', $event)"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                </div>
              }
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button (click)="closeEditModal()"
                      class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
                Hủy
              </button>
              <button (click)="saveUserEdit()"
                      class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Bulk Import Modal -->
    @if (isBulkImportModalOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Import người dùng từ Excel
                  </h3>

                  <!-- Template Info -->
                   <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                     <div class="flex">
                       <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                         <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                       </svg>
                       <div class="text-sm text-blue-700">
                         <p class="font-medium mb-1">Định dạng file Excel yêu cầu:</p>
                         <ul class="list-disc list-inside space-y-1 text-xs">
                           <li>Cột A: Username (bắt buộc) - Tên đăng nhập</li>
                           <li>Cột B: Email (bắt buộc) - Địa chỉ email</li>
                           <li>Cột C: Full Name (bắt buộc) - Họ tên đầy đủ</li>
                           <li>Cột D: Department (tùy chọn) - Phòng ban/Khoa</li>
                         </ul>
                         <button (click)="downloadTemplate()"
                                 class="mt-2 text-blue-600 hover:text-blue-800 underline text-xs">
                           Tải template mẫu
                         </button>
                       </div>
                     </div>
                   </div>

                   <!-- Role Selection -->
                   <div class="mb-4">
                     <label class="block text-sm font-medium text-gray-700 mb-2">
                       Chọn vai trò cho tất cả người dùng được import
                     </label>
                     <select [(ngModel)]="defaultImportRole"
                             name="importRole"
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                       <option [ngValue]="UserRole.STUDENT">Học viên</option>
                       <option [ngValue]="UserRole.TEACHER">Giảng viên</option>
                       <option [ngValue]="UserRole.ADMIN">Quản trị viên</option>
                     </select>
                     <p class="text-xs text-gray-500 mt-1">
                       Tất cả người dùng trong file Excel sẽ được gán vai trò này
                     </p>
                   </div>

                  <!-- File Upload -->
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Chọn file Excel (.xlsx hoặc .xls)
                      </label>
                      <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                        @if (selectedFile()) {
                          <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div class="mt-4">
                              <p class="text-sm font-medium text-gray-900">{{ selectedFile()?.name }}</p>
                              <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                            </div>
                            <button (click)="removeFile()"
                                    class="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                              Chọn file khác
                            </button>
                          </div>
                        } @else {
                          <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                            <div class="mt-4">
                              <label for="file-upload" class="cursor-pointer">
                                <span class="mt-2 block text-sm font-medium text-gray-900">Kéo thả file vào đây hoặc</span>
                                <span class="mt-1 block text-sm text-blue-600 hover:text-blue-500">chọn file từ máy tính</span>
                              </label>
                              <input id="file-upload" name="file-upload" type="file" class="sr-only" accept=".xlsx,.xls" (change)="onFileSelected($event)">
                            </div>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Progress Bar -->
                    @if (userManagementService.bulkImportProgress().isImporting) {
                      <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                          <span class="text-gray-600">{{ userManagementService.bulkImportProgress().currentStep }}</span>
                          <span class="text-gray-600">{{ userManagementService.bulkImportProgress().progress }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                               [style.width.%]="userManagementService.bulkImportProgress().progress"></div>
                        </div>
                      </div>
                    }

                    <!-- Import Results -->
                    @if (userManagementService.bulkImportProgress().result) {
                      <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-900 mb-2">Kết quả import:</h4>
                        <div class="grid grid-cols-3 gap-4 text-sm">
                          <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">{{ userManagementService.bulkImportProgress().result?.totalRows }}</div>
                            <div class="text-gray-600">Tổng dòng</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">{{ userManagementService.bulkImportProgress().result?.successfulImports }}</div>
                            <div class="text-gray-600">Thành công</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-red-600">{{ userManagementService.bulkImportProgress().result?.failedImports }}</div>
                            <div class="text-gray-600">Thất bại</div>
                          </div>
                        </div>

                        @if (userManagementService.bulkImportProgress().result!.errors.length > 0) {
                           <div class="mt-4">
                             <h5 class="font-medium text-red-700 mb-2">Lỗi chi tiết:</h5>
                             <div class="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                               <ul class="text-xs text-red-700 space-y-1">
                                 @for (error of userManagementService.bulkImportProgress().result!.errors; track $index) {
                                   <li>• {{ error }}</li>
                                 }
                               </ul>
                             </div>
                           </div>
                         }
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button (click)="startBulkImport()"
                      [disabled]="!selectedFile() || userManagementService.bulkImportProgress().isImporting"
                      class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                @if (userManagementService.bulkImportProgress().isImporting) {
                  <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang import...
                } @else {
                  Import ngay
                }
              </button>
              <button (click)="closeBulkImportModal()"
                      [disabled]="userManagementService.bulkImportProgress().isImporting"
                      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                @if (userManagementService.bulkImportProgress().result) {
                  Đóng
                } @else {
                  Hủy
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  protected userManagementService = inject(UserManagementService);

  // Make UserRole available in template
  UserRole = UserRole;

  // Filter states
  searchQuery = signal('');
  roleFilter = signal('');
  statusFilter = signal('');

  // Modal state
  showCreateModal = signal(false);
  newUser = signal<Partial<AdminUser>>({
    name: '',
    email: '',
    role: UserRole.STUDENT,
    department: ''
  });

  // Edit modal state
  isEditModalOpen = signal(false);
  editingUser = signal<AdminUser | null>(null);

  // Bulk import modal state
  isBulkImportModalOpen = signal(false);
  selectedFile = signal<File | null>(null);
  defaultImportRole = signal<UserRole>(UserRole.STUDENT);

  // Pagination state
  currentPage = signal(1);

  // Computed properties
  totalUsers = computed(() => this.userManagementService.totalUsers());
  totalTeachers = computed(() => this.userManagementService.totalTeachers());
  totalStudents = computed(() => this.userManagementService.totalStudents());
  totalAdmins = computed(() => this.userManagementService.totalAdmins());
  activeUsers = computed(() => this.userManagementService.activeUsers());

  filteredUsers = computed(() => {
    let users = this.userManagementService.users();

    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      users = users.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.studentId && user.studentId.toLowerCase().includes(query))
      );
    }

    // Filter by role
    if (this.roleFilter()) {
      users = users.filter(user => user.role === this.roleFilter());
    }

    // Filter by status
    if (this.statusFilter()) {
      const isActive = this.statusFilter() === 'active';
      users = users.filter(user => user.isActive === isActive);
    }

    return users;
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(page: number = 1): Promise<void> {
    this.currentPage.set(page);
    const search = this.searchQuery() || undefined;
    const response = await this.userManagementService.getUsers(page, 10, search);
    // The service already updates the users and pagination signals internally
  }

  openCreateUserModal(): void {
    this.showCreateModal.set(true);
    this.newUser.set({
      name: '',
      email: '',
      role: UserRole.STUDENT,
      department: ''
    });
  }

  closeCreateUserModal(): void {
    this.showCreateModal.set(false);
  }

  async createUser(): Promise<void> {
    if (this.newUser().name && this.newUser().email && this.newUser().role) {
      await this.userManagementService.createUser(this.newUser());
      this.closeCreateUserModal();
    }
  }

  updateNewUser(key: string, value: any): void {
    this.newUser.update(user => ({
      ...user,
      [key]: value
    }));
  }

  editUser(user: AdminUser): void {
    // Set the user to edit and open modal
    this.editingUser.set(user);
    this.isEditModalOpen.set(true);
  }

  async toggleUserStatus(userId: string): Promise<void> {
    await this.userManagementService.toggleUserStatus(userId);
  }

  async deleteUser(userId: string): Promise<void> {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      await this.userManagementService.deleteUser(userId);
    }
  }

  // Edit modal methods
  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingUser.set(null);
  }

  async saveUserEdit(): Promise<void> {
    const user = this.editingUser();
    if (!user) return;

    try {
      await this.userManagementService.updateUser(user.id, user);
      this.closeEditModal();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  updateEditingUser(field: keyof AdminUser, value: any): void {
    const user = this.editingUser();
    if (user) {
      this.editingUser.set({
        ...user,
        [field]: value
      });
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getRoleClass(role: UserRole): string {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'teacher':
        return 'bg-purple-100 text-purple-800';
      case 'student':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getRoleText(role: UserRole): string {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'teacher':
        return 'Giảng viên';
      case 'student':
        return 'Học viên';
      default:
        return 'Không xác định';
    }
  }

  // Pagination methods
  async goToPage(page: number): Promise<void> {
    if (page >= 1 && page <= (this.userManagementService.pagination()?.totalPages || 1)) {
      await this.loadUsers(page);
    }
  }

  getVisiblePages(): number[] {
    const pagination = this.userManagementService.pagination();
    if (!pagination) return [];

    const currentPage = pagination.number + 1; // Convert 0-based to 1-based
    const totalPages = pagination.totalPages;
    const pages: number[] = [];

    // Show max 5 pages around current page
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Bulk import methods
  openBulkImportModal(): void {
    this.isBulkImportModalOpen.set(true);
    this.selectedFile.set(null);
    this.defaultImportRole.set(UserRole.STUDENT);
    this.userManagementService.resetBulkImportProgress();
  }

  closeBulkImportModal(): void {
    this.isBulkImportModalOpen.set(false);
    this.selectedFile.set(null);
    this.userManagementService.resetBulkImportProgress();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
  }

  async startBulkImport(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    try {
      await this.userManagementService.bulkImportUsers(file, this.defaultImportRole());
      // Refresh user list after successful import
      await this.loadUsers(this.currentPage());
      // Close modal after successful import
      setTimeout(() => {
        this.closeBulkImportModal();
      }, 2000);
    } catch (error) {
      console.error('Bulk import failed:', error);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  downloadTemplate(): void {
    this.userManagementService.downloadExcelTemplate();
  }
}
```

## 3. Hướng Dẫn Tích Hợp

### 3.1 Cài Đặt Dependencies

Thêm các package cần thiết vào `package.json`:

```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.5"
  }
}
```

### 3.2 Cấu Hình Routing

Trong `admin.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/role.guard';
import { AdminLayoutSimpleComponent } from './presentation/components/admin-layout-simple.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutSimpleComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'users',
        loadComponent: () => import('./presentation/components/user-management.component').then(m => m.UserManagementComponent),
        title: 'Quản lý người dùng'
      }
      // ... other admin routes
    ]
  }
];
```

### 3.3 Cấu Hình Environment

Trong `environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};
```

### 3.4 Cấu Hình Backend API

#### Controller (Java Spring Boot):

```java
@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search) {

        Page<User> userPage = userService.getUsers(page, limit, search);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", userPage.getContent());
        response.put("pagination", Map.of(
            "page", page,
            "limit", limit,
            "totalItems", userPage.getTotalElements(),
            "totalPages", userPage.getTotalPages()
        ));

        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        User user = userService.createUser(request);
        return ResponseEntity.ok(Map.of("success", true, "data", user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody UpdateUserRequest request) {
        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(Map.of("success", true, "data", user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/bulk-import")
    public ResponseEntity<?> bulkImport(@RequestParam("file") MultipartFile file,
                                      @RequestParam("defaultRole") String defaultRole) {
        BulkImportResult result = userService.bulkImportUsers(file, defaultRole);
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }
}
```

### 3.5 Cài Đặt và Chạy

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Chạy Angular app:**
   ```bash
   ng serve
   ```

3. **Truy cập trang admin:**
   ```
   http://localhost:4200/admin/users
   ```

## 4. Tính Năng Chi Tiết

### 4.1 Phân Trang
- Hiển thị 10 user/trang
- Điều hướng Previous/Next
- Hiển thị tổng số kết quả
- Responsive design cho mobile/desktop

### 4.2 Tìm Kiếm và Lọc
- Tìm kiếm theo tên, email, mã sinh viên
- Lọc theo vai trò (admin, teacher, student)
- Lọc theo trạng thái (active/inactive)

### 4.3 Thao Tác User
- **Thêm thủ công:** Form modal với validation
- **Import hàng loạt:** Upload Excel với progress bar
- **Chỉnh sửa:** Modal edit với các trường tùy chỉnh theo role
- **Khóa/Mở khóa:** Toggle trạng thái active
- **Xóa:** Xác nhận trước khi xóa

### 4.4 Thống Kê
- Tổng số user theo vai trò
- Số user đang hoạt động
- Hiển thị dạng card với icon và màu sắc

### 4.5 Xử Lý Lỗi
- Error handling toàn diện
- Thông báo lỗi user-friendly
- Retry mechanism cho network errors

## 5. Cấu Trúc File Hoàn Chỉnh

```
src/app/
├── features/admin/
│   ├── infrastructure/services/
│   │   └── user-management.service.ts
│   └── presentation/components/
│       ├── user-management.component.ts
│       └── admin-layout-simple.component.ts
├── core/
│   ├── guards/
│   │   └── role.guard.ts
│   └── services/
│       └── auth.service.ts
├── shared/
│   ├── components/
│   │   ├── loading/
│   │   │   └── loading.component.ts
│   └── services/
│       └── error-handling.service.ts
└── environments/
    └── environment.ts
```

## 6. Lưu Ý Quan Trọng

1. **Authentication:** Đảm bảo user đã đăng nhập và có quyền admin
2. **API Endpoints:** Cần backend API tương thích với format response
3. **File Upload:** Cần cấu hình CORS cho file upload
4. **Error Handling:** Implement error handling service
5. **Loading States:** Hiển thị loading cho UX tốt hơn
6. **Validation:** Validate dữ liệu ở cả frontend và backend

Code này cung cấp một giao diện quản lý user hoàn chỉnh, có thể tái sử dụng và mở rộng dễ dàng cho các dự án admin khác.