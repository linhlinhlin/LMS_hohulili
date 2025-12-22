import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, delay, tap, map, catchError } from 'rxjs';
import {
  AssignmentAllocation,
  DistributionType,
  EnrolledStudent,
  createAllocation,
  getAllocatedStudents,
  isStudentAllocated,
  getAllocationStats,
} from '../../features/teacher/assignment-hub/utils/allocation-utils';
import {
  StudentTask,
  TaskStatus,
  calculateTaskStatus,
  sortTasksByDueDate,
  groupTasksByStatus,
  getEffectiveDeadline,
  DeadlineOverride,
} from '../../features/student/assignments/utils/task-utils';
import { AllocationApi, AllocationResponse, AllocationStatsResponse } from '../../api/client/allocation.api';

/**
 * Distribution Service
 *
 * Quản lý logic giao bài tập với signal-based state management.
 *
 * @requirements 1.4, 6.2
 */
@Injectable({
  providedIn: 'root',
})
export class DistributionService {
  private allocationApi = inject(AllocationApi);

  // State
  private allocations = signal<AssignmentAllocation[]>([]);
  private deadlineOverrides = signal<DeadlineOverride[]>([]);
  private loading = signal(false);
  private error = signal<string | null>(null);

  // Computed
  readonly isLoading = computed(() => this.loading());
  readonly hasError = computed(() => this.error() !== null);
  readonly errorMessage = computed(() => this.error());

  /**
   * Create a new allocation for an assignment (using real API)
   */
  createAllocation(
    assignmentId: string,
    courseId: string,
    distributionType: DistributionType,
    studentIds: string[] | null,
    createdBy: string,
    isIndividual: boolean = false
  ): Observable<AssignmentAllocation> {
    this.loading.set(true);
    this.error.set(null);

    return this.allocationApi.createOrUpdateAllocation(assignmentId, {
      distributionType,
      studentIds: studentIds || undefined,
      isIndividual
    }).pipe(
      map(response => {
        const allocation = this.mapResponseToAllocation(response.data!, assignmentId, courseId, createdBy);
        this.allocations.update((current) => {
          // Replace existing or add new
          const filtered = current.filter(a => a.assignmentId !== assignmentId);
          return [...filtered, allocation];
        });
        this.loading.set(false);
        return allocation;
      }),
      catchError(err => {
        console.error('Error creating allocation:', err);
        this.error.set('Không thể lưu cài đặt phân phối');
        this.loading.set(false);
        // Fallback to local creation
        const allocation = createAllocation(assignmentId, courseId, distributionType, studentIds, createdBy, isIndividual);
        return of(allocation);
      })
    );
  }

  private mapResponseToAllocation(
    response: AllocationResponse,
    assignmentId: string,
    courseId: string,
    createdBy: string
  ): AssignmentAllocation {
    // For ALL_STUDENTS, studentIds should be null (dynamic query at runtime)
    // For SPECIFIC_STUDENTS, studentIds should be the explicit list
    let studentIds: string[] | null = null;
    
    if (response.distributionType === 'SPECIFIC_STUDENTS') {
      // Only set studentIds for SPECIFIC_STUDENTS
      if (response.studentIds && response.studentIds.length > 0) {
        studentIds = response.studentIds.map(id => String(id));
      } else {
        studentIds = []; // Empty list means no students selected
      }
    }
    // For ALL_STUDENTS, keep studentIds as null (will be resolved dynamically)
    
    return {
      id: response.id ? String(response.id) : `local-${Date.now()}`,
      assignmentId,
      courseId,
      distributionType: response.distributionType,
      studentIds,
      createdBy,
      createdAt: response.createdAt || new Date().toISOString(),
      isIndividual: response.isIndividual
    };
  }

  /**
   * Get allocation for an assignment (from cache)
   */
  getAllocation(assignmentId: string): AssignmentAllocation | undefined {
    return this.allocations().find((a) => a.assignmentId === assignmentId);
  }

