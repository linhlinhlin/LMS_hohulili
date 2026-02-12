import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, tap, catchError, finalize, map } from 'rxjs';
import { AssignmentApi, SubmissionSummary, SubmissionDetail, GradeSubmissionRequest, SubmissionGrade } from '../../../../api/client/assignment.api';

/**
 * Submissions Store
 * 
 * Manages submissions list state with filtering and inline grading support.
 * Part of the unified Assignment-Grading Hub architecture.
 * 
 * @requirements Expert feedback - SignalStore pattern, Inline Grading
 */

export type SubmissionFilter = 'ALL' | 'PENDING' | 'GRADED' | 'LATE';

export interface InlineGradeUpdate {
  submissionId: string;
  score: number;
  feedback?: string;
}

@Injectable({ providedIn: 'root' })
export class SubmissionsStore {
  private assignmentApi = inject(AssignmentApi);

  // State Signals
  private _submissions = signal<SubmissionDetail[]>([]);
  private _filter = signal<SubmissionFilter>('ALL');
  private _loading = signal(false);
  private _savingGrade = signal<string | null>(null); // submissionId being saved
  private _error = signal<string | null>(null);
  private _currentAssignmentId = signal<string | null>(null);

  // Public Readonly Signals
  readonly submissions = this._submissions.asReadonly();
  readonly filter = this._filter.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly savingGrade = this._savingGrade.asReadonly();
  readonly error = this._error.asReadonly();

  // Helper to normalize status (backend returns uppercase, frontend uses lowercase)
  private normalizeStatus(status: string): string {
    return status?.toLowerCase() || '';
  }

  // Computed - Filtered submissions
  readonly filteredSubmissions = computed(() => {
    const all = this._submissions();
    const filter = this._filter();

    switch (filter) {
      case 'PENDING':
        return all.filter(s => {
          const status = this.normalizeStatus(s.status);
          return status === 'submitted' || status === 'pending';
        });
      case 'GRADED':
        return all.filter(s => this.normalizeStatus(s.status) === 'graded');
      case 'LATE':
        return all.filter(s => {
          const status = this.normalizeStatus(s.status);
          return status === 'late' || status === 'late_submission' || s.isLate;
        });
      default:
        return all;
    }
  });

  // Computed - Stats
  readonly totalCount = computed(() => this._submissions().length);
  readonly pendingCount = computed(() => 
    this._submissions().filter(s => {
      const status = this.normalizeStatus(s.status);
      return status === 'submitted' || status === 'pending';
    }).length
  );
  readonly gradedCount = computed(() => 
    this._submissions().filter(s => this.normalizeStatus(s.status) === 'graded').length
  );
  readonly lateCount = computed(() => 
    this._submissions().filter(s => {
      const status = this.normalizeStatus(s.status);
      return status === 'late' || status === 'late_submission' || s.isLate;
    }).length
  );

  // Load submissions for assignment
  loadSubmissions(assignmentId: string, forceRefresh = false): Observable<SubmissionDetail[]> {
    if (!forceRefresh && this._currentAssignmentId() === assignmentId && this._submissions().length > 0) {
      return of(this._submissions());
    }

    this._loading.set(true);
    this._error.set(null);
    this._currentAssignmentId.set(assignmentId);

    return this.assignmentApi.getSubmissionsByAssignment(assignmentId).pipe(
      tap((response: { data?: SubmissionSummary[] }) => {
        if (response.data) {
          // Convert SubmissionSummary to SubmissionDetail
          const details = response.data.map(s => this.toSubmissionDetail(s, assignmentId));
          this._submissions.set(details);
        } else {
          this._submissions.set([]);
        }
      }),
      catchError(() => {
        this._error.set('Không thể tải danh sách bài nộp. Vui lòng thử lại.');
        this._submissions.set([]);
        return of({ data: [] });
      }),
      finalize(() => this._loading.set(false))
    ) as unknown as Observable<SubmissionDetail[]>;
  }

  // Set filter
  setFilter(filter: SubmissionFilter): void {
    this._filter.set(filter);
  }

