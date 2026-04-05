import { StudentAssignment, StudentTaskStatus } from '../../services/student-assignment.service';
import { StudentWorkItem, WorkType } from '../../services/student-task.service';

/**
 * Minimal interface satisfied by both StudentAssignment and StudentWorkItem.
 * Used to make utility functions generic across both types.
 */
export interface TaskListItem {
  status: StudentTaskStatus;
  isOverdue: boolean;
  courseId: string;
  courseTitle: string;
  dueDate: string;
  daysUntilDue: number;
  description?: string;
  personalDeadline?: string;
  // Title fields — different names across types
  title?: string;            // StudentWorkItem
  assignmentTitle?: string;  // StudentAssignment (legacy)
  // Work type (only on StudentWorkItem)
  workType?: WorkType;
  // Quiz retry tracking
  attemptCount?: number;
  maxAttempts?: number;
}

/**
 * Tab-based grouping for the task list.
 * - Tự luận uses: todo | overdue | submitted | graded
 * - Trắc nghiệm uses: todo | quiz-overdue | completed
 */
export type TaskTab = 'todo' | 'overdue' | 'submitted' | 'graded' | 'completed' | 'quiz-overdue';

export interface AssignmentStats {
  total: number;
  toDo: number;
  submitted: number;
  graded: number;
  overdue: number;
}

export interface AssignmentFilters {
  courseId?: string;
  searchQuery?: string;
  workType?: WorkType | '';
}

export interface StatusBadge {
  text: string;
  cssClass: string;
}

export type DeadlineUrgency = 'normal' | 'warning' | 'danger';

// ============================================
// TAB FILTERING
// ============================================

/**
 * Check if a quiz item can be retried (GRADED but attemptCount < maxAttempts).
 */
export function canRetryQuiz(item: TaskListItem): boolean {
  if (item.workType === 'ASSIGNMENT') return false;
  return item.status === 'GRADED'
    && item.maxAttempts != null && item.maxAttempts > 0
    && (item.attemptCount ?? 0) < item.maxAttempts;
}

/**
 * Quiz-specific: overdue/locked AND never attempted (0 attempts).
 * This is "truly missed" — student had no interaction at all.
 * LOCKED = hard deadline passed (Canvas lock_at).
 */
export function isQuizOverdueNeverAttempted(item: TaskListItem): boolean {
  if (item.workType === 'ASSIGNMENT') return false;
  const isOverdueStatus = item.status === 'OVERDUE'
    || item.status === 'LOCKED'
    || ((item.status === 'NOT_STARTED' || item.status === 'IN_PROGRESS') && item.isOverdue);
  return isOverdueStatus && (item.attemptCount ?? 0) === 0;
}

/**
 * Filter assignments by active tab.
 * Tự luận tabs: todo, overdue, submitted, graded
 * Trắc nghiệm tabs: todo, quiz-overdue, completed
 */
