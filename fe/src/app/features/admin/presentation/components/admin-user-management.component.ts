import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, UserAccountStatus, UpdateUserStatusRequest } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
/**
 * Admin User Management Component
 * SOTA Design: Coursera-inspired with role change, status actions
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-user-management',
  imports: [RouterModule, FormsModule],
  styles: [`
    select.role-select {
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
      appearance: auto;
    }
    select.role-select:hover { border-color: #9CA3AF; }
  `],
  template: `
    <div class="min-h-screen bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 class="text-2xl font-bold text-gray-900 mb-1">Quản lý Quản trị viên</h1>
              <p class="text-sm text-gray-600">Quản lý các tài khoản có quyền quản trị hệ thống</p>
            </div>
            <button (click)="openCreateModal()" class="inline-flex items-center px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700 transition-colors">
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
              Thêm Quản trị viên
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase mb-2">Tổng Admin</p>
                <p class="text-2xl font-bold text-gray-900">{{ totalAdmins() }}</p>
                <p class="text-xs text-gray-600 mt-2">{{ activeAdmins() }} đang hoạt động</p>
              </div>
              <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase mb-2">Super Admin</p>
                <p class="text-2xl font-bold text-gray-900">{{ superAdmins() }}</p>
                <p class="text-xs text-gray-600 mt-2">Quyền cao nhất</p>
              </div>
              <div class="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase mb-2">Bị khóa</p>
                <p class="text-2xl font-bold text-gray-900">{{ blockedAdmins() }}</p>
                <p class="text-xs text-gray-600 mt-2">Tài khoản bị khóa</p>
              </div>
              <div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-medium text-gray-500 uppercase mb-2">Hoạt động gần đây</p>
                <p class="text-2xl font-bold text-gray-900">{{ recentlyActive() }}</p>
                <p class="text-xs text-gray-600 mt-2">Trong 7 ngày qua</p>
              </div>
              <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-[#0056D2]" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Search & Filter -->
        <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div class="flex flex-col lg:flex-row gap-4">
            <div class="flex-1 relative">
              <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
              </svg>
              <input type="text" [value]="searchQuery()" (input)="onSearchInput($any($event.target).value)"
                     placeholder="Tìm kiếm theo tên hoặc email..."
                     class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent">
            </div>
            <select [value]="statusFilter()" (change)="onStatusFilterChange($any($event.target).value)"
                    class="px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:ring-2 focus:ring-orange-500">
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="BLOCKED">Bị khóa</option>
              <option value="RESTRICTED">Hạn chế</option>
            </select>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-xs text-gray-600">
              Hiển thị <span class="font-medium text-gray-900">{{ filteredAdmins().length }}</span>
              trong tổng số <span class="font-medium text-gray-900">{{ totalAdmins() }}</span> quản trị viên
            </p>
          </div>
        </div>

        <!-- Admins Table -->
        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
          @if (isLoading()) {
            <div class="p-12 text-center">
              <div class="w-12 h-12 border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin mx-auto"></div>
              <p class="mt-4 text-sm text-gray-600">Đang tải danh sách quản trị viên...</p>
            </div>
          } @else if (filteredAdmins().length === 0) {
            <div class="p-12 text-center">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
              </svg>
              <h3 class="text-base font-medium text-gray-900 mb-2">Không tìm thấy quản trị viên</h3>
              <p class="text-sm text-gray-600">Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quản trị viên</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vai trò</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Trạng thái</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Hoạt động cuối</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Đăng nhập</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">
                  @for (admin of filteredAdmins(); track admin.id) {
                    <tr class="hover:bg-gray-50 transition-colors">
                      <!-- User Info -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <img [src]="getDefaultAvatar(admin.email)" class="w-10 h-10 rounded-full border border-gray-200">
                          <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">{{ admin.name }}</div>
                            <div class="text-xs text-gray-500">{{ admin.email }}</div>
                          </div>
                        </div>
                      </td>
                      <!-- Role Change -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <select [ngModel]="getRoleValue(admin.role)"
                                (ngModelChange)="onRoleChange(admin.id, $event)"
                                class="role-select px-2 py-1 text-xs font-medium rounded border border-gray-300 bg-white focus:ring-2 focus:ring-orange-500">
                          <option value="STUDENT">Học viên</option>
                          <option value="TEACHER">Giảng viên</option>
                          <option value="ADMIN">Quản trị viên</option>
                        </select>
                      </td>
                      <!-- Status -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded" [class]="getStatusBadgeClass(admin.accountStatus)">
                          <span class="w-1.5 h-1.5 rounded-full mr-1.5" [class]="getStatusDotClass(admin.accountStatus)"></span>
                          {{ getStatusLabel(admin.accountStatus) }}
                        </span>
                      </td>
                      <!-- Last Login -->
                      <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {{ admin.lastLogin ? formatDateValue(admin.lastLogin) : 'Chưa đăng nhập' }}
                      </td>
                      <!-- Login Count -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center text-xs text-gray-600">
                          <svg class="w-3 h-3 mr-1.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5z"></path>
                          </svg>
                          {{ admin.loginCount || 0 }} lần
                        </div>
                      </td>
                      <!-- Actions -->
                      <td class="px-6 py-4 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center space-x-1">
                          <!-- Status Actions -->
                          <select (change)="onStatusActionChange(admin, $any($event.target).value); $any($event.target).value = ''"
                                  class="text-xs px-2 py-1 border border-gray-300 rounded bg-white cursor-pointer hover:border-gray-400">
                            <option value="" disabled selected>Trạng thái</option>
                            @if (admin.accountStatus !== 'ACTIVE') {
                              <option value="ACTIVE">Kích hoạt</option>
                            }
                            @if (admin.accountStatus !== 'BLOCKED') {
                              <option value="BLOCKED">Khóa</option>
                            }
                            @if (admin.accountStatus !== 'RESTRICTED') {
                              <option value="RESTRICTED">Hạn chế</option>
                            }
                          </select>
                          <!-- Revoke Admin -->
                          <button (click)="revokeAdmin(admin)"
                                  class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Thu hồi quyền Admin">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Create Admin Modal -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40" (click)="closeCreateModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b">
              <h3 class="text-xl font-semibold text-gray-900">Thêm Quản trị viên mới</h3>
              <button (click)="closeCreateModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tên đầy đủ <span class="text-red-500">*</span></label>
                <input type="text" [(ngModel)]="newAdminName" placeholder="Nhập họ và tên"
                       class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email <span class="text-red-500">*</span></label>
                <input type="email" [(ngModel)]="newAdminEmail" placeholder="email@example.com"
                       class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              </div>
              <div class="bg-orange-50 border border-orange-200 rounded p-3">
                <div class="flex">
                  <svg class="w-5 h-5 text-orange-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                  <p class="text-xs text-orange-700">
                    <span class="font-medium">Cảnh báo:</span> Đây là vai trò có quyền cao nhất. Mật khẩu mặc định: Password123!
                  </p>
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
              <button (click)="closeCreateModal()" class="px-4 py-2 text-sm text-gray-700 bg-white border rounded hover:bg-gray-50">Hủy</button>
              <button (click)="createAdmin()" [disabled]="!newAdminName() || !newAdminEmail()"
                      class="px-4 py-2 text-sm text-white bg-orange-600 rounded hover:bg-orange-700 disabled:opacity-50">
                Thêm quản trị viên
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class AdminUserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  // State
  allUsers = signal<AdminUser[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  statusFilter = signal('');
  showCreateModal = signal(false);
  newAdminName = signal('');
  newAdminEmail = signal('');

  // Computed - filter for admins (ADMIN + ORG_ADMIN)
  adminUsers = computed(() => this.allUsers().filter(u => u.role === 'admin' || u.role === 'org_admin'));

  filteredAdmins = computed(() => {
    let admins = this.adminUsers();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();

    if (query) {
      admins = admins.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query)
      );
    }

    if (status) {
      admins = admins.filter(a => a.accountStatus === status);
    }

    return admins;
  });

  // Stats
  totalAdmins = computed(() => this.adminUsers().length);
  activeAdmins = computed(() => this.adminUsers().filter(a => a.accountStatus === 'ACTIVE').length);
  blockedAdmins = computed(() => this.adminUsers().filter(a => a.accountStatus === 'BLOCKED').length);
  superAdmins = computed(() => 1); // Placeholder - needs backend support
  recentlyActive = computed(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.adminUsers().filter(a => a.lastLogin && new Date(a.lastLogin) > weekAgo).length;
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.adminService.getUsers({ page: 1, limit: 1000 }).subscribe({
      next: (response) => {
        this.allUsers.set(response.data || []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
  }

  onStatusFilterChange(value: string) {
    this.statusFilter.set(value);
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.newAdminName.set('');
    this.newAdminEmail.set('');
  }

  createAdmin() {
    if (!this.newAdminName() || !this.newAdminEmail()) return;

    this.adminService.createUser({
      username: this.newAdminEmail().split('@')[0],
      email: this.newAdminEmail(),
      password: 'Password123!',
      fullName: this.newAdminName(),
      role: 'ADMIN'
    }).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadUsers();
      }
    });
  }

  // Role change handler
  async onRoleChange(userId: string, newRole: string) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Thay đổi vai trò',
      message: `Bạn có chắc muốn thay đổi vai trò người dùng này thành ${this.getRoleLabel(newRole)}?`,
      confirmText: 'Thay đổi',
      variant: 'warning'
    });
    if (!confirmed) {
      this.loadUsers();
      return;
    }

    this.adminService.updateUser(userId, { role: newRole as 'ADMIN' | 'TEACHER' | 'STUDENT' }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.toast.error('Không thể thay đổi vai trò: ' + (err.error?.message || 'Vui lòng thử lại'))
    });
  }

  // Status action handler
  onStatusActionChange(user: AdminUser, newStatus: string) {
    if (!newStatus) return;

    this.adminService.updateUserStatus(user.id, {
      status: newStatus as UserAccountStatus,
      reason: ''
    }).subscribe({
      next: () => this.loadUsers(),
      error: () => {
        this.adminService.toggleUserStatus(user.id).subscribe({
          next: () => this.loadUsers(),
          error: (err) => this.toast.error('Không thể thay đổi trạng thái: ' + (err.error?.message || 'Vui lòng thử lại'))
        });
      }
    });
  }

  async revokeAdmin(admin: AdminUser) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Thu hồi quyền Admin',
      message: `Bạn có chắc muốn thu hồi quyền Admin của ${admin.name}? Họ sẽ trở thành Học viên.`,
      confirmText: 'Thu hồi',
      variant: 'danger'
    });
    if (!confirmed) return;

    this.adminService.updateUser(admin.id, { role: 'STUDENT' }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.toast.error('Không thể thu hồi quyền: ' + (err.error?.message || 'Vui lòng thử lại'))
    });
  }

  // Helpers
  getRoleValue(role: string): string {
    return role.toUpperCase();
  }

  getRoleLabel(role: string): string {
    switch (role.toUpperCase()) {
      case 'ADMIN': return 'Quản trị viên';
      case 'TEACHER': return 'Giảng viên';
      case 'STUDENT': return 'Học viên';
      default: return role;
    }
  }

  formatDateValue(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  getDefaultAvatar(email: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=f97316&color=fff`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      case 'RESTRICTED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'BLOCKED': return 'bg-red-500';
      case 'RESTRICTED': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động';
      case 'BLOCKED': return 'Bị khóa';
      case 'RESTRICTED': return 'Hạn chế';
      default: return 'Chờ xác thực';
    }
  }
}

