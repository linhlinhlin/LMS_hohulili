/**
 * Quiz API Endpoints - V3
 * Standardized RESTful endpoints for Quiz operations
 * Backend: QuizControllerV3 @ /api/v3/quizzes
 */
export const QUIZ_ENDPOINTS = {
  // === Quiz CRUD ===
  QUIZZES: '/api/v3/quizzes',
  QUIZ_BY_ID: (id: string) => `/api/v3/quizzes/${id}`,
  QUIZZES_BY_LESSON: (lessonId: string) => `/api/v3/quizzes/lessons/${lessonId}`,

  // === Quiz Actions ===
  DELETE_QUIZ: (id: string) => `/api/v3/quizzes/${id}`,
  PUBLISH_QUIZ: (id: string) => `/api/v3/quizzes/${id}/publish`,

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
  SAVE_ATTEMPT: (attemptId: string) => `/api/v3/quizzes/attempts/${attemptId}/save`,
  ATTEMPT_RESULT: (attemptId: string) => `/api/v3/quizzes/attempts/${attemptId}`,
  STUDENT_ATTEMPTS: '/api/v3/quizzes/student/my-attempts',

  // === Manual Grading (Teacher) ===
  MANUAL_GRADE: (attemptId: string) => `/api/v3/quizzes/attempts/${attemptId}/grade`,

  // === Quiz Statistics ===
  QUIZ_STATISTICS: (lessonId: string) => `/api/v3/quizzes/lessons/${lessonId}/statistics`,

  // === Teacher Quiz Management ===
  TEACHER_QUIZZES: '/api/v3/quizzes/teacher/quizzes',
} as const;
