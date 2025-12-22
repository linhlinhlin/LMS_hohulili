/**
 * Submission Utilities
 * 
 * Provides utility functions for submission-related operations.
 * Includes late submission detection and sorting functionality.
 * 
 * @module submission-utils
 * @requirements 4.3, 7.2
 */

// ============================================================================
// Types
// ============================================================================

export interface SubmissionData {
  id: string;
  submittedAt: string; // ISO date string
  studentName: string;
  studentEmail: string;
  status: SubmissionStatus;
  grade?: number;
}

export interface SubmissionWithDueDate extends SubmissionData {
  dueDate?: string; // ISO date string from assignment
}

export interface PendingSubmission {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  studentName: string;
  submittedAt: string;
  dueDate?: string;
  isOverdue: boolean;
  priority: SubmissionPriority;
}

export type SubmissionStatus = 'PENDING' | 'SUBMITTED' | 'GRADED' | 'RETURNED' | 'LATE';
export type SubmissionPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LateSubmissionResult {
  isLate: boolean;
  lateByMs?: number;
  lateByHours?: number;
  lateByDays?: number;
}

// ============================================================================
// Late Submission Detection
// ============================================================================

/**
 * Determines if a submission is late based on submission time and due date.
 * 
 * A submission is considered late if submittedAt is after dueDate.
 * If dueDate is not provided, the submission is never considered late.
 * 
 * @param submittedAt - ISO date string of when the submission was made
 * @param dueDate - ISO date string of the assignment due date (optional)
 * @returns LateSubmissionResult with isLate flag and time difference details
 * 
 * @example
 * isLateSubmission('2025-10-21T10:00:00Z', '2025-10-20T23:59:59Z');
 * // { isLate: true, lateByMs: 36001000, lateByHours: 10, lateByDays: 0 }
 * 
 * @requirements 4.3
 */
export function isLateSubmission(submittedAt: string, dueDate?: string | null): LateSubmissionResult {
  // If no due date, submission cannot be late
  if (!dueDate) {
    return { isLate: false };
  }

  const submittedDate = new Date(submittedAt);
  const dueDateObj = new Date(dueDate);

  // Validate dates
  if (isNaN(submittedDate.getTime()) || isNaN(dueDateObj.getTime())) {
    return { isLate: false };
  }

  const diffMs = submittedDate.getTime() - dueDateObj.getTime();
  const isLate = diffMs > 0;

  if (!isLate) {
    return { isLate: false };
  }

  const lateByHours = Math.floor(diffMs / (1000 * 60 * 60));
  const lateByDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    isLate: true,
    lateByMs: diffMs,
    lateByHours,
    lateByDays
  };
}

/**
 * Quick boolean check for late submission.
 * 
 * @param submittedAt - ISO date string of when the submission was made
 * @param dueDate - ISO date string of the assignment due date
 * @returns true if submission is late, false otherwise
 */
export function checkIsLate(submittedAt: string, dueDate?: string | null): boolean {
  return isLateSubmission(submittedAt, dueDate).isLate;
}

/**
 * Formats the late duration into a human-readable Vietnamese string.
 * 
 * @param result - LateSubmissionResult from isLateSubmission
 * @returns Formatted string like "Muộn 2 ngày" or "Muộn 5 giờ"
 */
export function formatLateDuration(result: LateSubmissionResult): string {
  if (!result.isLate) {
    return '';
  }

  if (result.lateByDays && result.lateByDays >= 1) {
    return `Muộn ${result.lateByDays} ngày`;
  }

  if (result.lateByHours && result.lateByHours >= 1) {
    return `Muộn ${result.lateByHours} giờ`;
  }

  const minutes = Math.floor((result.lateByMs || 0) / (1000 * 60));
  return `Muộn ${minutes} phút`;
}

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * Sorts pending submissions by due date in ascending order (oldest first).
 * Submissions without due dates are placed at the end.
 * 
 * This ensures teachers see the most urgent submissions first.
 * 
 * @param submissions - Array of pending submissions to sort
 * @returns New sorted array (does not mutate original)
 * 
 * @example
 * const sorted = sortSubmissionsByDueDate(submissions);
 * // Submissions with earliest due dates appear first
 * 
 * @requirements 7.2
 */
