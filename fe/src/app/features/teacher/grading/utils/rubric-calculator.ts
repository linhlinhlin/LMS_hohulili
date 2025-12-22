/**
 * Rubric Calculator Utility
 * 
 * Provides calculation and validation functions for rubric-based grading.
 * Ensures idempotent score calculation and weight validation.
 * 
 * @module rubric-calculator
 * @requirements 6.4, 6.5, 6.6, 6.7
 */

// ============================================================================
// Types
// ============================================================================

export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  weight: number; // Percentage (0-100)
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  points: number; // Points for this level (0 to max)
}

export interface Rubric {
  id: string;
  name: string;
  description?: string;
  criteria: RubricCriterion[];
  totalPoints: number;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface RubricGradeSelection {
  criterionId: string;
  levelId: string;
  points?: number; // Optional: points for this selection
}

export interface RubricScoreResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  criteriaScores: CriterionScore[];
}

export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  weight: number;
  selectedLevelId: string;
  selectedLevelName: string;
  points: number;
  maxPoints: number;
  weightedScore: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// Constants
// ============================================================================

export const REQUIRED_WEIGHT_SUM = 100;
export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 100;

// ============================================================================
// Score Calculation Functions
// ============================================================================

/**
 * Calculates the total score based on rubric criteria and selected levels.
 * This function is IDEMPOTENT - calling it multiple times with the same
 * inputs will always produce the same result.
 * 
 * The score is calculated as:
 * totalScore = Σ (criterion.weight / 100 * selectedLevel.points)
 * 
 * @param rubric - The rubric definition with criteria and levels
 * @param selections - Array of criterion-level selections
 * @returns RubricScoreResult with total score and breakdown
 * 
 * @example
 * const result = calculateRubricScore(rubric, [
 *   { criterionId: 'c1', levelId: 'l1' },
 *   { criterionId: 'c2', levelId: 'l2' }
 * ]);
 * // result.totalScore = weighted sum of selected levels
 * 
 * @requirements 6.4, 6.7
 */
