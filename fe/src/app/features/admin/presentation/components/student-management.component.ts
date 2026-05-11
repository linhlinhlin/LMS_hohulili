import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, UserAccountStatus, UpdateUserStatusRequest } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ConfirmStatusChangeService } from '../../services/confirm-status-change.service';
import { AuthService } from '../../../../core/services/auth.service';
import { getAdminPortalBase } from '../../../../core/utils/portal-route.util';
import { forkJoin } from 'rxjs';
import { KpiCardComponent } from '../../../../shared/components/admin/kpi-card/kpi-card.component';
import { BulkActionBarComponent, BulkAction } from '../../../../shared/components/admin/bulk-action-bar/bulk-action-bar.component';
import { KebabMenuComponent, KebabAction } from '../../../../shared/components/admin/kebab-menu/kebab-menu.component';
import { initialsAvatar } from '../../../../shared/utils/avatar.util';
import { formatRelativeTimeVN } from '../../../../shared/utils/relative-time.util';

/**
 * Student Management Component
 * SOTA: Coursera-inspired design with role change, status actions, and course statistics
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-student-management',
  imports: [RouterModule, FormsModule, KpiCardComponent, BulkActionBarComponent, KebabMenuComponent],
  // F-ST1 hotfix: was missing — main SCSS file never loaded so .stat-icon
  // had no width/height constraint and stretched to 1136×1136, making the
  // page unusable. Mirrors teacher-management.component.ts:20.
  styleUrl: './student-management.component.scss',
  styles: [`
    select.role-select {
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
      appearance: auto;
    }
    select.role-select:hover { border-color: #9CA3AF; }
  `],
  templateUrl: './student-management.component.html'
})
export class StudentManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private confirmStatus = inject(ConfirmStatusChangeService);
  private authService = inject(AuthService);
  private loadRequestId = 0;

  isSystemAdmin = computed(() => this.authService.userRole() === 'admin');
  courseSearchRoute = computed(() => `${getAdminPortalBase(this.authService.userRole())}/courses`);
  pageTitle = computed(() => this.isSystemAdmin() ? 'Quản lý Học viên' : 'Học viên của tổ chức');
  pageSubtitle = computed(() =>
    this.isSystemAdmin()
      ? 'Quản lý các tài khoản học viên trong hệ thống'
      : 'Quản lý các tài khoản học viên thuộc tổ chức của bạn'
  );

  // State
  allUsers = signal<AdminUser[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  statusFilter = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  readonly pageSize = 12;
  showCreateModal = signal(false);
  newStudentName = signal('');
  newStudentEmail = signal('');

  // Courses modal state
  showCoursesModal = signal(false);
  selectedStudent = signal<AdminUser | null>(null);
  studentCourses = signal<any[]>([]);
  isLoadingCourses = signal(false);

  // Bulk selection state — CC-06.
  selectedUserIds = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selectedUserIds().size);

  bulkActions = computed<BulkAction[]>(() => [
    {
      key: 'block',
      label: 'Khóa',
      variant: 'danger',
      ariaLabel: 'Khóa các tài khoản học viên đã chọn',
      icon: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
    },
    {
      key: 'activate',
      label: 'Kích hoạt',
      ariaLabel: 'Kích hoạt các tài khoản học viên đã chọn',
      icon: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
    },
  ]);

  // Computed - filter for students (UserRole.STUDENT = 'student')
  studentUsers = computed(() => this.allUsers().filter(u => u.role === 'student'));

  filteredStudents = computed(() => {
    let students = this.studentUsers();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    if (query) {
      students = students.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    }

    if (status) {
      students = students.filter(s => s.accountStatus === status);
    }

    return students;
  });

  // Stats
  totalStudents = computed(() => this.totalItems());
  activeStudents = computed(() => this.studentUsers().filter(s => s.accountStatus === 'ACTIVE').length);
  blockedStudents = computed(() => this.studentUsers().filter(s => s.accountStatus === 'BLOCKED').length);
  totalEnrollments = computed(() => this.studentUsers().reduce((sum, s) => sum + (s.coursesEnrolled || 0), 0));
  newThisWeek = computed(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.studentUsers().filter(s => s.createdAt && new Date(s.createdAt) > weekAgo).length;
  });

  ngOnInit() {
    this.loadUsers(1);
  }

  loadUsers(page = this.currentPage()) {
    this.isLoading.set(true);
    const requestId = ++this.loadRequestId;
    const params: any = { page, limit: this.pageSize, role: 'STUDENT' };
    const search = this.searchQuery().trim();
    if (search) params.search = search;
    if (this.statusFilter()) params.status = this.statusFilter();

    this.adminService.getUsers(params).subscribe({
      next: (response) => {
        if (requestId !== this.loadRequestId) return;
        this.allUsers.set(response.data || []);
        this.currentPage.set(response.pagination?.page ?? page);
        this.totalPages.set(Math.max(1, response.pagination?.totalPages ?? 1));
        this.totalItems.set(response.pagination?.totalItems ?? response.data?.length ?? 0);
        this.clearSelection();
        this.isLoading.set(false);
      },
      error: () => {
        if (requestId !== this.loadRequestId) return;
        this.isLoading.set(false);
      }
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
    const visibleIds = this.filteredStudents().map(s => s.id);
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
    const visible = this.filteredStudents();
    if (visible.length === 0) return false;
    const selected = this.selectedUserIds();
    return visible.every(s => selected.has(s.id));
  });

  clearSelection(): void {
    this.selectedUserIds.set(new Set());
  }

  paginationPages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: number[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) pages.push(-1);
    for (let page = start; page <= end; page++) pages.push(page);
    if (end < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  });

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.loadUsers(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pageStart(): number {
    if (this.totalItems() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  }

  pageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.totalItems());
  }

  // --- Per-row kebab menu (CC-10) ---
  // Replaces inline `<select>` Trạng thái + Vô hiệu hóa icon button.
  // Status pill stays as a read-only badge in its own column.
  rowActions(student: AdminUser): KebabAction[] {
    const status = student.accountStatus;
    const items: KebabAction[] = [];

    if (status !== 'ACTIVE') {
      items.push({
        key: 'status:ACTIVE',
        label: 'Kích hoạt',
        ariaLabel: `Kích hoạt tài khoản ${student.name}`,
        icon: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      });
    }
    if (status !== 'BLOCKED') {
      items.push({
        key: 'status:BLOCKED',
        label: 'Khóa',
        variant: 'danger',
        ariaLabel: `Khóa tài khoản ${student.name}`,
        icon: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
      });
    }
    if (status !== 'RESTRICTED') {
      items.push({
        key: 'status:RESTRICTED',
        label: 'Hạn chế',
        ariaLabel: `Hạn chế tài khoản ${student.name}`,
        icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
      });
    }
    if (this.isSystemAdmin()) {
      items.push({
        key: 'delete',
        label: 'Vô hiệu hóa tài khoản',
        variant: 'danger',
        ariaLabel: `Vô hiệu hóa tài khoản ${student.name}`,
        icon: 'M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z',
      });
    }

    return items;
  }

  onRowAction(student: AdminUser, key: string): void {
    if (key === 'delete') {
      this.deleteUser(student.id);
      return;
    }
    if (key.startsWith('status:')) {
      this.onStatusActionChange(student, key.slice('status:'.length));
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
        ? `Bạn có chắc muốn khóa ${userIds.length} tài khoản học viên đã chọn? Họ sẽ không đăng nhập được cho đến khi mở khóa.`
        : `Bạn có chắc muốn kích hoạt lại ${userIds.length} tài khoản học viên đã chọn?`,
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
            ? `Đã khóa ${userIds.length} tài khoản học viên`
            : `Đã kích hoạt ${userIds.length} tài khoản học viên`
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
    this.loadUsers(1);
  }

  onStatusFilterChange(value: string) {
    this.statusFilter.set(value);
    this.loadUsers(1);
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.newStudentName.set('');
    this.newStudentEmail.set('');
  }

  createStudent() {
    if (!this.newStudentName() || !this.newStudentEmail()) return;

    this.adminService.createUser({
      username: this.newStudentEmail().split('@')[0],
      email: this.newStudentEmail(),
      password: 'Password123!',
      fullName: this.newStudentName(),
      role: 'STUDENT'
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

  // Status action handler — F-U3 security fix: require confirm modal before
  // suspending or activating an account. Cancel → loadUsers() re-fetch reverts
  // the inline-edit dropdown UI.
  // Modal copy lives in ConfirmStatusChangeService (DRY — issue #195).
  async onStatusActionChange(user: AdminUser, newStatus: string) {
    if (!newStatus) return;

    const confirmed = await this.confirmStatus.confirm(user, newStatus as UserAccountStatus, 'student');
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

  async deleteUser(userId: string) {
    if (!this.isSystemAdmin()) {
      this.toast.warning('Chỉ quản trị hệ thống mới có thể vô hiệu hóa tài khoản học viên.');
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

  // View enrolled courses for a student
  viewStudentCourses(student: AdminUser) {
    this.selectedStudent.set(student);
    this.studentCourses.set([]);
    this.showCoursesModal.set(true);
    this.isLoadingCourses.set(true);

    // Call real API to get enrolled courses
    this.adminService.getUserEnrolledCourses(student.id).subscribe({
      next: (courses) => {
        // Map to simpler format for display
        const mappedCourses = courses.map((c: any) => ({
          id: c.id,
          title: c.title,
          progress: c.completionPercent ?? 0,
          enrolledAt: c.enrolledAt ? new Date(c.enrolledAt) : (c.createdAt ? new Date(c.createdAt) : new Date()),
          status: c.status,
          enrollmentStatus: c.enrollmentStatus
        }));
        this.studentCourses.set(mappedCourses);
        this.isLoadingCourses.set(false);
      },
      error: () => {
        this.studentCourses.set([]);
        this.isLoadingCourses.set(false);
      }
    });
  }

  closeCoursesModal() {
    this.showCoursesModal.set(false);
    this.selectedStudent.set(null);
    this.studentCourses.set([]);
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
    return initialsAvatar(email, '#4f46e5', '#ffffff');
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

  formatRelativeTime(input: Date | string | null | undefined): string {
    return formatRelativeTimeVN(input);
  }

  formatExactDateTime(input: Date | string | null | undefined): string | null {
    if (!input) {
      return null;
    }

    const date = typeof input === 'string' ? new Date(input) : input;
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
