import { CourseLevel, CertificateType } from '../types';

/**
 * Value Object: Course Specifications
 * Immutable object containing course specifications and business rules
 */
export class CourseSpecifications {
  constructor(
    public readonly durationHours: number, // in hours
    public readonly level: CourseLevel,
    public readonly maxStudents: number,
    public readonly price: number,
    public readonly prerequisites: string[],
    public readonly certificateType: CertificateType,
    public readonly modulesCount: number,
    public readonly lessonsCount: number
  ) {
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (this.durationHours <= 0) {
      throw new Error('Course duration must be positive');
    }

    if (this.maxStudents <= 0) {
      throw new Error('Maximum students must be positive');
    }

    if (this.price < 0) {
      throw new Error('Course price cannot be negative');
    }

    if (this.modulesCount <= 0) {
      throw new Error('Course must have at least one module');
    }

    if (this.lessonsCount <= 0) {
      throw new Error('Course must have at least one lesson');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if course is advanced level
   */
  public isAdvanced(): boolean {
    return this.level === CourseLevel.ADVANCED;
  }

  /**
   * Check if course has prerequisites
   */
  public hasPrerequisites(): boolean {
    return this.prerequisites.length > 0;
  }

  /**
   * Check if course is expensive (above threshold)
   */
  public isExpensive(threshold: number = 2000000): boolean {
    return this.price > threshold;
  }

  /**
   * Check if course is long duration
   */
  public isLongCourse(hoursThreshold: number = 40): boolean {
    return this.durationHours > hoursThreshold;
  }

  /**
   * Calculate price per hour
   */
  public getPricePerHour(): number {
    return this.price / this.durationHours;
  }

  /**
   * Get estimated completion time in weeks (assuming 10 hours/week study)
   */
  public getEstimatedWeeks(): number {
    const weeklyHours = 10;
    return Math.ceil(this.durationHours / weeklyHours);
  }

  /**
   * Check if course provides certificate
   */
  public providesCertificate(): boolean {
    return this.certificateType !== CertificateType.COMPLETION;
  }

  /**
   * Get certificate level (for sorting/filtering)
   */
  public getCertificateLevel(): number {
    switch (this.certificateType) {
      case CertificateType.STCW: return 4;
      case CertificateType.IMO: return 3;
      case CertificateType.PROFESSIONAL: return 2;
      case CertificateType.COMPLETION: return 1;
      default: return 0;
    }
  }

  /**
   * Check if course is suitable for beginners
   */
  public isBeginnerFriendly(): boolean {
    return this.level === CourseLevel.BEGINNER && !this.hasPrerequisites();
  }

  /**
   * Get course intensity (lessons per hour)
   */
  public getIntensity(): 'low' | 'medium' | 'high' {
    const lessonsPerHour = this.lessonsCount / this.durationHours;

    if (lessonsPerHour < 0.5) return 'low';
    if (lessonsPerHour < 1.0) return 'medium';
    return 'high';
  }

  /**
   * Create a copy with updated price
   */
  public withPrice(newPrice: number): CourseSpecifications {
    return new CourseSpecifications(
      this.durationHours,
      this.level,
      this.maxStudents,
      newPrice,
      this.prerequisites,
      this.certificateType,
      this.modulesCount,
      this.lessonsCount
    );
  }

  /**
   * Create a copy with updated max students
   */
  public withMaxStudents(newMaxStudents: number): CourseSpecifications {
    return new CourseSpecifications(
      this.durationHours,
      this.level,
      newMaxStudents,
      this.price,
      this.prerequisites,
      this.certificateType,
      this.modulesCount,
      this.lessonsCount
    );
  }
}