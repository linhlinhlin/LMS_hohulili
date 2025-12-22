/**
 * Property-Based Tests for Rubric Calculator
 * 
 * Tests correctness properties using generated test data.
 * Minimum 100 iterations per property test.
 * 
 * @module rubric-calculator.property.spec
 * **Feature: teacher-assignments-grading**
 */

import {
  calculateRubricScore,
  validateRubricDeletion,
  validateRubricWeightSum,
  Rubric,
  RubricCriterion,
  RubricLevel,
  RubricGradeSelection,
  RubricScoreResult,
  REQUIRED_WEIGHT_SUM
} from './rubric-calculator';

// ============================================================================
// Test Data Generators
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateLevel(index: number): RubricLevel {
  return {
    id: `level-${index}-${randomString(4)}`,
    name: `Level ${index}`,
    description: `Description for level ${index}`,
    points: randomInt(0, 100)
  };
}

function generateCriterion(index: number, weight: number): RubricCriterion {
  const levelCount = randomInt(2, 5);
  return {
    id: `criterion-${index}-${randomString(4)}`,
    name: `Criterion ${index}`,
    description: `Description for criterion ${index}`,
    weight,
    levels: Array.from({ length: levelCount }, (_, i) => generateLevel(i))
  };
}

/** Generates rubric with weights summing to exactly 100 */
function generateValidRubric(): Rubric {
  const criteriaCount = randomInt(2, 5);
  let remainingWeight = 100;
  const criteria: RubricCriterion[] = [];
  
  for (let i = 0; i < criteriaCount; i++) {
    const isLast = i === criteriaCount - 1;
    const weight = isLast ? remainingWeight : randomInt(10, Math.min(50, remainingWeight - (criteriaCount - i - 1) * 10));
    remainingWeight -= weight;
    criteria.push(generateCriterion(i, weight));
  }
  
  return {
    id: `rubric-${randomString(6)}`,
    name: `Rubric ${randomString(5)}`,
    description: 'Test rubric',
    criteria,
    totalPoints: 100,
    createdAt: new Date().toISOString()
  };
}

/** Generates rubric with weights NOT summing to 100 */
function generateInvalidWeightRubric(): Rubric {
  const rubric = generateValidRubric();
  // Modify one weight to break the sum
  if (rubric.criteria.length > 0) {
    rubric.criteria[0].weight += randomInt(1, 20);
  }
  return rubric;
}

