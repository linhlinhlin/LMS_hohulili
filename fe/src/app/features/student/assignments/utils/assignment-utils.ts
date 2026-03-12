import { StudentAssignment, StudentTaskStatus } from '../../services/student-assignment.service';

/**
 * Tab-based grouping for the task list (Coursera/Canvas pattern)
 */
export type TaskTab = 'todo' | 'submitted' | 'graded';

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
 * Filter assignments by active tab.
 * - todo: NOT_STARTED + IN_PROGRESS + OVERDUE (things student needs to act on)
 * - submitted: SUBMITTED (waiting for grading)
 * - graded: GRADED (has score)
 */
export function filterByTab(assignments: StudentAssignment[], tab: TaskTab): StudentAssignment[] {
  switch (tab) {
    case 'todo':
      return assignments.filter(a =>
        a.status === 'NOT_STARTED' || a.status === 'IN_PROGRESS' || a.status === 'OVERDUE'
      );
    case 'submitted':
      return assignments.filter(a => a.status === 'SUBMITTED');
    case 'graded':
      return assignments.filter(a => a.status === 'GRADED');
  }
}

/**
 * Count assignments per tab
 */
export function countByTab(assignments: StudentAssignment[]): Record<TaskTab, number> {
  let todo = 0, submitted = 0, graded = 0;
  for (const a of assignments) {
    switch (a.status) {
      case 'NOT_STARTED':
      case 'IN_PROGRESS':
      case 'OVERDUE':
        todo++;
        break;
      case 'SUBMITTED':
        submitted++;
        break;
      case 'GRADED':
        graded++;
        break;
    }
  }
  return { todo, submitted, graded };
}

// ============================================
// FILTER & SEARCH
// ============================================

export function filterAssignments(
  assignments: StudentAssignment[],
  filters: AssignmentFilters
): StudentAssignment[] {
  return assignments.filter(assignment => {
    if (filters.courseId && assignment.courseId !== filters.courseId) {
      return false;
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = assignment.assignmentTitle.toLowerCase().includes(query);
      const matchesDescription = assignment.description.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDescription) {
        return false;
      }
    }
    return true;
  });
}

// ============================================
// STATS
// ============================================

export function calculateStats(assignments: StudentAssignment[]): AssignmentStats {
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
    // Also count overdue from non-OVERDUE statuses
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
    'NOT_STARTED': { text: 'Ch\u01B0a b\u1EAFt \u0111\u1EA7u', cssClass: 'bg-slate-100 text-slate-600' },
    'IN_PROGRESS': { text: '\u0110ang l\u00E0m', cssClass: 'bg-[#0056D2]/10 text-[#004BB5]' },
    'SUBMITTED':   { text: '\u0110\u00E3 n\u1ED9p', cssClass: 'bg-amber-50 text-amber-700' },
    'GRADED':      { text: '\u0110\u00E3 ch\u1EA5m', cssClass: 'bg-emerald-50 text-emerald-700' },
    'OVERDUE':     { text: 'Qu\u00E1 h\u1EA1n', cssClass: 'bg-red-50 text-red-700' },
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

export function sortByDueDate(assignments: StudentAssignment[]): StudentAssignment[] {
  return [...assignments].sort((a, b) => {
    const dateA = a.personalDeadline || a.dueDate;
    const dateB = b.personalDeadline || b.dueDate;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
}

// ============================================
// HELPERS
// ============================================

export function getUniqueCourses(assignments: StudentAssignment[]): { id: string; title: string }[] {
  const courseMap = new Map<string, string>();
  for (const assignment of assignments) {
    if (!courseMap.has(assignment.courseId)) {
      courseMap.set(assignment.courseId, assignment.courseTitle);
    }
  }
  return Array.from(courseMap.entries()).map(([id, title]) => ({ id, title }));
}