  /**
   * Load allocation from API
   */
  loadAllocation(assignmentId: string, courseId: string): Observable<AssignmentAllocation | null> {
    return this.allocationApi.getAllocation(assignmentId).pipe(
      map(response => {
        if (response.data) {
          const allocation = this.mapResponseToAllocation(response.data, assignmentId, courseId, 'unknown');
          this.allocations.update(current => {
            const filtered = current.filter(a => a.assignmentId !== assignmentId);
            return [...filtered, allocation];
          });
          return allocation;
        }
        return null;
      }),
      catchError(() => {
        return of(null);
      })
    );
  }

  /**
   * Get all allocated students for an assignment
   */
  getAllocatedStudents(
    assignmentId: string,
    enrolledStudents: EnrolledStudent[]
  ): string[] {
    const allocation = this.getAllocation(assignmentId);
    if (!allocation) return [];

    return getAllocatedStudents(allocation, enrolledStudents);
  }

  /**
   * Check if a student is allocated to an assignment
   */
  isStudentAllocated(
    studentId: string,
    assignmentId: string,
    enrolledStudents: EnrolledStudent[]
  ): boolean {
    const allocation = this.getAllocation(assignmentId);
    if (!allocation) return false;

    const result = isStudentAllocated(studentId, allocation, enrolledStudents);
    return result.isAllocated;
  }

  /**
   * Get allocation statistics for an assignment
   */
  getAllocationStats(
    assignmentId: string,
    enrolledStudents: EnrolledStudent[]
  ): { totalAllocated: number; distributionType: DistributionType; isIndividual: boolean } | null {
    const allocation = this.getAllocation(assignmentId);
    if (!allocation) return null;

    return getAllocationStats(allocation, enrolledStudents);
  }

  /**
   * Get all tasks for a student (with full data)
   */
  getStudentTasksWithData(
    studentId: string,
    assignments: Array<{
      id: string;
      title: string;
      courseId: string;
      courseTitle: string;
      dueDate: string;
      maxScore: number;
    }>,
    submissions: Array<{
      assignmentId: string;
      id: string;
      status: 'PENDING' | 'SUBMITTED' | 'GRADED';
      submittedAt?: string;
      grade?: number;
    }>,
    enrolledStudents: EnrolledStudent[]
  ): StudentTask[] {
    const tasks: StudentTask[] = [];
    const overrides = this.deadlineOverrides();

    for (const assignment of assignments) {
      // Check if student is allocated to this assignment
      if (!this.isStudentAllocated(studentId, assignment.id, enrolledStudents)) {
        continue;
      }

      // Find submission for this assignment
      const submission = submissions.find(
        (s) => s.assignmentId === assignment.id
      );

      // Get effective deadline (with override if exists)
      const personalDeadline = getEffectiveDeadline(
        assignment.dueDate,
        overrides,
        studentId,
        assignment.id
      );

      // Calculate status
      const status = calculateTaskStatus(
        submission
          ? {
              id: submission.id,
              assignmentId: submission.assignmentId,
              status: submission.status,
              grade: submission.grade,
            }
          : null,
        assignment.dueDate,
        personalDeadline !== assignment.dueDate ? personalDeadline : undefined
      );

      // Check if overdue
      const isOverdue =
        status === 'OVERDUE' ||
        (status === 'NOT_STARTED' &&
          new Date() > new Date(personalDeadline || assignment.dueDate));

      // Get allocation to check if individual
      const allocation = this.getAllocation(assignment.id);

      tasks.push({
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        courseId: assignment.courseId,
        courseTitle: assignment.courseTitle,
        dueDate: assignment.dueDate,
        personalDeadline:
          personalDeadline !== assignment.dueDate ? personalDeadline : undefined,
        status,
        submissionId: submission?.id,
        submittedAt: submission?.submittedAt,
        grade: submission?.grade,
        maxScore: assignment.maxScore,
        isOverdue,
        isIndividual: allocation?.isIndividual,
      });
    }

    return sortTasksByDueDate(tasks);
  }