/** Generates selections for all criteria in a rubric */
function generateSelectionsForRubric(rubric: Rubric): RubricGradeSelection[] {
  return rubric.criteria.map(criterion => {
    const randomLevel = criterion.levels[randomInt(0, criterion.levels.length - 1)];
    return {
      criterionId: criterion.id,
      levelId: randomLevel.id,
      points: randomLevel.points
    };
  });
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Rubric Calculator - Property Tests', () => {
  const ITERATIONS = 100;


  /**
   * **Property 9: Rubric Score Calculation**
   * 
   * *For any* rubric with criteria and selected levels, the total score 
   * SHALL equal the sum of points from all selected levels weighted by criteria.
   * 
   * **Validates: Requirements 6.4**
   */
  describe('Property 9: Rubric Score Calculation', () => {
    it('should calculate score as weighted sum of selected levels', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const selections = generateSelectionsForRubric(rubric);
        
        const result = calculateRubricScore(rubric, selections);
        
        // Manually calculate expected score
        let expectedScore = 0;
        for (const criterion of rubric.criteria) {
          const selection = selections.find(s => s.criterionId === criterion.id);
          if (selection) {
            const level = criterion.levels.find(l => l.id === selection.levelId);
            if (level) {
              expectedScore += (criterion.weight / 100) * level.points;
            }
          }
        }
        
        expect(Math.abs(result.totalScore - expectedScore)).toBeLessThan(0.01);
      }
    });

    it('should return score between 0 and maxPossibleScore', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const selections = generateSelectionsForRubric(rubric);
        
        const result = calculateRubricScore(rubric, selections);
        
        expect(result.totalScore).toBeGreaterThanOrEqual(0);
        expect(result.totalScore).toBeLessThanOrEqual(result.maxPossibleScore);
      }
    });

    it('should return percentage between 0 and 100', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const selections = generateSelectionsForRubric(rubric);
        
        const result = calculateRubricScore(rubric, selections);
        
        expect(result.percentage).toBeGreaterThanOrEqual(0);
        expect(result.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should include score for each criterion', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const selections = generateSelectionsForRubric(rubric);
        
        const result = calculateRubricScore(rubric, selections);
        
        expect(result.criteriaScores.length).toBe(rubric.criteria.length);
      }
    });
  });

  /**
   * **Property 10: Rubric Deletion Guard**
   * 
   * *For any* rubric that is currently associated with one or more assignments,
   * the delete operation SHALL fail and return an error.
   * 
   * **Validates: Requirements 6.5**
   */
  describe('Property 10: Rubric Deletion Guard', () => {
    it('should reject deletion when rubric is in use', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const assignmentRubricIds = [rubric.id, `other-${randomString(4)}`];
        
        const result = validateRubricDeletion(rubric, assignmentRubricIds);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'RUBRIC_IN_USE')).toBe(true);
      }
    });

    it('should allow deletion when rubric is not in use', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        rubric.usageCount = 0;
        const assignmentRubricIds = [`other-${randomString(4)}`, `another-${randomString(4)}`];
        
        const result = validateRubricDeletion(rubric, assignmentRubricIds);
        
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      }
    });

    it('should reject deletion when usageCount > 0', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        rubric.usageCount = randomInt(1, 10);
        const assignmentRubricIds: string[] = [];
        
        const result = validateRubricDeletion(rubric, assignmentRubricIds);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'RUBRIC_HAS_USAGE')).toBe(true);
      }
    });
  });


  /**
   * **Property 13: Rubric Weight Sum Integrity**
   * 
   * *For any* active rubric, the sum of weights of all criteria 
   * SHALL equal exactly 100 (percentage-based).
   * 
   * **Validates: Requirements 6.6**
   */
  describe('Property 13: Rubric Weight Sum Integrity', () => {
    it('should accept rubrics with weights summing to 100', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        
        const result = validateRubricWeightSum(rubric.criteria);
        
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      }
    });

    it('should reject rubrics with weights not summing to 100', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateInvalidWeightRubric();
        
        const result = validateRubricWeightSum(rubric.criteria);
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_WEIGHT_SUM')).toBe(true);
      }
    });

    it('should reject empty criteria array', () => {
      const result = validateRubricWeightSum([]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_CRITERIA')).toBe(true);
    });

    it('should validate that total weight equals REQUIRED_WEIGHT_SUM constant', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
        
        expect(totalWeight).toBe(REQUIRED_WEIGHT_SUM);
      }
    });
  });

  /**
   * **Property 14: Grading Idempotency**
   * 
   * *For any* submission and rubric, applying the same rubric levels 
   * multiple times SHALL always produce the same final score (no cumulative errors).
   * 
   * **Validates: Requirements 6.7**
   */
  describe('Property 14: Grading Idempotency', () => {
    it('should produce same score when called multiple times with same inputs', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const selections = generateSelectionsForRubric(rubric);
        
        const result1 = calculateRubricScore(rubric, selections);
        const result2 = calculateRubricScore(rubric, selections);
        const result3 = calculateRubricScore(rubric, selections);
        
        expect(result1.totalScore).toBe(result2.totalScore);
        expect(result2.totalScore).toBe(result3.totalScore);
        expect(result1.percentage).toBe(result2.percentage);
        expect(result2.percentage).toBe(result3.percentage);
      }
    });

    it('should produce same criteriaScores when called multiple times', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const selections = generateSelectionsForRubric(rubric);
        
        const result1 = calculateRubricScore(rubric, selections);
        const result2 = calculateRubricScore(rubric, selections);
        
        expect(result1.criteriaScores.length).toBe(result2.criteriaScores.length);
        
        for (let j = 0; j < result1.criteriaScores.length; j++) {
          expect(result1.criteriaScores[j].weightedScore).toBe(result2.criteriaScores[j].weightedScore);
          expect(result1.criteriaScores[j].points).toBe(result2.criteriaScores[j].points);
        }
      }
    });

    it('should not accumulate errors over multiple calculations', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const rubric = generateValidRubric();
        const selections = generateSelectionsForRubric(rubric);
        
        let lastScore = 0;
        for (let j = 0; j < 10; j++) {
          const result = calculateRubricScore(rubric, selections);
          if (j === 0) {
            lastScore = result.totalScore;
          } else {
            expect(result.totalScore).toBe(lastScore);
          }
        }
      }
    });
  });
});

