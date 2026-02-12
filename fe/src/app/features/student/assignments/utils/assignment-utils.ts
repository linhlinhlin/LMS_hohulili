import { StudentAssignment, StudentTaskStatus } from '../../services/student-assignment.service';

/**
 * Grouped Assignments - Nhóm bài tập theo trạng thái cho Kanban view
 */
export interface GroupedAssignments {
  toDo: StudentAssignment[];      // NOT_STARTED + OVERDUE
  inProgress: StudentAssignment[]; // IN_PROGRESS
  completed: StudentAssignment[];  // SUBMITTED + GRADED
}

/**
 * Assignment Stats - Thống kê bài tập
 */
export interface AssignmentStats {
  total: number;
  toDo: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

/**
 * Assignment Filters - Bộ lọc bài tập
 */
export interface AssignmentFilters {
  courseId?: string;
  status?: StudentTaskStatus;
  searchQuery?: string;
}

/**
 * Status Badge - Badge hiển thị trạng thái
 */
export interface StatusBadge {
  text: string;
  cssClass: string;
}

/**
 * Deadline Urgency - Mức độ khẩn cấp của deadline
 */
export type DeadlineUrgency = 'normal' | 'warning' | 'danger';

// ============================================
// GROUPING FUNCTIONS
// ============================================

/**
 * Nhóm bài tập theo trạng thái cho Kanban view
 * 
 * Property 3: Kanban grouping integrity
 * Tổng số items trong 3 cột phải bằng tổng số bài tập
 */
export function groupTasksByStatus(assignments: StudentAssignment[]): GroupedAssignments {
  const toDo: StudentAssignment[] = [];
  const inProgress: StudentAssignment[] = [];
  const completed: StudentAssignment[] = [];

  for (const assignment of assignments) {
    switch (assignment.status) {
      case 'NOT_STARTED':
      case 'OVERDUE':
        toDo.push(assignment);
        break;
      case 'IN_PROGRESS':
        inProgress.push(assignment);
        break;
      case 'SUBMITTED':
      case 'GRADED':
        completed.push(assignment);
        break;
      default:
        // Fallback to toDo for unknown status
        toDo.push(assignment);
    }
  }

  return { toDo, inProgress, completed };
}

// ============================================
// FILTER FUNCTIONS
// ============================================

/**
 * Lọc bài tập theo điều kiện
 * 
 * Property 9: Filter correctness
 * Tất cả items hiển thị phải thỏa mãn điều kiện filter
 */
export function filterAssignments(
  assignments: StudentAssignment[],
  filters: AssignmentFilters
): StudentAssignment[] {
  return assignments.filter(assignment => {
    // Filter by courseId
    if (filters.courseId && assignment.courseId !== filters.courseId) {
      return false;
    }

    // Filter by status
    if (filters.status && assignment.status !== filters.status) {
      return false;
    }

    // Filter by search query (title or description)
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

/**
 * Lọc bài tập theo khóa học
 */
export function filterByCourse(
  assignments: StudentAssignment[],
  courseId: string
): StudentAssignment[] {
  return assignments.filter(a => a.courseId === courseId);
}

/**
 * Lọc bài tập theo trạng thái
 */
export function filterByStatus(
  assignments: StudentAssignment[],
  status: StudentTaskStatus
): StudentAssignment[] {
  return assignments.filter(a => a.status === status);
}

/**
 * Tìm kiếm bài tập theo từ khóa
 */
export function searchAssignments(
  assignments: StudentAssignment[],
  query: string
): StudentAssignment[] {
  const lowerQuery = query.toLowerCase();
  return assignments.filter(a => 
    a.assignmentTitle.toLowerCase().includes(lowerQuery) ||
    a.description.toLowerCase().includes(lowerQuery)
  );
}

// ============================================
// STATS FUNCTIONS
// ============================================

/**
 * Tính thống kê bài tập
 * 
 * Property 10: Stats calculation
 * Stats phải được tính đúng theo công thức
 */
export function calculateStats(assignments: StudentAssignment[]): AssignmentStats {
  let toDo = 0;
  let inProgress = 0;
  let completed = 0;
  let overdue = 0;

  for (const assignment of assignments) {
    switch (assignment.status) {
      case 'NOT_STARTED':
        toDo++;
        break;
      case 'IN_PROGRESS':
        inProgress++;
        break;
      case 'SUBMITTED':
      case 'GRADED':
        completed++;
        break;
      case 'OVERDUE':
        toDo++;
        overdue++;
        break;
    }
    
    // Count overdue separately (can be in any status except completed)
    if (assignment.isOverdue && assignment.status !== 'SUBMITTED' && assignment.status !== 'GRADED') {
      if (assignment.status !== 'OVERDUE') {
        overdue++;
      }
    }
  }

  return {
    total: assignments.length,
    toDo,
    inProgress,
    completed,
    overdue
  };
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

/**
 * Format deadline theo định dạng Việt Nam
 * 
 * Property 6: Deadline formatting
 * Output phải theo định dạng dd/MM/yyyy HH:mm
 */
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

/**
 * Format deadline với label gia hạn nếu có
 * 
 * Property 7: Personal deadline indicator
 * Nếu có personalDeadline, output phải chứa "(Gia hạn)"
 */
export function formatDeadlineWithExtension(
  dueDate: string,
  personalDeadline?: string
): string {
  if (personalDeadline) {
    return `${formatDeadline(personalDeadline)} (Gia hạn)`;
  }
  return formatDeadline(dueDate);
}

// ============================================
// STATUS BADGE FUNCTIONS
// ============================================

/**
 * Lấy badge text và CSS class cho status
 * 
 * Property 5: Status badge mapping
 * Badge text và class phải khớp với mapping table
 */
export function getStatusBadge(status: StudentTaskStatus): StatusBadge {
  const mapping: Record<StudentTaskStatus, StatusBadge> = {
    'NOT_STARTED': {
      text: 'Chưa bắt đầu',
      cssClass: 'bg-gray-100 text-gray-700'
    },
    'IN_PROGRESS': {
      text: 'Đang làm',
      cssClass: 'bg-blue-100 text-[#004BB5]'
    },
    'SUBMITTED': {
      text: 'Đã nộp',
      cssClass: 'bg-yellow-100 text-yellow-700'
    },
    'GRADED': {
      text: 'Đã chấm',
      cssClass: 'bg-green-100 text-green-700'
    },
    'OVERDUE': {
      text: 'Quá hạn',
      cssClass: 'bg-red-100 text-red-700'
    }
  };

  return mapping[status] || mapping['NOT_STARTED'];
}

/**
 * Lấy label text cho status
 */
export function getStatusLabel(status: StudentTaskStatus): string {
  return getStatusBadge(status).text;
}

/**
 * Lấy CSS class cho status
 */
export function getStatusClass(status: StudentTaskStatus): string {
  return `px-2 py-1 text-xs rounded ${getStatusBadge(status).cssClass}`;
}

// ============================================
// DEADLINE URGENCY FUNCTIONS
// ============================================

/**
 * Tính mức độ khẩn cấp của deadline
 * 
 * Property 8: Deadline urgency styling
 * - daysUntilDue 0-3 → warning (orange)
 * - daysUntilDue < 0 → danger (red)
 * - otherwise → normal
 */
export function getDeadlineUrgency(daysUntilDue: number): DeadlineUrgency {
  if (daysUntilDue < 0) {
    return 'danger';
  }
  if (daysUntilDue <= 3) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Lấy CSS class cho deadline urgency
 */
export function getDeadlineUrgencyClass(daysUntilDue: number): string {
  const urgency = getDeadlineUrgency(daysUntilDue);
  
  switch (urgency) {
    case 'danger':
      return 'text-gray-900 font-medium';
    case 'warning':
      return 'text-gray-900 font-medium';
    default:
      return 'text-gray-900';
  }
}

/**
 * Tính số ngày còn lại từ date string
 */
export function calculateDaysUntilDue(dateString: string): number {
  if (!dateString) return 999;
  
  const dueDate = new Date(dateString);
  if (isNaN(dueDate.getTime())) return 999;
  
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// SORTING FUNCTIONS
// ============================================

/**
 * Sắp xếp bài tập theo deadline (gần nhất trước)
 */
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

/**
 * Sắp xếp bài tập theo tiêu đề
 */
export function sortByTitle(assignments: StudentAssignment[]): StudentAssignment[] {
  return [...assignments].sort((a, b) => 
    a.assignmentTitle.localeCompare(b.assignmentTitle, 'vi')
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Lấy danh sách khóa học unique từ assignments
 */
export function getUniqueCourses(assignments: StudentAssignment[]): { id: string; title: string }[] {
  const courseMap = new Map<string, string>();
  
  for (const assignment of assignments) {
    if (!courseMap.has(assignment.courseId)) {
      courseMap.set(assignment.courseId, assignment.courseTitle);
    }
  }
  
  return Array.from(courseMap.entries()).map(([id, title]) => ({ id, title }));
}

/**
 * Kiểm tra xem bài tập có quá hạn không
 */
export function isAssignmentOverdue(assignment: StudentAssignment): boolean {
  return assignment.isOverdue || assignment.status === 'OVERDUE';
}

/**
 * Kiểm tra xem bài tập đã hoàn thành chưa
 */
export function isAssignmentCompleted(assignment: StudentAssignment): boolean {
  return assignment.status === 'SUBMITTED' || assignment.status === 'GRADED';
}
