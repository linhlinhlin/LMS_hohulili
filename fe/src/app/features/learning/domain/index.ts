// Learning Domain Layer Exports
// Domain entities, value objects, repositories, and types

// Types
export type {
  LearningSessionId,
  ProgressId,
  BookmarkId,
  NoteId,
  StudentId,
  CourseId,
  LessonId,
  LearningSessionStatus,
  ProgressStatus,
  BookmarkType,
  NoteType,
  LearningPathStatus,
  SessionType,
  ValidationResult,
  LearningStatistics,
  ProgressFilters,
  BookmarkFilters,
  NoteFilters,
  LearningSortOptions,
  PaginationOptions,
  PaginatedResult
} from './types';

// Value Objects
export { SessionDuration } from './value-objects/session-duration';
export { ProgressPercentage } from './value-objects/progress-percentage';

// Entities
export type { LearningSessionMetadata } from './entities/learning-session.entity';
export type { ProgressMetadata } from './entities/progress.entity';
export type { BookmarkMetadata } from './entities/bookmark.entity';
export { LearningSession } from './entities/learning-session.entity';
export { Progress } from './entities/progress.entity';
export { Bookmark } from './entities/bookmark.entity';

// Repositories
export type {
  LearningSessionRepository,
  LearningSessionStatistics,
  CourseSessionStatistics
} from './repositories/learning-session.repository';
export type {
  ProgressRepository,
  StudentProgressStatistics,
  CourseProgressStatistics,
  StudentCourseProgress
} from './repositories/progress.repository';
export type {
  BookmarkRepository,
  BookmarkStatistics,
  CourseBookmarkStatistics
} from './repositories/bookmark.repository';