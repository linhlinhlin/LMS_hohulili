/**
 * Allocation Endpoints - Centralized API paths
 * @see AllocationControllerV3
 */
export const ALLOCATION_ENDPOINTS = {
    // Base
    BASE: '/api/v3/allocations',

    // CRUD
    BY_ID: (id: string) => `/api/v3/allocations/${id}`,

    // Assignment-based
    BY_ASSIGNMENT: (assignmentId: string) => `/api/v3/assignments/${assignmentId}/allocation`,
    STATS: (assignmentId: string) => `/api/v3/assignments/${assignmentId}/allocation/stats`,

    // Student operations
    ASSIGN_INDIVIDUAL: (assignmentId: string) => `/api/v3/assignments/${assignmentId}/allocation/assign`,
    REMOVE_STUDENT: (assignmentId: string, studentId: string) =>
        `/api/v3/assignments/${assignmentId}/allocation/students/${studentId}`,
    UPDATE_DEADLINE: (assignmentId: string, studentId: string) =>
        `/api/v3/assignments/${assignmentId}/allocation/students/${studentId}/deadline`,

    // Student view
    MY_ALLOCATIONS: '/api/v3/student/allocations',
} as const;
