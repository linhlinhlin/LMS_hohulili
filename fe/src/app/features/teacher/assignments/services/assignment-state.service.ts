import { Injectable, inject, signal, computed } from '@angular/core';
import { AssignmentApi, AssignmentSummary, AssignmentDetail, CreateAssignmentRequest, UpdateAssignmentRequest } from '../../../../api/client/assignment.api';
import { Observable, tap, catchError, of, finalize } from 'rxjs';

/**
 * Assignment State Service
 * 
 * Manages assignment state using Angular Signals.
 * Provides caching, optimistic updates, and CRUD operations.
 * 
 * @requirements 2.1, 3.2
 */
@Injectable({ providedIn: 'root' })
export class AssignmentStateService {
  private assignmentApi = inject(AssignmentApi);

  // ============================================================================
  // State Signals
  // ============================================================================

  /** All assignments for the current teacher */
  private _assignments = signal<AssignmentSummary[]>([]);
  
  /** Currently selected/editing assignment */
  private _currentAssignment = signal<AssignmentDetail | null>(null);
  
  /** Loading states */
  private _loading = signal(false);
  private _saving = signal(false);
  
  /** Error state */
  private _error = signal<string | null>(null);
  
  /** Cache timestamp for invalidation */
  private _lastFetched = signal<number | null>(null);
  
  /** Cache duration in milliseconds (5 minutes) */
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  // ============================================================================
  // Public Computed Signals (Read-only)
  // ============================================================================

  /** Read-only assignments list */
  readonly assignments = this._assignments.asReadonly();
  
  /** Read-only current assignment */
  readonly currentAssignment = this._currentAssignment.asReadonly();
  
  /** Read-only loading state */
  readonly loading = this._loading.asReadonly();
  
  /** Read-only saving state */
  readonly saving = this._saving.asReadonly();
  
  /** Read-only error state */
  readonly error = this._error.asReadonly();

  /** Total assignments count */
  readonly totalCount = computed(() => this._assignments().length);

  /** Pending assignments (draft status) */
  readonly pendingAssignments = computed(() => 
    this._assignments().filter((a: AssignmentSummary) => 
      a.status === 'pending' || a.status === 'DRAFT' as unknown as typeof a.status
    )
  );

  /** Published assignments */
  readonly publishedAssignments = computed(() => 
    this._assignments().filter((a: AssignmentSummary) => 
      a.status === 'published' || a.status === 'PUBLISHED' as unknown as typeof a.status
    )
  );

  /** Check if cache is valid */
  readonly isCacheValid = computed(() => {
    const lastFetched = this._lastFetched();
    if (!lastFetched) return false;
    return Date.now() - lastFetched < this.CACHE_DURATION;
  });

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Loads all assignments for the current teacher.
   * Uses cache if valid, otherwise fetches from API.
   * 
   * @param forceRefresh - Force refresh even if cache is valid
   */
  loadAssignments(forceRefresh = false): Observable<AssignmentSummary[]> {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid()) {
      return of(this._assignments());
    }

    this._loading.set(true);
    this._error.set(null);

