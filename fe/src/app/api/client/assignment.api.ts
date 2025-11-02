import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  instructions?: string;
  dueDate?: string;
}

export interface AssignmentSummary {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  courseId: string;
  courseTitle: string;
  status: 'pending' | 'published' | 'closed';
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
  status: 'pending' | 'published' | 'closed';
  submissionsCount: number;
  totalStudents: number;
  createdAt: string;
  updatedAt?: string;
  maxPoints?: number;
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
  status: 'pending' | 'submitted' | 'graded' | 'late';
  grade?: number;
  feedback?: string;
}

export interface SubmissionDetail extends SubmissionSummary {
  content?: string;
  attachments?: string[];
}

export interface CreateSubmissionRequest {
  content?: string;
  attachments?: string[];
}

export interface GradeSubmissionRequest {
  score: number;
  maxScore: number;
  feedback?: string;
}

@Injectable({ providedIn: 'root' })
export class AssignmentApi {
  private api = inject(ApiClient);
  private http = inject(HttpClient);

  // Get assignments by course
  getAssignmentsByCourse(courseId: string, params?: { page?: number; limit?: number }) {
    return this.api.getWithResponse<any>(`/api/v1/courses/${courseId}/assignments`, { params }).pipe(
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
    return this.api.postWithResponse<AssignmentDetail>(`/api/v1/courses/${courseId}/assignments`, payload);
  }

  // Get assignment detail
  getAssignmentById(assignmentId: string) {
    return this.api.getWithResponse<AssignmentDetail>(`/api/v1/assignments/${assignmentId}`);
  }

  // Update assignment
  updateAssignment(assignmentId: string, payload: UpdateAssignmentRequest) {
    return this.api.putWithResponse<AssignmentDetail>(`/api/v1/assignments/${assignmentId}`, payload);
  }

  // Delete assignment
  deleteAssignment(assignmentId: string) {
    return this.api.deleteWithResponse<string>(`/api/v1/assignments/${assignmentId}`);
  }

  // Get submissions by assignment
  getSubmissionsByAssignment(assignmentId: string, params?: { page?: number; limit?: number; status?: string }) {
    return this.api.getWithResponse<any>(`/api/v1/assignments/${assignmentId}/submissions`, { params }).pipe(
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
    return this.api.postWithResponse<SubmissionDetail>(`/api/v1/assignments/${assignmentId}/submissions`, payload);
  }

  // Get my submission (student)
  getMySubmission(assignmentId: string) {
    return this.api.getWithResponse<SubmissionDetail>(`/api/v1/assignments/${assignmentId}/my-submission`);
  }

  // Grade submission (teacher)
  gradeSubmission(submissionId: string, payload: GradeSubmissionRequest) {
    return this.api.patchWithResponse<SubmissionDetail>(`/api/v1/submissions/${submissionId}/grade`, payload);
  }

  // Export submissions as Excel (teacher)
  exportSubmissions(assignmentId: string): Observable<Blob> {
    return this.http.get(`/api/v1/assignments/${assignmentId}/submissions/export`, {
      responseType: 'blob'
    });
  }

  // Get all teacher assignments (for management view)  
  // Note: This will need to aggregate from multiple courses
  getTeacherAssignments(params?: { page?: number; limit?: number; courseId?: string; status?: string }) {
    // For now, we'll need to get assignments from all teacher's courses
    // This is a temporary solution until backend provides a dedicated endpoint
    return this.api.getWithResponse<AssignmentSummary[]>(`/api/v1/assignments/teacher-summary`, { params });
  }
}