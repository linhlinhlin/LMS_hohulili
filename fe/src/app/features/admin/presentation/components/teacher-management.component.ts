import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService, AdminUser, UserAccountStatus, UpdateUserStatusRequest } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Teacher Management Component
 * SOTA: Coursera-inspired design with role change, status actions, and course statistics
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-teacher-management',
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
  templateUrl: './teacher-management.html'
})
export class TeacherManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private authService = inject(AuthService);

  isSystemAdmin = computed(() => this.authService.userRole() === 'admin');

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
    this.adminService.getUsers({ page: 0, size: 200, role: 'TEACHER' }).subscribe({
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

  // Status action handler
  onStatusActionChange(user: AdminUser, newStatus: string) {
    if (!newStatus) return;

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
    window.open(`/teacher/courses/${courseId}/editor`, '_blank');
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

  getDefaultAvatar(email: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=9333ea&color=fff`;
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

