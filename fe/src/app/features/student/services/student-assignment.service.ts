import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiClient } from '../../../api/client/api-client';
import { AssignmentApi, AssignmentDetail, SubmissionDetail } from '../../../api/client/assignment.api';
import { STUDENT_ENDPOINTS } from '../../../api/endpoints/student.endpoints';

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
  deliveryMode?: 'SELF_PACED' | 'INSTRUCTOR_LED';
  distributionType?: 'ALL_STUDENTS' | 'CLASS' | 'SPECIFIC_STUDENTS';
  classId?: string;
  className?: string;
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
 * Service để lấy bài tập được giao cho học viên.
 *
 * Flow hiện tại:
 * 1. Gọi GET /api/v3/student/assignments
 * 2. Backend chỉ trả về các assignment student thực sự được phép truy cập
 *    theo enrollment + allocation/distribution hiện hành
 * 3. Transform và trả về StudentAssignment[]
 */
@Injectable({ providedIn: 'root' })
export class StudentAssignmentService {
  private api = inject(ApiClient);
  private assignmentApi = inject(AssignmentApi);

  /**
   * Lấy tất cả bài tập được giao cho học viên
   */
  getStudentAssignments(_studentId?: string, _courseId?: string): Observable<StudentAssignment[]> {
    return this.api.getWithResponse<any[]>(STUDENT_ENDPOINTS.MY_ASSIGNMENTS).pipe(
      map(response => {
        const data: any[] = response?.data || [];
        return data.map(item => this.transformToStudentAssignment(item));
      }),
      catchError(() => of([]))
    );
  }

  /**
   * Lấy chi tiết một bài tập (student-scoped, with enrollment check)
   */
  getAssignmentDetail(assignmentId: string): Observable<AssignmentDetail | null> {
    return this.api.getWithResponse<any>(STUDENT_ENDPOINTS.ASSIGNMENT_DETAIL(assignmentId)).pipe(
      map(res => res.data || null),
      catchError(() => of(null))
    );
  }

  /**
   * Lấy submission của học viên cho một bài tập
   */
  getMySubmission(assignmentId: string): Observable<SubmissionDetail | null> {
    return this.assignmentApi.getStudentSubmission(assignmentId).pipe(
      map(res => res.data || null),
      catchError(() => of(null))
    );
  }

  /**
   * Transform API response thành StudentAssignment
   */
  private transformToStudentAssignment(item: any): StudentAssignment {
    const now = new Date();
    const dueDate = item.dueDate ? new Date(item.dueDate) : null;

    // Tính số ngày còn lại
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Xác định trạng thái
    const submissionStatus = item.submissionStatus || 'NOT_STARTED';
    const status = this.determineStatus(submissionStatus, dueDate, now, item.grade);
    const isOverdue = status === 'OVERDUE';

    return {
      assignmentId: item.id,
      assignmentTitle: item.title || '',
      description: item.description || '',
      courseId: item.courseId || '',
      courseTitle: item.courseTitle || item.courseName || '',
      deliveryMode: item.deliveryMode || 'SELF_PACED',
      distributionType: item.distributionType || 'ALL_STUDENTS',
      classId: item.classId || undefined,
      className: item.className || undefined,
      dueDate: item.dueDate || '',
      status,
      isOverdue,
      daysUntilDue,
      submissionId: item.submissionId,
      submittedAt: item.submittedAt,
      grade: item.grade,
      maxScore: item.maxScore || 100,
      feedback: item.feedback,
      isIndividual: false
    };
  }

  /**
   * Xác định trạng thái bài tập
   */
  private determineStatus(
    submissionStatus: string,
    deadline: Date | null,
    now: Date,
    grade?: number
  ): StudentTaskStatus {
    if (grade !== undefined && grade !== null) return 'GRADED';
    if (submissionStatus === 'GRADED') return 'GRADED';
    if (submissionStatus === 'SUBMITTED' || submissionStatus === 'RESUBMITTED') return 'SUBMITTED';
    if (deadline && now > deadline) return 'OVERDUE';
    if (submissionStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
    return 'NOT_STARTED';
  }
}
