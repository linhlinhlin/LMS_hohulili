import { Observable } from 'rxjs';
import { BookmarkId, StudentId, CourseId, LessonId, BookmarkType } from '../types';
import { Bookmark } from '../entities/bookmark.entity';
import { BookmarkFilters, LearningSortOptions, PaginationOptions, PaginatedResult } from '../types';

/**
 * Repository Interface: Bookmark Repository
 * Defines the contract for bookmark data access operations
 */
export interface BookmarkRepository {
  /**
   * Find a bookmark by its ID
   */
  findById(id: BookmarkId): Observable<Bookmark | null>;

  /**
   * Find bookmarks by student
   */
  findByStudent(
    studentId: StudentId,
    filters?: BookmarkFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Bookmark>>;

  /**
   * Find bookmarks by course
   */
  findByCourse(
    courseId: CourseId,
    filters?: BookmarkFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Bookmark>>;

  /**
   * Find bookmarks by lesson
   */
  findByLesson(
    lessonId: LessonId,
    filters?: BookmarkFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Bookmark>>;

  /**
   * Find bookmarks by type
   */
  findByType(
    studentId: StudentId,
    type: BookmarkType,
    filters?: BookmarkFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Bookmark>>;

  /**
   * Find important bookmarks
   */
  findImportant(studentId: StudentId): Observable<Bookmark[]>;

  /**
   * Find bookmarks for review
   */
  findForReview(studentId: StudentId): Observable<Bookmark[]>;

  /**
   * Find recent bookmarks
   */
  findRecent(studentId: StudentId, limit: number): Observable<Bookmark[]>;

  /**
   * Search bookmarks by content
   */
  search(
    studentId: StudentId,
    query: string,
    filters?: BookmarkFilters,
    sort?: LearningSortOptions,
    pagination?: PaginationOptions
  ): Observable<PaginatedResult<Bookmark>>;

  /**
   * Save a new bookmark or update existing one
   */
  save(bookmark: Bookmark): Observable<Bookmark>;

  /**
   * Update an existing bookmark
   */
  update(id: BookmarkId, updates: Partial<Bookmark>): Observable<Bookmark>;

  /**
   * Update bookmark content
   */
  updateContent(id: BookmarkId, content: string): Observable<Bookmark>;

  /**
   * Update bookmark title
   */
  updateTitle(id: BookmarkId, title: string): Observable<Bookmark>;

  /**
   * Add tags to bookmark
   */
  addTags(id: BookmarkId, tags: string[]): Observable<Bookmark>;

  /**
   * Remove tags from bookmark
   */
  removeTags(id: BookmarkId, tags: string[]): Observable<Bookmark>;

  /**
   * Delete a bookmark
   */
  delete(id: BookmarkId): Observable<void>;

  /**
   * Check if a bookmark exists
   */
  exists(id: BookmarkId): Observable<boolean>;

  /**
   * Get bookmark statistics for a student
   */
  getStudentStatistics(studentId: StudentId): Observable<BookmarkStatistics>;

  /**
   * Get bookmark statistics for a course
   */
  getCourseStatistics(courseId: CourseId): Observable<CourseBookmarkStatistics>;

  /**
   * Get public bookmarks for a course (shared by other students)
   */
  getPublicBookmarks(courseId: CourseId): Observable<Bookmark[]>;
}

/**
 * Bookmark Statistics
 */
export interface BookmarkStatistics {
  totalBookmarks: number;
  bookmarksByType: Record<BookmarkType, number>;
  recentBookmarks: number; // last 7 days
  importantBookmarks: number;
  reviewBookmarks: number;
  publicBookmarks: number;
  privateBookmarks: number;
  averageBookmarksPerCourse: number;
  mostBookmarkedCourse: {
    courseId: CourseId;
    bookmarkCount: number;
  };
  tagsUsage: Record<string, number>;
}

/**
 * Course Bookmark Statistics
 */
export interface CourseBookmarkStatistics {
  totalBookmarks: number;
  studentCount: number; // students who bookmarked
  averageBookmarksPerStudent: number;
  popularTypes: BookmarkType[];
  popularTags: string[];
  publicBookmarksCount: number;
  mostBookmarkedLesson: {
    lessonId: LessonId;
    bookmarkCount: number;
  };
}