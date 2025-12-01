/**
 * ChatContext Value Object
 * Contains learning environment context for AI responses
 */
import { ChatContext } from '../types';

/**
 * Create an empty ChatContext
 */
export function createEmptyContext(): ChatContext {
  return {};
}

/**
 * Create ChatContext from course page
 */
export function createCourseContext(
  courseId: string,
  pageUrl?: string
): ChatContext {
  return {
    courseId,
    pageUrl,
  };
}

/**
 * Create ChatContext from lesson page
 */
export function createLessonContext(
  courseId: string,
  lessonId: string,
  pageUrl?: string
): ChatContext {
  return {
    courseId,
    lessonId,
    pageUrl,
  };
}

/**
 * Merge two contexts, with second taking precedence
 */
export function mergeContexts(
  base: ChatContext,
  override: Partial<ChatContext>
): ChatContext {
  return {
    ...base,
    ...override,
    additionalData: {
      ...base.additionalData,
      ...override.additionalData,
    },
  };
}

/**
 * Check if context has course information
 */
export function hasCourseContext(context: ChatContext): boolean {
  return !!context.courseId;
}

/**
 * Check if context has lesson information
 */
export function hasLessonContext(context: ChatContext): boolean {
  return !!context.lessonId;
}

/**
 * Check if context is empty
 */
export function isEmptyContext(context: ChatContext): boolean {
  return (
    !context.courseId &&
    !context.lessonId &&
    !context.pageUrl &&
    (!context.additionalData ||
      Object.keys(context.additionalData).length === 0)
  );
}

/**
 * Extract context summary for display
 */
export function getContextSummary(context: ChatContext): string {
  const parts: string[] = [];
  if (context.courseId) parts.push(`Course: ${context.courseId}`);
  if (context.lessonId) parts.push(`Lesson: ${context.lessonId}`);
  return parts.join(', ') || 'No context';
}

// Re-export type
export type { ChatContext };
