import { API } from './api.config';

export const QUIZ_ENDPOINTS = {
  // Quiz CRUD
  QUIZZES: `${API.BASE}/quizzes`,
  QUIZ_BY_ID: (id: string) => `${API.BASE}/quizzes/${id}`,
  QUIZZES_BY_COURSE: (courseId: string) => `${API.BASE}/courses/${courseId}/quizzes`,
  QUIZZES_BY_INSTRUCTOR: (instructorId: string) => `${API.BASE}/instructors/${instructorId}/quizzes`,

  // Quiz actions
  PUBLISH_QUIZ: (id: string) => `${API.BASE}/quizzes/${id}/publish`,
  ARCHIVE_QUIZ: (id: string) => `${API.BASE}/quizzes/${id}/archive`,

  // Quiz attempts
  QUIZ_ATTEMPTS: (quizId: string) => `${API.BASE}/quizzes/${quizId}/attempts`,
  QUIZ_ATTEMPT_BY_ID: (attemptId: string) => `${API.BASE}/quiz-attempts/${attemptId}`,
  STUDENT_ATTEMPTS: (studentId: string) => `${API.BASE}/students/${studentId}/quiz-attempts`,
  START_ATTEMPT: (quizId: string) => `${API.BASE}/quizzes/${quizId}/attempts`,
  SUBMIT_ATTEMPT: (attemptId: string) => `${API.BASE}/quiz-attempts/${attemptId}/submit`,

  // Quiz statistics
  QUIZ_STATISTICS: (quizId: string) => `${API.BASE}/quizzes/${quizId}/statistics`,
  STUDENT_QUIZ_HISTORY: (studentId: string) => `${API.BASE}/students/${studentId}/quiz-history`
} as const;
