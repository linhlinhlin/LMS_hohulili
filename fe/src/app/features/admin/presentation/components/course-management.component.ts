import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminCourseSummary } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-course-management',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './course-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementComponent implements OnInit {
  protected adminService = inject(AdminService);

  // Filter states
  searchQuery = signal('');
  statusFilter = signal('');
  // Data signals
  courses = signal<AdminCourseSummary[]>([]);
  isLoading = signal(true);
  categoryFilter = signal('');

  // Modal state
  showRejectModal = signal(false);
  showDetailModal = signal(false);
  selectedCourse = signal<AdminCourseSummary | null>(null);
  rejectionReason = signal('');

  // Computed properties
  totalCourses = computed(() => {
    const courses = this.courses();
    return Array.isArray(courses) ? courses.length : 0;
  });

  pendingCourses = computed(() => {
    const courses = this.courses();
    return Array.isArray(courses) ? courses.filter(c => c.status === 'pending' || c.status === 'PENDING').length : 0;
  });

  approvedCourses = computed(() => {
    const courses = this.courses();
    return Array.isArray(courses) ? courses.filter(c => c.status === 'approved' || c.status === 'APPROVED').length : 0;
  });

  totalRevenue = computed(() => {
    const courses = this.courses();
    if (!Array.isArray(courses)) return 0;
    return courses.reduce((sum, c) => sum + (c.revenue || 0), 0);
  });

  filteredCourses = computed(() => {
    const courses = this.courses();

    // Safety check: ensure courses is an array
    if (!Array.isArray(courses)) {
      console.warn('[CourseManagement] courses is not an array:', courses);
      return [];
    }

    let filtered = [...courses];

    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter((course: AdminCourseSummary) =>
        course.title?.toLowerCase().includes(query) ||
        course.teacherName?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (this.statusFilter()) {
      const status = this.statusFilter().toUpperCase();
      filtered = filtered.filter((course: AdminCourseSummary) =>
        course.status?.toUpperCase() === status
      );
    }

    // Filter by category
    if (this.categoryFilter()) {
      filtered = filtered.filter((course: AdminCourseSummary) =>
        course.category?.toLowerCase() === this.categoryFilter().toLowerCase()
      );
    }

    return filtered;
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  private loadCourses(): void {
    console.log('[CourseManagement] Loading courses...');
    this.isLoading.set(true);

    this.adminService.getAllCourses().subscribe({
      next: (response) => {
        console.log('[CourseManagement] Courses loaded:', response);

        // Ensure we have an array
        const coursesData = Array.isArray(response.data) ? response.data : [];
        console.log('[CourseManagement] Setting courses:', coursesData.length, 'items');

        this.courses.set(coursesData);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('[CourseManagement] Error loading courses:', error);
        this.courses.set([]); // Set empty array on error
        this.isLoading.set(false);
        alert('KhĂ´ng thá»ƒ táº£i danh sĂ¡ch khĂ³a há»c. Vui lĂ²ng thá»­ láº¡i.');
      }
    });
  }

  approveCourse(courseId: string): void {
    this.adminService.approveCourse(courseId).subscribe({
      next: () => {
        // Reload courses after approval
        this.loadCourses();
      },
      error: (error) => {
        console.error('Error approving course:', error);
      }
    });
  }

  openRejectModal(course: AdminCourseSummary): void {
    this.selectedCourse.set(course);
    this.showRejectModal.set(true);
    this.rejectionReason.set('');
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.selectedCourse.set(null);
    this.rejectionReason.set('');
  }

  rejectCourse(): void {
    if (this.selectedCourse() && this.rejectionReason()) {
      this.adminService.rejectCourse(this.selectedCourse()!.id, this.rejectionReason()).subscribe({
        next: () => {
          this.closeRejectModal();
          this.loadCourses();
        },
        error: (error) => {
          console.error('Error rejecting course:', error);
        }
      });
    }
  }

  viewCourse(courseId: string): void {
    console.log('đŸ” viewCourse called with ID:', courseId);
    console.log('đŸ“ All courses:', this.courses());
    const course = this.courses().find(c => c.id === courseId);
    console.log('âœ… Found course:', course);
    if (course) {
      this.selectedCourse.set(course);
      this.showDetailModal.set(true);
      console.log('đŸ¯ Modal should show now. showDetailModal:', this.showDetailModal());
    } else {
      console.error('âŒ Course not found with ID:', courseId);
    }
  }

  /**
   * Open course in teacher editor for FULL content view
   * This provides 100% course details: chapters, lessons, students, quiz, etc.
   */
  openFullCourseView(courseId: string): void {
    // Navigate to teacher course editor which has ALL course content
    window.open(`/teacher/courses/${courseId}/editor`, '_blank');
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCourse.set(null);
  }

  editCourse(courseId: string): void {
    // Navigate to teacher course editor
    window.open(`/teacher/courses/${courseId}/edit`, '_blank');
  }

  formatDate(date: string | Date): string {
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

  getStatusClass(status: string): string {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return 'Chá» phĂª duyá»‡t';
      case 'approved':
        return 'ÄĂ£ phĂª duyá»‡t';
      case 'rejected':
        return 'Bá»‹ tá»« chá»‘i';
      case 'active':
        return 'Äang hoáº¡t Ä‘á»™ng';
      case 'archived':
        return 'LÆ°u trá»¯';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  getLevelText(level: string): string {
    switch (level) {
      case 'beginner':
        return 'CÆ¡ báº£n';
      case 'intermediate':
        return 'Trung cáº¥p';
      case 'advanced':
        return 'NĂ¢ng cao';
      default:
        return 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
    }
  }

  // Helper methods for status checking (handles various status naming conventions)
  isPendingStatus(status: string): boolean {
    const s = status?.toUpperCase() || '';
    return s === 'PENDING' || s === 'PENDING_APPROVAL' || s === 'PENDING_REVIEW';
  }

  isApprovedStatus(status: string): boolean {
    const s = status?.toUpperCase() || '';
    return s === 'APPROVED' || s === 'ACTIVE' || s === 'PUBLISHED';
  }

  revokeCourse(courseId: string): void {
    const reason = window.prompt('Nháº­p lĂ½ do thu há»“i phĂª duyá»‡t:', 'Cáº§n xem xĂ©t láº¡i ná»™i dung khĂ³a há»c');
    if (reason) {
      this.adminService.revokeCourse(courseId, reason).subscribe({
        next: () => {
          alert('ÄĂ£ thu há»“i phĂª duyá»‡t khĂ³a há»c');
          this.loadCourses();
        },
        error: (error) => {
          console.error('Error revoking course:', error);
          alert('Lá»—i khi thu há»“i phĂª duyá»‡t: ' + (error.error?.message || error.message || 'KhĂ´ng xĂ¡c Ä‘á»‹nh'));
        }
      });
    }
  }
}

