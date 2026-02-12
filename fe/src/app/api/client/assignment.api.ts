import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'pending' | 'published' | 'closed';

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  instructions?: string;
  dueDate?: string; // ISO string
  maxScore?: number;
  attachments?: {
    fileId: string;
    fileName: string;
    fileUrl: string;
  }[];
  classId?: string;
  status?: AssignmentStatus;
  studentIds?: string[]; // IDs of specific students if creating for specific students
  assignmentConfig?: Record<string, any>;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  instructions?: string;
  dueDate?: string;
  maxScore?: number;
  classId?: string;
  status?: AssignmentStatus;
  studentIds?: string[]; // IDs for specific student allocation
  distributionType?: 'CLASS' | 'SPECIFIC_STUDENTS' | 'ALL_STUDENTS';
  assignmentConfig?: Record<string, any>;
}

export interface AssignmentSummary {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  courseId: string;
  courseTitle: string;
  status: AssignmentStatus;
  submissionsCount: number;
  totalStudents: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AssignmentDetail {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  dueDate?: string;
  courseId: string;
  courseTitle: string;
  status: AssignmentStatus;
  submissionsCount: number;
  totalStudents: number;
  classId?: string;
  className?: string;
  allocatedStudentIds?: string[];
  distributionType?: 'CLASS' | 'SPECIFIC_STUDENTS' | 'ALL_STUDENTS';
  createdAt: string;
  updatedAt?: string;
  maxScore?: number;
  assignmentConfig?: Record<string, any>;
  attachments?: {
    fileId: string;
    fileName: string;
    fileUrl: string;
  }[];
}

export interface SubmissionSummary {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string;
  submittedAt?: string;
  gradedAt?: string;
  status: 'pending' | 'submitted' | 'graded' | 'late' | 'PENDING' | 'SUBMITTED' | 'GRADED' | 'LATE_SUBMISSION';
  grade?: number | SubmissionGrade;
  score?: number; // Direct score from backend (BigDecimal)
  feedback?: string;
}

export interface SubmissionAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
}

export interface SubmissionGrade {
  score: number;
  maxScore: number;
  percentage: number;
  feedback?: string;
  rubricGrades?: RubricGradeItem[];
  gradedAt: string;
  gradedBy: string;
}

export interface SubmissionDetail extends Omit<SubmissionSummary, 'grade'> {
  content?: string;
  attachments?: SubmissionAttachment[];
  assignmentId?: string;
  assignmentTitle?: string;
  maxScore?: number;
  dueDate?: string;
  isLate?: boolean;
  gradedAt?: string;
  grade?: SubmissionGrade; // Override to only accept SubmissionGrade object
  score?: number; // Direct score from backend (BigDecimal)
}

export interface CreateSubmissionRequest {
  content?: string;
  attachments?: string[];
}

export interface RubricGradeItem {
  criterionId: string;
  levelId: string;
  score: number;
  comment?: string;
}

export interface GradeSubmissionRequest {
  score: number;
  maxScore?: number;
  feedback?: string;
  rubricGrades?: RubricGradeItem[];
}

@Injectable({ providedIn: 'root' })
export class AssignmentApi {
  private api = inject(ApiClient);
  private http = inject(HttpClient);

  // Get assignments by course
  getAssignmentsByCourse(courseId: string, params?: { page?: number; limit?: number }) {
    return this.api.getWithResponse<any>(`/api/v3/teacher/assignments/courses/${courseId}`, { params }).pipe(
      map((res: ApiResponse<any>) => {
        const content: AssignmentSummary[] = res?.data?.content ?? [];
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<AssignmentSummary[]>;
      })
    );
  }

  // Create assignment
  createAssignment(courseId: string, payload: CreateAssignmentRequest) {
    return this.api.postWithResponse<AssignmentDetail>(`/api/v3/teacher/assignments/courses/${courseId}`, payload);
  }

  // Get assignment detail
  getAssignmentById(assignmentId: string) {
    return this.api.getWithResponse<AssignmentDetail>(`/api/v3/teacher/assignments/${assignmentId}`);
  }

  // Update assignment
  updateAssignment(assignmentId: string, payload: UpdateAssignmentRequest) {
    return this.api.putWithResponse<AssignmentDetail>(`/api/v3/teacher/assignments/${assignmentId}`, payload);
  }

  // Delete assignment
  deleteAssignment(assignmentId: string) {
    return this.api.deleteWithResponse<string>(`/api/v3/teacher/assignments/${assignmentId}`);
  }

  // Publish assignment
  publishAssignment(assignmentId: string) {
    return this.api.putWithResponse<AssignmentDetail>(`/api/v3/assignments/${assignmentId}/publish`, {});
  }

  // Get submissions by assignment
  getSubmissionsByAssignment(assignmentId: string, params?: { page?: number; limit?: number; status?: string }) {
    return this.api.getWithResponse<any>(`/api/v3/assignments/${assignmentId}/submissions`, { params }).pipe(
      map((res: ApiResponse<any>) => {
        const content: SubmissionSummary[] = res?.data?.content ?? [];
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<SubmissionSummary[]>;
      })
    );
  }

  // Submit assignment (student)
  submitAssignment(assignmentId: string, payload: CreateSubmissionRequest) {
    return this.api.postWithResponse<SubmissionDetail>(`/api/v3/assignments/${assignmentId}/submissions`, payload);
  }

  // Get my submission (student)
  getMySubmission(assignmentId: string) {
    return this.api.getWithResponse<SubmissionDetail>(`/api/v3/assignments/${assignmentId}/my-submission`);
  }

  // Grade submission (teacher)
  gradeSubmission(submissionId: string, payload: GradeSubmissionRequest) {
    return this.api.patchWithResponse<SubmissionDetail>(`/api/v3/submissions/${submissionId}/grade`, payload);
  }

  // Get submission detail by ID (teacher)
  getSubmissionById(submissionId: string) {
    return this.api.getWithResponse<SubmissionDetail>(`/api/v3/submissions/${submissionId}`);
  }

  // Export submissions as Excel (teacher)
  exportSubmissions(assignmentId: string): Observable<Blob> {
    return this.http.get(`/api/v3/assignments/${assignmentId}/submissions/export`, {
      responseType: 'blob'
    });
  }

  // Get submissions for grading (alias for getSubmissionsByAssignment with full details)
  getSubmissions(assignmentId: string, params?: { page?: number; limit?: number; status?: string }) {
    return this.api.getWithResponse<SubmissionDetail[]>(`/api/v3/assignments/${assignmentId}/submissions/details`, { params });
  }

  // Get all pending submissions across all assignments (for grading dashboard)
  getPendingSubmissions(params?: { page?: number; limit?: number }) {
    return this.api.getWithResponse<SubmissionDetail[]>(`/api/v3/submissions/pending`, { params });
  }

  // Get all teacher assignments (for management view)  
  // Note: This will need to aggregate from multiple courses
  getTeacherAssignments(params?: { page?: number; limit?: number; courseId?: string; status?: string }) {
    // For now, we'll need to get assignments from all teacher's courses
    // For now, we'll need to get assignments from all teacher's courses
    // This is a temporary solution until backend provides a dedicated endpoint
    return this.api.getWithResponse<AssignmentSummary[]>(`/api/v3/teacher/assignments/summary`, { params });
  }
}
