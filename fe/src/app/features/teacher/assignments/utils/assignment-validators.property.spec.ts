/**
 * Property-Based Tests for Assignment Validators
 * 
 * Tests correctness properties using generated test data.
 * Minimum 100 iterations per property test.
 * 
 * @module assignment-validators.property.spec
 * **Feature: teacher-assignments-grading**
 */

import {
  validateAssignmentCreation,
  validateMaxScore,
  validateGrade,
  ValidationResult
} from './assignment-validators';

// ============================================================================
// Test Data Generators
// ============================================================================

/** Generates random string of given length */
function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Generates random integer in range [min, max] */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generates random date string */
function randomDateString(): string {
  const start = new Date(2024, 0, 1);
  const end = new Date(2025, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
}

/** Generates valid assignment creation request */
function generateValidAssignment() {
  return {
    title: randomString(randomInt(5, 50)),
    courseId: `course-${randomInt(1, 1000)}`,
    dueDate: randomDateString(),
    maxScore: randomInt(1, 1000)
  };
}

/** Generates assignment with missing required field */
function generateInvalidAssignment(missingField: 'title' | 'courseId' | 'dueDate') {
  const valid = generateValidAssignment();
  const invalid: Record<string, unknown> = { ...valid };
  
  switch (missingField) {
    case 'title':
      delete invalid.title;
      break;
    case 'courseId':
      delete invalid.courseId;
      break;
    case 'dueDate':
      delete invalid.dueDate;
      break;
  }
  
  return invalid;
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Assignment Validators - Property Tests', () => {
  const ITERATIONS = 100;

  /**
   * **Property 3: Assignment Creation Validation**
   * 
   * *For any* assignment creation request missing required fields 
   * (title, courseId, or dueDate), the validation function SHALL 
   * return an error and prevent creation.
   * 
   * **Validates: Requirements 2.2**
   */
  describe('Property 3: Assignment Creation Validation', () => {
    it('should accept all valid assignments with required fields', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const validAssignment = generateValidAssignment();
        const result = validateAssignmentCreation(validAssignment);
        
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      }
    });

    it('should reject assignments missing title', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const invalid = generateInvalidAssignment('title');
        const result = validateAssignmentCreation(invalid as any);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'title')).toBe(true);
      }
    });

    it('should reject assignments missing courseId', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const invalid = generateInvalidAssignment('courseId');
        const result = validateAssignmentCreation(invalid as any);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'courseId')).toBe(true);
      }
    });

    it('should reject assignments missing dueDate', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const invalid = generateInvalidAssignment('dueDate');
        const result = validateAssignmentCreation(invalid as any);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'dueDate')).toBe(true);
      }
    });

    it('should reject assignments with empty title', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignment = generateValidAssignment();
        assignment.title = '   '; // whitespace only
        const result = validateAssignmentCreation(assignment);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'title')).toBe(true);
      }
    });
  });

  /**
   * **Property 4: Max Score Range Validation**
   * 
   * *For any* max score value, the validation function SHALL accept 
   * only values between 1 and 1000 inclusive.
   * 
   * **Validates: Requirements 2.4**
   */
  describe('Property 4: Max Score Range Validation', () => {
    it('should accept all scores in valid range [1, 1000]', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const validScore = randomInt(1, 1000);
        const result = validateMaxScore(validScore);
        
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      }
    });

    it('should reject scores below 1', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const invalidScore = randomInt(-1000, 0);
        const result = validateMaxScore(invalidScore);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'MAX_SCORE_TOO_LOW' || e.code === 'MAX_SCORE_OUT_OF_RANGE')).toBe(true);
      }
    });

    it('should reject scores above 1000', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const invalidScore = randomInt(1001, 10000);
        const result = validateMaxScore(invalidScore);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'MAX_SCORE_TOO_HIGH' || e.code === 'MAX_SCORE_OUT_OF_RANGE')).toBe(true);
      }
    });

    it('should accept boundary values 1 and 1000', () => {
      const result1 = validateMaxScore(1);
      const result1000 = validateMaxScore(1000);
      
      expect(result1.isValid).toBe(true);
      expect(result1000.isValid).toBe(true);
    });
  });


  /**
   * **Property 7: Grade Range Validation**
   * 
   * *For any* grade value and assignment max score, the validation 
   * function SHALL accept only grades between 0 and maxScore inclusive.
   * 
   * **Validates: Requirements 5.2**
   */
  describe('Property 7: Grade Range Validation', () => {
    it('should accept all grades in valid range [0, maxScore]', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const maxScore = randomInt(1, 1000);
        const validGrade = randomInt(0, maxScore);
        const result = validateGrade(validGrade, maxScore);
        
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      }
    });

    it('should reject negative grades', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const maxScore = randomInt(1, 1000);
        const invalidGrade = randomInt(-1000, -1);
        const result = validateGrade(invalidGrade, maxScore);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'GRADE_NEGATIVE' || e.code === 'GRADE_OUT_OF_RANGE')).toBe(true);
      }
    });

    it('should reject grades exceeding maxScore', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const maxScore = randomInt(1, 500);
        const invalidGrade = maxScore + randomInt(1, 500);
        const result = validateGrade(invalidGrade, maxScore);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'GRADE_EXCEEDS_MAX' || e.code === 'GRADE_OUT_OF_RANGE')).toBe(true);
      }
    });

    it('should accept boundary values 0 and maxScore', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const maxScore = randomInt(1, 1000);
        
        const result0 = validateGrade(0, maxScore);
        const resultMax = validateGrade(maxScore, maxScore);
        
        expect(result0.isValid).toBe(true);
        expect(resultMax.isValid).toBe(true);
      }
    });

    it('should handle decimal grades correctly', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const maxScore = randomInt(10, 100);
        const validDecimalGrade = Math.random() * maxScore;
        const result = validateGrade(validDecimalGrade, maxScore);
        
        expect(result.isValid).toBe(true);
      }
    });
  });
});

