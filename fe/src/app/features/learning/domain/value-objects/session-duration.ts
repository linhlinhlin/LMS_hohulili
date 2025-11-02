/**
 * Value Object: Session Duration
 * Immutable object representing learning session duration with business rules
 */
export class SessionDuration {
  constructor(
    public readonly minutes: number,
    public readonly expectedMinutes?: number // Expected duration for planning
  ) {
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (this.minutes < 0) {
      throw new Error('Session duration cannot be negative');
    }

    if (this.expectedMinutes !== undefined && this.expectedMinutes < 0) {
      throw new Error('Expected duration cannot be negative');
    }

    if (this.expectedMinutes !== undefined && this.expectedMinutes < this.minutes) {
      throw new Error('Actual duration cannot exceed expected duration');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if session is completed within expected time
   */
  public isWithinExpectedTime(): boolean {
    return this.expectedMinutes === undefined || this.minutes <= this.expectedMinutes;
  }

  /**
   * Get duration in hours
   */
  public getHours(): number {
    return Math.round((this.minutes / 60) * 100) / 100;
  }

  /**
   * Get formatted duration string
   */
  public getFormattedDuration(): string {
    if (this.minutes < 60) {
      return `${this.minutes} phút`;
    }

    const hours = Math.floor(this.minutes / 60);
    const remainingMinutes = this.minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} giờ`;
    }

    return `${hours} giờ ${remainingMinutes} phút`;
  }

  /**
   * Check if session is considered long
   */
  public isLongSession(thresholdMinutes: number = 120): boolean {
    return this.minutes > thresholdMinutes;
  }

  /**
   * Check if session is considered short
   */
  public isShortSession(thresholdMinutes: number = 15): boolean {
    return this.minutes < thresholdMinutes;
  }

  /**
   * Get efficiency ratio (actual vs expected)
   */
  public getEfficiencyRatio(): number | null {
    if (!this.expectedMinutes) return null;
    return Math.round((this.minutes / this.expectedMinutes) * 100) / 100;
  }

  /**
   * Check if session meets minimum requirements
   */
  public meetsMinimumRequirement(minMinutes: number = 10): boolean {
    return this.minutes >= minMinutes;
  }

  /**
   * Create a copy with updated actual duration
   */
  public withActualDuration(newMinutes: number): SessionDuration {
    return new SessionDuration(newMinutes, this.expectedMinutes);
  }

  /**
   * Create a copy with updated expected duration
   */
  public withExpectedDuration(newExpectedMinutes: number): SessionDuration {
    return new SessionDuration(this.minutes, newExpectedMinutes);
  }
}