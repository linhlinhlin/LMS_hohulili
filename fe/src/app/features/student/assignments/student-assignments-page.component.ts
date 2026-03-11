import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StudentAssignmentService, StudentAssignment, StudentTaskStatus } from '../services/student-assignment.service';
import {
  GroupedAssignments,
  AssignmentStats,
  AssignmentFilters,
  groupTasksByStatus,
  filterAssignments,
  calculateStats,
  formatDeadline,
  formatDeadlineWithExtension,
  getStatusBadge,
  getStatusClass,
  getDeadlineUrgencyClass,
  sortByDueDate,
  getUniqueCourses,
} from './utils/assignment-utils';

/**
 * Student Assignments Page Component
 *
 * Trang hợp nhất hiển thị tất cả bài tập được giao cho học viên.
 * Hỗ trợ 2 chế độ xem: Kanban và List
 * Kết nối với API thực thông qua StudentAssignmentService
 *
 * @requirements 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1-4.5, 5.1-5.4, 6.1-6.4, 7.1-7.3
 */
@Component({
  selector: 'app-student-assignments-page',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-assignments-page.component.html',
})
export class StudentAssignmentsPageComponent implements OnInit {
  private authService = inject(AuthService);
  private assignmentService = inject(StudentAssignmentService);

  // State
  allAssignments = signal<StudentAssignment[]>([]);
  courses = signal<{ id: string; title: string }[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  viewMode = signal<'kanban' | 'list'>('kanban');

  // Filters
  selectedCourse = '';
  selectedStatus: StudentTaskStatus | '' = '';
  searchQuery = '';

  // Computed
  filteredAssignments = computed(() => {
    const filters: AssignmentFilters = {};
    
    if (this.selectedCourse) {
      filters.courseId = this.selectedCourse;
    }
    if (this.selectedStatus) {
      filters.status = this.selectedStatus as StudentTaskStatus;
    }
    if (this.searchQuery) {
      filters.searchQuery = this.searchQuery;
    }

    const filtered = filterAssignments(this.allAssignments(), filters);
    return sortByDueDate(filtered);
  });

  groupedAssignments = computed(() => {
    return groupTasksByStatus(this.filteredAssignments());
  });

  stats = computed(() => {
    return calculateStats(this.filteredAssignments());
  });

  ngOnInit(): void {
    this.loadViewPreference();
    this.loadAssignments();
  }

  loadAssignments(): void {
    const user = this.authService.user();
    if (!user?.id) {
      this.error.set('Không thể xác định người dùng');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.assignmentService.getStudentAssignments(user.id).subscribe({
      next: (assignments) => {
        this.allAssignments.set(assignments);
        this.courses.set(getUniqueCourses(assignments));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Không thể tải danh sách bài tập. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    // Filters are reactive via computed signals
  }

  resetFilters(): void {
    this.selectedCourse = '';
    this.selectedStatus = '';
    this.searchQuery = '';
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedCourse || this.selectedStatus || this.searchQuery);
  }

  setViewMode(mode: 'kanban' | 'list'): void {
    this.viewMode.set(mode);
    this.saveViewPreference(mode);
  }

  private loadViewPreference(): void {
    const saved = localStorage.getItem('student-assignments-view');
    if (saved === 'kanban' || saved === 'list') {
      this.viewMode.set(saved);
    }
  }

  private saveViewPreference(mode: 'kanban' | 'list'): void {
    localStorage.setItem('student-assignments-view', mode);
  }

  // Template helpers
  formatDeadlineDisplay(assignment: StudentAssignment): string {
    return formatDeadlineWithExtension(assignment.dueDate, assignment.personalDeadline);
  }

  getDeadlineClass(assignment: StudentAssignment): string {
    return getDeadlineUrgencyClass(assignment.daysUntilDue);
  }

  getStatusLabel(status: StudentTaskStatus): string {
    return getStatusBadge(status).text;
  }

  getStatusClassForAssignment(status: StudentTaskStatus): string {
    return getStatusClass(status);
  }

  getActionLabel(status: StudentTaskStatus): string {
    switch (status) {
      case 'NOT_STARTED':
        return 'Bắt đầu';
      case 'IN_PROGRESS':
        return 'Tiếp tục';
      case 'SUBMITTED':
      case 'GRADED':
        return 'Xem';
      case 'OVERDUE':
        return 'Nộp muộn';
      default:
        return 'Xem';
    }
  }

  getAudienceLabel(assignment: StudentAssignment): string {
    if (assignment.deliveryMode === 'SELF_PACED') {
      return 'Toàn khóa học';
    }

    switch (assignment.distributionType) {
      case 'CLASS':
        return assignment.className ? `Lớp: ${assignment.className}` : 'Theo lớp';
      case 'SPECIFIC_STUDENTS':
        return 'Nhóm học viên';
      default:
        return assignment.className ? `Lớp: ${assignment.className}` : 'Toàn bộ học viên trong lớp';
    }
  }

  getAudienceBadgeClass(assignment: StudentAssignment): string {
    if (assignment.deliveryMode === 'SELF_PACED') {
      return 'bg-slate-100 text-slate-700';
    }

    if (assignment.distributionType === 'CLASS') {
      return 'bg-[#0056D2]/10 text-[#004BB5]';
    }

    if (assignment.distributionType === 'SPECIFIC_STUDENTS') {
      return 'bg-amber-100 text-amber-700';
    }

    return 'bg-indigo-100 text-indigo-700';
  }
}
