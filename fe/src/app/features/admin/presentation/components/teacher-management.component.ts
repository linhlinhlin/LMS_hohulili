import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService, AdminUser, UserAccountStatus, UpdateUserStatusRequest } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ConfirmStatusChangeService } from '../../services/confirm-status-change.service';
import { AuthService } from '../../../../core/services/auth.service';
import { getAdminPortalBase } from '../../../../core/utils/portal-route.util';
import { KpiCardComponent } from '../../../../shared/components/admin/kpi-card/kpi-card.component';
import { BulkActionBarComponent, BulkAction } from '../../../../shared/components/admin/bulk-action-bar/bulk-action-bar.component';
import { KebabMenuComponent, KebabAction } from '../../../../shared/components/admin/kebab-menu/kebab-menu.component';
import { formatRelativeTimeVN } from '../../../../shared/utils/relative-time.util';

/**
 * Teacher Management Component
 * SOTA: Coursera-inspired design with role change, status actions, and course statistics
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-teacher-management',
  imports: [RouterModule, FormsModule, KpiCardComponent, BulkActionBarComponent, KebabMenuComponent],
  styleUrl: './teacher-management.component.scss',
  templateUrl: './teacher-management.html'
})
export class TeacherManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private confirmStatus = inject(ConfirmStatusChangeService);
  private authService = inject(AuthService);

  isSystemAdmin = computed(() => this.authService.userRole() === 'admin');
  courseSearchRoute = computed(() => `${getAdminPortalBase(this.authService.userRole())}/courses`);
  pageTitle = computed(() => this.isSystemAdmin() ? 'Quản lý Giảng viên' : 'Giảng viên của tổ chức');
  pageSubtitle = computed(() =>
    this.isSystemAdmin()
      ? 'Quản lý các tài khoản giảng viên trong hệ thống'
      : 'Quản lý các tài khoản giảng viên thuộc tổ chức của bạn'
  );

  // State
  allUsers = signal<AdminUser[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  statusFilter = signal('');
  showCreateModal = signal(false);
  newTeacherName = signal('');
  newTeacherEmail = signal('');

  // Courses modal state
  showCoursesModal = signal(false);
  selectedTeacher = signal<AdminUser | null>(null);
  teacherCourses = signal<any[]>([]);  // Owned courses
  coopCourses = signal<any[]>([]);     // Co-op courses (invited as teaching staff)
  isLoadingCourses = signal(false);

  // Bulk selection state — CC-06. The current user can never be in this set
  // because TEACHER cannot be the logged-in admin (role mismatch), but the
  // self-suspend guard is left in for symmetry with the wider users surface.
  selectedUserIds = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selectedUserIds().size);

  bulkActions = computed<BulkAction[]>(() => {
    const selfId = this.authService.currentUser()?.id;
    const selectedHasSelf = !!selfId && this.selectedUserIds().has(selfId);
    return [
      {
        key: 'block',
        label: 'Khóa',
        variant: 'danger',
        disabled: selectedHasSelf,
        ariaLabel: 'Khóa các tài khoản giảng viên đã chọn',
        icon: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
      },
      {
        key: 'activate',
        label: 'Kích hoạt',
        ariaLabel: 'Kích hoạt các tài khoản giảng viên đã chọn',
        icon: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      },
    ];
  });

  // Computed - filter for teachers (UserRole.TEACHER = 'teacher')
  teacherUsers = computed(() => this.allUsers().filter(u => u.role === 'teacher'));

  filteredTeachers = computed(() => {
    let teachers = this.teacherUsers();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();

    if (query) {
      teachers = teachers.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query)
      );
    }

    if (status) {
      teachers = teachers.filter(t => t.accountStatus === status);
    }

    return teachers;
  });

  // Stats
  totalTeachers = computed(() => this.teacherUsers().length);
  activeTeachers = computed(() => this.teacherUsers().filter(t => t.accountStatus === 'ACTIVE').length);
  blockedTeachers = computed(() => this.teacherUsers().filter(t => t.accountStatus === 'BLOCKED').length);
  totalCourses = computed(() => this.teacherUsers().reduce((sum, t) => sum + (t.coursesCreated || 0), 0));
  recentlyActive = computed(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.teacherUsers().filter(t => t.lastLogin && new Date(t.lastLogin) > weekAgo).length;
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.adminService.getUsers({ page: 1, limit: 200, role: 'TEACHER' }).subscribe({
      next: (response) => {
        this.allUsers.set(response.data || []);
        this.clearSelection();
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // --- Bulk selection helpers (CC-06) ---

  isSelected(userId: string): boolean {
    return this.selectedUserIds().has(userId);
  }

  toggleSelection(userId: string): void {
    const next = new Set(this.selectedUserIds());
    next.has(userId) ? next.delete(userId) : next.add(userId);
    this.selectedUserIds.set(next);
  }

  toggleSelectAll(): void {
    const visibleIds = this.filteredTeachers().map(t => t.id);
    const current = this.selectedUserIds();
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => current.has(id));
    if (allSelected) {
      const next = new Set(current);
      visibleIds.forEach(id => next.delete(id));
      this.selectedUserIds.set(next);
    } else {
      this.selectedUserIds.set(new Set([...current, ...visibleIds]));
    }
  }

  allVisibleSelected = computed(() => {
    const visible = this.filteredTeachers();
    if (visible.length === 0) return false;
    const selected = this.selectedUserIds();
    return visible.every(t => selected.has(t.id));
  });

  clearSelection(): void {
    this.selectedUserIds.set(new Set());
  }

  // --- Per-row kebab menu (CC-10) ---
  // Replaces the inline `<select>` Trạng thái + Vô hiệu hóa icon button.
  // Status pill stays as a read-only badge in its own column. The kebab
  // surfaces Kích hoạt / Khóa / Hạn chế and (system-admin only) Vô hiệu
  // hóa tài khoản.
  rowActions(teacher: AdminUser): KebabAction[] {
    const status = teacher.accountStatus;
    const items: KebabAction[] = [];

    if (status !== 'ACTIVE') {
      items.push({
        key: 'status:ACTIVE',
        label: 'Kích hoạt',
        ariaLabel: `Kích hoạt tài khoản ${teacher.name}`,
        icon: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      });
    }
    if (status !== 'BLOCKED') {
      items.push({
        key: 'status:BLOCKED',
        label: 'Khóa',
        variant: 'danger',
        ariaLabel: `Khóa tài khoản ${teacher.name}`,
        icon: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
      });
    }
    if (status !== 'RESTRICTED') {
      items.push({
        key: 'status:RESTRICTED',
        label: 'Hạn chế',
        ariaLabel: `Hạn chế tài khoản ${teacher.name}`,
        icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
      });
    }
    // System admin gets the destructive Vô hiệu hóa lever; ORG_ADMIN does
    // not (mirrors the per-row icon button gate that was here before).
    if (this.isSystemAdmin()) {
      items.push({
        key: 'delete',
        label: 'Vô hiệu hóa tài khoản',
        variant: 'danger',
        ariaLabel: `Vô hiệu hóa tài khoản ${teacher.name}`,
        icon: 'M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z',
      });
    }

    return items;
  }

  onRowAction(teacher: AdminUser, key: string): void {
    if (key === 'delete') {
      this.deleteUser(teacher.id);
      return;
    }
    if (key.startsWith('status:')) {
      this.onStatusActionChange(teacher, key.slice('status:'.length));
    }
  }

  // --- Bulk action dispatcher ---

  async onBulkAction(key: string): Promise<void> {
    const ids = Array.from(this.selectedUserIds());
    if (ids.length === 0) return;
    if (key === 'block') await this.bulkUpdateStatus(ids, UserAccountStatus.BLOCKED);
    else if (key === 'activate') await this.bulkUpdateStatus(ids, UserAccountStatus.ACTIVE);
  }

  private async bulkUpdateStatus(userIds: string[], status: UserAccountStatus): Promise<void> {
    const isBlock = status === UserAccountStatus.BLOCKED;
    const confirmed = await this.confirmDialog.confirm({
      title: isBlock ? 'Khóa tài khoản hàng loạt' : 'Kích hoạt tài khoản hàng loạt',
      message: isBlock
        ? `Bạn có chắc muốn khóa ${userIds.length} tài khoản giảng viên đã chọn? Họ sẽ không đăng nhập được cho đến khi mở khóa.`
        : `Bạn có chắc muốn kích hoạt lại ${userIds.length} tài khoản giảng viên đã chọn?`,
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
            ? `Đã khóa ${userIds.length} tài khoản giảng viên`
            : `Đã kích hoạt ${userIds.length} tài khoản giảng viên`
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

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.newTeacherName.set('');
    this.newTeacherEmail.set('');
  }

  createTeacher() {
    if (!this.newTeacherName() || !this.newTeacherEmail()) return;

    this.adminService.createUser({
      username: this.newTeacherEmail().split('@')[0],
      email: this.newTeacherEmail(),
      password: 'Password123!',
      fullName: this.newTeacherName(),
      role: 'TEACHER'
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
      next: () => this.loadUsers()
    });
  }

  // Status action handler — F-U3/F-AD2 security fix: require confirm modal
  // before suspending or activating an account. Cancel → loadUsers() re-fetch
  // reverts the inline-edit dropdown UI to the previous value.
  // Modal copy lives in ConfirmStatusChangeService (DRY — issue #195).
  async onStatusActionChange(user: AdminUser, newStatus: string) {
    if (!newStatus) return;

    const confirmed = await this.confirmStatus.confirm(user, newStatus as UserAccountStatus, 'teacher');
    if (!confirmed) {
      this.loadUsers();
      return;
    }

    this.adminService.updateUserStatus(user.id, {
      status: newStatus as UserAccountStatus,
      reason: ''
    }).subscribe({
      next: () => {
        this.loadUsers();
        this.toast.success('Đã cập nhật trạng thái tài khoản.');
      },
      error: () => {
        // Fallback to toggle if updateUserStatus not implemented
        this.adminService.toggleUserStatus(user.id).subscribe({
          next: () => this.loadUsers(),
          error: () => this.toast.error('Không thể cập nhật trạng thái tài khoản.')
        });
      }
    });
  }

  async deleteUser(userId: string) {
    if (!this.isSystemAdmin()) {
      this.toast.warning('Chỉ quản trị hệ thống mới có thể vô hiệu hóa tài khoản giảng viên.');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Vô hiệu hóa tài khoản',
      message: 'Bạn có chắc muốn vô hiệu hóa tài khoản này?',
      confirmText: 'Vô hiệu hóa',
      variant: 'danger'
    });
    if (!confirmed) return;

    this.adminService.deleteUser(userId).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.toast.error('Không thể vô hiệu hóa: ' + (err.error?.message || 'Vui lòng thử lại'))
    });
  }

  // View managed courses for a teacher (including owned and co-op)
  viewTeacherCourses(teacher: AdminUser) {
    this.selectedTeacher.set(teacher);
    this.teacherCourses.set([]);
    this.coopCourses.set([]);
    this.showCoursesModal.set(true);
    this.isLoadingCourses.set(true);

    // Fetch both owned courses and co-op courses simultaneously
    forkJoin({
      owned: this.adminService.getUserManagedCourses(teacher.id),
      coop: this.adminService.getUserCoopCourses(teacher.id)
    }).subscribe({
      next: ({ owned, coop }) => {
        // Map owned courses
        const mappedOwned = owned.map(c => ({
          id: c.id,
          title: c.title,
          status: c.status?.toLowerCase() || 'draft',
          enrolledCount: c.enrolledCount || 0,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          isOwned: true
        }));

        // Map co-op courses
        const mappedCoop = coop.map(c => ({
          id: c.id,
          title: c.title,
          status: c.status?.toLowerCase() || 'draft',
          enrolledCount: c.enrolledCount || 0,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          teacherName: c.teacherName || 'N/A',
          isOwned: false
        }));

        this.teacherCourses.set(mappedOwned);
        this.coopCourses.set(mappedCoop);
        this.isLoadingCourses.set(false);
      },
      error: () => {
        this.teacherCourses.set([]);
        this.coopCourses.set([]);
        this.isLoadingCourses.set(false);
      }
    });
  }

  closeCoursesModal() {
    this.showCoursesModal.set(false);
    this.selectedTeacher.set(null);
    this.teacherCourses.set([]);
    this.coopCourses.set([]);
  }

  /**
   * Open course in teacher editor for FULL content view
   * This provides 100% course details: chapters, lessons, students, quiz, etc.
   */
  openFullCourseView(courseId: string): void {
    if (this.isSystemAdmin()) {
      window.open(`/teacher/courses/${courseId}/editor`, '_blank');
      return;
    }

    window.open(`${getAdminPortalBase(this.authService.userRole())}/courses/${courseId}/preview`, '_blank');
  }

  /**
   * Approve a pending course
   */
  async approveCourse(courseId: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Phê duyệt khóa học',
      message: 'Bạn có chắc muốn phê duyệt khóa học này?',
      confirmText: 'Phê duyệt',
      variant: 'warning'
    });
    if (!confirmed) return;

    this.adminService.approveCourse(courseId).subscribe({
      next: () => {
        const courses = this.teacherCourses();
        const updatedCourses = courses.map(c =>
          c.id === courseId ? { ...c, status: 'PUBLISHED' } : c
        );
        this.teacherCourses.set(updatedCourses);
        this.toast.success('Đã phê duyệt khóa học thành công');
      },
      error: (err) => {
        this.toast.error('Lỗi khi phê duyệt: ' + (err.error?.message || 'Vui lòng thử lại'));
      }
    });
  }

  /**
   * Reject a pending course - uses reject reason signal + modal pattern
   */
  rejectReasonInput = signal('');
  showRejectCourseModal = signal(false);
  rejectingCourseId = signal('');

  openRejectCourseModal(courseId: string): void {
    this.rejectingCourseId.set(courseId);
    this.rejectReasonInput.set('');
    this.showRejectCourseModal.set(true);
  }

  closeRejectCourseModal(): void {
    this.showRejectCourseModal.set(false);
    this.rejectingCourseId.set('');
    this.rejectReasonInput.set('');
  }

  confirmRejectCourse(): void {
    const reason = this.rejectReasonInput();
    const courseId = this.rejectingCourseId();
    if (!reason.trim()) {
      this.toast.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    this.adminService.rejectCourse(courseId, reason).subscribe({
      next: () => {
        const courses = this.teacherCourses();
        const updatedCourses = courses.map(c =>
          c.id === courseId ? { ...c, status: 'REJECTED' } : c
        );
        this.teacherCourses.set(updatedCourses);
        this.closeRejectCourseModal();
        this.toast.success('Đã từ chối khóa học');
      },
      error: (err) => {
        this.toast.error('Lỗi khi từ chối: ' + (err.error?.message || 'Vui lòng thử lại'));
      }
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
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=9333ea&color=fff`;
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