  /**
   * Get tasks grouped by status for Kanban view
   */
  getGroupedTasks(tasks: StudentTask[]): {
    toDo: StudentTask[];
    inProgress: StudentTask[];
    completed: StudentTask[];
  } {
    return groupTasksByStatus(tasks);
  }

  /**
   * Extend deadline for a specific student (using real API)
   */
  extendDeadline(
    assignmentId: string,
    studentId: string,
    newDeadline: string,
    reason: string
  ): Observable<DeadlineOverride> {
    this.loading.set(true);

    const override: DeadlineOverride = {
      assignmentId,
      studentId,
      newDeadline,
    };

    return this.allocationApi.updateStudentDeadline(assignmentId, studentId, { newDeadline }).pipe(
      map(() => {
        // Remove existing override if any
        this.deadlineOverrides.update((current) =>
          current.filter(
            (o) =>
              !(o.assignmentId === assignmentId && o.studentId === studentId)
          )
        );
        // Add new override
        this.deadlineOverrides.update((current) => [...current, override]);
        this.loading.set(false);
        return override;
      }),
      catchError(err => {
        console.error('Error extending deadline:', err);
        this.error.set('Không thể gia hạn deadline');
        this.loading.set(false);
        // Still update local state for UX
        this.deadlineOverrides.update((current) => [...current, override]);
        return of(override);
      })
    );
  }

  /**
   * Get deadline override for a student
   */
  getDeadlineOverride(
    assignmentId: string,
    studentId: string
  ): DeadlineOverride | undefined {
    return this.deadlineOverrides().find(
      (o) => o.assignmentId === assignmentId && o.studentId === studentId
    );
  }

  /**
   * Load allocations from API (mock)
   */
  loadAllocations(courseId: string): Observable<AssignmentAllocation[]> {
    this.loading.set(true);

    // Mock data - replace with real API call
    const mockAllocations: AssignmentAllocation[] = [];

    return of(mockAllocations).pipe(
      delay(300),
      tap((result) => {
        this.allocations.set(result);
        this.loading.set(false);
      })
    );
  }

  /**
   * Clear all state (for logout/cleanup)
   */
  clearState(): void {
    this.allocations.set([]);
    this.deadlineOverrides.set([]);
    this.loading.set(false);
    this.error.set(null);
  }

