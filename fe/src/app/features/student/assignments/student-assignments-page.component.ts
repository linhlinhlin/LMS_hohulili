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
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { StudentAssignmentService, StudentAssignment, StudentTaskStatus } from '../services/student-assignment.service';
import {
  TaskTab,
  AssignmentFilters,
  filterByTab,
  countByTab,
  filterAssignments,
  calculateStats,
  formatDeadlineWithExtension,
  formatDeadlineRelative,
  getStatusBadge,
  getStatusClass,
  getDeadlineUrgencyClass,
  sortByDueDate,
  getUniqueCourses,
} from './utils/assignment-utils';

/**
 * Course group with assignments - for course-first layout
 */
interface CourseGroup {
  courseId: string;
  courseTitle: string;
  assignments: StudentAssignment[];
  expanded: boolean;
  todoCount: number;
  submittedCount: number;
  gradedCount: number;
  overdueCount: number;
}

@Component({
  selector: 'app-student-assignments-page',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-assignments-page.component.html',
  styleUrl: './student-assignments-page.component.scss',
})
export class StudentAssignmentsPageComponent implements OnInit {
  protected authService = inject(AuthService);
  protected assignmentService = inject(StudentAssignmentService);

  // State
  allAssignments = signal<StudentAssignment[]>([]);
  courses = signal<{ id: string; title: string }[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filters as signals (OnPush-safe)
  activeTab = signal<TaskTab>('todo');
  selectedCourse = signal('');
  searchQuery = signal('');

  // Track expanded courses
  private expandedCourses = signal<Set<string>>(new Set());

  // Computed: tab counts (always from full list, not filtered)
  tabCounts = computed(() => countByTab(this.allAssignments()));

  // Computed: filtered list
  filteredAssignments = computed(() => {
    const all = this.allAssignments();
    const tab = this.activeTab();

    // First: tab filter
    let result = filterByTab(all, tab);

    // Then: course + search filters
    const filters: AssignmentFilters = {};
    const course = this.selectedCourse();
    const search = this.searchQuery();
    if (course) filters.courseId = course;
    if (search) filters.searchQuery = search;

    result = filterAssignments(result, filters);
    return sortByDueDate(result);
  });

  // Computed: group assignments by course (course-first layout)
  courseGroups = computed(() => {
    const assignments = this.filteredAssignments();
    const expanded = this.expandedCourses();
    const courseMap = new Map<string, CourseGroup>();

    for (const assignment of assignments) {
      const courseId = assignment.courseId;
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          courseId,
          courseTitle: assignment.courseTitle,
          assignments: [],
          expanded: expanded.has(courseId),
          todoCount: 0,
          submittedCount: 0,
          gradedCount: 0,
          overdueCount: 0
        });
      }

      const group = courseMap.get(courseId)!;
      group.assignments.push(assignment);

      // Count by status
      switch (assignment.status) {
        case 'NOT_STARTED':
        case 'IN_PROGRESS':
          group.todoCount++;
          if (assignment.isOverdue) group.overdueCount++;
          break;
        case 'OVERDUE':
          group.todoCount++;
          group.overdueCount++;
          break;
        case 'SUBMITTED':
          group.submittedCount++;
          break;
        case 'GRADED':
          group.gradedCount++;
          break;
      }
    }

    // Sort groups by has overdue (desc), then by todo count (desc)
    return Array.from(courseMap.values()).sort((a, b) => {
      if (a.overdueCount > 0 && b.overdueCount === 0) return -1;
      if (b.overdueCount > 0 && a.overdueCount === 0) return 1;
      return b.todoCount - a.todoCount;
    });
  });

  // Stats for toolbar
  stats = computed(() => calculateStats(this.allAssignments()));

  hasActiveFilters = computed(() =>
    !!(this.selectedCourse() || this.searchQuery())
  );

  ngOnInit(): void {
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
      error: () => {
        this.error.set('Không thể tải danh sách bài tập. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  setTab(tab: TaskTab): void {
    this.activeTab.set(tab);
  }

  resetFilters(): void {
    this.selectedCourse.set('');
    this.searchQuery.set('');
  }

  // Toggle course expansion
  toggleCourse(courseId: string): void {
    this.expandedCourses.update(expanded => {
      const newSet = new Set(expanded);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  }

  isCourseExpanded(courseId: string): boolean {
    return this.expandedCourses().has(courseId);
  }

  // Template helpers
  formatDeadlineDisplay(assignment: StudentAssignment): string {
    return formatDeadlineWithExtension(assignment.dueDate, assignment.personalDeadline);
  }

  formatRelativeDeadline(assignment: StudentAssignment): string {
    return formatDeadlineRelative(assignment.daysUntilDue);
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
      case 'NOT_STARTED': return 'Bắt đầu';
      case 'IN_PROGRESS': return 'Tiếp tục';
      case 'SUBMITTED':
      case 'GRADED': return 'Xem';
      case 'OVERDUE': return 'Nộp muộn';
      default: return 'Xem';
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
        return 'Giao riêng';
      default:
        return assignment.className ? `Lớp: ${assignment.className}` : 'Toàn bộ học viên';
    }
  }

  getAudienceBadgeClass(assignment: StudentAssignment): string {
    if (assignment.deliveryMode === 'SELF_PACED') return 'bg-slate-100 text-slate-600';
    if (assignment.distributionType === 'CLASS') return 'bg-[#0056D2]/10 text-[#004BB5]';
    if (assignment.distributionType === 'SPECIFIC_STUDENTS') return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }

  isOverdue(assignment: StudentAssignment): boolean {
    return assignment.status === 'OVERDUE' || assignment.isOverdue;
  }
}
