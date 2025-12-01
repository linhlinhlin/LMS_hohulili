/**
 * Assignment List Utilities
 * 
 * Provides filtering and sorting functions for assignment lists.
 * Used by AssignmentManagementComponent for list operations.
 * 
 * @module assignment-list-utils
 * @requirements 1.2, 1.3
 */

// ============================================================================
// Types
// ============================================================================

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'pending' | 'published' | 'closed';

export interface AssignmentListItem {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  courseTitle: string;
  dueDate?: string | null;
  status: AssignmentStatus;
  submissionsCount: number;
  totalStudents: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AssignmentFilterCriteria {
  status?: AssignmentStatus | '';
  courseId?: string | '';
  keyword?: string;
}

export type AssignmentSortColumn = 
  | 'title' 
  | 'courseTitle' 
  | 'dueDate' 
  | 'status' 
  | 'submissionsCount'
  | 'createdAt';

export type SortDirection = 'asc' | 'desc';

export interface AssignmentSortConfig {
  column: AssignmentSortColumn;
  direction: SortDirection;
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Filters assignments based on provided criteria.
 * 
 * All criteria are optional and combined with AND logic.
 * - status: Exact match on assignment status
 * - courseId: Exact match on course ID
 * - keyword: Case-insensitive partial match on title or description
 * 
 * @param assignments - Array of assignments to filter
 * @param criteria - Filter criteria object
 * @returns Filtered array of assignments
 * 
 * @example
 * const filtered = filterAssignments(assignments, { 
 *   status: 'published', 
 *   keyword: 'safety' 
 * });
 * 
 * @requirements 1.2
 */
export function filterAssignments<T extends AssignmentListItem>(
  assignments: T[],
  criteria: AssignmentFilterCriteria
): T[] {
  return assignments.filter(assignment => {
    // Status filter
    if (criteria.status) {
      const normalizedAssignmentStatus = normalizeStatus(assignment.status);
      const normalizedCriteriaStatus = normalizeStatus(criteria.status);
      if (normalizedAssignmentStatus !== normalizedCriteriaStatus) {
        return false;
      }
    }

    // Course filter
    if (criteria.courseId && criteria.courseId !== '') {
      if (assignment.courseId !== criteria.courseId) {
        return false;
      }
    }

    // Keyword filter (search in title and description)
    if (criteria.keyword && criteria.keyword.trim() !== '') {
      const keyword = criteria.keyword.toLowerCase().trim();
      const titleMatch = assignment.title.toLowerCase().includes(keyword);
      const descriptionMatch = assignment.description?.toLowerCase().includes(keyword) ?? false;
      
      if (!titleMatch && !descriptionMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Normalizes status values to lowercase for comparison.
 * Handles both uppercase (DRAFT, PUBLISHED, CLOSED) and lowercase (pending, published, closed) formats.
 * 
 * @param status - Status value to normalize
 * @returns Normalized lowercase status
 */
function normalizeStatus(status: AssignmentStatus | ''): string {
  if (!status) return '';
  
  const statusMap: Record<string, string> = {
    'DRAFT': 'pending',
    'PUBLISHED': 'published',
    'CLOSED': 'closed',
    'pending': 'pending',
    'published': 'published',
    'closed': 'closed'
  };
  
  return statusMap[status] || status.toLowerCase();
}

/**
 * Checks if an assignment matches the given filter criteria.
 * Useful for single-item validation.
 * 
 * @param assignment - Single assignment to check
 * @param criteria - Filter criteria
 * @returns true if assignment matches all criteria
 */
export function matchesFilterCriteria<T extends AssignmentListItem>(
  assignment: T,
  criteria: AssignmentFilterCriteria
): boolean {
  return filterAssignments([assignment], criteria).length > 0;
}

// ============================================================================
// Sort Functions
// ============================================================================

/**
 * Sorts assignments by the specified column and direction.
 * 
 * Supported columns:
 * - title: Alphabetical sort
 * - courseTitle: Alphabetical sort
 * - dueDate: Chronological sort (null dates at end)
 * - status: Alphabetical sort
 * - submissionsCount: Numeric sort
 * - createdAt: Chronological sort
 * 
 * @param assignments - Array of assignments to sort
 * @param config - Sort configuration with column and direction
 * @returns New sorted array (does not mutate original)
 * 
 * @example
 * const sorted = sortAssignments(assignments, { 
 *   column: 'dueDate', 
 *   direction: 'asc' 
 * });
 * 
 * @requirements 1.3
 */
export function sortAssignments<T extends AssignmentListItem>(
  assignments: T[],
  config: AssignmentSortConfig
): T[] {
  const { column, direction } = config;
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...assignments].sort((a, b) => {
    const comparison = compareByColumn(a, b, column);
    return comparison * multiplier;
  });
}

/**
 * Compares two assignments by a specific column.
 * 
 * @param a - First assignment
 * @param b - Second assignment
 * @param column - Column to compare by
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
function compareByColumn<T extends AssignmentListItem>(
  a: T,
  b: T,
  column: AssignmentSortColumn
): number {
  switch (column) {
    case 'title':
      return compareStrings(a.title, b.title);

    case 'courseTitle':
      return compareStrings(a.courseTitle, b.courseTitle);

    case 'status':
      return compareStrings(normalizeStatus(a.status), normalizeStatus(b.status));

    case 'dueDate':
      return compareDates(a.dueDate, b.dueDate);

    case 'createdAt':
      return compareDates(a.createdAt, b.createdAt);

    case 'submissionsCount':
      return compareNumbers(a.submissionsCount, b.submissionsCount);

    default:
      return 0;
  }
}

/**
 * Compares two strings using locale-aware comparison.
 * Handles Vietnamese characters correctly.
 */
function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, 'vi', { sensitivity: 'base' });
}

/**
 * Compares two date strings.
 * Null/undefined dates are sorted to the end.
 */
function compareDates(a?: string | null, b?: string | null): number {
  // Handle null/undefined - push to end
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const dateA = new Date(a).getTime();
  const dateB = new Date(b).getTime();

  // Handle invalid dates
  if (isNaN(dateA) && isNaN(dateB)) return 0;
  if (isNaN(dateA)) return 1;
  if (isNaN(dateB)) return -1;

  return dateA - dateB;
}

/**
 * Compares two numbers.
 */
function compareNumbers(a: number, b: number): number {
  return a - b;
}

// ============================================================================
// Combined Operations
// ============================================================================

/**
 * Filters and sorts assignments in a single operation.
 * More efficient than calling filter and sort separately.
 * 
 * @param assignments - Array of assignments
 * @param filterCriteria - Filter criteria
 * @param sortConfig - Sort configuration
 * @returns Filtered and sorted array
 */
export function filterAndSortAssignments<T extends AssignmentListItem>(
  assignments: T[],
  filterCriteria: AssignmentFilterCriteria,
  sortConfig: AssignmentSortConfig
): T[] {
  const filtered = filterAssignments(assignments, filterCriteria);
  return sortAssignments(filtered, sortConfig);
}

/**
 * Paginates an array of assignments.
 * 
 * @param assignments - Array of assignments
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Paginated slice of assignments
 */
export function paginateAssignments<T>(
  assignments: T[],
  page: number,
  pageSize: number
): T[] {
  const startIndex = (page - 1) * pageSize;
  return assignments.slice(startIndex, startIndex + pageSize);
}

/**
 * Calculates pagination metadata.
 * 
 * @param totalItems - Total number of items
 * @param page - Current page (1-based)
 * @param pageSize - Items per page
 * @returns Pagination metadata
 */
export function getPaginationInfo(
  totalItems: number,
  page: number,
  pageSize: number
): {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
} {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

  return {
    currentPage,
    totalPages,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    startIndex,
    endIndex
  };
}
