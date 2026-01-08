export const COURSE_ENDPOINTS = {
  // Public / Shared
  BASE: '/api/v3/courses',
  CONTENT: (id: string) => `/api/v3/courses/${id}/content`,

  // Teacher / Management
  TEACHER: {
    BASE: '/api/v3/teacher/courses',
    MY_COURSES: '/api/v3/teacher/courses/my-courses',
    BY_ID: (id: string) => `/api/v3/teacher/courses/${id}`,
    ENROLLMENTS: (id: string) => `/api/v3/teacher/courses/${id}/enrollments`,
    // Mapping legacy endpoints to V3
    BULK_ENROLL: (id: string) => `/api/v3/teacher/courses/${id}/bulk-enroll`,
    SUBMIT_APPROVAL: (id: string) => `/api/v3/teacher/courses/${id}/submit-for-approval`,
    CANCEL_APPROVAL: (id: string) => `/api/v3/teacher/courses/${id}/cancel-approval`,
    REVIEW_STATUS: (id: string) => `/api/v3/teacher/courses/${id}/review-status`,
    AVAILABLE_CLASSES: (id: string) => `/api/v3/teacher/courses/${id}/classes/available`,
    AVAILABLE_STUDENTS: (id: string) => `/api/v3/teacher/courses/${id}/available-students`,
    ENROLLED_STUDENTS: (id: string) => `/api/v3/teacher/courses/${id}/students`
  },

  // Authoring (Content Editing)
  AUTHORING: {
    PUBLISH: (id: string) => `/api/v3/authoring/courses/${id}/publish`
  },

  // Student
  STUDENT: {
    ENROLLED: '/api/v3/student/courses/enrolled',
    PROGRESS: (id: string) => `/api/v3/student/progress/courses/${id}`,
    NEXT_LESSON: (id: string) => `/api/v3/student/progress/courses/${id}/next-lesson`
  },

  // Backward Compatibility (Deprecated - prevent runtime errors if used directly)
  CREATE: '/api/v3/teacher/courses',
  MY_COURSES: '/api/v3/teacher/courses/my-courses',
  ENROLLED_COURSES: '/api/v3/student/courses/enrolled',
  BY_ID: (id: string) => `/api/v3/teacher/courses/${id}`, // Default to teacher for now as it's most common in this module
  PUBLISH: (id: string) => `/api/v3/authoring/courses/${id}/publish`,
  ENROLLMENTS: (id: string) => `/api/v3/teacher/courses/${id}/enrollments`
} as const;
