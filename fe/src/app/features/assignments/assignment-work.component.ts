import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AssignmentApi,
  AssignmentDetail,
  SubmissionDetail,
  StudentAssignmentResponse,
} from '../../api/client/assignment.api';
import { ApiClient } from '../../api/client/api-client';
import { FileApi } from '../../api/client/file.api';
import { STUDENT_ENDPOINTS } from '../../api/endpoints/student.endpoints';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

type StudentAssignmentDetail = AssignmentDetail & Partial<StudentAssignmentResponse>;

@Component({
  selector: 'app-assignment-work',
  imports: [RouterModule, FormsModule],
  templateUrl: './assignment-work.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignmentWorkComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private assignmentApi = inject(AssignmentApi);
  private apiClient = inject(ApiClient);
  private fileApi = inject(FileApi);
  private toast = inject(ToastService);

  assignment = signal<StudentAssignmentDetail | null>(null);
  mySubmission = signal<SubmissionDetail | null>(null);
  submissionContent = signal('');
  uploadedFiles = signal<File[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const assignmentId = this.route.snapshot.paramMap.get('id');
    if (!assignmentId) {
      this.error.set('Không tìm thấy ID bài tập');
      this.isLoading.set(false);
      return;
    }

    this.loadAssignment(assignmentId);
  }

  private loadAssignment(assignmentId: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.apiClient.getWithResponse<StudentAssignmentDetail>(STUDENT_ENDPOINTS.ASSIGNMENT_DETAIL(assignmentId)).subscribe({
      next: (response) => {
        if (!response.data) {
          this.error.set('Không tìm thấy bài tập');
          this.isLoading.set(false);
          return;
        }

        this.assignment.set(this.normalizeAssignmentDetail(response.data));
        this.loadMySubmission(assignmentId);
      },
      error: () => {
        this.error.set('Không thể tải bài tập. Vui lòng thử lại.');
        this.isLoading.set(false);
      },
    });
  }

  private loadMySubmission(assignmentId: string): void {
    this.assignmentApi.getStudentSubmission(assignmentId).subscribe({
      next: (response) => {
        const submission = response.data ?? null;
        this.mySubmission.set(submission);

        if (submission?.content && !this.submissionContent().trim()) {
          this.submissionContent.set(submission.content);
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private normalizeAssignmentDetail(detail: StudentAssignmentDetail): StudentAssignmentDetail {
    const courseTitle = detail.courseTitle || detail.courseName || '';
    return {
      ...detail,
      courseTitle,
      courseName: detail.courseName || courseTitle,
    };
  }

  goBack(): void {
    this.router.navigate(['/student/tasks']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      return;
    }

    const files = Array.from(input.files);
    this.uploadedFiles.update((current) => [...current, ...files]);
  }

  removeFile(file: File): void {
    this.uploadedFiles.update((current) => current.filter((currentFile) => currentFile !== file));
  }

  getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'Không có hạn';
    return new Date(date).toLocaleDateString('vi-VN');
  }

  formatDateTime(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleString('vi-VN');
  }

  isOverdue(): boolean {
    const assignment = this.assignment();
    if (!assignment?.dueDate) return false;
    return new Date() > new Date(assignment.dueDate);
  }

  getStatusClass(): string {
    if (this.hasGrade()) return 'bg-green-100 text-green-800';
    if (this.mySubmission()) return 'bg-[#0056D2]/10 text-[#004BB5]';
    if (this.isOverdue()) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  }

  getStatusText(): string {
    if (this.hasGrade()) return 'Đã chấm điểm';
    if (this.mySubmission()) return 'Đã nộp';
    if (this.isOverdue()) return 'Quá hạn';
    return 'Chưa nộp';
  }

  getGradeScore(grade: unknown): number {
    const submission = this.mySubmission();
    if (submission?.score !== undefined && submission.score !== null) {
      return submission.score;
    }

    if (typeof grade === 'number') {
      return grade;
    }

    if (grade && typeof grade === 'object' && 'score' in grade) {
      const score = (grade as { score?: unknown }).score;
      return typeof score === 'number' ? score : 0;
    }

    return 0;
  }

  getGradeFeedback(grade: unknown): string {
    const submission = this.mySubmission();
    if (submission?.feedback) {
      return submission.feedback;
    }

    if (grade && typeof grade === 'object' && 'feedback' in grade) {
      const feedback = (grade as { feedback?: unknown }).feedback;
      return typeof feedback === 'string' ? feedback : '';
    }

    return '';
  }

  hasGrade(): boolean {
    const submission = this.mySubmission();
    if (!submission) {
      return false;
    }

    return (
      (submission.score !== undefined && submission.score !== null) ||
      (submission.grade !== undefined && submission.grade !== null)
    );
  }

  canSubmit(): boolean {
    return this.submissionContent().trim().length > 0 || this.uploadedFiles().length > 0;
  }

  canResubmit(): boolean {
    const submission = this.mySubmission();
    if (!submission) {
      return true;
    }

    return !this.hasGrade();
  }

  async submitAssignment(): Promise<void> {
    if (!this.canSubmit()) return;

    const assignmentId = this.assignment()?.id;
    if (!assignmentId) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      let firstFileUrl = '';
      let firstFileName = '';

      for (const file of this.uploadedFiles()) {
        try {
          const uploaded = await firstValueFrom(this.fileApi.uploadFile(file, 'assignment'));
          if (!firstFileUrl) {
            firstFileUrl = uploaded.url;
            firstFileName = uploaded.originalName || file.name;
          }
        } catch {
          // Keep trying remaining files.
        }
      }

      const payload = {
        content: this.submissionContent().trim() || undefined,
        fileUrl: firstFileUrl || undefined,
        fileName: firstFileName || undefined,
      };

      const response = await firstValueFrom(
        this.assignmentApi.submitStudentAssignment(assignmentId.toString(), payload)
      );

      if (response.data) {
        const submissionResponse = await firstValueFrom(
          this.assignmentApi.getStudentSubmission(assignmentId.toString())
        );
        this.mySubmission.set(submissionResponse.data ?? null);
        this.submissionContent.set('');
        this.uploadedFiles.set([]);
        this.toast.success('Nộp bài thành công!');
      }
    } catch {
      this.error.set('Không thể nộp bài. Vui lòng thử lại.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
