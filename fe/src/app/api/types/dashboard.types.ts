/**
 * Dashboard Types
 * Types for admin, teacher, and student dashboards
 * PostgreSQL Tables: users, courses, enrollments, assignments
 */

// =======================
// Admin Dashboard Types
// =======================

export interface AdminDashboardStats {
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    totalCourses: number;
    pendingApprovals: number;
    totalEnrollments: number;
    totalRevenue: number;
}

export interface PendingApproval {
    id: string;
    title: string;
    type: 'course' | 'teacher' | 'content';
    submittedBy: string;
    submittedAt: string; // ISO 8601
    status: 'pending' | 'approved' | 'rejected';
}

export interface RevenueData {
    period: string;
    revenue: number;
    enrollments: number;
    date?: string; // ISO 8601
}

// =======================
// Teacher Dashboard Types
// =======================

export interface TeacherDashboardStats {
    totalCourses: number;
    activeCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
    pendingAssignments: number;
}

export interface Activity {
    id: string;
    type: 'enrollment' | 'submission' | 'comment' | 'review' | 'payment';
    title: string;
    description: string;
    timestamp: string; // ISO 8601
    userId?: string;
    userName?: string;
    courseId?: string;
    courseName?: string;
}

// =======================
// Student Dashboard Types
// =======================

export interface StudentDashboardStats {
    enrolledCourses: number;
    completedCourses: number;
    completedLessons: number;
    averageProgress: number;
    totalStudyTime: number;
    certificates: number;
}

export interface NextItem {
    id: string;
    type: 'lesson' | 'quiz' | 'assignment';
    title: string;
    courseId: string;
    courseName: string;
    thumbnailUrl?: string;
    estimatedTime?: number;
}

// =======================
// UI Pagination Types (UI-specific, different from common.types.ts)
// =======================

export interface UIPaginationState {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface PagedResult<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
    };
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

// =======================
// Bulk Import Types
// =======================

export interface BulkImportProgress {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    status: 'preparing' | 'importing' | 'completed' | 'failed';
    errors?: string[];
}

