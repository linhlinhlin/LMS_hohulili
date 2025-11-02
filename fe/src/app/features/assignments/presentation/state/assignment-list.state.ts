import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AssignmentFilters, AssignmentSortOptions, StudentId } from '../../domain/types';
import { AssignmentApplicationService, StudentAssignmentStats } from '../../application/services/assignment.application.service';
import { AssignmentView, AssignmentListView } from '../../application/use-cases/get-student-assignments.use-case';

/**
 * State Management: Assignment List State
 * Manages reactive state for assignment lists using Angular Signals
 * Follows the established pattern from the codebase
 */
@Injectable({
  providedIn: 'root'
})
export class AssignmentListState {
  private router = inject(Router);
  private assignmentService = inject(AssignmentApplicationService);

  // ========================================
  // CORE STATE SIGNALS
  // ========================================

  // Data state
  private _assignments = signal<AssignmentView[]>([]);
  private _stats = signal<StudentAssignmentStats | null>(null);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Filter and sort state
  private _filters = signal<AssignmentFilters>({});
  private _sortOptions = signal<AssignmentSortOptions>({
    field: 'dueDate',
    direction: 'asc'
  });

  // UI state
  private _selectedAssignments = signal<Set<string>>(new Set());
  private _currentView = signal<'list' | 'grid'>('list');
  private _pageSize = signal<number>(12);
  private _currentPage = signal<number>(1);

  // ========================================
  // READONLY SIGNALS (Public API)
  // ========================================

  readonly assignments = this._assignments.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly sortOptions = this._sortOptions.asReadonly();
  readonly selectedAssignments = this._selectedAssignments.asReadonly();
  readonly currentView = this._currentView.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();

  // ========================================
  // COMPUTED SIGNALS (Derived State)
  // ========================================

  // Filtered and sorted assignments
  readonly filteredAssignments = computed(() => {
    let assignments = [...this._assignments()];

    // Apply client-side filters if needed
    const filters = this._filters();
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      assignments = assignments.filter(assignment =>
        assignment.title.toLowerCase().includes(query) ||
        assignment.description.toLowerCase().includes(query) ||
        assignment.courseName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sort = this._sortOptions();
    assignments.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'dueDate':
          aValue = a.dueDate.getTime();
          bValue = b.dueDate.getTime();
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        default:
          aValue = a.dueDate.getTime();
          bValue = b.dueDate.getTime();
      }

      if (sort.direction === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return assignments;
  });

  // Paginated assignments
  readonly paginatedAssignments = computed(() => {
    const allAssignments = this.filteredAssignments();
    const pageSize = this._pageSize();
    const currentPage = this._currentPage();

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return allAssignments.slice(startIndex, endIndex);
  });

  // Pagination metadata
  readonly paginationInfo = computed(() => {
    const totalItems = this.filteredAssignments().length;
    const pageSize = this._pageSize();
    const currentPage = this._currentPage();
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      currentPage,
      totalPages,
      pageSize,
      totalItems,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      startItem: (currentPage - 1) * pageSize + 1,
      endItem: Math.min(currentPage * pageSize, totalItems)
    };
  });

  // Selection helpers
  readonly selectedCount = computed(() => this._selectedAssignments().size);
  readonly isAllSelected = computed(() => {
    const visibleAssignments = this.paginatedAssignments();
    return visibleAssignments.length > 0 &&
           visibleAssignments.every(assignment => this._selectedAssignments().has(assignment.id));
  });

  readonly isIndeterminate = computed(() => {
    const visibleAssignments = this.paginatedAssignments();
    const selectedCount = visibleAssignments.filter(assignment =>
      this._selectedAssignments().has(assignment.id)
    ).length;
    return selectedCount > 0 && selectedCount < visibleAssignments.length;
  });

  // Quick stats
  readonly urgentAssignmentsCount = computed(() =>
    this._assignments().filter(a => a.priority === 'urgent').length
  );

  readonly overdueAssignmentsCount = computed(() =>
    this._assignments().filter(a => a.isOverdue).length
  );

  readonly dueSoonCount = computed(() =>
    this._assignments().filter(a => a.daysUntilDue > 0 && a.daysUntilDue <= 3).length
  );

  // ========================================
  // STATE MUTATION METHODS
  // ========================================