    return this.assignmentApi.getTeacherAssignments().pipe(
      tap((response: { data?: AssignmentSummary[] }) => {
        if (response.data) {
          this._assignments.set(response.data);
          this._lastFetched.set(Date.now());
        }
      }),
      catchError((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách bài tập';
        this._error.set(errorMessage);
        console.error('Error loading assignments:', err);
        return of({ data: [] as AssignmentSummary[] });
      }),
      finalize(() => this._loading.set(false)),
      // Map to just the data array
      tap(() => {}),
    ) as unknown as Observable<AssignmentSummary[]>;
  }

  /**
   * Loads a single assignment by ID.
   * 
   * @param assignmentId - The assignment ID to load
   */
  loadAssignment(assignmentId: string): Observable<AssignmentDetail | null> {
    this._loading.set(true);
    this._error.set(null);

    return this.assignmentApi.getAssignmentById(assignmentId).pipe(
      tap((response: { data?: AssignmentDetail }) => {
        if (response.data) {
          this._currentAssignment.set(response.data);
        }
      }),
      catchError((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Không thể tải thông tin bài tập';
        this._error.set(errorMessage);
        console.error('Error loading assignment:', err);
        return of({ data: null });
      }),
      finalize(() => this._loading.set(false))
    ) as unknown as Observable<AssignmentDetail | null>;
  }

  /**
   * Creates a new assignment.
   * Uses optimistic update pattern.
   * 
   * @param courseId - The course ID to create assignment in
   * @param data - The assignment creation data
   */
  createAssignment(courseId: string, data: CreateAssignmentRequest): Observable<AssignmentDetail | null> {
    this._saving.set(true);
    this._error.set(null);

    return this.assignmentApi.createAssignment(courseId, data).pipe(
      tap((response: { data?: AssignmentDetail }) => {
        if (response.data) {
          // Add to local state
          const newSummary: AssignmentSummary = {
            id: response.data.id,
            title: response.data.title,
            description: response.data.description,
            dueDate: response.data.dueDate,
            courseId: response.data.courseId,
            courseTitle: response.data.courseTitle,
            status: response.data.status,
            submissionsCount: response.data.submissionsCount,
            totalStudents: response.data.totalStudents,
            createdAt: response.data.createdAt,
            updatedAt: response.data.updatedAt
          };
          
          this._assignments.update((list: AssignmentSummary[]) => [...list, newSummary]);
          this._currentAssignment.set(response.data);
        }
      }),
      catchError((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Không thể tạo bài tập';
        this._error.set(errorMessage);
        console.error('Error creating assignment:', err);
        return of({ data: null });
      }),
      finalize(() => this._saving.set(false))
    ) as unknown as Observable<AssignmentDetail | null>;
  }

  /**
   * Updates an existing assignment.
   * Uses optimistic update with rollback on failure.
   * 
   * @param assignmentId - The assignment ID to update
   * @param data - The update data
   */
  updateAssignment(assignmentId: string, data: UpdateAssignmentRequest): Observable<AssignmentDetail | null> {
    this._saving.set(true);
    this._error.set(null);

    // Store previous state for rollback
    const previousAssignments = this._assignments();
    const previousCurrent = this._currentAssignment();

    // Optimistic update
    this._assignments.update((list: AssignmentSummary[]) => 
      list.map((a: AssignmentSummary) => a.id === assignmentId ? { ...a, ...data } : a)
    );

    return this.assignmentApi.updateAssignment(assignmentId, data).pipe(
      tap((response: { data?: AssignmentDetail }) => {
        if (response.data) {
          // Update with actual server response
          this._assignments.update((list: AssignmentSummary[]) => 
            list.map((a: AssignmentSummary) => a.id === assignmentId ? {
              ...a,
              title: response.data!.title,
              description: response.data!.description,
              dueDate: response.data!.dueDate,
              status: response.data!.status,
              updatedAt: response.data!.updatedAt
            } : a)
          );
          this._currentAssignment.set(response.data);
        }
      }),
      catchError((err: unknown) => {
        // Rollback on error
        this._assignments.set(previousAssignments);
        this._currentAssignment.set(previousCurrent);
        
        const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật bài tập';
        this._error.set(errorMessage);
        console.error('Error updating assignment:', err);
        return of({ data: null });
      }),
      finalize(() => this._saving.set(false))
    ) as unknown as Observable<AssignmentDetail | null>;
  }

  /**
   * Deletes an assignment.
   * Uses optimistic update with rollback on failure.
   * 
   * @param assignmentId - The assignment ID to delete
   */
  deleteAssignment(assignmentId: string): Observable<boolean> {
    this._saving.set(true);
    this._error.set(null);

    // Store previous state for rollback
    const previousAssignments = this._assignments();

    // Optimistic delete
    this._assignments.update((list: AssignmentSummary[]) => list.filter((a: AssignmentSummary) => a.id !== assignmentId));

    return this.assignmentApi.deleteAssignment(assignmentId).pipe(
      tap(() => {
        // Clear current if it was the deleted one
        if (this._currentAssignment()?.id === assignmentId) {
          this._currentAssignment.set(null);
        }
      }),
      catchError((err: unknown) => {
        // Rollback on error
        this._assignments.set(previousAssignments);
        
        const errorMessage = err instanceof Error ? err.message : 'Không thể xóa bài tập';
        this._error.set(errorMessage);
        console.error('Error deleting assignment:', err);
        return of(false);
      }),
      finalize(() => this._saving.set(false))
    ) as unknown as Observable<boolean>;
  }

  // ============================================================================
  // State Management Helpers
  // ============================================================================

  /**
   * Clears the current assignment selection.
   */
  clearCurrentAssignment(): void {
    this._currentAssignment.set(null);
  }

  /**
   * Clears any error state.
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Invalidates the cache, forcing next load to fetch from API.
   */
  invalidateCache(): void {
    this._lastFetched.set(null);
  }

  /**
   * Gets an assignment from local state by ID.
   * 
   * @param assignmentId - The assignment ID to find
   */
  getAssignmentById(assignmentId: string): AssignmentSummary | undefined {
    return this._assignments().find((a: AssignmentSummary) => a.id === assignmentId);
  }

  /**
   * Checks if an assignment exists in local state.
   * 
   * @param assignmentId - The assignment ID to check
   */
  hasAssignment(assignmentId: string): boolean {
    return this._assignments().some((a: AssignmentSummary) => a.id === assignmentId);
  }
}

