/**
 * Allocation Utilities for Assignment Distribution
 * 
 * Expert Note: Uses DYNAMIC logic for ALL_STUDENTS distribution
 * - ALL_STUDENTS: studentIds = null, query enrolled students at runtime
 * - SPECIFIC_STUDENTS: studentIds = explicit list
 * This ensures newly enrolled students automatically see assignments
 */

// Types
export type DistributionType = 'ALL_STUDENTS' | 'SPECIFIC_STUDENTS' | 'CLASS';

export interface AssignmentAllocation {
  id: string;
  assignmentId: string;
  courseId: string;
  distributionType: DistributionType;
  studentIds: string[] | null; // null for ALL_STUDENTS or CLASS
  classId?: string | null;
  isIndividual?: boolean;
  createdAt: string;
  createdBy: string;
}

export interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
}

export interface AllocationResult {
  studentId: string;
  isAllocated: boolean;
  allocationType: 'BULK' | 'INDIVIDUAL' | 'NONE';
}

/**
 * Get all allocated students for an assignment
 * Uses DYNAMIC logic: ALL_STUDENTS returns all enrolled students
 * 
 * @param allocation - The assignment allocation record
 * @param enrolledStudents - Current list of enrolled students in the course
 * @returns Array of student IDs who should see this assignment
 */
export function getAllocatedStudents(
  allocation: AssignmentAllocation,
  enrolledStudents: EnrolledStudent[]
): string[] {
  if (allocation.distributionType === 'ALL_STUDENTS') {
    // Dynamic: Return ALL currently enrolled students
    return enrolledStudents.map(s => s.id);
  }
  
  // Specific: Return only explicitly assigned students
  return allocation.studentIds ?? [];
}

/**
 * Get students for SPECIFIC_STUDENTS distribution
 * Only returns the explicitly assigned student IDs
 * 
 * @param allocation - The assignment allocation record
 * @returns Array of explicitly assigned student IDs, or empty if ALL_STUDENTS
 */
export function getSpecificStudents(allocation: AssignmentAllocation): string[] {
  if (allocation.distributionType === 'SPECIFIC_STUDENTS' && allocation.studentIds) {
    return [...allocation.studentIds];
  }
  return [];
}

/**
 * Check if a specific student is allocated to an assignment
 * 
 * @param studentId - The student ID to check
 * @param allocation - The assignment allocation record
 * @param enrolledStudents - Current list of enrolled students in the course
 * @returns AllocationResult with allocation status and type
 */
export function isStudentAllocated(
  studentId: string,
  allocation: AssignmentAllocation,
  enrolledStudents: EnrolledStudent[]
): AllocationResult {
  // Check if student is enrolled in the course
  const isEnrolled = enrolledStudents.some(s => s.id === studentId);
  
  if (allocation.distributionType === 'ALL_STUDENTS') {
    // ALL_STUDENTS: Student is allocated if they are enrolled
    return {
      studentId,
      isAllocated: isEnrolled,
      allocationType: isEnrolled ? 'BULK' : 'NONE'
    };
  }
  
  // SPECIFIC_STUDENTS: Check if student is in the explicit list
  const isInList = allocation.studentIds?.includes(studentId) ?? false;
  
  return {
    studentId,
    isAllocated: isInList,
    allocationType: isInList 
      ? (allocation.isIndividual ? 'INDIVIDUAL' : 'BULK') 
      : 'NONE'
  };
}

/**
 * Create a new allocation record
 * 
 * @param assignmentId - The assignment ID
 * @param courseId - The course ID
 * @param distributionType - ALL_STUDENTS or SPECIFIC_STUDENTS
 * @param studentIds - List of student IDs (only for SPECIFIC_STUDENTS)
 * @param createdBy - Teacher ID who created the allocation
 * @param isIndividual - Whether this is an individual (remedial) assignment
 * @returns New AssignmentAllocation object
 */
export function createAllocation(
  assignmentId: string,
  courseId: string,
  distributionType: DistributionType,
  studentIds: string[] | null,
  createdBy: string,
  isIndividual: boolean = false
): AssignmentAllocation {
  return {
    id: generateId(),
    assignmentId,
    courseId,
    distributionType,
    studentIds: distributionType === 'ALL_STUDENTS' ? null : studentIds,
    isIndividual,
    createdAt: new Date().toISOString(),
    createdBy
  };
}

/**
 * Validate allocation data
 * 
 * @param distributionType - The distribution type
 * @param studentIds - The student IDs (required for SPECIFIC_STUDENTS)
 * @returns Validation result with error message if invalid
 */
export function validateAllocation(
  distributionType: DistributionType,
  studentIds: string[] | null
): { isValid: boolean; error?: string } {
  if (distributionType === 'SPECIFIC_STUDENTS') {
    if (!studentIds || studentIds.length === 0) {
      return {
        isValid: false,
        error: 'Vui lòng chọn ít nhất một học viên'
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Get allocation statistics
 * 
 * @param allocation - The assignment allocation record
 * @param enrolledStudents - Current list of enrolled students
 * @returns Statistics about the allocation
 */
export function getAllocationStats(
  allocation: AssignmentAllocation,
  enrolledStudents: EnrolledStudent[]
): { totalAllocated: number; distributionType: DistributionType; isIndividual: boolean } {
  const allocatedStudents = getAllocatedStudents(allocation, enrolledStudents);
  
  return {
    totalAllocated: allocatedStudents.length,
    distributionType: allocation.distributionType,
    isIndividual: allocation.isIndividual ?? false
  };
}

// Helper function to generate unique ID
function generateId(): string {
  return `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
