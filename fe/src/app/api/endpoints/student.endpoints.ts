/**
 * Student Endpoints - Centralized API paths
 * @see StudentControllerV3, StudentProgressControllerV3
 */
export const STUDENT_ENDPOINTS = {
    // Base
    BASE: '/api/v3/student',

    // Courses
    MY_COURSES: '/api/v3/student/courses',
    COURSE_PROGRESS: (courseId: string) => `/api/v3/student/courses/${courseId}/progress`,
    COMPLETED_IDS: (courseId: string) => `/api/v3/student/progress/courses/${courseId}/completed-ids`,

    // Lessons
    LESSON_PROGRESS: (lessonId: string) => `/api/v3/student/lessons/${lessonId}/progress`,
    MARK_COMPLETE: (lessonId: string) => `/api/v3/student/lessons/${lessonId}/complete`,

    // Assignments
    MY_ASSIGNMENTS: '/api/v3/student/assignments',
    ASSIGNMENT_DETAIL: (assignmentId: string) => `/api/v3/student/assignments/${assignmentId}`,

    // Quizzes
    MY_QUIZZES: '/api/v3/student/quizzes',
    QUIZ_DETAIL: (quizId: string) => `/api/v3/student/quizzes/${quizId}`,
    START_QUIZ: (quizId: string) => `/api/v3/student/quizzes/${quizId}/start`,
    SUBMIT_QUIZ: (quizId: string) => `/api/v3/student/quizzes/${quizId}/submit`,

    // Grades
    MY_GRADES: '/api/v3/student/grades',
    CLASS_GRADES: (classId: string) => `/api/v3/student/classes/${classId}/grades`,
} as const;