export function filterByTab<T extends TaskListItem>(assignments: T[], tab: TaskTab): T[] {
  switch (tab) {
    case 'todo':
      return assignments.filter(a =>
        (a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS' || a.status === 'NOT_AVAILABLE') && !a.isOverdue
      );
    case 'overdue':
      return assignments.filter(a =>
        a.status === 'OVERDUE'
        || a.status === 'LOCKED'
        || ((a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS') && a.isOverdue)
      );
    case 'quiz-overdue':
      return assignments.filter(a => isQuizOverdueNeverAttempted(a));
    case 'submitted':
      return assignments.filter(a => a.status === 'SUBMITTED');
    case 'graded':
      return assignments.filter(a => a.status === 'GRADED');
    case 'completed':
      // Quizzes: GRADED (including retryable) + SUBMITTED all go to "Đã hoàn thành"
      return assignments.filter(a =>
        a.status === 'SUBMITTED' || a.status === 'GRADED'
      );
  }
}

/**
 * Count assignments per tab.
 */
export function countByTab<T extends TaskListItem>(assignments: T[]): Record<TaskTab, number> {
  let todo = 0, overdue = 0, submitted = 0, graded = 0, quizOverdue = 0;
  for (const a of assignments) {
    switch (a.status) {
      case 'NOT_STARTED':
      case 'IN_PROGRESS':
        if (a.isOverdue) { overdue++; } else { todo++; }
        break;
      case 'NOT_AVAILABLE':
        todo++; // upcoming quiz, not yet open — still "to do"
        break;
      case 'OVERDUE':
        overdue++;
        break;
      case 'LOCKED':
        overdue++; // hard deadline passed — counts as overdue
        break;
      case 'SUBMITTED':
        submitted++;
        break;
      case 'GRADED':
        graded++;
        break;
    }
    // Quiz-specific overdue: overdue/locked + never attempted
    if (isQuizOverdueNeverAttempted(a)) {
      quizOverdue++;
    }
  }
  return {
    todo, overdue, submitted, graded,
    completed: submitted + graded,
    'quiz-overdue': quizOverdue,
  };
}

// ============================================
// FILTER & SEARCH
// ============================================

export function filterAssignments<T extends TaskListItem>(
  assignments: T[],
  filters: AssignmentFilters
): T[] {
  return assignments.filter(assignment => {
    if (filters.courseId && assignment.courseId !== filters.courseId) {
      return false;
    }
    if (filters.workType && assignment.workType !== filters.workType) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const title = (assignment.title || assignment.assignmentTitle || '').toLowerCase();
      const description = (assignment.description || '').toLowerCase();
      if (!title.includes(query) && !description.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

// ============================================
// STATS
// ============================================

export function calculateStats<T extends TaskListItem>(assignments: T[]): AssignmentStats {
  let toDo = 0;
  let submitted = 0;
  let graded = 0;
  let overdue = 0;

  for (const a of assignments) {
    switch (a.status) {
      case 'NOT_STARTED':
      case 'IN_PROGRESS':
        toDo++;
        break;
      case 'OVERDUE':
        toDo++;
        overdue++;
        break;
      case 'SUBMITTED':
        submitted++;
        break;
      case 'GRADED':
        graded++;
        break;
    }
    if (a.isOverdue && a.status !== 'SUBMITTED' && a.status !== 'GRADED' && a.status !== 'OVERDUE') {
      overdue++;
    }
  }

  return { total: assignments.length, toDo, submitted, graded, overdue };
}

// ============================================
// FORMATTING
// ============================================

export function formatDeadline(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatDeadlineWithExtension(
  dueDate: string,
  personalDeadline?: string
): string {
  if (personalDeadline) {
    return `${formatDeadline(personalDeadline)} (Gia h\u1EA1n)`;
  }
  return formatDeadline(dueDate);
}

/**
 * Relative deadline text: "Quá hạn 2 ngày", "Còn 3 ngày", "Hôm nay"
 */
export function formatDeadlineRelative(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    return `Qu\u00E1 h\u1EA1n ${Math.abs(daysUntilDue)} ng\u00E0y`;
  }
  if (daysUntilDue === 0) return 'H\u00F4m nay';
  if (daysUntilDue === 1) return 'Ng\u00E0y mai';
  return `C\u00F2n ${daysUntilDue} ng\u00E0y`;
}

// ============================================
// STATUS BADGE — Semantic colors
// ============================================

export function getStatusBadge(status: StudentTaskStatus): StatusBadge {
  const mapping: Record<StudentTaskStatus, StatusBadge> = {
    'NOT_STARTED':   { text: 'Chưa bắt đầu', cssClass: 'bg-slate-100 text-slate-600' },
    'IN_PROGRESS':   { text: 'Đang làm', cssClass: 'bg-[#0056D2]/10 text-[#004BB5]' },
    'SUBMITTED':     { text: 'Đã nộp', cssClass: 'bg-amber-50 text-amber-700' },
    'GRADED':        { text: 'Đã chấm', cssClass: 'bg-emerald-50 text-emerald-700' },
    'OVERDUE':       { text: 'Quá hạn', cssClass: 'bg-red-50 text-red-700' },
    'NOT_AVAILABLE': { text: 'Chưa mở', cssClass: 'bg-gray-100 text-gray-500' },
    'LOCKED':        { text: 'Đã đóng', cssClass: 'bg-gray-100 text-gray-500' },
  };
  return mapping[status] || mapping['NOT_STARTED'];
}

export function getStatusLabel(status: StudentTaskStatus): string {
  return getStatusBadge(status).text;
}

export function getStatusClass(status: StudentTaskStatus): string {
  return `px-2 py-0.5 text-[11px] font-medium rounded-full ${getStatusBadge(status).cssClass}`;
}

// ============================================
// DEADLINE URGENCY — Semantic colors
// ============================================

export function getDeadlineUrgency(daysUntilDue: number): DeadlineUrgency {
  if (daysUntilDue < 0) return 'danger';
  if (daysUntilDue <= 3) return 'warning';
  return 'normal';
}

export function getDeadlineUrgencyClass(daysUntilDue: number): string {
  switch (getDeadlineUrgency(daysUntilDue)) {
    case 'danger':  return 'text-red-600 font-semibold';
    case 'warning': return 'text-amber-600 font-medium';
    default:        return 'text-slate-500';
  }
}

// ============================================
// SORTING
// ============================================

export function sortByDueDate<T extends TaskListItem>(assignments: T[]): T[] {
  return [...assignments].sort((a, b) => {
    const dateA = a.personalDeadline || a.dueDate;
    const dateB = b.personalDeadline || b.dueDate;
    if (!dateA && !dateB) {
      // Secondary sort: by title when both have no due date
      const titleA = (a.title || a.assignmentTitle || '').toLowerCase();
      const titleB = (b.title || b.assignmentTitle || '').toLowerCase();
      return titleA.localeCompare(titleB);
    }
    if (!dateA) return 1;
    if (!dateB) return -1;
    const diff = new Date(dateA).getTime() - new Date(dateB).getTime();
    if (diff !== 0) return diff;
    // Same due date: secondary sort by title
    const titleA = (a.title || a.assignmentTitle || '').toLowerCase();
    const titleB = (b.title || b.assignmentTitle || '').toLowerCase();
    return titleA.localeCompare(titleB);
  });
}

// ============================================
// HELPERS
// ============================================

export function getUniqueCourses<T extends TaskListItem>(assignments: T[]): { id: string; title: string }[] {
  const courseMap = new Map<string, string>();
  for (const assignment of assignments) {
    if (!courseMap.has(assignment.courseId)) {
      courseMap.set(assignment.courseId, assignment.courseTitle);
    }
  }
  return Array.from(courseMap.entries()).map(([id, title]) => ({ id, title }));
}
