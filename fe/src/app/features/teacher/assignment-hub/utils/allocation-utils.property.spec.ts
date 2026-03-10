/**
 * Property-Based Tests for Allocation Utilities
 * 
 * Feature: assignment-distribution
 * Tests the core allocation logic for assignment distribution
 */

import * as fc from 'fast-check';
import {
  getAllocatedStudents,
  getSpecificStudents,
  isStudentAllocated,
  createAllocation,
  validateAllocation,
  AssignmentAllocation,
  EnrolledStudent,
  DistributionType
} from './allocation-utils';

// Arbitraries for generating test data
const studentIdArb = fc.uuid();
const assignmentIdArb = fc.uuid();
const courseIdArb = fc.uuid();
const teacherIdArb = fc.uuid();

const enrolledStudentArb: fc.Arbitrary<EnrolledStudent> = fc.record({
  id: studentIdArb,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  enrolledAt: fc.integer({ min: 1500000000000, max: 2000000000000 }).map(v => new Date(v).toISOString())
});

const enrolledStudentsArb = fc.array(enrolledStudentArb, { minLength: 0, maxLength: 100 });

const allocationArb: fc.Arbitrary<AssignmentAllocation> = fc.record({
  id: fc.uuid(),
  assignmentId: assignmentIdArb,
  courseId: courseIdArb,
  distributionType: fc.constantFrom('ALL_STUDENTS', 'SPECIFIC_STUDENTS') as fc.Arbitrary<DistributionType>,
  studentIds: fc.oneof(fc.constant(null), fc.array(studentIdArb, { minLength: 1, maxLength: 50 })),
  isIndividual: fc.boolean(),
  createdAt: fc.integer({ min: 1500000000000, max: 2000000000000 }).map(v => new Date(v).toISOString()),
  createdBy: teacherIdArb
});

