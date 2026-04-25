import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, UserAccountStatus, UpdateUserStatusRequest } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { KpiCardComponent } from '../../../../shared/components/admin/kpi-card/kpi-card.component';
/**
 * Admin User Management Component
 * SOTA Design: Coursera-inspired with role change, status actions
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-user-management',
  imports: [RouterModule, FormsModule, KpiCardComponent],
  templateUrl: './admin-user-management.component.html',
  styleUrl: './admin-user-management.component.scss'
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

  // Status action handler — F-AD2 security fix: require confirm modal before
  // suspending or activating an admin account. Admins suspending other admins
  // is the highest-blast-radius action in the portal; the modal makes the
  // intent explicit and the cancel path re-fetches to revert dropdown UI.
  async onStatusActionChange(user: AdminUser, newStatus: string) {
    if (!newStatus) return;

    const isBlock = newStatus === 'BLOCKED';
    const confirmed = await this.confirmDialog.confirm({
      title: isBlock ? 'Khóa tài khoản Quản trị viên' : 'Kích hoạt tài khoản',
      message: isBlock
        ? `Bạn có chắc muốn khóa tài khoản Quản trị viên ${user.name}? Họ sẽ mất quyền truy cập hệ thống cho đến khi được mở khóa.`
        : `Bạn có chắc muốn kích hoạt lại tài khoản của ${user.name}?`,
      confirmText: isBlock ? 'Khóa tài khoản' : 'Kích hoạt',
      variant: isBlock ? 'danger' : 'warning'
    });
    if (!confirmed) {
      this.loadUsers();
      return;
    }

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
      case 'ACTIVE': return 'badge-success';
      case 'BLOCKED': return 'badge-error';
      case 'RESTRICTED': return 'badge-warning';
      default: return 'badge-default';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'dot-success';
      case 'BLOCKED': return 'dot-error';
      case 'RESTRICTED': return 'dot-warning';
      default: return 'dot-default';
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