  /**
   * Load assignments for a student
   */
  async loadAssignments(studentId: StudentId): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await this.assignmentService.getStudentAssignments(studentId, this._filters()).toPromise();
      if (result) {
        this._assignments.set(result.assignments);
        const stats = await this.assignmentService.getAssignmentStats(studentId).toPromise();
        this._stats.set(stats || null);
      }
    } catch (error) {
      this._error.set('Không thể tải danh sách bài tập');
      console.error('Error loading assignments:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load upcoming deadlines
   */
  async loadUpcomingDeadlines(studentId: StudentId, daysAhead: number = 7): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await this.assignmentService.getUpcomingDeadlines(studentId, daysAhead).toPromise();
      if (result) {
        this._assignments.set(result.assignments);
      }
    } catch (error) {
      this._error.set('Không thể tải bài tập sắp đến hạn');
      console.error('Error loading upcoming deadlines:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load overdue assignments
   */
  async loadOverdueAssignments(studentId: StudentId): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await this.assignmentService.getOverdueAssignments(studentId).toPromise();
      if (result) {
        this._assignments.set(result.assignments);
      }
    } catch (error) {
      this._error.set('Không thể tải bài tập quá hạn');
      console.error('Error loading overdue assignments:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update filters
   */
  updateFilters(newFilters: Partial<AssignmentFilters>): void {
    this._filters.update(current => ({ ...current, ...newFilters }));
    this._currentPage.set(1); // Reset to first page when filtering
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this._filters.set({});
    this._currentPage.set(1);
  }

  /**
   * Update sort options
   */
  updateSortOptions(field: AssignmentSortOptions['field'], direction?: 'asc' | 'desc'): void {
    this._sortOptions.set({
      field,
      direction: direction || (this._sortOptions().direction === 'asc' ? 'desc' : 'asc')
    });
  }

  /**
   * Change page
   */
  setPage(page: number): void {
    if (page >= 1 && page <= this.paginationInfo().totalPages) {
      this._currentPage.set(page);
    }
  }

  /**
   * Change page size
   */
  setPageSize(pageSize: number): void {
    this._pageSize.set(pageSize);
    this._currentPage.set(1); // Reset to first page
  }

  /**
   * Toggle view mode
   */
  toggleViewMode(): void {
    this._currentView.set(this._currentView() === 'list' ? 'grid' : 'list');
  }

  /**
   * Select/deselect assignment
   */
  toggleAssignmentSelection(assignmentId: string): void {
    this._selectedAssignments.update(selected => {
      const newSelected = new Set(selected);
      if (newSelected.has(assignmentId)) {
        newSelected.delete(assignmentId);
      } else {
        newSelected.add(assignmentId);
      }
      return newSelected;
    });
  }

  /**
   * Select/deselect all visible assignments
   */
  toggleSelectAll(): void {
    const visibleAssignments = this.paginatedAssignments();
    const allSelected = this.isAllSelected();

    this._selectedAssignments.update(selected => {
      const newSelected = new Set(selected);

      if (allSelected) {
        // Deselect all visible
        visibleAssignments.forEach(assignment => {
          newSelected.delete(assignment.id);
        });
      } else {
        // Select all visible
        visibleAssignments.forEach(assignment => {
          newSelected.add(assignment.id);
        });
      }

      return newSelected;
    });
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this._selectedAssignments.set(new Set());
  }

  /**
   * Navigate to assignment work page
   */
  navigateToAssignment(assignmentId: string): void {
    this.router.navigate(['/student/assignments/work', assignmentId]);
  }

  /**
   * Navigate to assignment details
   */
  navigateToAssignmentDetails(assignmentId: string): void {
    this.router.navigate(['/student/assignments', assignmentId]);
  }

  /**
   * Refresh data
   */
  async refresh(): Promise<void> {
    // This would need the current student ID - in a real implementation,
    // this would be passed or stored in the state
    console.log('Refresh assignments - would need student ID');
  }

  /**
   * Clear error
   */
  clearError(): void {
    this._error.set(null);
  }

  // ========================================
  // EFFECTS (Side Effects)
  // ========================================

  constructor() {
    // Auto-save filters to localStorage
    effect(() => {
      const filters = this._filters();
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('assignment-filters', JSON.stringify(filters));
      }
    });

    // Auto-save view preferences
    effect(() => {
      const preferences = {
        view: this._currentView(),
        pageSize: this._pageSize(),
        sortField: this._sortOptions().field,
        sortDirection: this._sortOptions().direction
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('assignment-view-preferences', JSON.stringify(preferences));
      }
    });

    // Load saved preferences on initialization
    this.loadSavedPreferences();
  }

  private loadSavedPreferences(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        // Load filters
        const savedFilters = localStorage.getItem('assignment-filters');
        if (savedFilters) {
          this._filters.set(JSON.parse(savedFilters));
        }

        // Load view preferences
        const savedPreferences = localStorage.getItem('assignment-view-preferences');
        if (savedPreferences) {
          const preferences = JSON.parse(savedPreferences);
          this._currentView.set(preferences.view || 'list');
          this._pageSize.set(preferences.pageSize || 12);
          this._sortOptions.set({
            field: preferences.sortField || 'dueDate',
            direction: preferences.sortDirection || 'asc'
          });
        }
      } catch (error) {
        console.warn('Error loading saved preferences:', error);
      }
    }
  }
}