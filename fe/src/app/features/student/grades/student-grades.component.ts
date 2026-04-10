import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../api/client/api-client';
import { CertificateApi, CertificateDTO } from '../../../api/endpoints/certificate.api';

type DeliveryMode = 'SELF_PACED' | 'INSTRUCTOR_LED';
type EnrollmentStatus = 'ACTIVE' | 'COMPLETED';
type StatusFilterKey = 'ALL' | 'ACTIVE' | 'COMPLETED';

interface QuizScore {
  quizId: string;
  quizTitle: string;
  bestScore: number;
  maxScore: number;
  isPassed: boolean | null;
  bestAttemptId: string | null;
  attempts: number;
}

interface AssignmentScore {
  assignmentId: string;
  assignmentTitle: string;
  grade: number | null;
  maxScore: number;
  status: string;
}

interface EnrollmentGrade {
  enrollmentId: string;
  enrollmentStatus: EnrollmentStatus;
  enrolledAt: string | null;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  deliveryMode: DeliveryMode;
  thumbnailUrl: string | null;
  classId: string;
  className: string;
  classCode: string | null;
  semester: string | null;
  progress: number;
  quizScores: QuizScore[];
  assignmentScores: AssignmentScore[];
  hasCertificate: boolean;
}

interface StatusTab {
  key: StatusFilterKey;
  label: string;
  count: number;
}

@Component({
  selector: 'app-student-grades',
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-grades.component.html',
  styleUrl: './student-grades.component.scss',
})
export class StudentGradesComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private certificateApi = inject(CertificateApi);
  private router = inject(Router);

  // === Data ===
  activeTab = signal<'grades' | 'certificates'>('grades');
  grades = signal<EnrollmentGrade[]>([]);
  certificates = signal<CertificateDTO[]>([]);
  isLoading = signal(true);
  certsLoading = signal(false);
  error = signal<string | null>(null);

  // === Status Filter ===
  activeStatusFilter = signal<StatusFilterKey>('ALL');

  statusFilterTabs = computed<StatusTab[]>(() => {
    const all = this.grades();
    return [
      { key: 'ALL', label: 'Tất cả', count: all.length },
      { key: 'ACTIVE', label: 'Đang học', count: all.filter(g => g.enrollmentStatus === 'ACTIVE').length },
      { key: 'COMPLETED', label: 'Đã hoàn thành', count: all.filter(g => g.enrollmentStatus === 'COMPLETED').length },
    ];
  });

  // === Semester Filter ===
  selectedSemester = signal<string | null>(null);

  availableSemesters = computed(() => {
    return this.grades()
      .filter(g => g.deliveryMode === 'INSTRUCTOR_LED' && g.semester)
      .map(g => g.semester!)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
  });

  hasSemesterFilter = computed(() => this.availableSemesters().length > 0);

  // === Filtered List ===
  filteredGrades = computed(() => {
    let result = this.grades();
    const status = this.activeStatusFilter();
    if (status !== 'ALL') {
      result = result.filter(g => g.enrollmentStatus === status);
    }
    const semester = this.selectedSemester();
    if (semester) {
      result = result.filter(g => g.semester === semester);
    }
    return result;
  });

  // === Summary ===
  completedCount = computed(() => this.filteredGrades().filter(g => g.enrollmentStatus === 'COMPLETED').length);
  averageProgress = computed(() => {
    const g = this.filteredGrades();
    return g.length > 0 ? Math.round(g.reduce((s, c) => s + c.progress, 0) / g.length) : 0;
  });

  // === Load More ===
  private readonly LOAD_MORE_COUNT = 5;
  visibleCount = signal(5);
  visibleGrades = computed(() => this.filteredGrades().slice(0, this.visibleCount()));
  hasMoreGrades = computed(() => this.visibleCount() < this.filteredGrades().length);
  remainingGrades = computed(() => Math.max(0, this.filteredGrades().length - this.visibleCount()));

  // === Expand/Collapse per enrollment ===
  expandedEnrollments = signal<Set<string>>(new Set());

  // === Lifecycle ===

  async ngOnInit(): Promise<void> {
    try {
      const response: any = await firstValueFrom(this.apiClient.get('/api/v3/student/grades'));
      const data: EnrollmentGrade[] = (response?.data || []).map((g: any) => ({
        enrollmentId: g.enrollmentId || g.courseId,
        enrollmentStatus: g.enrollmentStatus || g.status || 'ACTIVE',
        enrolledAt: g.enrolledAt || null,
        courseId: g.courseId,
        courseTitle: g.courseTitle,
        courseCode: g.courseCode || '',
        deliveryMode: g.deliveryMode || 'SELF_PACED',
        thumbnailUrl: g.thumbnailUrl || null,
        classId: g.classId || '',
        className: g.className || '',
        classCode: g.classCode || null,
        semester: g.semester || null,
        progress: g.progress || 0,
        quizScores: (g.quizScores || []).map((qs: any) => ({
          ...qs,
          isPassed: qs.isPassed ?? null,
          bestAttemptId: qs.bestAttemptId ?? null,
        })),
        assignmentScores: g.assignmentScores || [],
        hasCertificate: g.hasCertificate || false,
      }));
      this.grades.set(data);
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải bảng điểm');
    } finally {
      this.isLoading.set(false);
    }
  }

  // === Actions ===

  setStatusFilter(key: StatusFilterKey): void {
    this.activeStatusFilter.set(key);
    this.visibleCount.set(5);
  }

  setSemesterFilter(semester: string | null): void {
    this.selectedSemester.set(semester);
    this.visibleCount.set(5);
  }

  loadMoreGrades(): void {
    this.visibleCount.update(c => c + this.LOAD_MORE_COUNT);
  }

  async loadCertificates(): Promise<void> {
    if (this.certificates().length > 0) return;
    this.certsLoading.set(true);
    this.error.set(null);
    try {
      const response: any = await firstValueFrom(this.certificateApi.getMyCertificates());
      this.certificates.set(response?.data || []);
    } catch (err: any) {
      this.error.set(err?.message || 'Không thể tải danh sách chứng chỉ.');
    } finally {
      this.certsLoading.set(false);
    }
  }

  viewQuizResult(attemptId: string): void {
    this.router.navigate(['/student/quiz/result'], {
      queryParams: { attemptId, returnUrl: '/student/results' },
    });
  }

  // === Helpers ===

  getAllItems(grade: EnrollmentGrade): any[] {
    return [
      ...grade.quizScores.map(q => ({ ...q, type: 'quiz' })),
      ...grade.assignmentScores.map(a => ({ ...a, type: 'assignment' })),
    ];
  }

  formatScore(score: number): string {
    return Number.isInteger(score) ? score.toString() : score.toFixed(1);
  }

  getAssignmentStatusLabel(status: string): string {
    switch (status) {
      case 'GRADED': return 'Đã chấm';
      case 'SUBMITTED': return 'Đã nộp';
      case 'OVERDUE': return 'Quá hạn';
      default: return 'Chưa nộp';
    }
  }
}
