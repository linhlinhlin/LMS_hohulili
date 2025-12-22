/**
 * ContextExtractor Utility
 * Extracts course and lesson context from routes and URLs
 */
import { ChatContext } from '../domain/types';

/**
 * Route patterns for context extraction
 */
const ROUTE_PATTERNS = {
  courseId: [
    /\/courses\/([a-zA-Z0-9_-]+)/,
    /\/course\/([a-zA-Z0-9_-]+)/,
    /courseId=([a-zA-Z0-9_-]+)/,
  ],
  lessonId: [
    /\/lessons\/([a-zA-Z0-9_-]+)/,
    /\/lesson\/([a-zA-Z0-9_-]+)/,
    /lessonId=([a-zA-Z0-9_-]+)/,
  ],
  moduleId: [
    /\/modules\/([a-zA-Z0-9_-]+)/,
    /\/module\/([a-zA-Z0-9_-]+)/,
  ],
  assignmentId: [
    /\/assignments\/([a-zA-Z0-9_-]+)/,
    /\/assignment\/([a-zA-Z0-9_-]+)/,
  ],
};

/**
 * Extract context from URL string
 */
export function extractContextFromUrl(url: string): ChatContext {
  if (!url) return {};

  const context: ChatContext = {
    pageUrl: url,
  };

  // Extract courseId
  for (const pattern of ROUTE_PATTERNS.courseId) {
    const match = url.match(pattern);
    if (match) {
      context.courseId = match[1];
      break;
    }
  }

  // Extract lessonId
  for (const pattern of ROUTE_PATTERNS.lessonId) {
    const match = url.match(pattern);
    if (match) {
      context.lessonId = match[1];
      break;
    }
  }

  // Extract additional data
  const additionalData: Record<string, string> = {};

  // Module ID
  for (const pattern of ROUTE_PATTERNS.moduleId) {
    const match = url.match(pattern);
    if (match) {
      additionalData['moduleId'] = match[1];
      break;
    }
  }

  // Assignment ID
  for (const pattern of ROUTE_PATTERNS.assignmentId) {
    const match = url.match(pattern);
    if (match) {
      additionalData['assignmentId'] = match[1];
      break;
    }
  }

  if (Object.keys(additionalData).length > 0) {
    context.additionalData = additionalData;
  }

  return context;
}

/**
 * Extract context from route params object
 */
export function extractContextFromParams(
  params: Record<string, string | undefined>
): ChatContext {
  const context: ChatContext = {};

  if (params['courseId']) {
    context.courseId = params['courseId'];
  }

  if (params['lessonId']) {
    context.lessonId = params['lessonId'];
  }

  const additionalData: Record<string, string> = {};

  if (params['moduleId']) {
    additionalData['moduleId'] = params['moduleId'];
  }

  if (params['assignmentId']) {
    additionalData['assignmentId'] = params['assignmentId'];
  }

  if (Object.keys(additionalData).length > 0) {
    context.additionalData = additionalData;
  }

  return context;
}

/**
 * Merge URL context with params context
 */
export function mergeExtractedContexts(
  urlContext: ChatContext,
  paramsContext: ChatContext
): ChatContext {
  return {
    ...urlContext,
    ...paramsContext,
    additionalData: {
      ...urlContext.additionalData,
      ...paramsContext.additionalData,
    },
  };
}

/**
 * Get page type from URL
 */
export function getPageType(url: string): string {
  if (!url) return 'unknown';

  if (url.includes('/lesson')) return 'lesson';
  if (url.includes('/course')) return 'course';
  if (url.includes('/assignment')) return 'assignment';
  if (url.includes('/quiz')) return 'quiz';
  if (url.includes('/dashboard')) return 'dashboard';
  if (url.includes('/ai-chat')) return 'chat';

  return 'other';
}

/**
 * Check if context has learning-related information
 */
export function hasLearningContext(context: ChatContext): boolean {
  return !!(context.courseId || context.lessonId);
}

/**
 * Format context for display
 */
export function formatContextForDisplay(context: ChatContext): string {
  const parts: string[] = [];

  if (context.courseId) {
    parts.push(`Khóa học: ${context.courseId}`);
  }

  if (context.lessonId) {
    parts.push(`Bài học: ${context.lessonId}`);
  }

  if (context.additionalData?.['moduleId']) {
    parts.push(`Module: ${context.additionalData['moduleId']}`);
  }

  if (context.additionalData?.['assignmentId']) {
    parts.push(`Bài tập: ${context.additionalData['assignmentId']}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Không có ngữ cảnh';
}

