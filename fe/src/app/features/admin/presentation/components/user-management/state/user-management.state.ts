import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService, AdminUser, CreateUserRequest, UpdateUserRequest } from '../../../../infrastructure/services/admin.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../../../core/services/auth.service';

export interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
}

export interface BulkImportProgress {
  isImporting: boolean;
  progress: number;
  currentStep: string;
  result?: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    errors: string[];
  };
}

/**
 * Signal-based State Management for User Management
 * Extracted from user-management.component.ts (975 LOC)
 */
@Injectable()
export class UserManagementState {
  private adminService = inject(AdminService);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private authService = inject(AuthService);

  // All role options
  private readonly ALL_ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Quản trị hệ thống' },
    { value: 'ORG_ADMIN', label: 'Chuyên viên quản lý' },
    { value: 'TEACHER', label: 'Giảng viên' },
    { value: 'STUDENT', label: 'Học viên' }
  ] as const;

  // Role options filtered by current user's role
  // ORG_ADMIN can only create/assign TEACHER and STUDENT
  get ROLE_OPTIONS() {
    if (this.authService.userRole() === 'org_admin') {
      return this.ALL_ROLE_OPTIONS.filter(r => r.value === 'TEACHER' || r.value === 'STUDENT');
    }
    return this.ALL_ROLE_OPTIONS;
  }

  // Filter states
  searchQuery = signal('');
  roleFilter = signal('');
  statusFilter = signal('');
  fromDate = signal('');
  toDate = signal('');

  // Modal states
  showCreateModal = signal(false);
  isEditModalOpen = signal(false);
  isBulkImportModalOpen = signal(false);

  // Create user form
  newUserName = signal('');
  newUserEmail = signal('');
  newUserRole = signal('');

  // Edit user form
  editingUserId = signal('');
  editingUserName = signal('');
  editingUserEmail = signal('');
  editingUserRole = signal('');

  // Bulk import
  selectedFile = signal<File | null>(null);
  defaultImportRole = signal('STUDENT');
  bulkImportProgress = signal<BulkImportProgress>({
    isImporting: false,
    progress: 0,
    currentStep: '',
    result: undefined
  });

  // Pagination
  currentPage = signal(1);
  pagination = signal<PaginationInfo | null>(null);

  // Users data
  private _localUsers = signal<AdminUser[]>([]);

  // Loading states
  isLoadingUsers = signal(false);
  isDeletingUser = signal(false);

  // Role checks
  /** True if current user is ADMIN (not ORG_ADMIN) */
  readonly isSystemAdmin = computed(() => this.authService.userRole() === 'admin');

  /** ORG_ADMIN cannot delete users (ADMIN-only backend endpoint) */
  canDeleteUser(user: AdminUser): boolean {
    return this.isSystemAdmin();
  }

  /** ORG_ADMIN cannot change status of ADMIN/ORG_ADMIN users */
  canChangeStatus(user: AdminUser): boolean {
    if (this.isSystemAdmin()) return true;
    const role = user.role?.toUpperCase();
    return role !== 'ADMIN' && role !== 'ORG_ADMIN';
  }

  /** ORG_ADMIN cannot change role of ADMIN/ORG_ADMIN users */
  canChangeRole(user: AdminUser): boolean {
    if (this.isSystemAdmin()) return true;
    const role = user.role?.toUpperCase();
    return role !== 'ADMIN' && role !== 'ORG_ADMIN';
  }

  // Computed - Stats
  totalUsers = computed(() => this._localUsers().length);
  totalTeachers = computed(() => this._localUsers().filter(u => u.role === 'TEACHER').length);
  totalStudents = computed(() => this._localUsers().filter(u => u.role === 'STUDENT').length);
  totalAdmins = computed(() => this._localUsers().filter(u => u.role === 'ADMIN' || u.role === 'ORG_ADMIN').length);
  activeUsers = computed(() => this._localUsers().filter(u => u.accountStatus === 'ACTIVE').length);

  // Computed - Filtered users
  filteredUsers = computed(() => {
    let users = this._localUsers();

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      users = users.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    if (this.roleFilter()) {
      users = users.filter(user => user.role === this.roleFilter());
    }

    if (this.statusFilter()) {
      const isActive = this.statusFilter() === 'active';
      users = users.filter(user => user.isActive === isActive);
    }

    return users;
  });

  // Load users
  loadUsers(page: number = 1, limit: number = 10): void {
    this.currentPage.set(page);
    this.isLoadingUsers.set(true);

    const params: any = { page, limit };
    if (this.searchQuery()) params.search = this.searchQuery();
    if (this.roleFilter()) params.role = this.roleFilter();
    if (this.statusFilter()) params.status = this.statusFilter();
    // Note: fromDate/toDate not supported by UserControllerV3 backend — filtered client-side


    this.adminService.getUsers(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const normalizedUsers = (response.data || []).map((user: any) => ({
            ...user,
            role: user.role?.toUpperCase() || user.role
          }));

          this._localUsers.set(normalizedUsers);

          if (response.pagination) {
            this.pagination.set({
              page: response.pagination.page || page,
              limit: response.pagination.limit || limit,
              totalItems: response.pagination.totalItems || 0,
              totalPages: response.pagination.totalPages || 1,
              first: page === 1,
              last: page === (response.pagination.totalPages || 1)
            });
          }

          this.isLoadingUsers.set(false);
        },
        error: () => {
          this.isLoadingUsers.set(false);
          this.toastService.error('Không thể tải danh sách người dùng. Vui lòng thử lại.');
        }
      });
  }

  // Search and filter
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.loadUsers(1);
  }

  onRoleFilterChange(value: string): void {
    this.roleFilter.set(value);
    this.loadUsers(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.loadUsers(1);
  }

  onFromDateChange(value: string): void {
    this.fromDate.set(value);
    this.loadUsers(1);
  }

  onToDateChange(value: string): void {
    this.toDate.set(value);
    this.loadUsers(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('');
    this.statusFilter.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.loadUsers(1);
  }

  // Pagination
  goToPage(page: number): void {
    const paginationInfo = this.pagination();
    if (page >= 1 && page <= (paginationInfo?.totalPages || 1)) {
      this.loadUsers(page);
    }
  }

  getVisiblePages(): number[] {
    const paginationInfo = this.pagination();
    if (!paginationInfo) return [];

    const currentPage = paginationInfo.page;
    const totalPages = paginationInfo.totalPages;
    const pages: number[] = [];

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Create User
  openCreateUserModal(): void {
    this.showCreateModal.set(true);
    this.newUserName.set('');
    this.newUserEmail.set('');
    this.newUserRole.set('');
  }

  closeCreateUserModal(): void {
    this.showCreateModal.set(false);
  }

  createUser(): void {
    if (!this.newUserName() || !this.newUserEmail() || !this.newUserRole()) {
      return;
    }

    const request: CreateUserRequest = {
      username: this.newUserEmail().split('@')[0],
      email: this.newUserEmail(),
      password: 'Password123!',
      fullName: this.newUserName(),
      role: this.newUserRole() as 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT'
    };

    this.adminService.createUser(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.closeCreateUserModal();
          this.loadUsers(this.currentPage());
          this.toastService.success('Người dùng đã được tạo thành công!');
        },
        error: () => {
          this.toastService.error('Không thể tạo người dùng. Vui lòng thử lại.');
        }
      });
  }

  // Edit User
  editUser(user: AdminUser): void {
    this.editingUserId.set(user.id);
    this.editingUserName.set(user.name);
    this.editingUserEmail.set(user.email);
    this.editingUserRole.set(user.role);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  saveUserEdit(): void {
    const userId = this.editingUserId();
    if (!userId) return;

    const request: UpdateUserRequest = {
      email: this.editingUserEmail(),
      fullName: this.editingUserName(),
      role: this.editingUserRole() as 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT'
    };

    this.adminService.updateUser(userId, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.closeEditModal();
          this.loadUsers(this.currentPage());
          this.toastService.success('Người dùng đã được cập nhật thành công!');
        },
        error: () => {
          this.toastService.error('Không thể cập nhật người dùng. Vui lòng thử lại.');
        }
      });
  }

  // Delete User
  async deleteUser(userId: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Vô hiệu hóa người dùng',
      message: 'Bạn có chắc chắn muốn vô hiệu hóa người dùng này?',
      confirmText: 'Vô hiệu hóa',
      variant: 'danger'
    });
    if (!confirmed) return;

    this.isDeletingUser.set(true);

    this.adminService.deleteUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const currentFilteredCount = this.filteredUsers().length;
          const paginationInfo = this.pagination();

          let targetPage = this.currentPage();
          if (currentFilteredCount === 1 && paginationInfo && paginationInfo.page > 1) {
            targetPage = paginationInfo.page - 1;
          }

          this.loadUsers(targetPage);
          this.isDeletingUser.set(false);
          this.toastService.success('Người dùng đã được vô hiệu hóa');
        },
        error: () => {
          this.isDeletingUser.set(false);
          this.toastService.error('Không thể vô hiệu hóa người dùng. Vui lòng thử lại.');
        }
      });
  }

  // Role Change
  async onRoleChange(userId: string, oldRole: string, newRole: string): Promise<void> {
    if (oldRole === newRole) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Thay đổi vai trò',
      message: `Bạn có chắc chắn muốn thay đổi vai trò người dùng thành ${this.getRoleText(newRole)}?`,
      confirmText: 'Thay đổi',
      variant: 'warning'
    });
    if (!confirmed) {
      this.revertUserRole(userId, oldRole);
      return;
    }

    this.adminService.updateUser(userId, { role: newRole as 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success(`Vai trò đã được thay đổi thành ${this.getRoleText(newRole)} thành công!`);
          this.updateUserRoleInList(userId, newRole);
        },
        error: () => {
          this.toastService.error('Không thể thay đổi vai trò. Vui lòng thử lại.');
          this.revertUserRole(userId, oldRole);
        }
      });
  }

  private revertUserRole(userId: string, oldRole: string): void {
    const users = this._localUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx > -1) {
      users[idx] = { ...users[idx], role: oldRole };
      this._localUsers.set([...users]);
    }
  }

  private updateUserRoleInList(userId: string, newRole: string): void {
    const users = this._localUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx > -1) {
      users[idx] = { ...users[idx], role: newRole };
      this._localUsers.set([...users]);
    }
  }

  // Bulk Import
  openBulkImportModal(): void {
    this.isBulkImportModalOpen.set(true);
    this.selectedFile.set(null);
    this.defaultImportRole.set('STUDENT');
    this.bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: '',
      result: undefined
    });
  }

  closeBulkImportModal(): void {
    this.isBulkImportModalOpen.set(false);
    this.selectedFile.set(null);
    this.bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: '',
      result: undefined
    });
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

  // Toggle user status
  toggleUserStatus(userId: string): void {
    this.adminService.toggleUserStatus(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadUsers(this.currentPage());
        },
        error: () => {
          this.toastService.error('Không thể thay đổi trạng thái người dùng. Vui lòng thử lại.');
        }
      });
  }

  // Helper methods
  getRoleText(role: string): string {
    return this.ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ORG_ADMIN': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'TEACHER': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'STUDENT': return 'bg-[#0056D2]/5 text-[#004BB5] border-[#0056D2]/20';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-50 text-green-700 border border-green-200';
      case 'BLOCKED': return 'bg-red-50 text-red-700 border border-red-200';
      case 'RESTRICTED': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'BLOCKED': return 'bg-red-500';
      case 'RESTRICTED': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'Hoạt động';
      case 'BLOCKED': return 'Đã khóa';
      case 'RESTRICTED': return 'Hạn chế';
      default: return 'Không xác định';
    }
  }

  getDefaultAvatar(email: string): string {
    const name = email.split('@')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0056D2&color=ffffff&size=150`;
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
}
