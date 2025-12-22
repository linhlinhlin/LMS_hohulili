/**
 * Value Objects barrel export
 */
export {
  createEmptyContext,
  createCourseContext,
  createLessonContext,
  mergeContexts,
  hasCourseContext,
  hasLessonContext,
  isEmptyContext,
  getContextSummary,
} from './chat-context.vo';

export {
  createMessageSource,
  hasSourceUrl,
  getSourcePreview,
  isValidSource,
  sortSourcesByTitle,
} from './message-source.vo';

export {
  USER_ROLES,
  DEFAULT_ROLE,
  isValidRole,
  parseRole,
  isElevatedRole,
  isAuthenticatedRole,
  getRoleDisplayName,
  getRolePriority,
} from './user-role.vo';

// Re-export types
export type { ChatContext } from './chat-context.vo';
export type { MessageSource } from './message-source.vo';
export type { UserRole } from './user-role.vo';

