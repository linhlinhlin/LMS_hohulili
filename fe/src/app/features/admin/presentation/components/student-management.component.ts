import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, UserAccountStatus, UpdateUserStatusRequest } from '../../infrastructure/services/admin.service';

/**
 * Student Management Component
 * SOTA: Coursera-inspired design with role change, status actions, and course statistics
 */
@Component({
  selector: 'app-student-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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

  // State
  allUsers = signal<AdminUser[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  statusFilter = signal('');
  showCreateModal = signal(false);
  newStudentName = signal('');
  newStudentEmail = signal('');

  // Courses modal state
  showCoursesModal = signal(false);
  selectedStudent = signal<AdminUser | null>(null);
  studentCourses = signal<any[]>([]);
  isLoadingCourses = signal(false);

  // Computed - filter for students (UserRole.STUDENT = 'student')
  studentUsers = computed(() => this.allUsers().filter(u => u.role === 'student'));

  filteredStudents = computed(() => {
    let students = this.studentUsers();
    const query = this.searchQuery().toLowerCase();
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
  totalStudents = computed(() => this.studentUsers().length);
  activeStudents = computed(() => this.studentUsers().filter(s => s.accountStatus === 'ACTIVE').length);
  blockedStudents = computed(() => this.studentUsers().filter(s => s.accountStatus === 'BLOCKED').length);
  totalEnrollments = computed(() => this.studentUsers().reduce((sum, s) => sum + (s.coursesEnrolled || 0), 0));
  newThisWeek = computed(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.studentUsers().filter(s => s.createdAt && new Date(s.createdAt) > weekAgo).length;
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
  onRoleChange(userId: string, newRole: string) {
    if (!confirm(`Báº¡n cĂ³ cháº¯c muá»‘n thay Ä‘á»•i vai trĂ² ngÆ°á»i dĂ¹ng nĂ y thĂ nh ${this.getRoleLabel(newRole)}?`)) {
      this.loadUsers(); // Reload to reset dropdown
      return;
    }

    this.adminService.updateUser(userId, { role: newRole as 'ADMIN' | 'TEACHER' | 'STUDENT' }).subscribe({
      next: () => this.loadUsers()
    });
  }

  // Status action handler
  onStatusActionChange(user: AdminUser, newStatus: string) {
    if (!newStatus) return;

    const statusLabel = this.getStatusLabel(newStatus);
    const reason = prompt(`Nháº­p lĂ½ do ${statusLabel.toLowerCase()} tĂ i khoáº£n (tĂ¹y chá»n):`);

    this.adminService.updateUserStatus(user.id, {
      status: newStatus as UserAccountStatus,
      reason: reason || ''
    }).subscribe({
      next: () => this.loadUsers(),
      error: () => {
        // Fallback to toggle if updateUserStatus not implemented
        this.adminService.toggleUserStatus(user.id).subscribe({
          next: () => this.loadUsers()
        });
      }
    });
  }

  deleteUser(userId: string) {
    if (!confirm('Báº¡n cĂ³ cháº¯c muá»‘n vĂ´ hiá»‡u hĂ³a tĂ i khoáº£n nĂ y?')) return;

    this.adminService.deleteUser(userId).subscribe({
      next: () => this.loadUsers()
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
        const mappedCourses = courses.map(c => ({
          id: c.id,
          title: c.title,
          progress: 0, // Progress not available from this endpoint
          enrolledAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          status: c.status
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
    window.open(`/teacher/courses/${courseId}/editor`, '_blank');
  }

  // Helpers
  getRoleValue(role: string): string {
    return role.toUpperCase();
  }

  getRoleLabel(role: string): string {
    switch (role.toUpperCase()) {
      case 'ADMIN': return 'Quáº£n trá»‹ viĂªn';
      case 'TEACHER': return 'Giáº£ng viĂªn';
      case 'STUDENT': return 'Há»c viĂªn';
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
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=4f46e5&color=fff`;
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
      case 'ACTIVE': return 'Hoáº¡t Ä‘á»™ng';
      case 'BLOCKED': return 'Bá»‹ khĂ³a';
      case 'RESTRICTED': return 'Háº¡n cháº¿';
      default: return 'Chá» xĂ¡c thá»±c';
    }
  }
}

