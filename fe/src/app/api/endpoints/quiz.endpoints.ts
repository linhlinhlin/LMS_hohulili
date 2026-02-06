/**
 * Quiz API Endpoints - V3
 * Standardized RESTful endpoints for Quiz operations
 * Backend: QuizControllerV3 @ /api/v3/quizzes
 */
export const QUIZ_ENDPOINTS = {
  // === Quiz CRUD ===
  QUIZZES: '/api/v3/quizzes',
  QUIZ_BY_ID: (id: string) => `/api/v3/quizzes/${id}`,
  QUIZZES_BY_COURSE: (courseId: string) => `/api/v3/courses/${courseId}/quizzes`,
  QUIZZES_BY_LESSON: (lessonId: string) => `/api/v3/quizzes/lessons/${lessonId}`,

  // === Quiz Actions ===
  PUBLISH_QUIZ: (id: string) => `/api/v3/quizzes/${id}/publish`,
  ARCHIVE_QUIZ: (id: string) => `/api/v3/quizzes/${id}/archive`,

  // === Quiz Questions (by quizId - matches QuizControllerV3) ===
  QUIZ_QUESTIONS: (quizId: string) => `/api/v3/quizzes/${quizId}/questions`,
  ADD_QUESTION: (quizId: string) => `/api/v3/quizzes/${quizId}/questions`,
  REMOVE_QUESTION: (quizId: string, questionId: string) =>
    `/api/v3/quizzes/${quizId}/questions/${questionId}`,

  // === Quiz Settings ===
  QUIZ_SETTINGS: (quizId: string) => `/api/v3/quizzes/${quizId}/settings`,

  // === Quiz Attempts (Student) - matches QuizControllerV3 ===
  QUIZ_ATTEMPTS: (quizId: string) => `/api/v3/quizzes/${quizId}/attempts`,
  START_ATTEMPT: (quizId: string) => `/api/v3/quizzes/${quizId}/attempts/start`,
  SUBMIT_ATTEMPT: (attemptId: string) => `/api/v3/quizzes/attempts/${attemptId}/submit`,
  ATTEMPT_RESULT: (attemptId: string) => `/api/v3/quizzes/attempts/${attemptId}`,

  // === Quiz Attempts (Teacher View) ===
  LESSON_ATTEMPTS: (lessonId: string) => `/api/v3/quizzes/lessons/${lessonId}/attempts`,

  // === Quiz Statistics ===
  QUIZ_STATISTICS: (lessonId: string) => `/api/v3/quizzes/lessons/${lessonId}/statistics`,

  // === Teacher Quiz Management ===
  TEACHER_QUIZZES: '/api/v3/quizzes/teacher/quizzes',
  TEACHER_ASSIGNMENTS: '/api/v3/quizzes/assignments',

  // === Quiz Assignments ===
  QUIZ_ASSIGNMENTS: (quizId: string) => `/api/v3/quizzes/${quizId}/assignments`,

  // === Quiz Auto-populate ===
  AUTO_POPULATE: (lessonId: string) => `/api/v3/quizzes/lessons/${lessonId}/auto-populate-questions`,
  CREATE_SAMPLE: (lessonId: string) => `/api/v3/quizzes/lessons/${lessonId}/create-sample-questions`,
} as const;
