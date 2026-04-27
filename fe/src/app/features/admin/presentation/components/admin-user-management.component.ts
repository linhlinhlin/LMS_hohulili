import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService, AdminUser, UserAccountStatus, UpdateUserStatusRequest } from '../../infrastructure/services/admin.service';
import { OrganizationService } from '../../infrastructure/services/organization.service';
import { Organization } from '../../../../shared/types/user.types';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmStatusChangeService } from '../../services/confirm-status-change.service';
import { KpiCardComponent } from '../../../../shared/components/admin/kpi-card/kpi-card.component';
import { BulkActionBarComponent, BulkAction } from '../../../../shared/components/admin/bulk-action-bar/bulk-action-bar.component';
import { KebabMenuComponent, KebabAction } from '../../../../shared/components/admin/kebab-menu/kebab-menu.component';
import { formatRelativeTimeVN } from '../../../../shared/utils/relative-time.util';
import { initialsAvatar } from '../../../../shared/utils/avatar.util';
/**
 * Admin User Management Component
 * SOTA Design: Coursera-inspired with role change, status actions
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-user-management',
  imports: [RouterModule, FormsModule, KpiCardComponent, BulkActionBarComponent, KebabMenuComponent],
  templateUrl: './admin-user-management.component.html',
  styleUrl: './admin-user-management.component.scss'
})
export class AdminUserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private organizationService = inject(OrganizationService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private authService = inject(AuthService);
  private confirmStatus = inject(ConfirmStatusChangeService);

  // State
  allUsers = signal<AdminUser[]>([]);
  organizations = signal<Organization[]>([]);  // #229: cho dropdown filter org
  isLoading = signal(false);
  searchQuery = signal('');
  statusFilter = signal('');
  // Issue #229: '' = tất cả, 'system' = ADMIN không thuộc org, UUID = org cụ thể
  orgFilter = signal('');
  showCreateModal = signal(false);
  newAdminName = signal('');
  newAdminEmail = signal('');

  // Bulk selection state — CC-06 (mega audit). Set keyed by user id so we
  // skip toUpperCase/toLowerCase normalization concerns. Selection is
  // cleared after every successful bulk action and on every loadUsers().
  selectedUserIds = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selectedUserIds().size);

  // Bulk action descriptors — derived so disabled states stay reactive to
  // selection changes (e.g. "Khóa" disables when the current admin is in
  // the selection — F-AD2 self-suspend block).
  bulkActions = computed<BulkAction[]>(() => {
    const selfId = this.authService.currentUser()?.id;
    const selectedHasSelf = !!selfId && this.selectedUserIds().has(selfId);
    return [
      {
        key: 'block',
        label: 'Khóa',
        variant: 'danger',
        disabled: selectedHasSelf,
        ariaLabel: selectedHasSelf
          ? 'Không thể khóa tài khoản của chính bạn'
          : 'Khóa các tài khoản đã chọn',
        icon: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
      },
      {
        key: 'activate',
        label: 'Kích hoạt',
        ariaLabel: 'Kích hoạt các tài khoản đã chọn',
        icon: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      },
    ];
  });

  // Computed - filter for admins (ADMIN + ORG_ADMIN)
  adminUsers = computed(() => this.allUsers().filter(u => u.role === 'admin' || u.role === 'org_admin'));

  filteredAdmins = computed(() => {
    let admins = this.adminUsers();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    const org = this.orgFilter();

    if (query) {
      admins = admins.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query)
      );
    }

    if (status) {
      admins = admins.filter(a => a.accountStatus === status);
    }

    // Issue #229: org filter — 'system' = system ADMIN không có organizationId,
    // UUID = scope tới org cụ thể. '' = không filter, hiển thị tất cả.
    if (org) {
      if (org === 'system') {
        admins = admins.filter(a => !a.organizationId);
      } else {
        admins = admins.filter(a => a.organizationId === org);
      }
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
    this.loadOrganizations();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.adminService.getUsers({ page: 1, limit: 1000 }).subscribe({
      next: (response) => {
        this.allUsers.set(response.data || []);
        this.clearSelection();
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Issue #229: load organizations cho filter dropdown. Silent fail nếu
  // endpoint lỗi — page vẫn dùng được không có org filter.
  private loadOrganizations() {
    this.organizationService.listOrganizations().subscribe({
      next: (orgs) => this.organizations.set(orgs),
      error: () => this.organizations.set([])
    });
  }

  // --- Bulk selection helpers ---

  isSelected(userId: string): boolean {
    return this.selectedUserIds().has(userId);
  }

  toggleSelection(userId: string): void {
    const next = new Set(this.selectedUserIds());
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    this.selectedUserIds.set(next);
  }

  toggleSelectAll(): void {
    const visibleIds = this.filteredAdmins().map(a => a.id);
    const current = this.selectedUserIds();
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => current.has(id));
    if (allSelected) {
      // Drop only the visible rows from the selection — preserves any
      // off-page selections (here we paginate client-side so this is moot
      // but keeps the helper consistent with the wider users surface).
      const next = new Set(current);
      visibleIds.forEach(id => next.delete(id));
      this.selectedUserIds.set(next);
    } else {
      this.selectedUserIds.set(new Set([...current, ...visibleIds]));
    }
  }

  allVisibleSelected = computed(() => {
    const visible = this.filteredAdmins();
    if (visible.length === 0) return false;
    const selected = this.selectedUserIds();
    return visible.every(a => selected.has(a.id));
  });

  clearSelection(): void {
    this.selectedUserIds.set(new Set());
  }

  // --- Per-row kebab menu (CC-10) ---
  // Replaces the inline `<select>` Trạng thái + Thu hồi icon button per row.
  // Status pill stays as a read-only badge in the cell next to the kebab.
  // Actions surface: Kích hoạt / Khóa / Hạn chế / Đổi vai trò → STUDENT
  // (= "Thu hồi quyền Admin"). Disabled flags mirror per-row guards
  // (e.g. cannot block self).
  rowActions(admin: AdminUser): KebabAction[] {
    const selfId = this.authService.currentUser()?.id;
    const isSelf = !!selfId && admin.id === selfId;
    const status = admin.accountStatus;
    const items: KebabAction[] = [];

    if (status !== 'ACTIVE') {
      items.push({
        key: 'status:ACTIVE',
        label: 'Kích hoạt',
        ariaLabel: `Kích hoạt tài khoản ${admin.name}`,
        icon: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      });
    }
    if (status !== 'BLOCKED') {
      items.push({
        key: 'status:BLOCKED',
        label: 'Khóa',
        variant: 'danger',
        disabled: isSelf,
        ariaLabel: isSelf
          ? 'Không thể khóa tài khoản của chính bạn'
          : `Khóa tài khoản ${admin.name}`,
        icon: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
      });
    }
    if (status !== 'RESTRICTED') {
      items.push({
        key: 'status:RESTRICTED',
        label: 'Hạn chế',
        ariaLabel: `Hạn chế tài khoản ${admin.name}`,
        icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
      });
    }
    items.push({
      key: 'revoke',
      label: 'Thu hồi quyền Admin',
      variant: 'danger',
      disabled: isSelf,
      ariaLabel: isSelf
        ? 'Không thể thu hồi quyền của chính bạn'
        : `Thu hồi quyền Admin của ${admin.name}`,
      icon: 'M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z',
    });

    return items;
  }

  /**
   * Per-row kebab dispatch. `key` is one of:
   *   - "status:ACTIVE" / "status:BLOCKED" / "status:RESTRICTED"
   *   - "revoke" (demote ADMIN → STUDENT — same gate as the previous icon
   *     button: blocks demoting the only remaining SYSTEM_ADMIN).
   */
  onRowAction(admin: AdminUser, key: string): void {
    if (key === 'revoke') {
      this.revokeAdmin(admin);
      return;
    }
    if (key.startsWith('status:')) {
      const newStatus = key.slice('status:'.length);
      this.onStatusActionChange(admin, newStatus);
    }
  }

  // --- Bulk action dispatcher ---

  async onBulkAction(key: string): Promise<void> {
    const ids = Array.from(this.selectedUserIds());
    if (ids.length === 0) return;

    if (key === 'block') {
      await this.bulkUpdateStatus(ids, UserAccountStatus.BLOCKED);
    } else if (key === 'activate') {
      await this.bulkUpdateStatus(ids, UserAccountStatus.ACTIVE);
    }
  }

  private async bulkUpdateStatus(userIds: string[], status: UserAccountStatus): Promise<void> {
    // Self-suspend safety net — also enforced via disabled action button so
    // this branch is defence-in-depth. Mirrors the F-AD2 confirm guard in
    // the per-row inline-edit dropdown.
    const selfId = this.authService.currentUser()?.id;
    if (status === UserAccountStatus.BLOCKED && selfId && userIds.includes(selfId)) {
      this.toast.error('Không thể khóa tài khoản của chính bạn.');
      return;
    }

    const isBlock = status === UserAccountStatus.BLOCKED;
    const confirmed = await this.confirmDialog.confirm({
      title: isBlock ? 'Khóa tài khoản hàng loạt' : 'Kích hoạt tài khoản hàng loạt',
      message: isBlock
        ? `Bạn có chắc muốn khóa ${userIds.length} tài khoản Quản trị viên đã chọn? Họ sẽ mất quyền truy cập hệ thống cho đến khi được mở khóa.`
        : `Bạn có chắc muốn kích hoạt lại ${userIds.length} tài khoản đã chọn?`,
      confirmText: isBlock ? `Khóa ${userIds.length} tài khoản` : `Kích hoạt ${userIds.length} tài khoản`,
      variant: isBlock ? 'danger' : 'warning'
    });
    if (!confirmed) return;

    const requests = userIds.map(id =>
      this.adminService.updateUserStatus(id, { status, reason: '' })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.toast.success(
          isBlock
            ? `Đã khóa ${userIds.length} tài khoản thành công`
            : `Đã kích hoạt ${userIds.length} tài khoản thành công`
        );
        this.loadUsers();
      },
      error: () => {
        this.toast.error('Một số tài khoản không thể cập nhật. Vui lòng thử lại.');
        this.loadUsers();
      }
    });
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
  }

  onStatusFilterChange(value: string) {
    this.statusFilter.set(value);
  }

  // Issue #229: org filter handler — '' = tất cả, 'system' = ADMIN không
  // thuộc org, UUID = scope tới org cụ thể.
  onOrgFilterChange(value: string) {
    this.orgFilter.set(value);
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
  // Issue #194 (F-AD2 followup): block demoting the only remaining SYSTEM_ADMIN
  // before showing the confirm modal. The check runs against the in-memory
  // `adminUsers` signal because the dropdown lives on this surface.
  async onRoleChange(userId: string, newRole: string) {
    const target = this.adminUsers().find(u => u.id === userId);
    if (target && !this.confirmStatus.validateRoleChange(target, newRole, this.adminUsers())) {
      this.loadUsers();
      return;
    }

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
  // Modal copy + variant lives in ConfirmStatusChangeService (DRY — issue #195).
  async onStatusActionChange(user: AdminUser, newStatus: string) {
    if (!newStatus) return;

    const confirmed = await this.confirmStatus.confirm(user, newStatus as UserAccountStatus, 'admin');
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
    // Issue #194: same sole-system-admin gate as onRoleChange — revoking is
    // a demote in disguise (ADMIN -> STUDENT).
    if (!this.confirmStatus.validateRoleChange(admin, 'STUDENT', this.adminUsers())) {
      return;
    }

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

  // Cột "Hoạt động cuối" — relative time (Linear/GitHub/Stripe pattern,
  // đồng bộ users/all PR #224). Tooltip [title] giữ ISO timestamp gốc.
  formatRelativeTime(input: Date | string | null | undefined): string {
    return formatRelativeTimeVN(input);
  }

  getDefaultAvatar(email: string): string {
    return initialsAvatar(email, '#f97316', '#ffffff');
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

