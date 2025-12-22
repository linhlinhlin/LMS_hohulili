/**
 * Property-Based Tests for Assignment List Utilities
 * 
 * Tests correctness properties using generated test data.
 * Minimum 100 iterations per property test.
 * 
 * @module assignment-list-utils.property.spec
 * **Feature: teacher-assignments-grading**
 */

import {
  filterAssignments,
  sortAssignments,
  AssignmentSummary,
  AssignmentFilterCriteria,
  SortConfig
} from './assignment-list-utils';

// ============================================================================
// Test Data Generators
// ============================================================================

const STATUSES: ('DRAFT' | 'PUBLISHED' | 'CLOSED')[] = ['DRAFT', 'PUBLISHED', 'CLOSED'];
const COURSE_IDS = ['course-1', 'course-2', 'course-3', 'course-4', 'course-5'];

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateString(): string {
  const start = new Date(2024, 0, 1);
  const end = new Date(2025, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
}

function generateAssignment(index: number): AssignmentSummary {
  return {
    id: `assignment-${index}`,
    title: `Assignment ${randomString(10)}`,
    courseId: COURSE_IDS[randomInt(0, COURSE_IDS.length - 1)],
    courseTitle: `Course ${randomInt(1, 5)}`,
    dueDate: randomDateString(),
    status: STATUSES[randomInt(0, 2)],
    submissionsCount: randomInt(0, 50),
    gradedCount: randomInt(0, 30),
    totalStudents: randomInt(10, 100),
    maxScore: randomInt(10, 100)
  };
}

function generateAssignments(count: number): AssignmentSummary[] {
  return Array.from({ length: count }, (_, i) => generateAssignment(i));
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Assignment List Utilities - Property Tests', () => {
  const ITERATIONS = 100;


  /**
   * **Property 1: Assignment List Filter Consistency**
   * 
   * *For any* set of assignments and any filter criteria (status, course, keyword),
   * all assignments returned by the filter function SHALL match the specified criteria.
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: Assignment List Filter Consistency', () => {
    it('should return only assignments matching status filter', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(10, 30));
        const targetStatus = STATUSES[randomInt(0, 2)];
        const criteria: AssignmentFilterCriteria = { status: targetStatus };
        
        const filtered = filterAssignments(assignments, criteria);
        
        filtered.forEach(a => {
          expect(a.status).toBe(targetStatus);
        });
      }
    });

    it('should return only assignments matching course filter', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(10, 30));
        const targetCourse = COURSE_IDS[randomInt(0, COURSE_IDS.length - 1)];
        const criteria: AssignmentFilterCriteria = { courseId: targetCourse };
        
        const filtered = filterAssignments(assignments, criteria);
        
        filtered.forEach(a => {
          expect(a.courseId).toBe(targetCourse);
        });
      }
    });

    it('should return only assignments matching keyword filter', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(10, 30));
        // Use part of a random assignment title as keyword
        const randomAssignment = assignments[randomInt(0, assignments.length - 1)];
        const keyword = randomAssignment.title.substring(0, 5).toLowerCase();
        const criteria: AssignmentFilterCriteria = { keyword };
        
        const filtered = filterAssignments(assignments, criteria);
        
        filtered.forEach(a => {
          const titleLower = a.title.toLowerCase();
          const courseLower = a.courseTitle.toLowerCase();
          expect(titleLower.includes(keyword) || courseLower.includes(keyword)).toBe(true);
        });
      }
    });

    it('should return subset of original assignments', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(10, 30));
        const criteria: AssignmentFilterCriteria = { status: STATUSES[randomInt(0, 2)] };
        
        const filtered = filterAssignments(assignments, criteria);
        
        expect(filtered.length).toBeLessThanOrEqual(assignments.length);
        filtered.forEach(f => {
          expect(assignments.some(a => a.id === f.id)).toBe(true);
        });
      }
    });

    it('should return all assignments when no filter applied', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(5, 20));
        const filtered = filterAssignments(assignments, {});
        
        expect(filtered.length).toBe(assignments.length);
      }
    });
  });

  /**
   * **Property 2: Assignment List Sort Order**
   * 
   * *For any* set of assignments and any sort configuration (column, direction),
   * the returned list SHALL be correctly ordered according to the specified 
   * column in the specified direction.
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Assignment List Sort Order', () => {
    it('should sort by title ascending correctly', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(5, 20));
        const config: SortConfig = { column: 'title', direction: 'asc' };
        
        const sorted = sortAssignments(assignments, config);
        
        for (let j = 1; j < sorted.length; j++) {
          expect(sorted[j - 1].title.localeCompare(sorted[j].title)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should sort by title descending correctly', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(5, 20));
        const config: SortConfig = { column: 'title', direction: 'desc' };
        
        const sorted = sortAssignments(assignments, config);
        
        for (let j = 1; j < sorted.length; j++) {
          expect(sorted[j - 1].title.localeCompare(sorted[j].title)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should sort by dueDate ascending correctly', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(5, 20));
        const config: SortConfig = { column: 'dueDate', direction: 'asc' };
        
        const sorted = sortAssignments(assignments, config);
        
        for (let j = 1; j < sorted.length; j++) {
          if (sorted[j - 1].dueDate && sorted[j].dueDate) {
            const prev = new Date(sorted[j - 1].dueDate!).getTime();
            const curr = new Date(sorted[j].dueDate!).getTime();
            expect(prev).toBeLessThanOrEqual(curr);
          }
        }
      }
    });

    it('should preserve all assignments after sorting', () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const assignments = generateAssignments(randomInt(5, 20));
        const config: SortConfig = { column: 'title', direction: 'asc' };
        
        const sorted = sortAssignments(assignments, config);
        
        expect(sorted.length).toBe(assignments.length);
        const originalIds = assignments.map(a => a.id).sort();
        const sortedIds = sorted.map(a => a.id).sort();
        expect(sortedIds).toEqual(originalIds);
      }
    });

    it('should handle empty array', () => {
      const sorted = sortAssignments([], { column: 'title', direction: 'asc' });
      expect(sorted).toEqual([]);
    });
  });
});