export function calculateRubricScore(
  rubric: Rubric,
  selections: RubricGradeSelection[]
): RubricScoreResult {
  const criteriaScores: CriterionScore[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;

  for (const criterion of rubric.criteria) {
    // Find the selection for this criterion
    const selection = selections.find(s => s.criterionId === criterion.id);
    
    // Find the selected level
    const selectedLevel = selection 
      ? criterion.levels.find(l => l.id === selection.levelId)
      : null;

    // Find max points for this criterion
    const maxPoints = Math.max(...criterion.levels.map(l => l.points), 0);

    // Calculate weighted score
    const points = selectedLevel?.points ?? 0;
    const weightedScore = (criterion.weight / 100) * points;
    const maxWeightedScore = (criterion.weight / 100) * maxPoints;

    totalScore += weightedScore;
    maxPossibleScore += maxWeightedScore;

    criteriaScores.push({
      criterionId: criterion.id,
      criterionName: criterion.name,
      weight: criterion.weight,
      selectedLevelId: selectedLevel?.id ?? '',
      selectedLevelName: selectedLevel?.name ?? 'Chưa chọn',
      points,
      maxPoints,
      weightedScore
    });
  }

  // Calculate percentage (avoid division by zero)
  const percentage = maxPossibleScore > 0 
    ? Math.round((totalScore / maxPossibleScore) * 100 * 100) / 100 
    : 0;

  return {
    totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
    maxPossibleScore: Math.round(maxPossibleScore * 100) / 100,
    percentage,
    criteriaScores
  };
}

/**
 * Converts rubric score to assignment score based on max score.
 * 
 * @param rubricResult - Result from calculateRubricScore
 * @param assignmentMaxScore - Maximum score for the assignment
 * @returns Scaled score for the assignment
 */
export function convertToAssignmentScore(
  rubricResult: RubricScoreResult,
  assignmentMaxScore: number
): number {
  return Math.round((rubricResult.percentage / 100) * assignmentMaxScore * 100) / 100;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that the sum of all criteria weights equals exactly 100%.
 * 
 * @param criteria - Array of rubric criteria
 * @returns ValidationResult with isValid flag and errors
 * 
 * @example
 * validateRubricWeightSum([
 *   { weight: 40, ... },
 *   { weight: 60, ... }
 * ]); // { isValid: true, errors: [] }
 * 
 * @requirements 6.6
 */
export function validateRubricWeightSum(criteria: RubricCriterion[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!criteria || criteria.length === 0) {
    errors.push({
      field: 'criteria',
      message: 'Rubric phải có ít nhất một tiêu chí',
      code: 'NO_CRITERIA'
    });
    return { isValid: false, errors };
  }

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  if (totalWeight !== REQUIRED_WEIGHT_SUM) {
    errors.push({
      field: 'weight',
      message: `Tổng trọng số phải bằng ${REQUIRED_WEIGHT_SUM}%. Hiện tại: ${totalWeight}%`,
      code: 'INVALID_WEIGHT_SUM'
    });
  }

  // Validate individual weights
  for (const criterion of criteria) {
    if (criterion.weight < MIN_WEIGHT || criterion.weight > MAX_WEIGHT) {
      errors.push({
        field: `criteria.${criterion.id}.weight`,
        message: `Trọng số của "${criterion.name}" phải từ ${MIN_WEIGHT} đến ${MAX_WEIGHT}`,
        code: 'INVALID_CRITERION_WEIGHT'
      });
    }

    if (criterion.levels.length === 0) {
      errors.push({
        field: `criteria.${criterion.id}.levels`,
        message: `Tiêu chí "${criterion.name}" phải có ít nhất một mức điểm`,
        code: 'NO_LEVELS'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a rubric can be deleted (not in use by any assignment).
 * 
 * @param rubric - The rubric to check
 * @param assignmentRubricIds - Array of rubric IDs currently in use
 * @returns ValidationResult with isValid flag and errors
 * 
 * @example
 * validateRubricDeletion(rubric, ['rubric-1', 'rubric-2']);
 * // Returns error if rubric.id is in the array
 * 
 * @requirements 6.5
 */
export function validateRubricDeletion(
  rubric: Rubric,
  assignmentRubricIds: string[]
): ValidationResult {
  const errors: ValidationError[] = [];

  if (assignmentRubricIds.includes(rubric.id)) {
    errors.push({
      field: 'rubric',
      message: `Không thể xóa rubric "${rubric.name}" vì đang được sử dụng bởi bài tập`,
      code: 'RUBRIC_IN_USE'
    });
  }

  // Also check usageCount if available
  if (rubric.usageCount && rubric.usageCount > 0) {
    errors.push({
      field: 'rubric',
      message: `Không thể xóa rubric "${rubric.name}" vì đang được sử dụng bởi ${rubric.usageCount} bài tập`,
      code: 'RUBRIC_HAS_USAGE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a complete rubric structure.
 * 
 * @param rubric - The rubric to validate
 * @returns ValidationResult with isValid flag and errors
 */
export function validateRubric(rubric: Rubric): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate name
  if (!rubric.name || rubric.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Tên rubric là bắt buộc',
      code: 'NAME_REQUIRED'
    });
  }

  // Validate criteria
  if (!rubric.criteria || rubric.criteria.length === 0) {
    errors.push({
      field: 'criteria',
      message: 'Rubric phải có ít nhất một tiêu chí',
      code: 'NO_CRITERIA'
    });
    return { isValid: false, errors };
  }

  // Validate weight sum
  const weightValidation = validateRubricWeightSum(rubric.criteria);
  errors.push(...weightValidation.errors);

  // Validate each criterion
  for (const criterion of rubric.criteria) {
    if (!criterion.name || criterion.name.trim().length === 0) {
      errors.push({
        field: `criteria.${criterion.id}.name`,
        message: 'Tên tiêu chí là bắt buộc',
        code: 'CRITERION_NAME_REQUIRED'
      });
    }

    // Validate levels
    for (const level of criterion.levels) {
      if (!level.name || level.name.trim().length === 0) {
        errors.push({
          field: `criteria.${criterion.id}.levels.${level.id}.name`,
          message: 'Tên mức điểm là bắt buộc',
          code: 'LEVEL_NAME_REQUIRED'
        });
      }

      if (level.points < 0) {
        errors.push({
          field: `criteria.${criterion.id}.levels.${level.id}.points`,
          message: 'Điểm không được âm',
          code: 'NEGATIVE_POINTS'
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if weight sum is valid (equals 100).
 * Quick boolean check for UI validation.
 * 
 * @param criteria - Array of rubric criteria
 * @returns true if weight sum equals 100
 */
export function isValidWeightSum(criteria: RubricCriterion[]): boolean {
  if (!criteria || criteria.length === 0) return false;
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  return totalWeight === REQUIRED_WEIGHT_SUM;
}

/**
 * Calculates the remaining weight needed to reach 100%.
 * 
 * @param criteria - Array of rubric criteria
 * @returns Remaining weight needed (can be negative if over 100)
 */
export function getRemainingWeight(criteria: RubricCriterion[]): number {
  if (!criteria || criteria.length === 0) return REQUIRED_WEIGHT_SUM;
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  return REQUIRED_WEIGHT_SUM - totalWeight;
}

/**
 * Creates a default rubric criterion with empty levels.
 * 
 * @param id - Unique ID for the criterion
 * @param name - Name of the criterion
 * @param weight - Weight percentage
 * @returns New RubricCriterion object
 */
export function createDefaultCriterion(
  id: string,
  name: string = '',
  weight: number = 0
): RubricCriterion {
  return {
    id,
    name,
    description: '',
    weight,
    levels: [
      { id: `${id}-l1`, name: 'Xuất sắc', description: '', points: 100 },
      { id: `${id}-l2`, name: 'Tốt', description: '', points: 75 },
      { id: `${id}-l3`, name: 'Đạt', description: '', points: 50 },
      { id: `${id}-l4`, name: 'Chưa đạt', description: '', points: 0 }
    ]
  };
}

/**
 * Generates a unique ID for rubric elements.
 * 
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
export function generateRubricId(prefix: string = 'rubric'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

