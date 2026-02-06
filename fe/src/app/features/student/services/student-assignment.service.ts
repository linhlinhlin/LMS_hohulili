import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { AllocationApi, AllocationResponse } from '../../../api/client/allocation.api';
import { AssignmentApi, AssignmentDetail, SubmissionDetail } from '../../../api/client/assignment.api';
import { CourseApi } from '../../../api/client/course.api';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Student Assignment - Trạng thái bài tập của học viên
 */
export type StudentTaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'OVERDUE';

/**
 * Student Assignment - Bài tập được giao cho học viên
 */
export interface StudentAssignment {
  assignmentId: string;
  assignmentTitle: string;
  description: string;
  courseId: string;
  courseTitle: string;
  instructorName?: string;

  // Deadline
  dueDate: string;           // ISO date string
  personalDeadline?: string; // Deadline riêng nếu được gia hạn

  // Status
  status: StudentTaskStatus;
  isOverdue: boolean;
  daysUntilDue: number;

  // Submission
  submissionId?: string;
  submittedAt?: string;

  // Grading
  grade?: number;
  maxScore: number;
  feedback?: string;

  // Flags
  isIndividual: boolean;     // Bài tập giao riêng
}

/**
 * Service để lấy bài tập được giao cho học viên từ API thực
 * 
 * Flow:
 * 1. Gọi AllocationApi để lấy danh sách assignment IDs được giao
 * 2. Gọi AssignmentApi để lấy chi tiết từng assignment
 * 3. Gọi AssignmentApi để lấy submission của học viên (nếu có)
 * 4. Transform và trả về StudentAssignment[]
 */
@Injectable({ providedIn: 'root' })
export class StudentAssignmentService {
  private allocationApi = inject(AllocationApi);
  private assignmentApi = inject(AssignmentApi);
  private courseApi = inject(CourseApi);
  private authService = inject(AuthService);

  /**
   * Lấy tất cả bài tập được giao cho học viên
   * @param studentId ID của học viên
   * @param courseId ID của khóa học (optional - nếu không truyền sẽ lấy từ tất cả khóa học)
   */
  getStudentAssignments(studentId: string, courseId?: string): Observable<StudentAssignment[]> {
    // Nếu có courseId cụ thể, lấy assignments từ course đó
    if (courseId) {
      return this.getAssignmentsForCourse(studentId, courseId);
    }

    // Nếu không có courseId, lấy từ tất cả khóa học đã enroll
    return this.getAssignmentsFromAllCourses(studentId);
  }

  /**
   * Lấy bài tập từ một khóa học cụ thể
   */
  private getAssignmentsForCourse(studentId: string, courseId: string): Observable<StudentAssignment[]> {
    return this.allocationApi.getStudentAllocatedAssignments(studentId, courseId).pipe(
      switchMap(response => {
        const assignmentIds = response.data || [];

        if (assignmentIds.length === 0) {
          return of([]);
        }

        // Lấy chi tiết từng assignment
        return this.fetchAssignmentDetails(assignmentIds, studentId);
      }),
      catchError(error => {
        return of([]);
      })
    );
  }

  /**
   * Lấy bài tập từ tất cả khóa học đã enroll
   */
  private getAssignmentsFromAllCourses(studentId: string): Observable<StudentAssignment[]> {
    // Lấy danh sách khóa học đã enroll
    return this.courseApi.enrolledCourses().pipe(
      switchMap((response: { data: any[] }) => {
        const courses = response.data || [];

        if (courses.length === 0) {
          return of([]);
        }

        // Lấy assignments từ mỗi course
        const courseAssignments$ = courses.map((course: any) =>
          this.getAssignmentsForCourse(studentId, course.id).pipe(
            catchError(() => of([]))
          )
        );

        return forkJoin(courseAssignments$).pipe(
          map((results: StudentAssignment[][]) => results.flat())
        );
      }),
      catchError(error => {
        return of([]);
      })
    );
  }

