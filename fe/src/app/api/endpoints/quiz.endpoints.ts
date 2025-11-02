export const QUIZ_ENDPOINTS = {
  // Quiz CRUD
  QUIZZES: '/api/v1/quizzes',
  QUIZ_BY_ID: (id: string) => `/api/v1/quizzes/${id}`,
  QUIZZES_BY_COURSE: (courseId: string) => `/api/v1/courses/${courseId}/quizzes`,
  QUIZZES_BY_INSTRUCTOR: (instructorId: string) => `/api/v1/instructors/${instructorId}/quizzes`,

  // Quiz actions
  PUBLISH_QUIZ: (id: string) => `/api/v1/quizzes/${id}/publish`,
  ARCHIVE_QUIZ: (id: string) => `/api/v1/quizzes/${id}/archive`,

  // Quiz attempts
  QUIZ_ATTEMPTS: (quizId: string) => `/api/v1/quizzes/${quizId}/attempts`,
  QUIZ_ATTEMPT_BY_ID: (attemptId: string) => `/api/v1/quiz-attempts/${attemptId}`,
  STUDENT_ATTEMPTS: (studentId: string) => `/api/v1/students/${studentId}/quiz-attempts`,
  START_ATTEMPT: (quizId: string) => `/api/v1/quizzes/${quizId}/attempts`,
  SUBMIT_ATTEMPT: (attemptId: string) => `/api/v1/quiz-attempts/${attemptId}/submit`,

  // Quiz statistics
  QUIZ_STATISTICS: (quizId: string) => `/api/v1/quizzes/${quizId}/statistics`,
  STUDENT_QUIZ_HISTORY: (studentId: string) => `/api/v1/students/${studentId}/quiz-history`
} as const;