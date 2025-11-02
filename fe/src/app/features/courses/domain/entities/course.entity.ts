import {
  CourseId,
  InstructorId,
  CourseStatus,
  CourseLevel,
  CertificateType,
  ValidationResult
} from '../types';
import { CourseSpecifications } from '../value-objects/course-specifications';

/**
 * Domain Entity: Course
 * Represents a course in the domain with rich business logic
 * Immutable entity with business rules and validations
 */
export class Course {
  constructor(
    public readonly id: CourseId,
    public readonly title: string,
    public readonly description: string,
    public readonly shortDescription: string,
    public readonly category: string,
    public readonly instructorId: InstructorId,
    public readonly specifications: CourseSpecifications,
    public readonly status: CourseStatus,
    public readonly tags: string[],
    public readonly skills: string[],
    public readonly thumbnail: string,
    public readonly metadata: CourseMetadata
  ) {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid course: ${validation.errors.join(', ')}`);
    }
  }


  /**
   * Business Logic Methods
   */

  /**
   * Check if course is published
   */
  public isPublished(): boolean {
    return this.status === CourseStatus.PUBLISHED;
  }

  /**
   * Check if course is available for enrollment
   */
  public isAvailableForEnrollment(): boolean {
    return this.isPublished() && this.status !== CourseStatus.ARCHIVED;
  }

  /**
   * Check if course is free
   */
  public isFree(): boolean {
    return this.specifications.price === 0;
  }

  /**
   * Check if course is popular (business rule)
   */
  public isPopular(minStudents: number = 100): boolean {
    return this.metadata.studentsCount >= minStudents;
  }

  /**
   * Check if course is new (created within last 30 days)
   */
  public isNew(): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.metadata.createdAt >= thirtyDaysAgo;
  }

  /**
   * Get course rating (rounded to 1 decimal)
   */
  public getRating(): number {
    return Math.round(this.metadata.rating * 10) / 10;
  }

  /**
   * Check if course has good rating
   */
  public hasGoodRating(threshold: number = 4.0): boolean {
    return this.getRating() >= threshold;
  }

  /**
   * Get course duration formatted
   */
  public getFormattedDuration(): string {
    const hours = this.specifications.durationHours;
    if (hours < 1) {
      return `${Math.round(hours * 60)} phút`;
    }
    return `${hours} giờ`;
  }

  /**
   * Get course level label
   */
  public getLevelLabel(): string {
    switch (this.specifications.level) {
      case CourseLevel.BEGINNER: return 'Cơ bản';
      case CourseLevel.INTERMEDIATE: return 'Trung cấp';
      case CourseLevel.ADVANCED: return 'Nâng cao';
      default: return 'Không xác định';
    }
  }

  /**
   * Get certificate type label
   */
  public getCertificateLabel(): string {
    switch (this.specifications.certificateType) {
      case CertificateType.STCW: return 'Chứng chỉ STCW';
      case CertificateType.IMO: return 'Chứng chỉ IMO';
      case CertificateType.PROFESSIONAL: return 'Chứng chỉ Chuyên nghiệp';
      case CertificateType.COMPLETION: return 'Chứng chỉ Hoàn thành';
      default: return 'Không có chứng chỉ';
    }
  }

  /**
   * Calculate estimated completion time
   */
  public getEstimatedCompletionTime(): {
    weeks: number;
    hoursPerWeek: number;
    totalHours: number;
  } {
    const totalHours = this.specifications.durationHours;
    const weeks = this.specifications.getEstimatedWeeks();
    const hoursPerWeek = Math.ceil(totalHours / weeks);

    return {
      weeks,
      hoursPerWeek,
      totalHours
    };
  }

  /**
   * Check if course matches search query
   */
  public matchesSearch(query: string): boolean {
    const searchTerm = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(searchTerm) ||
      this.description.toLowerCase().includes(searchTerm) ||
      this.shortDescription.toLowerCase().includes(searchTerm) ||
      this.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      this.skills.some(skill => skill.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get course difficulty score (1-10)
   */
  public getDifficultyScore(): number {
    let score = 1;

    // Level contributes 3 points
    switch (this.specifications.level) {
      case CourseLevel.BEGINNER: score += 1; break;
      case CourseLevel.INTERMEDIATE: score += 2; break;
      case CourseLevel.ADVANCED: score += 3; break;
    }

    // Prerequisites add complexity
    if (this.specifications.hasPrerequisites()) {
      score += 2;
    }

    // Duration affects difficulty
    if (this.specifications.isLongCourse()) {
      score += 2;
    }

    // Certificate level adds prestige/complexity
    score += Math.floor(this.specifications.getCertificateLevel() / 2);

    return Math.min(10, Math.max(1, score));
  }

  /**
   * Validate course data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.title.length < 5) {
      errors.push('Course title must be at least 5 characters long');
    }

    if (this.description.length < 20) {
      errors.push('Course description must be at least 20 characters long');
    }

    if (this.metadata.rating < 0 || this.metadata.rating > 5) {
      errors.push('Course rating must be between 0 and 5');
    }

    if (this.metadata.studentsCount < 0) {
      errors.push('Students count cannot be negative');
    }

    if (this.metadata.reviewsCount < 0) {
      errors.push('Reviews count cannot be negative');
    }

    // Warnings
    if (!this.thumbnail) {
      warnings.push('Course should have a thumbnail image');
    }

    if (this.tags.length < 3) {
      warnings.push('Course should have at least 3 tags for better discoverability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a copy with updated status
   */
  public withStatus(newStatus: CourseStatus): Course {
    return new Course(
      this.id,
      this.title,
      this.description,
      this.shortDescription,
      this.category,
      this.instructorId,
      this.specifications,
      newStatus,
      this.tags,
      this.skills,
      this.thumbnail,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated specifications
   */
  public withSpecifications(newSpecifications: CourseSpecifications): Course {
    return new Course(
      this.id,
      this.title,
      this.description,
      this.shortDescription,
      this.category,
      this.instructorId,
      newSpecifications,
      this.status,
      this.tags,
      this.skills,
      this.thumbnail,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated metadata
   */
  public withUpdatedMetadata(updates: Partial<CourseMetadata>): Course {
    return new Course(
      this.id,
      this.title,
      this.description,
      this.shortDescription,
      this.category,
      this.instructorId,
      this.specifications,
      this.status,
      this.tags,
      this.skills,
      this.thumbnail,
      {
        ...this.metadata,
        ...updates,
        updatedAt: new Date()
      }
    );
  }
}

/**
 * Course Metadata
 */
export interface CourseMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy: InstructorId;
  studentsCount: number;
  rating: number;
  reviewsCount: number;
  isPopular: boolean;
  isNew: boolean;
  version: number;
  isEnrolled?: boolean; // Whether current user is enrolled in this course
}