  /**
   * Lấy chi tiết từng assignment và submission
   */
  private fetchAssignmentDetails(assignmentIds: string[], studentId: string): Observable<StudentAssignment[]> {
    const detailRequests$ = assignmentIds.map(assignmentId =>
      forkJoin({
        assignment: this.assignmentApi.getAssignmentById(assignmentId).pipe(
          map(res => res.data),
          catchError(() => of(null))
        ),
        submission: this.assignmentApi.getMySubmission(assignmentId).pipe(
          map(res => res.data),
          catchError(() => of(null))
        ),
        allocation: this.allocationApi.getAllocation(assignmentId).pipe(
          map(res => res.data),
          catchError(() => of(null))
        )
      })
    );

    return forkJoin(detailRequests$).pipe(
      map(results => results
        .filter(r => r.assignment !== null)
        .map(r => this.transformToStudentAssignment(
          r.assignment as AssignmentDetail,
          r.submission as SubmissionDetail | null,
          r.allocation as AllocationResponse | null,
          studentId
        ))
      )
    );
  }

  /**
   * Transform API response thành StudentAssignment
   */
  private transformToStudentAssignment(
    assignment: AssignmentDetail,
    submission: SubmissionDetail | null,
    allocation: AllocationResponse | null,
    studentId: string
  ): StudentAssignment {
    const now = new Date();
    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;

    // Tìm personal deadline nếu có
    let personalDeadline: string | undefined;
    let isIndividual = false;

    if (allocation?.allocatedStudents) {
      const studentAllocation = allocation.allocatedStudents.find(
        s => s.studentId === studentId
      );
      if (studentAllocation?.customDeadline) {
        personalDeadline = studentAllocation.customDeadline;
      }
    }

    if (allocation?.isIndividual) {
      isIndividual = true;
    }

    // Tính deadline thực tế (ưu tiên personal deadline)
    const effectiveDeadline = personalDeadline ? new Date(personalDeadline) : dueDate;

    // Tính số ngày còn lại
    const daysUntilDue = effectiveDeadline
      ? Math.ceil((effectiveDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Xác định trạng thái
    const status = this.determineStatus(submission, effectiveDeadline, now);
    const isOverdue = status === 'OVERDUE';

    // Lấy điểm từ submission
    let grade: number | undefined;
    if (submission?.grade) {
      if (typeof submission.grade === 'number') {
        grade = submission.grade;
      } else if (typeof submission.grade === 'object' && 'score' in submission.grade) {
        grade = submission.grade.score;
      }
    }

    return {
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      description: assignment.description || '',
      courseId: assignment.courseId,
      courseTitle: assignment.courseTitle,
      dueDate: assignment.dueDate || '',
      personalDeadline,
      status,
      isOverdue,
      daysUntilDue,
      submissionId: submission?.id,
      submittedAt: submission?.submittedAt,
      grade,
      maxScore: assignment.maxScore || 100,
      feedback: submission?.feedback,
      isIndividual
    };
  }

  /**
   * Xác định trạng thái bài tập
   */
  private determineStatus(
    submission: SubmissionDetail | null,
    deadline: Date | null,
    now: Date
  ): StudentTaskStatus {
    // Đã chấm điểm
    if (submission?.status === 'graded' || submission?.gradedAt) {
      return 'GRADED';
    }

    // Đã nộp
    if (submission?.status === 'submitted' || submission?.submittedAt) {
      return 'SUBMITTED';
    }

    // Quá hạn chưa nộp
    if (deadline && now > deadline) {
      return 'OVERDUE';
    }

    // Đang làm (có draft hoặc đã truy cập)
    if (submission?.content || submission?.attachments?.length) {
      return 'IN_PROGRESS';
    }

    // Chưa bắt đầu
    return 'NOT_STARTED';
  }

  /**
   * Lấy chi tiết một bài tập
   */
  getAssignmentDetail(assignmentId: string): Observable<AssignmentDetail | null> {
    return this.assignmentApi.getAssignmentById(assignmentId).pipe(
      map(res => res.data || null),
      catchError(() => of(null))
    );
  }

  /**
   * Lấy submission của học viên cho một bài tập
   */
  getMySubmission(assignmentId: string): Observable<SubmissionDetail | null> {
    return this.assignmentApi.getMySubmission(assignmentId).pipe(
      map(res => res.data || null),
      catchError(() => of(null))
    );
  }
}