  /**
   * Get student tasks (simplified version for StudentAssignmentsComponent)
   * @requirements 2.1, 2.5
   */
  getStudentTasks(studentId: string): Observable<StudentTask[]> {
    this.loading.set(true);

    // Mock data - replace with real API call
    const mockTasks: StudentTask[] = [
      {
        id: '1',
        assignmentId: 'a1',
        title: 'Bài tập An toàn Hàng hải - Chương 1',
        courseId: 'c1',
        courseName: 'An toàn Hàng hải Cơ bản',
        dueDate: '2025-11-30T23:59:59Z',
        submittedAt: '2025-11-28T14:30:00Z',
        status: 'GRADED',
        grade: 85,
        maxScore: 100,
        feedback: 'Bài làm tốt, cần chú ý thêm về phần SOLAS',
        isIndividual: false,
        assignedAt: '2025-11-01T00:00:00Z'
      },
      {
        id: '2',
        assignmentId: 'a2',
        title: 'Bài tập bổ sung - Điều hướng',
        courseId: 'c2',
        courseName: 'Điều hướng Maritime',
        dueDate: '2025-12-05T23:59:59Z',
        personalDeadline: '2025-12-10T23:59:59Z',
        status: 'NOT_STARTED',
        maxScore: 100,
        isIndividual: true,
        assignedAt: '2025-11-25T10:00:00Z',
        assignedBy: 'Giảng viên Nguyễn Văn A'
      }
    ];

    return of(mockTasks).pipe(
      delay(300),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Get available assignments for a student (for AssignTaskModal)
   * @requirements 2.2
   */
  getAvailableAssignments(studentId: string): Observable<{
    assignments: Array<{
      id: string;
      title: string;
      courseId: string;
      courseTitle: string;
      dueDate: string | null;
      maxScore: number;
      status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
      alreadyAssigned: boolean;
    }>;
    courses: Array<{ id: string; title: string }>;
  }> {
    this.loading.set(true);

    // Mock data - replace with real API call
    const mockData = {
      courses: [
        { id: 'c1', title: 'An toàn Hàng hải Cơ bản' },
        { id: 'c2', title: 'Điều hướng Maritime' }
      ],
      assignments: [
        {
          id: 'a1',
          title: 'Bài tập An toàn Hàng hải - Chương 2',
          courseId: 'c1',
          courseTitle: 'An toàn Hàng hải Cơ bản',
          dueDate: '2025-12-15T23:59:59Z',
          maxScore: 100,
          status: 'PUBLISHED' as const,
          alreadyAssigned: false
        },
        {
          id: 'a2',
          title: 'Thực hành Radar',
          courseId: 'c2',
          courseTitle: 'Điều hướng Maritime',
          dueDate: '2025-12-20T23:59:59Z',
          maxScore: 100,
          status: 'PUBLISHED' as const,
          alreadyAssigned: true
        }
      ]
    };

    return of(mockData).pipe(
      delay(300),
      tap(() => this.loading.set(false))
    );
  }

  /**
   * Assign individual task to a student (using real API)
   * @requirements 2.2, 2.3
   */
  assignIndividualTask(
    assignmentId: string,
    studentId: string,
    customDeadline?: string,
    note?: string
  ): Observable<AssignmentAllocation> {
    this.loading.set(true);

    return this.allocationApi.assignIndividual(assignmentId, {
      studentId,
      customDeadline,
      note
    }).pipe(
      map(response => {
        const allocation = this.mapResponseToAllocation(
          response.data!,
          assignmentId,
          '', // courseId will be fetched from assignment
          'current-teacher'
        );
        
        // Update local state
        this.allocations.update(current => {
          const filtered = current.filter(a => a.assignmentId !== assignmentId);
          return [...filtered, allocation];
        });

        // If custom deadline, create override
        if (customDeadline) {
          const override: DeadlineOverride = {
            assignmentId,
            studentId,
            newDeadline: customDeadline
          };
          this.deadlineOverrides.update(current => [...current, override]);
        }

        this.loading.set(false);
        return allocation;
      }),
      catchError(err => {
        console.error('Error assigning individual task:', err);
        this.error.set('Không thể giao bài tập riêng');
        this.loading.set(false);
        
        // Fallback to local creation
        const allocation = createAllocation(
          assignmentId,
          '',
          'SPECIFIC_STUDENTS',
          [studentId],
          'current-teacher',
          true
        );
        return of(allocation);
      })
    );
  }

  /**
   * Remove individual assignment from a student (using real API)
   * @requirements 2.4
   */
  removeIndividualAssignment(
    assignmentId: string,
    studentId: string
  ): Observable<void> {
    this.loading.set(true);

    return this.allocationApi.removeStudentFromAllocation(assignmentId, studentId).pipe(
      map(() => {
        // Remove from local allocation
        this.allocations.update(current => {
          return current.map(a => {
            if (a.assignmentId === assignmentId && a.studentIds) {
              return {
                ...a,
                studentIds: a.studentIds.filter(id => id !== studentId)
              };
            }
            return a;
          });
        });
        // Remove deadline override if exists
        this.deadlineOverrides.update(current =>
          current.filter(o => 
            !(o.assignmentId === assignmentId && o.studentId === studentId)
          )
        );
        this.loading.set(false);
      }),
      catchError(err => {
        console.error('Error removing student from allocation:', err);
        this.error.set('Không thể xóa học viên khỏi danh sách');
        this.loading.set(false);
        return of(undefined);
      })
    );
  }
}

