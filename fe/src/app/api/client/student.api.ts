import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/common.types';
import { map } from 'rxjs/operators';

/**
 * Student API Endpoints - V3
 */
const STUDENT_ENDPOINTS = {
  // Teacher Student Management
  TEACHER_STUDENTS: '/api/v3/teacher/students',
  STUDENT_DETAIL: (studentId: string) => `/api/v3/teacher/students/${studentId}`,
  STUDENT_STATUS: (studentId: string) => `/api/v3/teacher/students/${studentId}/status`,
  STUDENT_ASSIGNMENTS: (studentId: string) => `/api/v3/teacher/students/${studentId}/assignments`,
  STUDENT_ANALYTICS: (studentId: string) => `/api/v3/teacher/students/${studentId}/analytics`,
  STUDENT_MESSAGES: (studentId: string) => `/api/v3/teacher/students/${studentId}/messages`,
  STUDENT_EXPORT: (studentId: string) => `/api/v3/teacher/students/${studentId}/export`,

  // Course Students
  COURSE_STUDENTS: (courseId: string) => `/api/v3/courses/${courseId}/students`,
  COURSE_STUDENT_PROGRESS: (courseId: string, studentId: string) =>
    `/api/v3/courses/${courseId}/students/${studentId}/progress`,
  REMOVE_STUDENT: (courseId: string, studentId: string) =>
    `/api/v3/courses/${courseId}/students/${studentId}`
} as const;

export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  lastAccessed?: string;
  progress: number;
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
  totalStudyTime: number;
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

  /**
   * Get students enrolled in teacher's courses
   */
  getTeacherStudents(params?: {
    page?: number;
    limit?: number;
    courseId?: string;
    status?: string;
    search?: string;
  }) {
    const cleanParams: any = {};

    if (params) {
      if (params.page !== undefined) cleanParams.page = params.page;
      if (params.limit !== undefined) cleanParams.size = params.limit;
      if (params.courseId) cleanParams.courseId = params.courseId;
      if (params.status) cleanParams.status = params.status;
      if (params.search) cleanParams.search = params.search;
    }

    return this.api.getWithResponse<any>(STUDENT_ENDPOINTS.TEACHER_STUDENTS, { params: cleanParams }).pipe(
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

  /**
   * Get students by course
   */
  getStudentsByCourse(courseId: string, params?: { page?: number; limit?: number }) {
    return this.api.getWithResponse<any>(STUDENT_ENDPOINTS.COURSE_STUDENTS(courseId), { params }).pipe(
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

  /**
   * Get detailed student information
   */
  getStudentDetail(studentId: string) {
    return this.api.getWithResponse<StudentDetail>(STUDENT_ENDPOINTS.STUDENT_DETAIL(studentId));
  }

  /**
   * Get student progress in specific course
   */
  getStudentCourseProgress(studentId: string, courseId: string) {
    return this.api.getWithResponse<StudentCourseProgress>(
      STUDENT_ENDPOINTS.COURSE_STUDENT_PROGRESS(courseId, studentId)
    );
  }

  /**
   * Get student assignment submissions
   */
  getStudentAssignments(studentId: string, params?: { courseId?: string; status?: string }) {
    return this.api.getWithResponse<StudentAssignmentSummary[]>(
      STUDENT_ENDPOINTS.STUDENT_ASSIGNMENTS(studentId),
      { params }
    );
  }

  /**
   * Get student analytics
   */
  getStudentAnalytics(studentId: string, params?: { courseId?: string; timeRange?: string }) {
    return this.api.getWithResponse<StudentAnalytics>(
      STUDENT_ENDPOINTS.STUDENT_ANALYTICS(studentId),
      { params }
    );
  }

  /**
   * Update student status (activate/deactivate/suspend)
   */
  updateStudentStatus(studentId: string, status: 'active' | 'inactive' | 'suspended') {
    return this.api.patchWithResponse<StudentSummary>(
      STUDENT_ENDPOINTS.STUDENT_STATUS(studentId),
      { status }
    );
  }

  /**
   * Remove student from course
   */
  removeStudentFromCourse(courseId: string, studentId: string) {
    return this.api.deleteWithResponse<string>(
      STUDENT_ENDPOINTS.REMOVE_STUDENT(courseId, studentId)
    );
  }

  /**
   * Send message to student
   */
  sendMessageToStudent(studentId: string, message: { subject: string; content: string }) {
    return this.api.postWithResponse<string>(
      STUDENT_ENDPOINTS.STUDENT_MESSAGES(studentId),
      message
    );
  }

  /**
   * Export student progress report
   */
  exportStudentReport(studentId: string, format: 'pdf' | 'excel' = 'pdf') {
    return this.api.get<Blob>(STUDENT_ENDPOINTS.STUDENT_EXPORT(studentId), {
      params: { format },
      responseType: 'blob'
    });
  }
}
