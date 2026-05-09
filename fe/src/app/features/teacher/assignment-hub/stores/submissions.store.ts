import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, tap, catchError, finalize, map } from 'rxjs';
import { AssignmentApi, SubmissionSummary, SubmissionDetail, GradeSubmissionRequest, SubmissionGrade, RubricGradeItem } from '../../../../api/client/assignment.api';

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
  rubricGrades?: RubricGradeItem[];
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

    let filtered: SubmissionDetail[];
    switch (filter) {
      case 'PENDING':
        filtered = all.filter(s => {
          const status = this.normalizeStatus(s.status);
          return status === 'submitted' || status === 'pending';
        });
        break;
      case 'GRADED':
        filtered = all.filter(s => this.normalizeStatus(s.status) === 'graded');
        break;
      case 'LATE':
        filtered = all.filter(s => {
          const status = this.normalizeStatus(s.status);
          return status === 'late' || status === 'late_submission' || s.isLate;
        });
        break;
      default:
        filtered = all;
    }
    // Default sort: ungraded first, then by submittedAt newest
    return [...filtered].sort((a, b) => {
      const aGraded = this.normalizeStatus(a.status) === 'graded' ? 1 : 0;
      const bGraded = this.normalizeStatus(b.status) === 'graded' ? 1 : 0;
      if (aGraded !== bGraded) return aGraded - bGraded;
      return (b.submittedAt || '').localeCompare(a.submittedAt || '');
    });
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
      catchError((error: any) => {
        const status = error?.status;
        if (status === 401 || status === 403) {
          // Auth error — don't cache as empty, allow retry after token refresh
          this._error.set('Phiên đăng nhập hết hạn. Đang thử lại...');
          this._currentAssignmentId.set(null); // Clear cache key so next call retries
        } else {
          this._error.set('Không thể tải danh sách bài nộp. Vui lòng thử lại.');
          this._submissions.set([]);
        }
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
      feedback: update.feedback,
      rubricGrades: update.rubricGrades
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

  // Batch grade update — persists to DB via batch API
  batchGrade(submissionIds: string[], score: number, feedback?: string): Observable<boolean> {
    const assignmentId = this._currentAssignmentId();
    if (!assignmentId) return of(false);

    // Optimistic update for better UX
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

    const items = submissionIds.map(id => ({ submissionId: id, grade: score, feedback }));
    return this.assignmentApi.batchGradeSubmissions(assignmentId, items).pipe(
      map(() => true),
      catchError(() => {
        this._error.set('Không thể chấm điểm hàng loạt. Vui lòng thử lại.');
        return of(false);
      })
    );
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
      tap((response: { data?: any }) => {
        if (response.data) {
          const raw = response.data;
          // Preserve normalized grade + build attachments from flat fields
          this._submissions.update(submissions =>
            submissions.map(s => {
              if (s.id !== submissionId) return s;
              // Build attachments from flat fileUrl/fileName if needed
              let attachments = raw.attachments || s.attachments;
              if (!attachments?.length && raw.fileUrl) {
                attachments = [{ id: raw.fileUrl, fileName: raw.fileName || 'Tệp đính kèm', fileUrl: raw.fileUrl }];
              }
              // Merge feedback + rubricGrades into existing grade object
              const grade = s.grade && typeof s.grade === 'object'
                ? {
                    ...s.grade,
                    feedback: raw.feedback || s.grade.feedback,
                    rubricGrades: raw.rubricGrades || s.grade.rubricGrades
                  }
                : s.grade;
              return { ...s, content: raw.content, attachments, feedback: raw.feedback, grade };
            })
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
    
    const effectiveMaxScore = summary.maxGrade || (summary as SubmissionDetail).maxScore || 100;

    if (directScore !== undefined && directScore !== null) {
      grade = {
        score: directScore,
        maxScore: effectiveMaxScore,
        percentage: (directScore / effectiveMaxScore) * 100,
        feedback: summary.feedback || undefined,
        gradedAt: summary.gradedAt || '',
        gradedBy: ''
      };
    } else if (summary.grade !== undefined && summary.grade !== null) {
      if (typeof summary.grade === 'number') {
        grade = {
          score: summary.grade,
          maxScore: effectiveMaxScore,
          percentage: (summary.grade / effectiveMaxScore) * 100,
          feedback: summary.feedback || undefined,
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
    
    // Convert flat fileUrl/fileName to attachments array for SpeedGrader
    const detail = summary as any;
    let attachments = (detail.attachments as SubmissionDetail['attachments']) || undefined;
    if (!attachments?.length && detail.fileUrl) {
      attachments = [{
        id: detail.fileUrl,
        fileName: detail.fileName || 'Tệp đính kèm',
        fileUrl: detail.fileUrl
      }];
    }

    return {
      ...summary,
      status: finalStatus as SubmissionDetail['status'],
      grade,
      assignmentId,
      maxScore: effectiveMaxScore,
      attachments,
      content: detail.content
    };
  }


}
