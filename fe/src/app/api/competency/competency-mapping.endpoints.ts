export const COMPETENCY_ENDPOINTS = {
  STANDARDS: '/api/v3/standards',
  COMPETENCIES_BY_STANDARD: (standardId: string) =>
    `/api/v3/standards/${standardId}/competencies`,
  COURSE_COMPETENCY_MAP: (courseId: string) =>
    `/api/v3/courses/${courseId}/competency-map`,
  EXPORT_CSV: (courseId: string) =>
    `/api/v3/courses/${courseId}/competency-map/export`,
  LESSON_COMPETENCIES: (lessonId: string) =>
    `/api/v3/lessons/${lessonId}/competencies`,
} as const;
