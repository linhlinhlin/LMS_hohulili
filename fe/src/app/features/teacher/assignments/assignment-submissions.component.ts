import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AssignmentApi, SubmissionSummary, SubmissionGrade } from '../../../api/client/assignment.api';
import { isLateSubmission, formatLateDuration, LateSubmissionResult } from './utils/submission-utils';
import { validateGrade } from './utils/assignment-validators';
import { ToastService } from '../../../core/services/toast.service';

/** Helper to extract numeric score from grade */
function getGradeScore(grade: number | SubmissionGrade | undefined): number | undefined {
  if (grade === undefined || grade === null) return undefined;
  if (typeof grade === 'number') return grade;
  return grade.score;
}

interface AssignmentSubmission extends SubmissionSummary {
  content?: string;
  fileUrl?: string;
  fileName?: string;
  attachments?: AttachmentInfo[];
}

interface AttachmentInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  metadata?: {
    scale?: string;
    coordinates?: { latitude: number; longitude: number };
    captureDate?: string;
  };
}

interface AssignmentDetail {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate?: string;
  maxScore: number;
  status: string;
  submissionCount: number;
  totalStudents: number;
  courseTitle?: string;
}

/**
 * Assignment Submissions Component
 * 
 * Manages student submissions for an assignment with grading capabilities.
 * Features: late submission detection, inline preview, grading modal.
 * 
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */
@Component({
  selector: 'app-assignment-submissions',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './assignment-submissions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentSubmissionsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private assignmentApi = inject(AssignmentApi);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  // Route params
  assignmentId = '';

  // State signals
  loading = signal(true);
  savingGrade = signal(false);
  assignment = signal<AssignmentDetail | null>(null);
  submissions = signal<AssignmentSubmission[]>([]);
  gradingSubmission = signal<AssignmentSubmission | null>(null);
  previewingFile = signal<AttachmentInfo | null>(null);
  filterStatus = signal<string>('');

  // Computed
  filteredSubmissions = computed(() => {
    const status = this.filterStatus();
    if (!status) return this.submissions();
    return this.submissions().filter((s: AssignmentSubmission) => s.status.toUpperCase() === status);
  });

  gradedCount = computed(() => this.submissions().filter((s: AssignmentSubmission) => s.status === 'graded').length);
  pendingCount = computed(() => this.submissions().filter((s: AssignmentSubmission) => s.status === 'pending' || s.status === 'submitted').length);
  lateCount = computed(() => this.submissions().filter((s: AssignmentSubmission) => s.status === 'late').length);

  // Form
  gradingForm = this.fb.group({
    grade: [0, [Validators.required, Validators.min(0)]],
    feedback: ['']
  });

  ngOnInit(): void {
    this.assignmentId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('assignmentId') || '';
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    // Load assignment details
    this.assignmentApi.getAssignmentById(this.assignmentId).subscribe({
      next: (res) => {
        const detail = res.data;
        if (detail) {
          this.assignment.set({
            id: detail.id,
            title: detail.title,
            description: detail.description || '',
            instructions: detail.instructions || '',
            dueDate: detail.dueDate,
            maxScore: detail.maxScore || 100,
            status: detail.status,
            submissionCount: detail.submissionsCount || 0,
            totalStudents: detail.totalStudents || 0,
            courseTitle: detail.courseTitle
          });
        }
        // Load submissions
        this.assignmentApi.getSubmissionsByAssignment(this.assignmentId).subscribe({
          next: (subRes) => {
            const subs = subRes.data || [];
            this.submissions.set(subs as AssignmentSubmission[]);
            this.loading.set(false);
          },
          error: () => {
            this.toast.error('Không thể tải danh sách bài nộp.');
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.toast.error('Không thể tải thông tin bài tập.');
        this.loading.set(false);
      }
    });
  }

  onFilterChange(event: Event): void {
    this.filterStatus.set((event.target as HTMLSelectElement).value);
  }

  getSubmissionLateInfo(submission: AssignmentSubmission): LateSubmissionResult | null {
    if (!submission.submittedAt || !this.assignment()?.dueDate) return null;
    return isLateSubmission(submission.submittedAt, this.assignment()?.dueDate);
  }

  formatLateDuration(result: LateSubmissionResult): string {
    return formatLateDuration(result);
  }

  viewSubmission(submission: AssignmentSubmission): void {
    this.gradingSubmission.set(submission);
  }

  gradeSubmission(submission: AssignmentSubmission): void {
    this.gradingSubmission.set(submission);
    const gradeValue = getGradeScore(submission.grade) || 0;
    this.gradingForm.patchValue({ grade: gradeValue, feedback: submission.feedback || '' });
    const maxScore = this.assignment()?.maxScore || 100;
    this.gradingForm.get('grade')?.setValidators([Validators.required, Validators.min(0), Validators.max(maxScore)]);
  }

  submitGrade(): void {
    if (this.gradingForm.invalid) return;
    const submission = this.gradingSubmission();
    if (!submission) return;

    const grade = this.gradingForm.value.grade!;
    const feedback = this.gradingForm.value.feedback || '';
    const validation = validateGrade(grade, this.assignment()?.maxScore || 100);
    if (!validation.isValid) return;

    this.savingGrade.set(true);
    this.assignmentApi.gradeSubmission(submission.id, {
      score: grade,
      maxScore: this.assignment()?.maxScore || 100,
      feedback
    }).subscribe({
      next: () => {
        this.submissions.update((list: AssignmentSubmission[]) => list.map((s: AssignmentSubmission) =>
          s.id === submission.id ? { ...s, grade, feedback, status: 'graded' as const } : s
        ));
        this.toast.success('Chấm điểm thành công.');
        this.savingGrade.set(false);
        this.closeGradingModal();
      },
      error: () => {
        this.toast.error('Chấm điểm thất bại. Vui lòng thử lại.');
        this.savingGrade.set(false);
      }
    });
  }

  closeGradingModal(): void {
    this.gradingSubmission.set(null);
    this.gradingForm.reset();
  }

  previewFile(file: AttachmentInfo): void {
    this.previewingFile.set(file);
  }

  closePreview(): void {
    this.previewingFile.set(null);
  }

  exportSubmissions(): void {
    this.assignmentApi.exportSubmissions(this.assignmentId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `submissions_${this.assignmentId}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => { this.toast.error('Không thể xuất danh sách bài nộp. Vui lòng thử lại.'); }
    });
  }

  // Helpers
  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN');
  }

  getInitials(name: string): string {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getGradeScore(grade: number | SubmissionGrade | undefined): number | undefined {
    return getGradeScore(grade);
  }

  getGradePercentage(grade: number): number {
    const max = this.assignment()?.maxScore || 100;
    return Math.round((grade / max) * 100);
  }

  isImageFile(fileName: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  }

  isPdfFile(fileName: string): boolean {
    return /\.pdf$/i.test(fileName);
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PUBLISHED': 'text-green-600', 'DRAFT': 'text-yellow-600', 'CLOSED': 'text-gray-600'
    };
    return classes[status] || 'text-gray-600';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'PUBLISHED': 'Đang mở', 'DRAFT': 'Nháp', 'CLOSED': 'Đã đóng'
    };
    return texts[status] || status;
  }

  getSubmissionStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'graded': 'bg-green-100 text-green-800', 'pending': 'bg-yellow-100 text-yellow-800',
      'submitted': 'bg-[#0056D2]/10 text-[#004BB5]', 'late': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getSubmissionStatusText(status: string): string {
    const texts: Record<string, string> = {
      'graded': 'Đã chấm', 'pending': 'Chờ chấm', 'submitted': 'Đã nộp', 'late': 'Nộp muộn'
    };
    return texts[status] || status;
  }
}

