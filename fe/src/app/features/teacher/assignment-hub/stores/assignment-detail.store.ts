import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, tap, catchError, finalize } from 'rxjs';
import { AssignmentApi, AssignmentDetail } from '../../../../api/client/assignment.api';

/**
 * Assignment Detail Store
 * 
 * Manages assignment detail state including stats.
 * Part of the unified Assignment-Grading Hub architecture.
 * 
 * @requirements Expert feedback - SignalStore pattern
 */

export interface AssignmentStats {
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  pendingCount: number;
  lateCount: number;
  averageScore: number;
  scoreDistribution: { range: string; count: number }[];
}

export interface AssignmentWithStats extends AssignmentDetail {
  stats?: AssignmentStats;
}

@Injectable({ providedIn: 'root' })
export class AssignmentDetailStore {
  private assignmentApi = inject(AssignmentApi);

  // State Signals
  private _assignment = signal<AssignmentWithStats | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Public Readonly Signals
  readonly assignment = this._assignment.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed
  readonly stats = computed(() => this._assignment()?.stats || this.getDefaultStats());
  readonly hasAssignment = computed(() => this._assignment() !== null);
  readonly assignmentId = computed(() => this._assignment()?.id || null);
  readonly assignmentTitle = computed(() => this._assignment()?.title || '');

  // Load assignment by ID
  loadAssignment(assignmentId: string, forceRefresh = false): Observable<AssignmentWithStats | null> {
    if (!forceRefresh && this._assignment()?.id === assignmentId) {
      return of(this._assignment());
    }

    this._loading.set(true);
    this._error.set(null);

    return this.assignmentApi.getAssignmentById(assignmentId).pipe(
      tap((response: { data?: AssignmentDetail }) => {
        if (response.data) {
          const assignmentWithStats: AssignmentWithStats = {
            ...response.data,
            stats: this.calculateStatsFromAssignment(response.data)
          };
          this._assignment.set(assignmentWithStats);
        } else {
          this._error.set('Không tìm thấy bài tập');
          this._assignment.set(null);
        }
      }),
      catchError((err: unknown) => {
        console.error('Error loading assignment:', err);
        this._error.set('Không thể tải bài tập. Vui lòng thử lại.');
        this._assignment.set(null);
        return of({ data: null });
      }),
      finalize(() => this._loading.set(false))
    ) as unknown as Observable<AssignmentWithStats | null>;
  }

  // Clear current assignment
  clearAssignment(): void {
    this._assignment.set(null);
    this._error.set(null);
  }

  // Update assignment locally
  updateAssignment(updates: Partial<AssignmentWithStats>): void {
    const current = this._assignment();
    if (current) {
      this._assignment.set({ ...current, ...updates });
    }
  }

  // Update stats after grading
  updateStatsAfterGrading(newGradedCount: number, newAverageScore: number): void {
    const current = this._assignment();
    if (current?.stats) {
      this._assignment.set({
        ...current,
        stats: {
          ...current.stats,
          gradedCount: newGradedCount,
          pendingCount: current.stats.submittedCount - newGradedCount,
          averageScore: newAverageScore
        }
      });
    }
  }

  private getDefaultStats(): AssignmentStats {
    return {
      totalStudents: 0,
      submittedCount: 0,
      gradedCount: 0,
      pendingCount: 0,
      lateCount: 0,
      averageScore: 0,
      scoreDistribution: [
        { range: '90-100', count: 0 },
        { range: '80-89', count: 0 },
        { range: '70-79', count: 0 },
        { range: '60-69', count: 0 },
        { range: '<60', count: 0 }
      ]
    };
  }

  private calculateStatsFromAssignment(assignment: AssignmentDetail): AssignmentStats {
    // Use data from assignment response
    const totalStudents = assignment.totalStudents || 0;
    const submittedCount = assignment.submissionsCount || 0;
    
    // These will be updated when submissions are loaded
    return {
      totalStudents,
      submittedCount,
      gradedCount: 0, // Will be calculated from submissions
      pendingCount: submittedCount, // Initially all submitted are pending
      lateCount: 0,
      averageScore: 0,
      scoreDistribution: [
        { range: '90-100', count: 0 },
        { range: '80-89', count: 0 },
        { range: '70-79', count: 0 },
        { range: '60-69', count: 0 },
        { range: '<60', count: 0 }
      ]
    };
  }

  // Update stats from submissions data
  updateStatsFromSubmissions(submissions: { status: string; grade?: { score: number; percentage: number } }[]): void {
    const current = this._assignment();
    if (!current) return;

    const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.grade);
    const pendingSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'pending');
    const lateSubmissions = submissions.filter(s => s.status === 'late');

    // Calculate average score
    let averageScore = 0;
    if (gradedSubmissions.length > 0) {
      const totalPercentage = gradedSubmissions.reduce((sum, s) => sum + (s.grade?.percentage || 0), 0);
      averageScore = totalPercentage / gradedSubmissions.length;
    }

    // Calculate score distribution
    const distribution = [
      { range: '90-100', count: 0 },
      { range: '80-89', count: 0 },
      { range: '70-79', count: 0 },
      { range: '60-69', count: 0 },
      { range: '<60', count: 0 }
    ];

    gradedSubmissions.forEach(s => {
      const percentage = s.grade?.percentage || 0;
      if (percentage >= 90) distribution[0].count++;
      else if (percentage >= 80) distribution[1].count++;
      else if (percentage >= 70) distribution[2].count++;
      else if (percentage >= 60) distribution[3].count++;
      else distribution[4].count++;
    });

    this._assignment.set({
      ...current,
      stats: {
        ...current.stats!,
        submittedCount: submissions.length,
        gradedCount: gradedSubmissions.length,
        pendingCount: pendingSubmissions.length,
        lateCount: lateSubmissions.length,
        averageScore,
        scoreDistribution: distribution
      }
    });
  }


}

