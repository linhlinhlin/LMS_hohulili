// Mapped to V3 "ContentBlock" (Section inside Lesson)
export const SECTION_ENDPOINTS = {
  CREATE: (lessonId: string) => `/api/v3/courses/lessons/${lessonId}/sections`,
  UPDATE: (sectionId: string) => {
    // NOTE: Backend needs lessonId in path? 
    // Current backend impl: /lessons/{lessonId}/sections/{sectionId}
    // Frontend UpdateSectionRequest usually doesn't carry lessonId?
    // We might need to adjust SectionApi to pass lessonId or change Backend to not need it?
    // Actually Backend ManageContentBlockUseCase only needs LessonId to find the entity.
    // If we only have sectionId, we can't find it easily if content blocks are embedded json.
    // So we need lessonId.
    return `/api/v3/courses/lessons/{lessonId}/sections/${sectionId}`;
  },
  DELETE: (sectionId: string) => `/api/v3/courses/lessons/{lessonId}/sections/${sectionId}`, // Placeholder, need lessonId
  GET: (sectionId: string) => `/api/v3/courses/lessons/{lessonId}/sections/${sectionId}`,

  // Video update not yet implemented in V3.
  UPDATE_VIDEO: (sectionId: string) => `/api/v3/courses/lessons/{lessonId}/sections/${sectionId}/video`
} as const;