export function sortSubmissionsByDueDate<T extends { dueDate?: string | null }>(
  submissions: T[]
): T[] {
  return [...submissions].sort((a, b) => {
    // Handle null/undefined due dates - push to end
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();

    // Handle invalid dates
    if (isNaN(dateA) && isNaN(dateB)) return 0;
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;

    // Ascending order (oldest first)
    return dateA - dateB;
  });
}

/**
 * Sorts submissions by submission time in descending order (newest first).
 * 
 * @param submissions - Array of submissions to sort
 * @returns New sorted array (does not mutate original)
 */
export function sortSubmissionsBySubmittedAt<T extends { submittedAt: string }>(
  submissions: T[]
): T[] {
  return [...submissions].sort((a, b) => {
    const dateA = new Date(a.submittedAt).getTime();
    const dateB = new Date(b.submittedAt).getTime();

    // Handle invalid dates
    if (isNaN(dateA) && isNaN(dateB)) return 0;
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;

    // Descending order (newest first)
    return dateB - dateA;
  });
}

// ============================================================================
// Priority Calculation
// ============================================================================

/**
 * Calculates the priority of a pending submission based on due date.
 * 
 * Priority levels:
 * - HIGH: Overdue or due within 24 hours
 * - MEDIUM: Due within 3 days
 * - LOW: Due later than 3 days or no due date
 * 
 * @param dueDate - ISO date string of the assignment due date
 * @param currentDate - Current date for comparison (defaults to now)
 * @returns SubmissionPriority ('HIGH' | 'MEDIUM' | 'LOW')
 */
export function calculateSubmissionPriority(
  dueDate?: string | null,
  currentDate: Date = new Date()
): SubmissionPriority {
  if (!dueDate) {
    return 'LOW';
  }

  const dueDateObj = new Date(dueDate);
  if (isNaN(dueDateObj.getTime())) {
    return 'LOW';
  }

  const diffMs = dueDateObj.getTime() - currentDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Overdue or due within 24 hours
  if (diffHours <= 24) {
    return 'HIGH';
  }

  // Due within 3 days (72 hours)
  if (diffHours <= 72) {
    return 'MEDIUM';
  }

  return 'LOW';
}

/**
 * Checks if a submission is overdue (past due date and not yet graded).
 * 
 * @param dueDate - ISO date string of the assignment due date
 * @param status - Current submission status
 * @param currentDate - Current date for comparison (defaults to now)
 * @returns true if submission is overdue
 */
export function isOverdueSubmission(
  dueDate?: string | null,
  status?: SubmissionStatus,
  currentDate: Date = new Date()
): boolean {
  // Already graded submissions are not considered overdue
  if (status === 'GRADED' || status === 'RETURNED') {
    return false;
  }

  if (!dueDate) {
    return false;
  }

  const dueDateObj = new Date(dueDate);
  if (isNaN(dueDateObj.getTime())) {
    return false;
  }

  return currentDate.getTime() > dueDateObj.getTime();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates time remaining until due date.
 * 
 * @param dueDate - ISO date string of the assignment due date
 * @param currentDate - Current date for comparison (defaults to now)
 * @returns Object with time remaining details, or null if no due date
 */
export function getTimeUntilDue(
  dueDate?: string | null,
  currentDate: Date = new Date()
): { days: number; hours: number; minutes: number; isPast: boolean } | null {
  if (!dueDate) {
    return null;
  }

  const dueDateObj = new Date(dueDate);
  if (isNaN(dueDateObj.getTime())) {
    return null;
  }

  const diffMs = dueDateObj.getTime() - currentDate.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isPast };
}

/**
 * Formats time until due date into a human-readable Vietnamese string.
 * 
 * @param dueDate - ISO date string of the assignment due date
 * @param currentDate - Current date for comparison (defaults to now)
 * @returns Formatted string like "Còn 2 ngày" or "Quá hạn 5 giờ"
 */
export function formatTimeUntilDue(
  dueDate?: string | null,
  currentDate: Date = new Date()
): string {
  const timeInfo = getTimeUntilDue(dueDate, currentDate);
  
  if (!timeInfo) {
    return 'Không giới hạn';
  }

  const prefix = timeInfo.isPast ? 'Quá hạn' : 'Còn';

  if (timeInfo.days >= 1) {
    return `${prefix} ${timeInfo.days} ngày`;
  }

  if (timeInfo.hours >= 1) {
    return `${prefix} ${timeInfo.hours} giờ`;
  }

  return `${prefix} ${timeInfo.minutes} phút`;
}

