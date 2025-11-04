export const LESSON_ASSIGNMENT_ENDPOINTS = {
  BASE: '/lesson-assignments',
  ASSIGN: (lessonId: string, studentId: string) => `/lesson-assignments?lessonId=${lessonId}&studentId=${studentId}`,
  LIST_BY_LESSON: (lessonId: string) => `/lesson-assignments?lessonId=${lessonId}`,
  UNASSIGN: (lessonId: string, studentId: string) => `/lesson-assignments?lessonId=${lessonId}&studentId=${studentId}`
};
