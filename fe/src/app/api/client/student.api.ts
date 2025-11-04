import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  lastAccessed?: string;
  progress: number; // Overall progress percentage
  averageGrade: number;
  status: 'active' | 'inactive' | 'suspended';
  completedCourses: number;
  totalCourses: number;
}

export interface StudentDetail extends StudentSummary {
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  address?: string;
  courseProgress: StudentCourseProgress[];
  assignmentSubmissions: StudentAssignmentSummary[];
  analytics: StudentAnalytics;
}

export interface StudentCourseProgress {
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessed?: string;
  grade?: number;
  status: 'in-progress' | 'completed' | 'dropped';
}

export interface StudentAssignmentSummary {
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  dueDate?: string;
  submittedAt?: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  score?: number;
  maxScore?: number;
  feedback?: string;
}

export interface StudentAnalytics {
  totalStudyTime: number; // in minutes
  averageSessionTime: number;
  streakDays: number;
  assignmentsCompleted: number;
  assignmentsOverdue: number;
  averageScore: number;
  strongSubjects: string[];
  improvementAreas: string[];
  learningActivity: {
    date: string;
    studyTime: number;
    lessonsCompleted: number;
  }[];
}

export interface StudentFilters {
  courseId?: string;
  status?: 'active' | 'inactive' | 'suspended';
  progressMin?: number;
  progressMax?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class StudentApi {
  private api = inject(ApiClient);

  // Get students enrolled in teacher's courses
  getTeacherStudents(params?: { 
    page?: number; 
    limit?: number; 
    courseId?: string;
    status?: string;
    search?: string;
  }) {
    return this.api.getWithResponse<any>('/api/v1/teacher/students', { params }).pipe(
      map((res: ApiResponse<any>) => {
        const content: StudentSummary[] = res?.data?.content ?? [];
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<StudentSummary[]>;
      })
    );
  }

  // Get students by course
  getStudentsByCourse(courseId: string, params?: { page?: number; limit?: number }) {
    return this.api.getWithResponse<any>(`/api/v1/courses/${courseId}/students`, { params }).pipe(
      map((res: ApiResponse<any>) => {
        const content: StudentSummary[] = res?.data?.content ?? [];
        return {
          data: content,
          pagination: res?.pagination,
          message: res?.message
        } as ApiResponse<StudentSummary[]>;
      })
    );
  }

  // Get detailed student information
  getStudentDetail(studentId: string) {
    return this.api.getWithResponse<StudentDetail>(`/api/v1/teacher/students/${studentId}`);
  }

  // Get student progress in specific course
  getStudentCourseProgress(studentId: string, courseId: string) {
    return this.api.getWithResponse<StudentCourseProgress>(`/api/v1/courses/${courseId}/students/${studentId}/progress`);
  }

  // Get student assignment submissions
  getStudentAssignments(studentId: string, params?: { courseId?: string; status?: string }) {
    return this.api.getWithResponse<StudentAssignmentSummary[]>(`/api/v1/teacher/students/${studentId}/assignments`, { params });
  }

  // Get student analytics
  getStudentAnalytics(studentId: string, params?: { courseId?: string; timeRange?: string }) {
    return this.api.getWithResponse<StudentAnalytics>(`/api/v1/teacher/students/${studentId}/analytics`, { params });
  }

  // Update student status (activate/deactivate/suspend)
  updateStudentStatus(studentId: string, status: 'active' | 'inactive' | 'suspended') {
    return this.api.patchWithResponse<StudentSummary>(`/api/v1/teacher/students/${studentId}/status`, { status });
  }

  // Remove student from course
  removeStudentFromCourse(courseId: string, studentId: string) {
    return this.api.deleteWithResponse<string>(`/api/v1/courses/${courseId}/students/${studentId}`);
  }

  // Send message to student
  sendMessageToStudent(studentId: string, message: { subject: string; content: string }) {
    return this.api.postWithResponse<string>(`/api/v1/teacher/students/${studentId}/messages`, message);
  }

  // Export student progress report
  exportStudentReport(studentId: string, format: 'pdf' | 'excel' = 'pdf') {
    return this.api.get<Blob>(`/api/v1/teacher/students/${studentId}/export`, {
      params: { format },
      responseType: 'blob'
    });
  }
}