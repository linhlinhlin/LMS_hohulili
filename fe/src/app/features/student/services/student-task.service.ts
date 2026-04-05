import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AssignmentApi,
  StudentTaskApiResponse,
} from '../../../api/client/assignment.api';

export type WorkType = 'ASSIGNMENT' | 'QUIZ' | 'EXAM' | 'PRACTICE';

export type StudentTaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADED'
  | 'OVERDUE'
  | 'NOT_AVAILABLE'
  | 'LOCKED';

export interface StudentWorkItem {
  itemId: string;
  workType: WorkType;
  title: string;
  description: string;
  courseId: string;
  courseTitle: string;
  dueDate: string;
  availableFrom?: string;   // Canvas "Available from" — quiz opens at this time
  lockAt?: string;          // Canvas "Until" — hard deadline, no access after
  status: StudentTaskStatus;
  isOverdue: boolean;
  daysUntilDue: number;
  // Assignment-specific
  submissionId?: string;
  submittedAt?: string;
  grade?: number;
  maxScore: number;
  feedback?: string;
  fileUrl?: string;
  fileName?: string;
  // Quiz-specific
  attemptId?: string;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  questionCount?: number;
  passingScore?: number;
  isPassed?: boolean;
  attemptCount?: number;
  requiresPassword?: boolean;
}

@Injectable({ providedIn: 'root' })
export class StudentTaskService {
  private assignmentApi = inject(AssignmentApi);

  getStudentTasks(): Observable<StudentWorkItem[]> {
    return this.assignmentApi.getStudentTasks().pipe(
      map((response) => {
        const data = response?.data ?? [];
        return data.map((item) => this.transformToWorkItem(item));
      }),
      catchError(() => of([]))
    );
  }

  private transformToWorkItem(item: StudentTaskApiResponse): StudentWorkItem {
    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
    let status = this.mapApiStatus(item.status, dueDate, item.score);

    // Quiz with attempts should never be OVERDUE — they already interacted
    // OVERDUE only makes sense for quizzes the student completely missed (0 attempts)
    const isQuiz = item.workType && item.workType !== 'ASSIGNMENT';
    if (isQuiz && status === 'OVERDUE' && (item.attemptCount ?? 0) > 0) {
      status = (item.score != null) ? 'GRADED' : 'IN_PROGRESS';
    }

    return {
      itemId: String(item.id),
      workType: item.workType || 'ASSIGNMENT',
      title: item.title || '',
      description: item.description || '',
      courseId: String(item.courseId || ''),
      courseTitle: item.courseName || '',
      dueDate: item.dueDate || '',
      availableFrom: item.availableFrom || undefined,
      lockAt: item.lockAt || undefined,
      status,
      isOverdue: status === 'OVERDUE',
      daysUntilDue: this.calculateDaysUntilDue(dueDate),
      submissionId: item.submissionId ? String(item.submissionId) : undefined,
      submittedAt: item.submittedAt,
      grade: item.score ?? undefined,
      maxScore: item.maxScore || 100,
      feedback: item.feedback,
      fileUrl: item.fileUrl,
      fileName: item.fileName,
      attemptId: item.attemptId ? String(item.attemptId) : undefined,
      timeLimitMinutes: item.timeLimitMinutes ?? undefined,
      maxAttempts: item.maxAttempts ?? undefined,
      questionCount: item.questionCount ?? undefined,
      passingScore: item.passingScore ?? undefined,
      isPassed: item.isPassed ?? undefined,
      attemptCount: item.attemptCount ?? undefined,
      requiresPassword: item.requiresPassword ?? false,
    };
  }

  private mapApiStatus(
    apiStatus: string | undefined,
    deadline: Date | null,
    _score?: number
  ): StudentTaskStatus {
    // Backend is authoritative for status — FE does NOT override based on score
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
      case 'NOT_AVAILABLE':
        return 'NOT_AVAILABLE';
      case 'LOCKED':
        return 'LOCKED';
      case 'NOT_SUBMITTED':
      case 'NOT_STARTED':
      case '':
      default:
        return deadline && deadline.getTime() < Date.now() ? 'OVERDUE' : 'NOT_STARTED';
    }
  }

  private calculateDaysUntilDue(dueDate: Date | null): number {
    if (!dueDate) return 999;
    return Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
}
