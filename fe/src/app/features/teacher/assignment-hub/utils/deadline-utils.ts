/**
 * Deadline Override Utilities
 *
 * Utilities for managing deadline extensions for individual students.
 * Includes audit trail support for STCW compliance.
 *
 * @requirements 4.3, 4.4, 4.5
 */

export interface DeadlineOverride {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  originalDeadline: string;
  newDeadline: string;
  reason: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface DeadlineOverrideRequest {
  assignmentId: string;
  studentId: string;
  studentName: string;
  newDeadline: string;
  reason: string;
}

export interface DeadlineAuditEntry {
  id: string;
  action: 'EXTENDED' | 'REVOKED';
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  originalDeadline: string;
  newDeadline: string;
  reason: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
}

/**
 * Get effective deadline for a student
 * Uses override if exists, otherwise returns original deadline
 *
 * @param originalDeadline - The original assignment deadline
 * @param overrides - List of all deadline overrides
 * @param studentId - The student ID to check
 * @param assignmentId - The assignment ID
 * @returns The effective deadline (override if exists, otherwise original)
 */
export function getEffectiveDeadline(
  originalDeadline: string,
  overrides: DeadlineOverride[],
  studentId: string,
  assignmentId: string
): string {
  const override = overrides.find(
    (o) => o.studentId === studentId && o.assignmentId === assignmentId
  );

  return override?.newDeadline || originalDeadline;
}

/**
 * Check if a student has a deadline override
 *
 * @param overrides - List of all deadline overrides
 * @param studentId - The student ID to check
 * @param assignmentId - The assignment ID
 * @returns The override if exists, undefined otherwise
 */
export function getStudentOverride(
  overrides: DeadlineOverride[],
  studentId: string,
  assignmentId: string
): DeadlineOverride | undefined {
  return overrides.find(
    (o) => o.studentId === studentId && o.assignmentId === assignmentId
  );
}

/**
 * Create a new deadline override
 *
 * @param request - The override request data
 * @param originalDeadline - The original assignment deadline
 * @param createdBy - Teacher ID who created the override
 * @param createdByName - Teacher name
 * @returns New DeadlineOverride object
 */
export function createDeadlineOverride(
  request: DeadlineOverrideRequest,
  originalDeadline: string,
  createdBy: string,
  createdByName: string
): DeadlineOverride {
  return {
    id: generateId(),
    assignmentId: request.assignmentId,
    studentId: request.studentId,
    studentName: request.studentName,
    originalDeadline,
    newDeadline: request.newDeadline,
    reason: request.reason,
    createdAt: new Date().toISOString(),
    createdBy,
    createdByName,
  };
}

/**
 * Validate override date
 * New deadline must be in the future
 *
 * @param newDeadline - The proposed new deadline
 * @param currentDate - Current date for comparison (defaults to now)
 * @returns Validation result with error message if invalid
 */
export function validateOverrideDate(
  newDeadline: string,
  currentDate: Date = new Date()
): { isValid: boolean; error?: string } {
  const deadlineDate = new Date(newDeadline);

  if (isNaN(deadlineDate.getTime())) {
    return {
      isValid: false,
      error: 'Ngày không hợp lệ',
    };
  }

  if (deadlineDate <= currentDate) {
    return {
      isValid: false,
      error: 'Hạn nộp mới phải sau thời điểm hiện tại',
    };
  }

  return { isValid: true };
}

/**
 * Validate override reason
 * Reason is required and must have minimum length
 *
 * @param reason - The reason for extension
 * @param minLength - Minimum required length (default 10)
 * @returns Validation result with error message if invalid
 */
export function validateOverrideReason(
  reason: string,
  minLength: number = 10
): { isValid: boolean; error?: string } {
  if (!reason || reason.trim().length === 0) {
    return {
      isValid: false,
      error: 'Vui lòng nhập lý do gia hạn',
    };
  }

  if (reason.trim().length < minLength) {
    return {
      isValid: false,
      error: `Lý do phải có ít nhất ${minLength} ký tự`,
    };
  }

  return { isValid: true };
}

/**
 * Create audit entry for deadline override
 *
 * @param override - The deadline override
 * @param assignmentTitle - Title of the assignment
 * @param action - The action performed
 * @returns Audit entry for logging
 */
export function createAuditEntry(
  override: DeadlineOverride,
  assignmentTitle: string,
  action: 'EXTENDED' | 'REVOKED' = 'EXTENDED'
): DeadlineAuditEntry {
  return {
    id: generateId(),
    action,
    assignmentId: override.assignmentId,
    assignmentTitle,
    studentId: override.studentId,
    studentName: override.studentName,
    originalDeadline: override.originalDeadline,
    newDeadline: override.newDeadline,
    reason: override.reason,
    performedBy: override.createdBy,
    performedByName: override.createdByName,
    performedAt: override.createdAt,
  };
}

/**
 * Format deadline for display
 *
 * @param deadline - ISO date string
 * @returns Formatted date string in Vietnamese locale
 */
export function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate days extended
 *
 * @param originalDeadline - Original deadline
 * @param newDeadline - New deadline
 * @returns Number of days extended (can be negative if shortened)
 */
export function calculateDaysExtended(
  originalDeadline: string,
  newDeadline: string
): number {
  const original = new Date(originalDeadline);
  const extended = new Date(newDeadline);
  const diffTime = extended.getTime() - original.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper function to generate unique ID
function generateId(): string {
  return `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
