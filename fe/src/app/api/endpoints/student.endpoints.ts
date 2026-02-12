/**
 * Student Endpoints - Centralized API paths
 * @see StudentEnrollmentControllerV3 @ /api/v3/student
 */
export const STUDENT_ENDPOINTS = {
    // Base
    BASE: '/api/v3/student',

    // Courses (BE: StudentEnrollmentControllerV3)
    MY_COURSES: '/api/v3/student/courses/enrolled',
    COURSE_PROGRESS: (courseId: string) => `/api/v3/student/progress/courses/${courseId}`,
    COMPLETED_IDS: (courseId: string) => `/api/v3/student/progress/courses/${courseId}/completed-ids`,
    NEXT_LESSON: (courseId: string) => `/api/v3/student/progress/courses/${courseId}/next-lesson`,

    // Lessons (BE: StudentEnrollmentControllerV3)
    LESSON_PROGRESS: (lessonId: string) => `/api/v3/student/lessons/${lessonId}/progress`,
    MARK_COMPLETE: (lessonId: string) => `/api/v3/student/progress/lessons/${lessonId}/complete`,

    // Assignments (BE: StudentEnrollmentControllerV3)
    MY_ASSIGNMENTS: '/api/v3/student/assignments',
    ASSIGNMENT_DETAIL: (assignmentId: string) => `/api/v3/student/assignments/${assignmentId}`,

    // Grades (BE: StudentEnrollmentControllerV3)
    MY_GRADES: '/api/v3/student/grades',

    // Certificates (BE: StudentEnrollmentControllerV3)
    MY_CERTIFICATES: '/api/v3/student/certificates',
    VERIFY_CERTIFICATE: (token: string) => `/api/v3/student/certificates/${token}/verify`,

    // Analytics (BE: StudentAnalyticsControllerV3)
    ANALYTICS: '/api/v3/student/analytics',
} as const;
