import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClient } from './api-client';
import { ApiResponse, Page as ApiPage, PaginationInfo } from '../types/common.types';

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

export type StudentEnrollmentStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DROPPED'
  | 'EXPIRED'
  | 'SUSPENDED';

export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  lastAccessed?: string;
  progress: number;
  averageGrade: number;
  status: StudentEnrollmentStatus;
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
  analytics?: StudentAnalytics;
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
  status?: StudentEnrollmentStatus | 'INACTIVE';
  progressMin?: number;
  progressMax?: number;
  search?: string;
}

export interface StudentStatusCounts {
  total: number;
  active: number;
  completed: number;
  suspended: number;
}

const DEFAULT_ANALYTICS: StudentAnalytics = {
  totalStudyTime: 0,
  averageSessionTime: 0,
  streakDays: 0,
  assignmentsCompleted: 0,
  assignmentsOverdue: 0,
  averageScore: 0,
  strongSubjects: [],
  improvementAreas: [],
  learningActivity: []
};

function normalizeStudentStatus(status?: string): StudentEnrollmentStatus {
  switch ((status ?? '').toUpperCase()) {
    case 'COMPLETED':
      return 'COMPLETED';
    case 'DROPPED':
      return 'DROPPED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'SUSPENDED':
      return 'SUSPENDED';
    case 'ACTIVE':
    default:
      return 'ACTIVE';
  }
}

function normalizeCourseProgressStatus(status?: string): StudentCourseProgress['status'] {
  switch ((status ?? '').toLowerCase()) {
    case 'completed':
      return 'completed';
    case 'dropped':
    case 'expired':
      return 'dropped';
    case 'in-progress':
    default:
      return 'in-progress';
  }
}

function normalizeAssignmentStatus(status?: string): StudentAssignmentSummary['status'] {
  switch ((status ?? '').toUpperCase()) {
    case 'GRADED':
      return 'graded';
    case 'SUBMITTED':
      return 'submitted';
    case 'OVERDUE':
      return 'overdue';
    case 'PENDING':
    default:
      return 'pending';
  }
}

function buildPagination(page?: ApiPage<unknown>): PaginationInfo | undefined {
  if (!page) {
    return undefined;
  }

  return {
    totalItems: page.totalElements ?? 0,
    totalPages: Math.max(page.totalPages ?? 1, 1),
    page: (page.number ?? 0) + 1,
    limit: page.size ?? 0,
    first: !!page.first,
    last: !!page.last
  };
}

function mapStudentSummary(student: any): StudentSummary {
  return {
    id: String(student?.id ?? ''),
    name: student?.name ?? student?.fullName ?? '',
    email: student?.email ?? '',
    enrolledAt: student?.enrolledAt ?? '',
    lastAccessed: student?.lastAccessed ?? undefined,
    progress: Number(student?.progress ?? student?.progressPercentage ?? 0),
    averageGrade: Number(student?.averageGrade ?? 0),
    status: normalizeStudentStatus(student?.status),
    completedCourses: Number(student?.completedCourses ?? 0),
    totalCourses: Number(student?.totalCourses ?? 0)
  };
}

function mapStudentAssignment(assignment: any): StudentAssignmentSummary {
  return {
    assignmentId: String(assignment?.assignmentId ?? assignment?.id ?? ''),
    assignmentTitle: assignment?.assignmentTitle ?? assignment?.title ?? 'Assignment',
    courseTitle: assignment?.courseTitle ?? '',
    dueDate: assignment?.dueDate ?? undefined,
    submittedAt: assignment?.submittedAt ?? undefined,
    status: normalizeAssignmentStatus(assignment?.status),
    score: assignment?.score ?? assignment?.grade ?? undefined,
    maxScore: assignment?.maxScore ?? assignment?.maxGrade ?? undefined,
    feedback: assignment?.feedback ?? undefined
  };
}

function mapStudentCourseProgress(progress: any): StudentCourseProgress {
  return {
    courseId: String(progress?.courseId ?? ''),
    courseTitle: progress?.courseTitle ?? 'Course',
    enrolledAt: progress?.enrolledAt ?? '',
    progress: Number(progress?.progress ?? 0),
    completedLessons: Number(progress?.completedLessons ?? 0),
    totalLessons: Number(progress?.totalLessons ?? 0),
    lastAccessed: progress?.lastAccessed ?? undefined,
    grade: progress?.grade ?? undefined,
    status: normalizeCourseProgressStatus(progress?.status)
  };
}

