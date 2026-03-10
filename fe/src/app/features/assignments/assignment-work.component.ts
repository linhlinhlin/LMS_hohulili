import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AssignmentApi, AssignmentDetail, SubmissionDetail } from '../../api/client/assignment.api';
import { ApiClient } from '../../api/client/api-client';
import { STUDENT_ENDPOINTS } from '../../api/endpoints/student.endpoints';
import { FileApi } from '../../api/client/file.api';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-assignment-work',
  imports: [RouterModule, FormsModule],
  templateUrl: './assignment-work.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentWorkComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private assignmentApi = inject(AssignmentApi);
  private apiClient = inject(ApiClient);
  private fileApi = inject(FileApi);
  private toast = inject(ToastService);

  // Component state
  assignment = signal<AssignmentDetail | null>(null);
  mySubmission = signal<SubmissionDetail | null>(null);
  submissionContent = signal<string>('');
  uploadedFiles = signal<File[]>([]);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const assignmentId = this.route.snapshot.paramMap.get('id');
    if (assignmentId) {
      this.loadAssignment(assignmentId);
    } else {
      this.error.set('Không tìm thấy ID bài tập');
      this.isLoading.set(false);
    }
  }

  private loadAssignment(assignmentId: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Load assignment details via student-scoped endpoint (enrollment check)
    this.apiClient.getWithResponse<any>(STUDENT_ENDPOINTS.ASSIGNMENT_DETAIL(assignmentId)).subscribe({
      next: (response) => {
        if (response.data) {
          this.assignment.set(response.data as AssignmentDetail);
          // Load my submission after assignment is loaded
          this.loadMySubmission(assignmentId);
        } else {
          this.error.set('Không tìm thấy bài tập');
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.error.set('Không thể tải bài tập. Vui lòng thử lại.');
        this.isLoading.set(false);
      }
    });
  }

  private loadMySubmission(assignmentId: string): void {
    this.assignmentApi.getStudentSubmission(assignmentId).subscribe({
      next: (response) => {
        if (response.data) {
          this.mySubmission.set(response.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        // 404 means no submission yet - that's OK
        if (err.status !== 404) {
        }
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/student/assignments']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.uploadedFiles.update(current => [...current, ...files]);
    }
  }

  removeFile(file: File): void {
    this.uploadedFiles.update(current => current.filter(f => f !== file));
  }

  getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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

  getGradeScore(grade: any): number {
    // First check direct score on submission
    const submission = this.mySubmission();
    if (submission?.score !== undefined && submission?.score !== null) {
      return submission.score;
    }
    // Then check grade object
    if (!grade) return 0;
    if (typeof grade === 'number') return grade;
    if (typeof grade === 'object' && grade.score !== undefined) return grade.score;
    return 0;
  }

  getGradeFeedback(grade: any): string {
    // First check direct feedback on submission
    const submission = this.mySubmission();
    if (submission?.feedback) {
      return submission.feedback;
    }
    // Then check grade object
    if (!grade) return '';
    if (typeof grade === 'object' && grade.feedback) return grade.feedback;
    return '';
  }

  hasGrade(): boolean {
    const submission = this.mySubmission();
    if (!submission) return false;
    // Check direct score or grade object
    return (submission.score !== undefined && submission.score !== null) ||
      (submission.grade !== undefined && submission.grade !== null);
  }

  canSubmit(): boolean {
    const hasContent = this.submissionContent().trim().length > 0;
    return hasContent;
  }

  canResubmit(): boolean {
    // Allow resubmit if not graded yet
    const submission = this.mySubmission();
    if (!submission) return true;
    return !this.hasGrade();
  }

  async submitAssignment(): Promise<void> {
    if (!this.canSubmit()) return;

    const assignmentId = this.assignment()?.id;
    if (!assignmentId) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Upload files first if any
      const fileUrls: string[] = [];
      let firstFileUrl = '';
      let firstFileName = '';
      for (const file of this.uploadedFiles()) {
        try {
          const uploaded = await firstValueFrom(this.fileApi.uploadFile(file, 'assignment'));
          fileUrls.push(uploaded.url);
          if (!firstFileUrl) {
            firstFileUrl = uploaded.url;
            firstFileName = uploaded.originalName || file.name;
          }
        } catch {
          // Continue with other files
        }
      }

      // BE expects { content, fileUrl, fileName } - include file info
      const payload: any = {
        content: this.submissionContent(),
        fileUrl: firstFileUrl || null,
        fileName: firstFileName || null
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
