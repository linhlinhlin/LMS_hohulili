/**
 * Value Object: Rubric
 * Defines the grading criteria for assignments
 */
export class RubricCriterion {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly points: number,
    public readonly weight: number = 1 // Relative weight for calculation
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.points <= 0) {
      throw new Error('Criterion points must be greater than 0');
    }

    if (this.weight <= 0) {
      throw new Error('Criterion weight must be greater than 0');
    }

    if (!this.description.trim()) {
      throw new Error('Criterion description cannot be empty');
    }
  }

  /**
   * Calculate weighted score
   */
  public calculateWeightedScore(score: number): number {
    return (score / this.points) * this.weight;
  }

  /**
   * Check if score is valid for this criterion
   */
  public isValidScore(score: number): boolean {
    return score >= 0 && score <= this.points;
  }
}

export class Rubric {
  constructor(
    public readonly criteria: RubricCriterion[]
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.criteria.length === 0) {
      throw new Error('Rubric must have at least one criterion');
    }

    // Check for duplicate criterion IDs
    const ids = this.criteria.map(c => c.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error('Rubric criteria must have unique IDs');
    }
  }

  /**
   * Get total possible points
   */
  public getTotalPoints(): number {
    return this.criteria.reduce((total, criterion) => total + criterion.points, 0);
  }

  /**
   * Get total weight
   */
  public getTotalWeight(): number {
    return this.criteria.reduce((total, criterion) => total + criterion.weight, 0);
  }

  /**
   * Calculate weighted grade
   */
  public calculateWeightedGrade(scores: Map<string, number>): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const criterion of this.criteria) {
      const score = scores.get(criterion.id);
      if (score !== undefined && criterion.isValidScore(score)) {
        totalWeightedScore += criterion.calculateWeightedScore(score);
        totalWeight += criterion.weight;
      }
    }

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * this.getTotalPoints() : 0;
  }

  /**
   * Calculate percentage grade
   */
  public calculatePercentageGrade(scores: Map<string, number>): number {
    const totalScore = Array.from(scores.values()).reduce((sum, score) => sum + score, 0);
    const maxScore = this.getTotalPoints();
    return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  }

  /**
   * Get criterion by ID
   */
  public getCriterionById(id: string): RubricCriterion | undefined {
    return this.criteria.find(criterion => criterion.id === id);
  }

  /**
   * Validate scores map
   */
  public validateScores(scores: Map<string, number>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const criterion of this.criteria) {
      const score = scores.get(criterion.id);

      if (score === undefined) {
        errors.push(`Missing score for criterion: ${criterion.description}`);
      } else if (!criterion.isValidScore(score)) {
        errors.push(`Invalid score ${score} for criterion: ${criterion.description} (must be 0-${criterion.points})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get detailed breakdown
   */
  public getDetailedBreakdown(scores: Map<string, number>): RubricBreakdown {
    const breakdown: RubricBreakdownItem[] = [];

    for (const criterion of this.criteria) {
      const score = scores.get(criterion.id) || 0;
      const percentage = criterion.points > 0 ? (score / criterion.points) * 100 : 0;

      breakdown.push({
        criterionId: criterion.id,
        description: criterion.description,
        points: criterion.points,
        score: score,
        percentage: Math.round(percentage),
        weight: criterion.weight
      });
    }

    const totalScore = breakdown.reduce((sum, item) => sum + item.score, 0);
    const maxScore = this.getTotalPoints();
    const overallPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return {
      items: breakdown,
      totalScore,
      maxScore,
      overallPercentage: Math.round(overallPercentage)
    };
  }
}

export interface RubricBreakdownItem {
  criterionId: string;
  description: string;
  points: number;
  score: number;
  percentage: number;
  weight: number;
}

export interface RubricBreakdown {
  items: RubricBreakdownItem[];
  totalScore: number;
  maxScore: number;
  overallPercentage: number;
}