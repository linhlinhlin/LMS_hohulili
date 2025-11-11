/**
 * Learning Interface Models
 * 
 * TypeScript interfaces and types for the enhanced learning interface.
 * These models map to the backend API responses and internal state.
 */

import { LessonType } from './lesson-types.enum';

/**
 * Course Overview
 * Used in the course overview page before starting to learn
 */
export interface CourseOverview {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  sectionsCount: number;
  lessonsCount: number;
  duration: string;
  isEnrolled: boolean;
}

/**
 * Section
 * Represents a chapter/module containing multiple lessons
 */
export interface Section {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonSummary[];
}

/**
 * Lesson Summary
 * Brief lesson information for navigation lists
 */
export interface LessonSummary {
  id: string;
  title: string;
  description: string;
  lessonType: LessonType;
  duration: number; // in minutes
  orderIndex: number;
}

/**
 * Lesson Detail
 * Full lesson information including content and attachments
 */
export interface LessonDetail extends LessonSummary {
  content: string; // HTML content
  videoUrl?: string;
  thumbnail?: string;
  attachments: LessonAttachment[];
  sectionId: string;
  sectionTitle: string;
  courseId: string;
  courseTitle: string;
  durationMinutes?: number;
}

/**
 * Lesson Attachment
 * File attached to a lesson (PDF, Office docs, images, videos, etc.)
 */
export interface LessonAttachment {
  id: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string; // API returns string, not enum
}

/**
 * Progress State
 * Tracks student's learning progress
 */
export interface ProgressState {
  completedLessons: Set<string>;
  progressPercentage: number;
  lastAccessedLessonId?: string;
}

/**
 * Course State
 * State for course data and loading status
 */
export interface CourseState {
  course: CourseOverview | null;
  sections: Section[];
  loading: boolean;
  error: string | null;
}

/**
 * Lesson State
 * State for current lesson data and loading status
 */
export interface LessonState {
  currentLesson: LessonDetail | null;
  loading: boolean;
  error: string | null;
}

/**
 * Video Player State
 * State for video playback
 */
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isFullscreen: boolean;
}

/**
 * Error Type
 * Types of errors that can occur in the learning interface
 */
export type ErrorType = 'network' | 'forbidden' | 'notfound' | 'video' | 'unknown';

/**
 * Error State
 * Detailed error information
 */
export interface ErrorState {
  type: ErrorType;
  message: string;
  canRetry: boolean;
  canEnroll: boolean;
}

/**
 * Navigation State
 * State for lesson navigation
 */
export interface NavigationState {
  canGoPrevious: boolean;
  canGoNext: boolean;
  previousLessonId?: string;
  nextLessonId?: string;
}

/**
 * Search State
 * State for lesson search functionality
 */
export interface SearchState {
  query: string;
  results: LessonSummary[];
  isSearching: boolean;
}

/**
 * Sidebar State
 * State for sidebar visibility and behavior
 */
export interface SidebarState {
  isCollapsed: boolean;
  isMobileView: boolean;
  isOverlayVisible: boolean;
}