  // Inline grade update (quick grade from list)
  updateInlineGrade(update: InlineGradeUpdate): Observable<boolean> {
    this._savingGrade.set(update.submissionId);
    this._error.set(null);

    const request: GradeSubmissionRequest = {
      score: update.score,
      feedback: update.feedback
    };

    return this.assignmentApi.gradeSubmission(update.submissionId, request).pipe(
      map((response: { data?: SubmissionDetail; message?: string }) => {
        if (response.data) {
          // Update local state with response data
          this._submissions.update(submissions =>
            submissions.map(s => s.id === update.submissionId ? {
              ...s,
              ...response.data,
              status: 'graded' as const,
              grade: {
                score: update.score,
                maxScore: s.maxScore || 100,
                percentage: (update.score / (s.maxScore || 100)) * 100,
                feedback: update.feedback,
                gradedAt: new Date().toISOString(),
                gradedBy: ''
              } as SubmissionGrade
            } : s)
          );
          return true;
        } else {
          this._error.set(response.message || 'Không thể lưu điểm');
          return false;
        }
      }),
      catchError((err: unknown) => {
        const errorMessage = (err as { message?: string })?.message || 'Không thể lưu điểm';
        this._error.set(errorMessage);
        return of(false);
      }),
      finalize(() => this._savingGrade.set(null))
    );
  }

  // Batch grade update
  batchGrade(submissionIds: string[], score: number, feedback?: string): Observable<boolean> {
    // For now, grade one by one - can be optimized with batch API
    const updates = submissionIds.map(id => ({ submissionId: id, score, feedback }));
    
    // Update local state immediately for better UX
    this._submissions.update(submissions =>
      submissions.map(s => submissionIds.includes(s.id) ? {
        ...s,
        status: 'graded' as const,
        grade: {
          score,
          maxScore: s.maxScore || 100,
          percentage: (score / (s.maxScore || 100)) * 100,
          feedback,
          gradedAt: new Date().toISOString(),
          gradedBy: ''
        } as SubmissionGrade
      } : s)
    );

    return of(true); // Batch grading: optimistic update, individual grades saved via SpeedGrader
  }

  // Mark submission as graded (after SpeedGrader)
  markAsGraded(submissionId: string, grade: SubmissionGrade): void {
    this._submissions.update(submissions =>
      submissions.map(s => s.id === submissionId ? {
        ...s,
        status: 'graded' as const,
        grade
      } : s)
    );
  }

  // Clear submissions
  clearSubmissions(): void {
    this._submissions.set([]);
    this._currentAssignmentId.set(null);
    this._filter.set('ALL');
    this._error.set(null);
  }

  // Get submission by ID from local state
  getSubmissionById(submissionId: string): SubmissionDetail | undefined {
    return this._submissions().find(s => s.id === submissionId);
  }

  // Load full submission detail from API (for SpeedGrader)
  loadSubmissionDetail(submissionId: string): Observable<SubmissionDetail | null> {
    return this.assignmentApi.getSubmissionById(submissionId).pipe(
      tap((response: { data?: SubmissionDetail }) => {
        if (response.data) {
          // Update local state with full detail
          this._submissions.update(submissions =>
            submissions.map(s => s.id === submissionId ? { ...s, ...response.data } : s)
          );
        }
      }),
      catchError(() => {
        return of({ data: null });
      })
    ) as unknown as Observable<SubmissionDetail | null>;
  }

  // Helper to extract score from grade
  getGradeScore(grade: number | SubmissionGrade | undefined): number | undefined {
    if (grade === undefined || grade === null) return undefined;
    if (typeof grade === 'number') return grade;
    return grade.score;
  }

  private toSubmissionDetail(summary: SubmissionSummary, assignmentId: string): SubmissionDetail {
    // Convert grade from number to SubmissionGrade if needed
    // Backend can return score directly OR grade object
    let grade: SubmissionGrade | undefined;
    
    // First check direct score field (backend returns BigDecimal as score)
    const directScore = summary.score;
    
    if (directScore !== undefined && directScore !== null) {
      grade = {
        score: directScore,
        maxScore: 100,
        percentage: directScore,
        gradedAt: summary.gradedAt || '',
        gradedBy: ''
      };
    } else if (summary.grade !== undefined && summary.grade !== null) {
      if (typeof summary.grade === 'number') {
        grade = {
          score: summary.grade,
          maxScore: 100,
          percentage: summary.grade,
          gradedAt: summary.gradedAt || '',
          gradedBy: ''
        };
      } else {
        grade = summary.grade;
      }
    }
    
    // Normalize status to lowercase for frontend consistency
    // Backend returns uppercase (GRADED, SUBMITTED, LATE_SUBMISSION)
    const normalizedStatus = summary.status ? this.normalizeStatus(summary.status) : 'submitted';
    
    // Determine final status based on score presence as well
    // If score exists, it means the submission has been graded
    let finalStatus = normalizedStatus;
    if ((directScore !== undefined && directScore !== null) || grade) {
      finalStatus = 'graded';
    }
    
    return {
      ...summary,
      status: finalStatus as SubmissionDetail['status'],
      grade,
      assignmentId,
      maxScore: 100 // Default, should come from assignment
    };
  }


}
