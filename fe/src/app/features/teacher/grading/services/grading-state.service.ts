import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, tap, catchError, finalize } from 'rxjs';
import { AssignmentApi, SubmissionDetail, GradeSubmissionRequest } from '../../../../api/client/assignment.api';

/**
 * Grading State Service
 * 
 * Manages grading state with auto-save functionality for draft grades.
 * Provides pending submissions tracking and statistics computation.
 * 
 * @requirements 5.6, 7.1, 7.2
 */

interface DraftGrade {
  submissionId: string;
  assignmentId: string;
  grade?: number;
  feedback?: string;
  lastSaved: number;
  rubricSelections?: { criterionId: string; levelId: string; points: number }[];
}

interface GradingStats {
  totalPending: number;
  overdueSubmissions: number;
  recentlyGraded: number;
  averageGradingTime: number;
}

@Injectable({ providedIn: 'root' })
export class GradingStateService {
  private assignmentApi = inject(AssignmentApi);
  
  // State Signals
  private _pendingSubmissions = signal<SubmissionDetail[]>([]);
  private _draftGrades = signal<Map<string, DraftGrade>>(new Map());
  private _loading = signal(false);
  private _savingDrafts = signal(false);
  private _error = signal<string | null>(null);
  
  // Auto-save configuration
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  private readonly DRAFT_STORAGE_KEY = 'grading_drafts';
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  
  // Public Computed Signals
  readonly pendingSubmissions = this._pendingSubmissions.asReadonly();
  readonly draftGrades = computed(() => Array.from(this._draftGrades().values()));
  readonly loading = this._loading.asReadonly();
  readonly savingDrafts = this._savingDrafts.asReadonly();
  readonly error = this._error.asReadonly();
  
  readonly gradingStats = computed((): GradingStats => {
    const pending = this._pendingSubmissions();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return {
      totalPending: pending.length,
      overdueSubmissions: pending.filter((s: SubmissionDetail) => 
        s.dueDate && new Date(s.dueDate).getTime() < now
      ).length,
      recentlyGraded: pending.filter((s: SubmissionDetail) => 
        s.gradedAt && new Date(s.gradedAt).getTime() > oneDayAgo
      ).length,
      averageGradingTime: 0
    };
  });
  
  readonly sortedPendingSubmissions = computed(() => {
    return [...this._pendingSubmissions()].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  });
  
  readonly draftCount = computed(() => this._draftGrades().size);
  
  constructor() {
    this.loadDraftsFromStorage();
    this.startAutoSave();
  }
  
  // Draft Grade Management
  saveDraftGrade(
    submissionId: string,
    assignmentId: string,
    grade?: number,
    feedback?: string,
    rubricSelections?: { criterionId: string; levelId: string; points: number }[]
  ): void {
    const draft: DraftGrade = {
      submissionId,
      assignmentId,
      grade,
      feedback,
      lastSaved: Date.now(),
      rubricSelections
    };
    
    this._draftGrades.update((drafts: Map<string, DraftGrade>) => {
      const newDrafts = new Map(drafts);
      newDrafts.set(submissionId, draft);
      return newDrafts;
    });
    
    this.saveDraftsToStorage();
  }
  
  getDraftGrade(submissionId: string): DraftGrade | null {
    return this._draftGrades().get(submissionId) || null;
  }
  
  removeDraftGrade(submissionId: string): void {
    this._draftGrades.update((drafts: Map<string, DraftGrade>) => {
      const newDrafts = new Map(drafts);
      newDrafts.delete(submissionId);
      return newDrafts;
    });
    this.saveDraftsToStorage();
  }
  
  clearAllDrafts(): void {
    this._draftGrades.set(new Map());
    localStorage.removeItem(this.DRAFT_STORAGE_KEY);
  }
  
  getDraftGradesForAssignment(assignmentId: string): DraftGrade[] {
    const allDrafts = Array.from(this._draftGrades().values()) as DraftGrade[];
    return allDrafts.filter((draft: DraftGrade) => draft.assignmentId === assignmentId);
  }

  // Pending Submissions Management
  loadPendingSubmissions(forceRefresh = false): Observable<SubmissionDetail[]> {
    if (!forceRefresh && this._pendingSubmissions().length > 0) {
      return of(this._pendingSubmissions());
    }
    
    this._loading.set(true);
    this._error.set(null);
    
    return this.assignmentApi.getPendingSubmissions().pipe(
      tap((response: { data?: SubmissionDetail[] }) => {
        if (response.data) {
          this._pendingSubmissions.set(response.data);
        } else {
          this._pendingSubmissions.set([]);
        }
      }),
      catchError(() => {
        this._error.set('Không thể tải danh sách bài nộp chờ chấm. Vui lòng thử lại.');
        this._pendingSubmissions.set([]);
        return of({ data: [] });
      }),
      finalize(() => this._loading.set(false))
    ) as unknown as Observable<SubmissionDetail[]>;
  }
  
  markSubmissionGraded(submissionId: string, _grade: number, _feedback?: string): void {
    this._pendingSubmissions.update((submissions: SubmissionDetail[]) => 
      submissions.filter((s: SubmissionDetail) => s.id !== submissionId)
    );
    this.removeDraftGrade(submissionId);
  }
  
  addPendingSubmission(submission: SubmissionDetail): void {
    this._pendingSubmissions.update((submissions: SubmissionDetail[]) => {
      if (submissions.some((s: SubmissionDetail) => s.id === submission.id)) {
        return submissions;
      }
      return [...submissions, submission];
    });
  }
  
  // Final Grade Submission
  submitFinalGrade(submissionId: string, request: GradeSubmissionRequest): Observable<boolean> {
    this._savingDrafts.set(true);
    this._error.set(null);
    
    return this.assignmentApi.gradeSubmission(submissionId, request).pipe(
      tap(() => {
        this.markSubmissionGraded(submissionId, request.score, request.feedback);
      }),
      catchError((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : 'Không thể lưu điểm';
        this._error.set(errorMessage);
        return of(false);
      }),
      finalize(() => this._savingDrafts.set(false))
    ) as unknown as Observable<boolean>;
  }

  // Auto-Save Implementation
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.autoSaveTimer = setInterval(() => {
      this.syncDraftsToServer();
    }, this.AUTO_SAVE_INTERVAL);
  }
  
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
  
  private syncDraftsToServer(): void {
    const drafts = Array.from(this._draftGrades().values());
    if (drafts.length === 0) return;
  }
  
  private saveDraftsToStorage(): void {
    try {
      const drafts = Array.from(this._draftGrades().entries());
      localStorage.setItem(this.DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
    }
  }
  
  private loadDraftsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.DRAFT_STORAGE_KEY);
      if (stored) {
        const drafts = JSON.parse(stored) as [string, DraftGrade][];
        this._draftGrades.set(new Map(drafts));
      }
    } catch {
      this._draftGrades.set(new Map());
    }
  }
  
  // Utility Methods
  hasUnsavedChanges(submissionId: string): boolean {
    return this._draftGrades().has(submissionId);
  }
  
  getLastSavedTime(submissionId: string): number | null {
    const draft = this._draftGrades().get(submissionId);
    return draft?.lastSaved || null;
  }
  
  clearError(): void {
    this._error.set(null);
  }
  
  forceSyncDrafts(): void {
    this.syncDraftsToServer();
  }
}
