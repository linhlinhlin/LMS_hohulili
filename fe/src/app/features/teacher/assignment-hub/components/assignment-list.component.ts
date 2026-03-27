import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AssignmentApi, AssignmentSummary } from '../../../../api/client/assignment.api';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

type AssignmentWithStats = AssignmentSummary;
type FilterType = 'ALL' | 'NEEDS_GRADING' | 'GRADED' | 'DRAFT';
type OperationalBucket = 'CLASSROOM' | 'COURSE' | 'UNASSIGNED';

interface CourseAssignmentClassGroup {
  key: string;
  label: string;
  assignments: AssignmentWithStats[];
}

interface CourseAssignmentGroup {
  key: string;
  courseId?: string;
  courseTitle: string;
  classroomGroups: CourseAssignmentClassGroup[];
  courseAssignments: AssignmentWithStats[];
  unassignedAssignments: AssignmentWithStats[];
  totalCount: number;
  pendingCount: number;
}

@Component({
  selector: 'app-assignment-list',
  imports: [CommonModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assignment-list.component.html'
})
export class AssignmentListComponent implements OnInit {
  private readonly assignmentApi = inject(AssignmentApi);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly assignments = signal<AssignmentWithStats[]>([]);
  readonly filter = signal<FilterType>('ALL');
  readonly searchQuery = signal('');
  readonly error = signal<string | null>(null);
  readonly expandedCourseKey = signal<string | null>(null);

  readonly filteredAssignments = computed(() => {
    let result = this.assignments();

    switch (this.filter()) {
      case 'NEEDS_GRADING':
        result = result.filter(assignment => (assignment.pendingCount || 0) > 0);
        break;
      case 'GRADED':
        result = result.filter(assignment => {
          const status = assignment.status?.toLowerCase() || '';
          return status === 'closed' || ((assignment.pendingCount || 0) === 0 && assignment.submissionsCount > 0);
        });
        break;
      case 'DRAFT':
        result = result.filter(assignment => {
          const status = assignment.status?.toLowerCase() || '';
          return status === 'draft' || status === 'pending';
        });
        break;
    }

    const searchTerm = this.searchQuery().trim().toLowerCase();
    if (searchTerm) {
      result = result.filter(assignment =>
        assignment.title.toLowerCase().includes(searchTerm) ||
        assignment.courseTitle?.toLowerCase().includes(searchTerm) ||
        assignment.className?.toLowerCase().includes(searchTerm)
      );
    }

    return result;
  });

  readonly allClassroomAssignments = computed(() =>
    this.assignments().filter(assignment => this.getOperationalBucket(assignment) === 'CLASSROOM')
  );

  readonly allCourseAssignments = computed(() =>
    this.assignments().filter(assignment => this.getOperationalBucket(assignment) === 'COURSE')
  );

  readonly allCount = computed(() => this.assignments().length);

  readonly needsGradingCount = computed(() =>
    this.assignments().filter(assignment => (assignment.pendingCount || 0) > 0).length
  );

  readonly gradedCount = computed(() =>
    this.assignments().filter(assignment => {
      const status = assignment.status?.toLowerCase() || '';
      return status === 'closed' || ((assignment.pendingCount || 0) === 0 && assignment.submissionsCount > 0);
    }).length
  );

  readonly draftCount = computed(() =>
    this.assignments().filter(assignment => {
      const status = assignment.status?.toLowerCase() || '';
      return status === 'draft' || status === 'pending';
    }).length
  );

  readonly hasActiveViewFilters = computed(() =>
    this.filter() !== 'ALL' || !!this.searchQuery().trim()
  );

  readonly courseGroups = computed<CourseAssignmentGroup[]>(() => {
    const groups = new Map<string, {
      key: string;
      courseId?: string;
      courseTitle: string;
      classroomMap: Map<string, CourseAssignmentClassGroup>;
      courseAssignments: AssignmentWithStats[];
      unassignedAssignments: AssignmentWithStats[];
    }>();

    for (const assignment of this.sortAssignments(this.filteredAssignments())) {
      const key = assignment.courseId || assignment.courseTitle || `course-${assignment.id}`;
      const group = groups.get(key) ?? {
        key,
        courseId: assignment.courseId,
        courseTitle: assignment.courseTitle || 'Khóa học chưa rõ',
        classroomMap: new Map<string, CourseAssignmentClassGroup>(),
        courseAssignments: [],
        unassignedAssignments: [],
      };

      const bucket = this.getOperationalBucket(assignment);
      if (bucket === 'CLASSROOM') {
        const classKey = this.getClassroomGroupKey(assignment);
        const classGroup = group.classroomMap.get(classKey) ?? {
          key: classKey,
          label: this.getClassroomGroupLabel(assignment),
          assignments: [],
        };
        classGroup.assignments.push(assignment);
        group.classroomMap.set(classKey, classGroup);
      } else if (bucket === 'COURSE') {
        group.courseAssignments.push(assignment);
      } else {
        group.unassignedAssignments.push(assignment);
      }

      groups.set(key, group);
    }

    return Array.from(groups.values())
      .map(group => {
        const classroomGroups = Array.from(group.classroomMap.values())
          .map(classGroup => ({
            ...classGroup,
            assignments: this.sortAssignments(classGroup.assignments),
          }))
          .sort((left, right) => left.label.localeCompare(right.label, 'vi'));
        const courseAssignments = this.sortAssignments(group.courseAssignments);
        const unassignedAssignments = this.sortAssignments(group.unassignedAssignments);
        const totalCount =
          classroomGroups.reduce((sum, classGroup) => sum + classGroup.assignments.length, 0) +
          courseAssignments.length +
          unassignedAssignments.length;
        const pendingCount = classroomGroups.reduce(
          (sum, classGroup) => sum + this.getPendingCount(classGroup.assignments),
          this.getPendingCount(courseAssignments) + this.getPendingCount(unassignedAssignments)
        );

        return {
          key: group.key,
          courseId: group.courseId,
          courseTitle: group.courseTitle,
          classroomGroups,
          courseAssignments,
          unassignedAssignments,
          totalCount,
          pendingCount,
        };
      })
      .sort((left, right) => left.courseTitle.localeCompare(right.courseTitle, 'vi'));
  });

  readonly courseCount = computed(() => this.courseGroups().length);

  ngOnInit(): void {
    this.loadAssignments();
  }

  getCompletedCount(): number {
    return this.assignments().filter(assignment => (assignment.pendingCount || 0) === 0 && assignment.status !== 'pending').length;
  }

  navigateToAssignment(id: string): void {
    this.router.navigate(['/teacher/assessments/classes/assignments', id, 'submissions']);
  }

  onAssignmentRowSpace(event: Event, id: string): void {
    event.preventDefault();
    this.navigateToAssignment(id);
  }

  toggleCourseGroup(courseKey: string): void {
    this.expandedCourseKey.update(current => current === courseKey ? null : courseKey);
  }

  isCourseExpanded(courseKey: string): boolean {
    return this.expandedCourseKey() === courseKey;
  }

  async deleteAssignment(id: string, event: Event): Promise<void> {
    event.stopPropagation();

    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa bài tập',
      message: 'Bạn có chắc chắn muốn xóa bài tập này không? Hành động này không thể hoàn tác.',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (!confirmed) {
      return;
    }

    this.assignmentApi.deleteAssignment(id).subscribe({
      next: () => {
        this.assignments.update(current => current.filter(assignment => assignment.id !== id));
      },
      error: err => {
        this.error.set('Không thể xóa bài tập. ' + (err.error?.message || 'Vui lòng thử lại.'));
      }
    });
  }

  loadAssignments(): void {
    this.loading.set(true);
    this.error.set(null);

    this.assignmentApi.getTeacherAssignments().subscribe({
      next: response => {
        const data: AssignmentWithStats[] = response.data || [];
        const normalized = data.map(assignment => ({
          ...assignment,
          status: (assignment.status?.toLowerCase() || 'draft') as AssignmentSummary['status']
        }));
        this.assignments.set(normalized);
      },
      error: () => {
        this.error.set('Không thể tải danh sách bài tập. Vui lòng thử lại.');
        this.assignments.set([]);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  setFilter(filter: FilterType): void {
    this.filter.set(filter);
  }

  clearViewFilters(): void {
    this.filter.set('ALL');
    this.searchQuery.set('');
    this.expandedCourseKey.set(null);
  }

  formatDate(dateString?: string): string {
    if (!dateString) {
      return 'Không giới hạn';
    }

    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  isOverdue(dateString?: string): boolean {
    if (!dateString) {
      return false;
    }

    return new Date(dateString) < new Date();
  }

  getStatusClass(status: string): string {
    const normalized = status?.toLowerCase() || '';
    const classes: Record<string, string> = {
      published: 'bg-blue-50 text-blue-700 border-blue-100',
      draft: 'bg-slate-50 text-slate-600 border-slate-200',
      pending: 'bg-orange-50 text-orange-700 border-orange-100',
      closed: 'bg-rose-50 text-rose-700 border-rose-100'
    };

    return classes[normalized] || 'bg-slate-50 text-slate-600 border-slate-200';
  }

  getStatusText(status: string): string {
    const normalized = status?.toLowerCase() || '';
    const texts: Record<string, string> = {
      published: 'Đang mở',
      draft: 'Bản nháp',
      pending: 'Bản nháp',
      closed: 'Đã đóng'
    };

    return texts[normalized] || status;
  }

  getDeliveryBadgeClass(deliveryMode?: string): string {
    return deliveryMode === 'INSTRUCTOR_LED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-blue-50 text-[#0056D2] border-blue-100';
  }

  getAudienceLabel(assignment: AssignmentSummary): string {
    if (assignment.distributionType === 'CLASS' && assignment.className) {
      return assignment.className;
    }

    if (assignment.distributionType === 'SPECIFIC_STUDENTS') {
      return `${assignment.totalStudents || 0} học viên chỉ định`;
    }

    return assignment.deliveryMode === 'INSTRUCTOR_LED'
      ? 'Toàn bộ học viên trong khóa học'
      : 'Toàn bộ học viên đã ghi danh';
  }

  hasAverageScore(assignment: AssignmentSummary): boolean {
    return typeof assignment.averageScore === 'number' && Number.isFinite(assignment.averageScore);
  }

  getCreateAssignmentQueryParams(courseId?: string): { courseId: string } | null {
    return courseId ? { courseId } : null;
  }

  getCourseEditorLink(courseId: string): string[] {
    return ['/teacher/courses', courseId, 'editor', 'curriculum'];
  }

  private getOperationalBucket(assignment: AssignmentSummary): OperationalBucket {
    if (assignment.deliveryMode === 'SELF_PACED' || assignment.distributionType === 'ALL_STUDENTS') {
      return 'COURSE';
    }

    if (assignment.distributionType === 'CLASS' || assignment.distributionType === 'SPECIFIC_STUDENTS') {
      return 'CLASSROOM';
    }

    return 'UNASSIGNED';
  }

  private getClassroomGroupKey(assignment: AssignmentSummary): string {
    if (assignment.distributionType === 'CLASS') {
      return assignment.classId || assignment.className || `class-${assignment.id}`;
    }

    return 'specific-students';
  }

  private getClassroomGroupLabel(assignment: AssignmentSummary): string {
    if (assignment.distributionType === 'CLASS') {
      return assignment.className || 'Lớp chưa rõ';
    }

    return 'Học viên chỉ định';
  }

  private getPendingCount(assignments: AssignmentWithStats[]): number {
    return assignments.reduce((sum, assignment) => sum + (assignment.pendingCount || 0), 0);
  }

  sortAssignments(assignments: AssignmentWithStats[]): AssignmentWithStats[] {
    return [...assignments].sort((left, right) => {
      const rightTime = Date.parse(right.updatedAt || right.dueDate || right.createdAt || '') || 0;
      const leftTime = Date.parse(left.updatedAt || left.dueDate || left.createdAt || '') || 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return (left.title || '').localeCompare(right.title || '', 'vi');
    });
  }
}
