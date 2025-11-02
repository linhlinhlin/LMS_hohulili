// Domain Types for Learning Feature
// Following Domain-Driven Design principles

export type LearningSessionId = string & { readonly __brand: 'LearningSessionId' };
export type ProgressId = string & { readonly __brand: 'ProgressId' };
export type BookmarkId = string & { readonly __brand: 'BookmarkId' };
export type NoteId = string & { readonly __brand: 'NoteId' };
export type StudentId = string & { readonly __brand: 'StudentId' };
export type CourseId = string & { readonly __brand: 'CourseId' };
export type LessonId = string & { readonly __brand: 'LessonId' };

// Learning Session Status
export enum LearningSessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

// Progress Status
export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked'
}

// Bookmark Type
export enum BookmarkType {
  TIMESTAMP = 'timestamp',
  NOTE = 'note',
  IMPORTANT = 'important',
  REVIEW = 'review'
}

// Note Type
export enum NoteType {
  TEXT = 'text',
  HIGHLIGHT = 'highlight',
  QUESTION = 'question',
  SUMMARY = 'summary'
}

// Learning Path Status
export enum LearningPathStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

// Session Type
export enum SessionType {
  LESSON = 'lesson',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  REVIEW = 'review'
}

// Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Learning Statistics
export interface LearningStatistics {
  totalSessions: number;
  totalHours: number;
  completedLessons: number;
  averageScore: number;
  streakDays: number;
  certificatesEarned: number;
}

// Progress Filters
export interface ProgressFilters {
  courseId?: CourseId[];
  status?: ProgressStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  lessonType?: SessionType[];
}

// Bookmark Filters
export interface BookmarkFilters {
  type?: BookmarkType[];
  courseId?: CourseId[];
  lessonId?: LessonId[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Note Filters
export interface NoteFilters {
  type?: NoteType[];
  courseId?: CourseId[];
  lessonId?: LessonId[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Sort Options
export interface LearningSortOptions {
  field: 'createdAt' | 'updatedAt' | 'progress' | 'score' | 'duration';
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}