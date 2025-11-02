import {
  BookmarkId,
  StudentId,
  CourseId,
  LessonId,
  BookmarkType,
  ValidationResult
} from '../types';

/**
 * Domain Entity: Bookmark
 * Represents a bookmark in the learning content
 */
export class Bookmark {
  constructor(
    public readonly id: BookmarkId,
    public readonly studentId: StudentId,
    public readonly courseId: CourseId,
    public readonly lessonId: LessonId,
    public readonly type: BookmarkType,
    public readonly title: string,
    public readonly metadata: BookmarkMetadata,
    public readonly description?: string,
    public readonly timestamp?: number, // in seconds for video bookmarks
    public readonly content?: string // highlighted text or note content
  ) {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid bookmark: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if bookmark is a timestamp bookmark
   */
  public isTimestampBookmark(): boolean {
    return this.type === BookmarkType.TIMESTAMP;
  }

  /**
   * Check if bookmark is a note bookmark
   */
  public isNoteBookmark(): boolean {
    return this.type === BookmarkType.NOTE;
  }

  /**
   * Check if bookmark is important
   */
  public isImportant(): boolean {
    return this.type === BookmarkType.IMPORTANT;
  }

  /**
   * Check if bookmark is for review
   */
  public isForReview(): boolean {
    return this.type === BookmarkType.REVIEW;
  }

  /**
   * Get formatted timestamp
   */
  public getFormattedTimestamp(): string | null {
    if (!this.timestamp) return null;

    const minutes = Math.floor(this.timestamp / 60);
    const seconds = Math.floor(this.timestamp % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if bookmark has content
   */
  public hasContent(): boolean {
    return !!(this.content && this.content.trim());
  }

  /**
   * Check if bookmark is recent
   */
  public isRecent(daysThreshold: number = 7): boolean {
    const now = new Date();
    const createdAt = this.metadata.createdAt;
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold;
  }

  /**
   * Get bookmark age in days
   */
  public getAgeInDays(): number {
    const now = new Date();
    const createdAt = this.metadata.createdAt;
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if bookmark matches search query
   */
  public matchesSearch(query: string): boolean {
    const searchTerm = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(searchTerm) ||
      (this.description && this.description.toLowerCase().includes(searchTerm)) ||
      (this.content && this.content.toLowerCase().includes(searchTerm)) ||
      this.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get bookmark priority score (for sorting)
   */
  public getPriorityScore(): number {
    let score = 0;

    // Type-based scoring
    switch (this.type) {
      case BookmarkType.IMPORTANT: score += 10; break;
      case BookmarkType.REVIEW: score += 7; break;
      case BookmarkType.NOTE: score += 5; break;
      case BookmarkType.TIMESTAMP: score += 3; break;
    }

    // Recency scoring
    const age = this.getAgeInDays();
    if (age <= 1) score += 5;
    else if (age <= 3) score += 3;
    else if (age <= 7) score += 1;

    // Content scoring
    if (this.hasContent()) score += 2;

    return score;
  }

  /**
   * Get formatted bookmark info
   */
  public getFormattedInfo(): {
    type: string;
    timestamp: string | null;
    hasContent: boolean;
    isRecent: boolean;
    priority: number;
    tags: string[];
  } {
    return {
      type: this.getTypeLabel(),
      timestamp: this.getFormattedTimestamp(),
      hasContent: this.hasContent(),
      isRecent: this.isRecent(),
      priority: this.getPriorityScore(),
      tags: this.metadata.tags
    };
  }

  /**
   * Get type label in Vietnamese
   */
  private getTypeLabel(): string {
    switch (this.type) {
      case BookmarkType.TIMESTAMP: return 'Thời điểm';
      case BookmarkType.NOTE: return 'Ghi chú';
      case BookmarkType.IMPORTANT: return 'Quan trọng';
      case BookmarkType.REVIEW: return 'Cần ôn';
      default: return 'Không xác định';
    }
  }

  /**
   * Validate bookmark data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.title.trim()) {
      errors.push('Bookmark title cannot be empty');
    }

    if (this.type === BookmarkType.TIMESTAMP && this.timestamp === undefined) {
      errors.push('Timestamp bookmark must have timestamp');
    }

    if (this.timestamp !== undefined && this.timestamp < 0) {
      errors.push('Timestamp cannot be negative');
    }

    if (this.metadata.createdAt > new Date()) {
      errors.push('Created date cannot be in the future');
    }

    // Business rule validations
    if (this.type === BookmarkType.NOTE && !this.hasContent()) {
      warnings.push('Note bookmark should have content');
    }

    if (this.title.length > 100) {
      warnings.push('Bookmark title is quite long');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a copy with updated content
   */
  public withContent(newContent: string): Bookmark {
    return new Bookmark(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      this.type,
      this.title,
      {
        ...this.metadata,
        updatedAt: new Date()
      },
      this.description,
      this.timestamp,
      newContent
    );
  }

  /**
   * Create a copy with updated title
   */
  public withTitle(newTitle: string): Bookmark {
    return new Bookmark(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      this.type,
      newTitle,
      {
        ...this.metadata,
        updatedAt: new Date()
      },
      this.description,
      this.timestamp,
      this.content
    );
  }

  /**
   * Create a copy with added tags
   */
  public withAddedTags(newTags: string[]): Bookmark {
    const updatedTags = [...new Set([...this.metadata.tags, ...newTags])];

    return new Bookmark(
      this.id,
      this.studentId,
      this.courseId,
      this.lessonId,
      this.type,
      this.title,
      {
        ...this.metadata,
        tags: updatedTags,
        updatedAt: new Date()
      },
      this.description,
      this.timestamp,
      this.content
    );
  }
}

/**
 * Bookmark Metadata
 */
export interface BookmarkMetadata {
  tags: string[];
  color?: string; // for UI customization
  isPublic: boolean; // can be shared with others
  createdAt: Date;
  updatedAt: Date;
}