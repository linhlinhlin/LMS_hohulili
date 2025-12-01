/**
 * Assignment Validators Utility
 * 
 * Provides validation functions for assignment-related operations.
 * These validators ensure data integrity and business rule compliance.
 * 
 * @module assignment-validators
 * @requirements 2.2, 2.4, 5.2
 */

// ============================================================================
// Types
// ============================================================================

export interface AssignmentCreationData {
  title?: string | null;
  courseId?: string | null;
  dueDate?: string | null;
  maxScore?: number | null;
  description?: string | null;
  instructions?: string | null;
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

export const MIN_MAX_SCORE = 1;
export const MAX_MAX_SCORE = 1000;
export const MIN_GRADE = 0;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates assignment creation data for required fields.
 * 
 * Required fields: title, courseId, dueDate
 * 
 * @param data - The assignment creation data to validate
 * @returns ValidationResult with isValid flag and array of errors
 * 
 * @example
 * const result = validateAssignmentCreation({ title: 'Test', courseId: '123', dueDate: '2025-12-01' });
 * // result.isValid === true
 * 
 * @requirements 2.2
 */
export function validateAssignmentCreation(data: AssignmentCreationData): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate title (required, non-empty)
  if (!data.title || data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Tiêu đề bài tập là bắt buộc',
      code: 'TITLE_REQUIRED'
    });
  }

  // Validate courseId (required, non-empty)
  if (!data.courseId || data.courseId.trim().length === 0) {
    errors.push({
      field: 'courseId',
      message: 'Vui lòng chọn khóa học',
      code: 'COURSE_REQUIRED'
    });
  }

  // Validate dueDate (required, non-empty)
  if (!data.dueDate || data.dueDate.trim().length === 0) {
    errors.push({
      field: 'dueDate',
      message: 'Hạn nộp bài là bắt buộc',
      code: 'DUE_DATE_REQUIRED'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that maxScore is within the allowed range (1-1000).
 * 
 * @param maxScore - The maximum score value to validate
 * @returns ValidationResult with isValid flag and array of errors
 * 
 * @example
 * validateMaxScore(100); // { isValid: true, errors: [] }
 * validateMaxScore(0);   // { isValid: false, errors: [...] }
 * validateMaxScore(1001); // { isValid: false, errors: [...] }
 * 
 * @requirements 2.4
 */
export function validateMaxScore(maxScore: number | null | undefined): ValidationResult {
  const errors: ValidationError[] = [];

  if (maxScore === null || maxScore === undefined) {
    errors.push({
      field: 'maxScore',
      message: 'Điểm tối đa là bắt buộc',
      code: 'MAX_SCORE_REQUIRED'
    });
    return { isValid: false, errors };
  }

  if (typeof maxScore !== 'number' || isNaN(maxScore)) {
    errors.push({
      field: 'maxScore',
      message: 'Điểm tối đa phải là số',
      code: 'MAX_SCORE_INVALID_TYPE'
    });
    return { isValid: false, errors };
  }

  if (!Number.isInteger(maxScore)) {
    errors.push({
      field: 'maxScore',
      message: 'Điểm tối đa phải là số nguyên',
      code: 'MAX_SCORE_NOT_INTEGER'
    });
    return { isValid: false, errors };
  }

  if (maxScore < MIN_MAX_SCORE) {
    errors.push({
      field: 'maxScore',
      message: `Điểm tối đa phải từ ${MIN_MAX_SCORE} trở lên`,
      code: 'MAX_SCORE_TOO_LOW'
    });
  }

  if (maxScore > MAX_MAX_SCORE) {
    errors.push({
      field: 'maxScore',
      message: `Điểm tối đa không được vượt quá ${MAX_MAX_SCORE}`,
      code: 'MAX_SCORE_TOO_HIGH'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a grade is within the allowed range (0 to maxScore).
 * 
 * @param grade - The grade value to validate
 * @param maxScore - The maximum allowed score for the assignment
 * @returns ValidationResult with isValid flag and array of errors
 * 
 * @example
 * validateGrade(85, 100);  // { isValid: true, errors: [] }
 * validateGrade(-1, 100);  // { isValid: false, errors: [...] }
 * validateGrade(101, 100); // { isValid: false, errors: [...] }
 * 
 * @requirements 5.2
 */
export function validateGrade(grade: number | null | undefined, maxScore: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (grade === null || grade === undefined) {
    errors.push({
      field: 'grade',
      message: 'Điểm số là bắt buộc',
      code: 'GRADE_REQUIRED'
    });
    return { isValid: false, errors };
  }

  if (typeof grade !== 'number' || isNaN(grade)) {
    errors.push({
      field: 'grade',
      message: 'Điểm số phải là số',
      code: 'GRADE_INVALID_TYPE'
    });
    return { isValid: false, errors };
  }

  if (grade < MIN_GRADE) {
    errors.push({
      field: 'grade',
      message: `Điểm số không được nhỏ hơn ${MIN_GRADE}`,
      code: 'GRADE_TOO_LOW'
    });
  }

  if (grade > maxScore) {
    errors.push({
      field: 'grade',
      message: `Điểm số không được vượt quá điểm tối đa (${maxScore})`,
      code: 'GRADE_TOO_HIGH'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Checks if a maxScore value is within the valid range.
 * Utility function for quick boolean checks.
 * 
 * @param maxScore - The maximum score value to check
 * @returns true if maxScore is valid (1-1000), false otherwise
 */
export function isValidMaxScore(maxScore: number): boolean {
  return Number.isInteger(maxScore) && maxScore >= MIN_MAX_SCORE && maxScore <= MAX_MAX_SCORE;
}

/**
 * Checks if a grade value is within the valid range for a given maxScore.
 * Utility function for quick boolean checks.
 * 
 * @param grade - The grade value to check
 * @param maxScore - The maximum allowed score
 * @returns true if grade is valid (0 to maxScore), false otherwise
 */
export function isValidGrade(grade: number, maxScore: number): boolean {
  return typeof grade === 'number' && !isNaN(grade) && grade >= MIN_GRADE && grade <= maxScore;
}
