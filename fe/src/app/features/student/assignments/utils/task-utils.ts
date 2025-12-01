/**
 * Task Utilities
 *
 * Utility functions for student task management.
 * Moved from my-tasks to assignments for better organization.
 *
 * @requirements 2.1, 2.5
 */

export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADED'
  | 'OVERDUE';

export interface StudentTask {
  id?: string;
  assignmentId: string;
  assignmentTitle?: string;
  title?: string;
  courseId: string;
  courseTitle?: string;
  courseName?: string;
  dueDate: string;
  personalDeadline?: string;
  status: TaskStatus;
  submissionId?: string;
  submittedAt?: string;
  grade?: number;
  maxScore: number;
  feedback?: string;
  isOverdue?: boolean;
  isIndividual?: boolean;
  assignedAt?: string;
  assignedBy?: string;
}

export interface DeadlineOverride {
  assignmentId: string;
  studentId: string;
  newDeadline: string;
  reason?: string;
  createdBy?: string;
  createdAt?: string;
}

/**
 * Calculate task status based on submission and deadline
 */
export function calculateTaskStatus(
  submission: {
    id: string;
    assignmentId: string;
    status: 'PENDING' | 'SUBMITTED' | 'GRADED';
    grade?: number;
  } | null,
  dueDate: string,
  personalDeadline?: string
): TaskStatus {
  const effectiveDeadline = personalDeadline || dueDate;
  const now = new Date();
  const deadline = new Date(effectiveDeadline);

  if (!submission) {
    // No submission yet
    if (now > deadline) {
      return 'OVERDUE';
    }
    return 'NOT_STARTED';
  }

  switch (submission.status) {
    case 'GRADED':
      return 'GRADED';
    case 'SUBMITTED':
      return 'SUBMITTED';
    case 'PENDING':
      if (now > deadline) {
        return 'OVERDUE';
      }
      return 'IN_PROGRESS';
    default:
      return 'NOT_STARTED';
  }
}

/**
 * Sort tasks by due date (earliest first)
 */
export function sortTasksByDueDate(tasks: StudentTask[]): StudentTask[] {
  return [...tasks].sort((a, b) => {
    const dateA = new Date(a.personalDeadline || a.dueDate);
    const dateB = new Date(b.personalDeadline || b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Group tasks by status for Kanban view
 */
export function groupTasksByStatus(tasks: StudentTask[]): {
  toDo: StudentTask[];
  inProgress: StudentTask[];
  completed: StudentTask[];
} {
  const toDo: StudentTask[] = [];
  const inProgress: StudentTask[] = [];
  const completed: StudentTask[] = [];

  for (const task of tasks) {
    switch (task.status) {
      case 'NOT_STARTED':
      case 'OVERDUE':
        toDo.push(task);
        break;
      case 'IN_PROGRESS':
      case 'SUBMITTED':
        inProgress.push(task);
        break;
      case 'GRADED':
        completed.push(task);
        break;
    }
  }

  return { toDo, inProgress, completed };
}

/**
 * Get effective deadline considering overrides
 */
export function getEffectiveDeadline(
  originalDeadline: string,
  overrides: DeadlineOverride[],
  studentId: string,
  assignmentId: string
): string {
  const override = overrides.find(
    (o) => o.assignmentId === assignmentId && o.studentId === studentId
  );
  return override?.newDeadline || originalDeadline;
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: StudentTask): boolean {
  if (task.status === 'GRADED' || task.status === 'SUBMITTED') {
    return false;
  }
  const deadline = new Date(task.personalDeadline || task.dueDate);
  return new Date() > deadline;
}

/**
 * Format deadline for display
 */
export function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Quá hạn ${Math.abs(diffDays)} ngày`;
  } else if (diffDays === 0) {
    return 'Hôm nay';
  } else if (diffDays === 1) {
    return 'Ngày mai';
  } else if (diffDays <= 7) {
    return `Còn ${diffDays} ngày`;
  } else {
    return date.toLocaleDateString('vi-VN');
  }
}