function mapStudentDetail(student: any): StudentDetail {
  return {
    ...mapStudentSummary(student),
    phone: student?.phone ?? undefined,
    avatar: student?.avatar ?? undefined,
    dateOfBirth: student?.dateOfBirth ?? undefined,
    address: student?.address ?? undefined,
    courseProgress: (student?.courseProgress ?? []).map(mapStudentCourseProgress),
    assignmentSubmissions: (student?.assignmentSubmissions ?? []).map(mapStudentAssignment),
    analytics: student?.analytics ?? DEFAULT_ANALYTICS
  };
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
    size?: number;
    courseId?: string;
    status?: string;
    search?: string;
  }) {
    const cleanParams: Record<string, string | number> = {};

    if (params) {
      if (params.page !== undefined) cleanParams['page'] = params.page;
      if (params.size !== undefined) cleanParams['size'] = params.size;
      else if (params.limit !== undefined) cleanParams['size'] = params.limit;
      if (params.courseId) cleanParams['courseId'] = params.courseId;
      if (params.status) cleanParams['status'] = params.status;
      if (params.search) cleanParams['search'] = params.search;
    }

    return this.api
      .getWithResponse<ApiPage<any>>(STUDENT_ENDPOINTS.TEACHER_STUDENTS, { params: cleanParams })
      .pipe(
        map((res: ApiResponse<ApiPage<any>>) => {
          const page = res?.data;
          return {
            ...res,
            data: (page?.content ?? []).map(mapStudentSummary),
            pagination: buildPagination(page)
          } as ApiResponse<StudentSummary[]>;
        })
      );
  }

  /**
   * Lấy counts theo enrollment status cho 1 course.
   *
   * Fire 4 parallel requests (size=1) để lấy `totalElements` per status —
   * source of truth cho tab counts + subtitle breakdown stats.
   *
   * Lý do dùng forkJoin: BE chưa có endpoint dedicated `/counts`. Khi
   * scale lên hàng nghìn students, nên migrate sang BE endpoint trả về
   * `{total, active, completed, suspended}` trong 1 query.
   */
  getTeacherStudentCounts(courseId: string): Observable<StudentStatusCounts> {
    const fetchCount = (status?: StudentEnrollmentStatus): Observable<number> => {
      const params: Record<string, string | number> = { courseId, page: 0, size: 1 };
      if (status) params['status'] = status;
      return this.api
        .getWithResponse<ApiPage<unknown>>(STUDENT_ENDPOINTS.TEACHER_STUDENTS, { params })
        .pipe(map((res) => Number(res?.data?.totalElements ?? 0)));
    };

    return forkJoin({
      total: fetchCount(),
      active: fetchCount('ACTIVE'),
      completed: fetchCount('COMPLETED'),
      suspended: fetchCount('SUSPENDED')
    });
  }

  /**
   * Get students by course
   */
  getStudentsByCourse(courseId: string, params?: { page?: number; limit?: number; size?: number }) {
    const cleanParams: Record<string, string | number> = {};

    if (params) {
      if (params.page !== undefined) cleanParams['page'] = params.page;
      if (params.size !== undefined) cleanParams['size'] = params.size;
      else if (params.limit !== undefined) cleanParams['size'] = params.limit;
    }

    return this.api
      .getWithResponse<ApiPage<any>>(STUDENT_ENDPOINTS.COURSE_STUDENTS(courseId), { params: cleanParams })
      .pipe(
        map((res: ApiResponse<ApiPage<any>>) => {
          const page = res?.data;
          return {
            ...res,
            data: (page?.content ?? []).map(mapStudentSummary),
            pagination: buildPagination(page)
          } as ApiResponse<StudentSummary[]>;
        })
      );
  }

  /**
   * Get detailed student information
   */
  getStudentDetail(studentId: string) {
    return this.api.getWithResponse<any>(STUDENT_ENDPOINTS.STUDENT_DETAIL(studentId)).pipe(
      map((res: ApiResponse<any>) => ({
        ...res,
        data: res?.data ? mapStudentDetail(res.data) : res?.data
      }) as ApiResponse<StudentDetail>)
    );
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
    return this.api.getWithResponse<StudentAnalytics>(STUDENT_ENDPOINTS.STUDENT_ANALYTICS(studentId), {
      params
    });
  }

  /**
   * Update student status
   */
  updateStudentStatus(studentId: string, status: StudentEnrollmentStatus) {
    return this.api.patchWithResponse<StudentSummary>(STUDENT_ENDPOINTS.STUDENT_STATUS(studentId), {
      status
    });
  }

  /**
   * Remove student from course
   */
  removeStudentFromCourse(courseId: string, studentId: string) {
    return this.api.deleteWithResponse<string>(STUDENT_ENDPOINTS.REMOVE_STUDENT(courseId, studentId));
  }

  /**
   * Send message to student
   */
  sendMessageToStudent(studentId: string, message: { subject: string; content: string }) {
    return this.api.postWithResponse<string>(STUDENT_ENDPOINTS.STUDENT_MESSAGES(studentId), message);
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