describe('Allocation Utilities - Property Tests', () => {

  /**
   * Feature: assignment-distribution, Property 1: All Students Distribution Completeness
   * For any assignment with distributionType='ALL_STUDENTS', all currently enrolled 
   * students in the course SHALL appear in the allocated students list.
   * Validates: Requirements 1.2, 6.3
   */
  describe('Property 1: All Students Distribution Completeness', () => {
    it('should return all enrolled students when distributionType is ALL_STUDENTS', () => {
      fc.assert(
        fc.property(
          enrolledStudentsArb,
          assignmentIdArb,
          courseIdArb,
          teacherIdArb,
          (enrolledStudents: EnrolledStudent[], assignmentId: string, courseId: string, teacherId: string) => {
            // Create ALL_STUDENTS allocation
            const allocation: AssignmentAllocation = {
              id: 'test-id',
              assignmentId,
              courseId,
              distributionType: 'ALL_STUDENTS',
              studentIds: null, // Dynamic query
              createdAt: new Date().toISOString(),
              createdBy: teacherId
            };

            const allocatedStudents = getAllocatedStudents(allocation, enrolledStudents);

            // All enrolled students should be in the allocated list
            const enrolledIds = enrolledStudents.map((s: EnrolledStudent) => s.id);
            expect(allocatedStudents.length).toBe(enrolledStudents.length);
            expect(allocatedStudents.sort()).toEqual(enrolledIds.sort());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include newly enrolled students dynamically', () => {
      fc.assert(
        fc.property(
          enrolledStudentsArb,
          enrolledStudentArb,
          assignmentIdArb,
          courseIdArb,
          (existingStudents: EnrolledStudent[], newStudent: EnrolledStudent, assignmentId: string, courseId: string) => {
            const allocation: AssignmentAllocation = {
              id: 'test-id',
              assignmentId,
              courseId,
              distributionType: 'ALL_STUDENTS',
              studentIds: null,
              createdAt: new Date().toISOString(),
              createdBy: 'teacher-1'
            };

            // Before new student enrolls
            const beforeEnroll = getAllocatedStudents(allocation, existingStudents);

            // After new student enrolls
            const afterEnroll = getAllocatedStudents(allocation, [...existingStudents, newStudent]);

            // New student should be included
            expect(afterEnroll.length).toBe(beforeEnroll.length + 1);
            expect(afterEnroll).toContain(newStudent.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: assignment-distribution, Property 2: Specific Students Distribution Accuracy
   * For any assignment with distributionType='SPECIFIC_STUDENTS', only the explicitly 
   * specified studentIds SHALL appear in the allocated students list.
   * Validates: Requirements 1.3, 6.4
   */
  describe('Property 2: Specific Students Distribution Accuracy', () => {
    it('should return only specified students when distributionType is SPECIFIC_STUDENTS', () => {
      fc.assert(
        fc.property(
          enrolledStudentsArb,
          fc.array(studentIdArb, { minLength: 1, maxLength: 20 }),
          assignmentIdArb,
          courseIdArb,
          (enrolledStudents: EnrolledStudent[], specificIds: string[], assignmentId: string, courseId: string) => {
            const allocation: AssignmentAllocation = {
              id: 'test-id',
              assignmentId,
              courseId,
              distributionType: 'SPECIFIC_STUDENTS',
              studentIds: specificIds,
              createdAt: new Date().toISOString(),
              createdBy: 'teacher-1'
            };

            const allocatedStudents = getAllocatedStudents(allocation, enrolledStudents);

            // Should return exactly the specified IDs
            expect(allocatedStudents.sort()).toEqual(specificIds.sort());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include new enrollees when using SPECIFIC_STUDENTS', () => {
      fc.assert(
        fc.property(
          fc.array(studentIdArb, { minLength: 1, maxLength: 10 }),
          enrolledStudentArb,
          assignmentIdArb,
          courseIdArb,
          (specificIds: string[], newStudent: EnrolledStudent, assignmentId: string, courseId: string) => {
            // Ensure new student is not in specific list
            const filteredIds = specificIds.filter((id: string) => id !== newStudent.id);
            if (filteredIds.length === 0) return true; // Skip if all filtered out

            const allocation: AssignmentAllocation = {
              id: 'test-id',
              assignmentId,
              courseId,
              distributionType: 'SPECIFIC_STUDENTS',
              studentIds: filteredIds,
              createdAt: new Date().toISOString(),
              createdBy: 'teacher-1'
            };

            const enrolledStudents: EnrolledStudent[] = [newStudent];
            const allocatedStudents = getAllocatedStudents(allocation, enrolledStudents);

            // New student should NOT be included (not in specific list)
            expect(allocatedStudents).not.toContain(newStudent.id);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: isStudentAllocated consistency
   */
  describe('isStudentAllocated consistency', () => {
    it('should return consistent results with getAllocatedStudents', () => {
      fc.assert(
        fc.property(
          enrolledStudentsArb.filter((arr: EnrolledStudent[]) => arr.length > 0),
          fc.constantFrom('ALL_STUDENTS', 'SPECIFIC_STUDENTS') as fc.Arbitrary<DistributionType>,
          assignmentIdArb,
          courseIdArb,
          (enrolledStudents: EnrolledStudent[], distributionType: DistributionType, assignmentId: string, courseId: string) => {
            const studentIds = distributionType === 'SPECIFIC_STUDENTS'
              ? enrolledStudents.slice(0, Math.ceil(enrolledStudents.length / 2)).map((s: EnrolledStudent) => s.id)
              : null;

            const allocation: AssignmentAllocation = {
              id: 'test-id',
              assignmentId,
              courseId,
              distributionType,
              studentIds,
              createdAt: new Date().toISOString(),
              createdBy: 'teacher-1'
            };

            const allocatedList = getAllocatedStudents(allocation, enrolledStudents);

            // Check each enrolled student
            for (const student of enrolledStudents) {
              const result = isStudentAllocated(student.id, allocation, enrolledStudents);
              const isInList = allocatedList.includes(student.id);

              expect(result.isAllocated).toBe(isInList);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Validation tests
   */
  describe('validateAllocation', () => {
    it('should require studentIds for SPECIFIC_STUDENTS with null', () => {
      const result = validateAllocation('SPECIFIC_STUDENTS', null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require studentIds for SPECIFIC_STUDENTS with empty array', () => {
      const result = validateAllocation('SPECIFIC_STUDENTS', []);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept any studentIds for ALL_STUDENTS', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(null), fc.array(studentIdArb)),
          (studentIds: string[] | null) => {
            const result = validateAllocation('ALL_STUDENTS', studentIds);
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
