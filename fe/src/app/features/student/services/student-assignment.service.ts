import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiClient } from '../../../api/client/api-client';
import {
  AssignmentApi,
  AssignmentDetail,
  SubmissionDetail,
  StudentAssignmentResponse as StudentAssignmentApiResponse,
} from '../../../api/client/assignment.api';
import { STUDENT_ENDPOINTS } from '../../../api/endpoints/student.endpoints';

export type StudentTaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADED'
  | 'OVERDUE'
  | 'NOT_AVAILABLE'
  | 'LOCKED';

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
  dueDate: string;
  personalDeadline?: string;
  status: StudentTaskStatus;
  isOverdue: boolean;
  daysUntilDue: number;
  submissionId?: string;
  submittedAt?: string;
  grade?: number;
  maxScore: number;
  feedback?: string;
  isIndividual: boolean;
}

@Injectable({ providedIn: 'root' })
export class StudentAssignmentService {
  private api = inject(ApiClient);
  private assignmentApi = inject(AssignmentApi);

  getStudentAssignments(_studentId?: string, _courseId?: string): Observable<StudentAssignment[]> {
    return this.assignmentApi.getStudentAssignments().pipe(
      map((response) => {
        const data = response?.data ?? [];
        return data.map((item) => this.transformToStudentAssignment(item));
      }),
      catchError(() => of([]))
    );
  }

  getAssignmentDetail(assignmentId: string): Observable<AssignmentDetail | null> {
    return this.api.getWithResponse<any>(STUDENT_ENDPOINTS.ASSIGNMENT_DETAIL(assignmentId)).pipe(
      map((res) => res.data || null),
      catchError(() => of(null))
    );
  }

  getMySubmission(assignmentId: string): Observable<SubmissionDetail | null> {
    return this.assignmentApi.getStudentSubmission(assignmentId).pipe(
      map((res) => res.data || null),
      catchError(() => of(null))
    );
  }

  private transformToStudentAssignment(item: StudentAssignmentApiResponse): StudentAssignment {
    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
    const distributionType = this.readStringField(item, 'distributionType') as StudentAssignment['distributionType'];
    const deliveryMode = this.readStringField(item, 'deliveryMode') as StudentAssignment['deliveryMode'];
    const status = this.mapApiStatus(item.status, dueDate, item.score);

    return {
      assignmentId: String(item.id),
      assignmentTitle: item.title || '',
      description: item.description || '',
      courseId: String(item.courseId || ''),
      courseTitle: item.courseName || '',
      deliveryMode: deliveryMode || 'SELF_PACED',
      distributionType: distributionType || 'ALL_STUDENTS',
      classId: this.readStringField(item, 'classId'),
      className: this.readStringField(item, 'className'),
      dueDate: item.dueDate || '',
      personalDeadline: undefined,
      status,
      isOverdue: status === 'OVERDUE',
      daysUntilDue: this.calculateDaysUntilDue(dueDate),
      submissionId: item.submissionId ? String(item.submissionId) : undefined,
      submittedAt: item.submittedAt,
      grade: item.score ?? undefined,
      maxScore: item.maxScore || 100,
      feedback: item.feedback,
      isIndividual: distributionType === 'SPECIFIC_STUDENTS',
    };
  }

  private mapApiStatus(
    apiStatus: string | undefined,
    deadline: Date | null,
    score?: number
  ): StudentTaskStatus {
    if (score !== undefined && score !== null) {
      return 'GRADED';
    }

    switch ((apiStatus || '').toUpperCase()) {
      case 'GRADED':
        return 'GRADED';
      case 'SUBMITTED':
      case 'RESUBMITTED':
      case 'LATE':
        return 'SUBMITTED';
      case 'RETURNED':
      case 'DRAFT':
      case 'IN_PROGRESS':
        return 'IN_PROGRESS';
      case 'OVERDUE':
        return 'OVERDUE';
      case 'NOT_SUBMITTED':
      case 'NOT_STARTED':
      case '':
      default:
        return deadline && deadline.getTime() < Date.now() ? 'OVERDUE' : 'NOT_STARTED';
    }
  }

  private calculateDaysUntilDue(dueDate: Date | null): number {
    if (!dueDate) {
      return 999;
    }

    return Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  private readStringField(
    item: StudentAssignmentApiResponse,
    key: 'classId' | 'className' | 'deliveryMode' | 'distributionType'
  ): string | undefined {
    const value = (item as unknown as Record<string, unknown>)[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
