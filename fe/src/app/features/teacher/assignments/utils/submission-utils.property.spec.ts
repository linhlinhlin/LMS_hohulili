/**
 * Property-Based Tests for Submission Utilities
 * 
 * Tests correctness properties using generated test data.
 * Minimum 100 iterations per property test.
 * 
 * @module submission-utils.property.spec
 * **Feature: teacher-assignments-grading**
 */

import {
  isLateSubmission,
  sortSubmissionsByDueDate,
  LateSubmissionResult
} from './submission-utils';

// ============================================================================
// Test Data Generators
// ============================================================================

/** Generates random date within range */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/** Generates random ISO date string */
function randomDateString(start?: Date, end?: Date): string {
  const s = start || new Date(2024, 0, 1);
  const e = end || new Date(2025, 11, 31);
  return randomDate(s, e).toISOString();
}

/** Generates submission that is definitely late */
function generateLateSubmission() {
  const dueDate = new Date(2024, 5, 15, 12, 0, 0); // June 15, 2024 noon
  const submittedAt = new Date(dueDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // 0-7 days late
  
  return {
    dueDate: dueDate.toISOString(),
    submittedAt: submittedAt.toISOString()
  };
}

/** Generates submission that is definitely on time */
function generateOnTimeSubmission() {
  const dueDate = new Date(2024, 5, 15, 12, 0, 0);
  const submittedAt = new Date(dueDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // 0-7 days early
  
  return {
    dueDate: dueDate.toISOString(),
    submittedAt: submittedAt.toISOString()
  };
}

/** Generates array of submissions with random due dates */
function generateSubmissionsWithDueDates(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `sub-${i}`,
    studentName: `Student ${i}`,
    dueDate: randomDateString(),
    submittedAt: randomDateString()
  }));
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Submission Utilities - Property Tests', () => {
  const ITERATIONS = 100;


  /**
   * **Property 6: Late Submission Detection**
   * 
   * *For any* submission with a submittedAt timestamp and an assignment 
   * with a dueDate, the isLate flag SHALL be true if and only if 
   * submittedAt is after dueDate.
   * 
   * **Validates: Requirements 4.3**
   */
  describe('Property 6: Late Submission Detection', () => {
    it('should correctly identify late submissions', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const { dueDate, submittedAt } = generateLateSubmission();
        const result = isLateSubmission(submittedAt, dueDate);
        
        expect(result.isLate).toBe(true);
        expect(new Date(submittedAt).getTime()).toBeGreaterThan(new Date(dueDate).getTime());
      }
    });

    it('should correctly identify on-time submissions', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const { dueDate, submittedAt } = generateOnTimeSubmission();
        const result = isLateSubmission(submittedAt, dueDate);
        
        expect(result.isLate).toBe(false);
        expect(new Date(submittedAt).getTime()).toBeLessThanOrEqual(new Date(dueDate).getTime());
      }
    });

    it('should handle exact deadline submissions as on-time', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const dueDate = randomDateString();
        const result = isLateSubmission(dueDate, dueDate);
        
        expect(result.isLate).toBe(false);
      }
    });

    it('should handle missing dueDate gracefully', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const submittedAt = randomDateString();
        const result = isLateSubmission(submittedAt, undefined);
        
        expect(result.isLate).toBe(false);
      }
    });

    it('should handle missing submittedAt gracefully', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const dueDate = randomDateString();
        const result = isLateSubmission(undefined, dueDate);
        
        expect(result.isLate).toBe(false);
      }
    });
  });

  /**
   * **Property 11: Pending Submissions Sort Order**
   * 
   * *For any* list of pending submissions, they SHALL be sorted by 
   * due date in ascending order (oldest first).
   * 
   * **Validates: Requirements 7.2**
   */
  describe('Property 11: Pending Submissions Sort Order', () => {
    it('should sort submissions by due date ascending', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const count = Math.floor(Math.random() * 20) + 2;
        const submissions = generateSubmissionsWithDueDates(count);
        const sorted = sortSubmissionsByDueDate(submissions as any);
        
        for (let j = 1; j < sorted.length; j++) {
          const prevDate = sorted[j - 1].dueDate ? new Date(sorted[j - 1].dueDate!).getTime() : Infinity;
          const currDate = sorted[j].dueDate ? new Date(sorted[j].dueDate!).getTime() : Infinity;
          
          expect(prevDate).toBeLessThanOrEqual(currDate);
        }
      }
    });

    it('should preserve all submissions after sorting', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const count = Math.floor(Math.random() * 20) + 1;
        const submissions = generateSubmissionsWithDueDates(count);
        const sorted = sortSubmissionsByDueDate(submissions as any);
        
        expect(sorted.length).toBe(submissions.length);
        
        const originalIds = submissions.map(s => s.id).sort();
        const sortedIds = sorted.map(s => s.id).sort();
        expect(sortedIds).toEqual(originalIds);
      }
    });

    it('should handle empty array', () => {
      const sorted = sortSubmissionsByDueDate([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single submission', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const submissions = generateSubmissionsWithDueDates(1);
        const sorted = sortSubmissionsByDueDate(submissions as any);
        
        expect(sorted.length).toBe(1);
        expect(sorted[0].id).toBe(submissions[0].id);
      }
    });

    it('should place submissions without dueDate at the end', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const submissions = generateSubmissionsWithDueDates(5);
        submissions[2].dueDate = undefined as any;
        
        const sorted = sortSubmissionsByDueDate(submissions as any);
        const lastItem = sorted[sorted.length - 1];
        
        expect(lastItem.dueDate).toBeUndefined();
      }
    });
  });
});

