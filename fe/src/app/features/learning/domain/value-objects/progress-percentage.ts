/**
 * Value Object: Progress Percentage
 * Immutable object representing learning progress with business rules
 */
export class ProgressPercentage {
  constructor(public readonly value: number) {
    this.validate();
  }

  /**
   * Business Rules Validation
   */
  private validate(): void {
    if (this.value < 0 || this.value > 100) {
      throw new Error('Progress percentage must be between 0 and 100');
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if progress is complete
   */
  public isComplete(): boolean {
    return this.value >= 100;
  }

  /**
   * Check if progress is started
   */
  public isStarted(): boolean {
    return this.value > 0;
  }

  /**
   * Check if progress is significant
   */
  public isSignificant(threshold: number = 25): boolean {
    return this.value >= threshold;
  }

  /**
   * Get progress category
   */
  public getCategory(): 'not_started' | 'started' | 'halfway' | 'almost_done' | 'completed' {
    if (this.value === 0) return 'not_started';
    if (this.value < 25) return 'started';
    if (this.value < 75) return 'halfway';
    if (this.value < 100) return 'almost_done';
    return 'completed';
  }

  /**
   * Get remaining percentage
   */
  public getRemaining(): number {
    return Math.max(0, 100 - this.value);
  }

  /**
   * Get progress as decimal (0-1)
   */
  public getDecimal(): number {
    return this.value / 100;
  }

  /**
   * Check if progress meets minimum requirement
   */
  public meetsMinimumRequirement(minPercentage: number = 80): boolean {
    return this.value >= minPercentage;
  }

  /**
   * Get formatted percentage string
   */
  public getFormattedPercentage(): string {
    return `${Math.round(this.value)}%`;
  }

  /**
   * Calculate new progress after adding completion
   */
  public addProgress(additionalPercentage: number): ProgressPercentage {
    const newValue = Math.min(100, this.value + additionalPercentage);
    return new ProgressPercentage(newValue);
  }

  /**
   * Calculate progress from completed/total items
   */
  public static fromCompletedItems(completed: number, total: number): ProgressPercentage {
    if (total === 0) return new ProgressPercentage(0);
    const percentage = (completed / total) * 100;
    return new ProgressPercentage(Math.round(percentage * 100) / 100);
  }

  /**
   * Create a copy with updated value
   */
  public withValue(newValue: number): ProgressPercentage {
    return new ProgressPercentage(newValue);
  }
}