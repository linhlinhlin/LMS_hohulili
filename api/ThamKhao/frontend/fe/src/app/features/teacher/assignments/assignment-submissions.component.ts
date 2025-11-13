import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LessonApi } from '../../../api/client/lesson.api';

interface AssignmentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  grade?: number;
  feedback?: string;
  status: 'PENDING' | 'GRADED' | 'LATE' | 'RETURNED';
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
}

@Component({
  selector: 'app-assignment-submissions',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-7xl mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Quản lý bài nộp</h1>
          <p class="text-gray-600 mt-1" *ngIf="assignment()">{{ assignment()!.title }}</p>
        </div>
        <a class="px-4 py-2 border rounded hover:bg-gray-50 transition-colors flex items-center gap-2" 
           [routerLink]="['/teacher/courses', courseId, 'sections', sectionId]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Quay lại bài học
        </a>
      </div>

      <!-- Assignment Info Card -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6" *ngIf="assignment() as a">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ a.submissionCount }}/{{ a.totalStudents }}</div>
            <div class="text-sm text-blue-500">Đã nộp</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ a.maxScore }}</div>
            <div class="text-sm text-green-500">Điểm tối đa</div>
          </div>
          <div class="text-center" *ngIf="a.dueDate">
            <div class="text-lg font-bold text-orange-600">{{ formatDate(a.dueDate) }}</div>
            <div class="text-sm text-orange-500">Hạn nộp</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold" [class]="getStatusClass(a.status)">{{ getStatusText(a.status) }}</div>
            <div class="text-sm text-gray-500">Trạng thái</div>
          </div>
        </div>
      </div>

      <!-- Submissions Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold text-gray-900">Danh sách bài nộp ({{ submissions().length }})</h2>
        </div>

        <div *ngIf="loading()" class="p-8 text-center text-gray-500">
          Đang tải danh sách bài nộp...
        </div>

        <div *ngIf="!loading() && submissions().length === 0" class="p-8 text-center text-gray-500">
          Chưa có bài nộp nào.
        </div>

        <div *ngIf="!loading() && submissions().length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Học viên
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian nộp
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Điểm số
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let submission of submissions()" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ submission.studentName }}</div>
                    <div class="text-sm text-gray-500">{{ submission.studentEmail }}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ formatDate(submission.submittedAt) }}</div>
                  <div class="text-xs text-gray-500" [class]="getSubmissionTimingClass(submission)">
                    {{ getSubmissionTiming(submission) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        [class]="getSubmissionStatusClass(submission.status)">
                    {{ getSubmissionStatusText(submission.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium" *ngIf="submission.grade !== undefined">
                    {{ submission.grade }}/{{ assignment()?.maxScore }}
                  </div>
                  <div class="text-sm text-gray-500" *ngIf="submission.grade === undefined">
                    Chưa chấm
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button class="text-blue-600 hover:text-blue-900" (click)="viewSubmission(submission)">
                    Xem
                  </button>
                  <button class="text-green-600 hover:text-green-900" (click)="gradeSubmission(submission)"
                          *ngIf="submission.status !== 'GRADED'">
                    Chấm điểm
                  </button>
                  <button class="text-purple-600 hover:text-purple-900" (click)="gradeSubmission(submission)"
                          *ngIf="submission.status === 'GRADED'">
                    Sửa điểm
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Grading Modal -->
      <div *ngIf="gradingSubmission()" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-6 border-b">
            <h3 class="text-lg font-semibold">Chấm điểm bài nộp</h3>
            <button (click)="closeGradingModal()" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-6" *ngIf="gradingSubmission() as submission">
            <!-- Student Info -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">Thông tin học viên</h4>
              <p><strong>Tên:</strong> {{ submission.studentName }}</p>
              <p><strong>Email:</strong> {{ submission.studentEmail }}</p>
              <p><strong>Thời gian nộp:</strong> {{ formatDate(submission.submittedAt) }}</p>
            </div>

            <!-- Submission Content -->
            <div>
              <h4 class="font-medium text-gray-900 mb-3">Nội dung bài nộp</h4>
              <div class="bg-gray-50 rounded-lg p-4 whitespace-pre-line">
                {{ submission.content || 'Không có nội dung văn bản.' }}
              </div>
              <div *ngIf="submission.fileUrl" class="mt-3">
                <a [href]="submission.fileUrl" target="_blank" 
                   class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Tải xuống file: {{ submission.fileName }}
                </a>
              </div>
            </div>

            <!-- Grading Form -->
            <form [formGroup]="gradingForm" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Điểm số (0 - {{ assignment()?.maxScore }})
                </label>
                <input type="number" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       formControlName="grade"
                       [min]="0"
                       [max]="assignment()?.maxScore ?? 100">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nhận xét
                </label>
                <textarea class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
                          formControlName="feedback"
                          placeholder="Nhập nhận xét cho học viên..."></textarea>
              </div>

              <div class="flex gap-3">
                <button type="button" (click)="submitGrade()" 
                        [disabled]="gradingForm.invalid"
                        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                  Lưu điểm
                </button>
                <button type="button" (click)="closeGradingModal()"
                        class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentSubmissionsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private lessonApi = inject(LessonApi);
  private fb = inject(FormBuilder);

  // Route params
  courseId = '';
  sectionId = '';
  assignmentId = '';

  // State
  loading = signal(true);
  assignment = signal<AssignmentDetail | null>(null);
  submissions = signal<AssignmentSubmission[]>([]);
  gradingSubmission = signal<AssignmentSubmission | null>(null);

  // Forms
  gradingForm = this.fb.group({
    grade: [0, [Validators.required, Validators.min(0)]],
    feedback: ['']
  });

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.sectionId = this.route.snapshot.paramMap.get('sectionId') || '';
    this.assignmentId = this.route.snapshot.paramMap.get('assignmentId') || '';

    this.loadAssignmentData();
    this.loadSubmissions();
  }

  loadAssignmentData(): void {
    // TODO: Call API to load assignment details
    // this.lessonApi.getAssignmentDetails(this.assignmentId).subscribe({
    //   next: (res) => this.assignment.set(res.data),
    //   error: (err) => console.error('Failed to load assignment:', err)
    // });

    // Mock data for now
    setTimeout(() => {
      this.assignment.set({
        id: this.assignmentId,
        title: 'Bài tập 1: Phân tích hệ thống LMS',
        description: 'Thực hiện phân tích và thiết kế hệ thống LMS theo yêu cầu đã cho.',
        instructions: 'Sinh viên cần nộp báo cáo dạng PDF và source code dạng ZIP.',
        dueDate: '2025-10-25T23:59:59',
        maxScore: 100,
        status: 'PUBLISHED',
        submissionCount: 8,
        totalStudents: 12
      });
    }, 500);
  }

  loadSubmissions(): void {
    // TODO: Call API to load submissions
    // this.lessonApi.getAssignmentSubmissions(this.assignmentId).subscribe({
    //   next: (res) => this.submissions.set(res.data),
    //   error: (err) => console.error('Failed to load submissions:', err),
    //   complete: () => this.loading.set(false)
    // });

    // Mock data for now
    setTimeout(() => {
      this.submissions.set([
        {
          id: '1',
          studentId: 'student1',
          studentName: 'Nguyễn Văn A',
          studentEmail: 'nguyenvana@email.com',
          submittedAt: '2025-10-20T14:30:00',
          content: 'Tôi đã hoàn thành bài phân tích hệ thống LMS. Báo cáo bao gồm các phần: phân tích yêu cầu, thiết kế kiến trúc, và thiết kế cơ sở dữ liệu.',
          fileUrl: '/uploads/assignments/baocao_lms.pdf',
          fileName: 'baocao_lms.pdf',
          grade: 85,
          feedback: 'Bài làm tốt, phần phân tích rõ ràng. Cần cải thiện phần thiết kế UI.',
          status: 'GRADED'
        },
        {
          id: '2',
          studentId: 'student2',
          studentName: 'Trần Thị B',
          studentEmail: 'tranthib@email.com',
          submittedAt: '2025-10-22T16:45:00',
          content: 'Báo cáo phân tích hệ thống LMS đã hoàn thành.',
          fileUrl: '/uploads/assignments/assignment_lms.docx',
          fileName: 'assignment_lms.docx',
          status: 'PENDING'
        }
      ]);
      this.loading.set(false);
    }, 800);
  }

  viewSubmission(submission: AssignmentSubmission): void {
    // TODO: Open detailed submission view
    console.log('Viewing submission:', submission);
  }

  gradeSubmission(submission: AssignmentSubmission): void {
    this.gradingSubmission.set(submission);
    this.gradingForm.patchValue({
      grade: submission.grade || 0,
      feedback: submission.feedback || ''
    });

    // Update max validator for grade based on assignment max score
    const maxScore = this.assignment()?.maxScore || 100;
    this.gradingForm.get('grade')?.setValidators([
      Validators.required,
      Validators.min(0),
      Validators.max(maxScore)
    ]);
  }

  submitGrade(): void {
    if (this.gradingForm.invalid) return;

    const submission = this.gradingSubmission();
    if (!submission) return;

    const grade = this.gradingForm.value.grade!;
    const feedback = this.gradingForm.value.feedback || '';

    // TODO: Call API to submit grade
    // this.lessonApi.gradeSubmission(submission.id, { grade, feedback }).subscribe({
    //   next: () => {
    //     // Update local state
    //     this.updateSubmissionGrade(submission.id, grade, feedback);
    //     this.closeGradingModal();
    //   },
    //   error: (err) => console.error('Failed to submit grade:', err)
    // });

    // Mock update for now
    this.updateSubmissionGrade(submission.id, grade, feedback);
    this.closeGradingModal();
  }

  private updateSubmissionGrade(submissionId: string, grade: number, feedback: string): void {
    this.submissions.update(list => 
      list.map(s => 
        s.id === submissionId 
          ? { ...s, grade, feedback, status: 'GRADED' as const }
          : s
      )
    );
  }

  closeGradingModal(): void {
    this.gradingSubmission.set(null);
    this.gradingForm.reset();
  }

  // Helper methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'text-green-600';
      case 'DRAFT': return 'text-yellow-600';
      case 'CLOSED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PUBLISHED': return 'Đang mở';
      case 'DRAFT': return 'Nháp';
      case 'CLOSED': return 'Đã đóng';
      default: return 'Không xác định';
    }
  }

  getSubmissionStatusClass(status: string): string {
    switch (status) {
      case 'GRADED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'LATE': return 'bg-red-100 text-red-800';
      case 'RETURNED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getSubmissionStatusText(status: string): string {
    switch (status) {
      case 'GRADED': return 'Đã chấm';
      case 'PENDING': return 'Chờ chấm';
      case 'LATE': return 'Nộp muộn';
      case 'RETURNED': return 'Đã trả';
      default: return 'Không xác định';
    }
  }

  getSubmissionTiming(submission: AssignmentSubmission): string {
    const dueDate = this.assignment()?.dueDate;
    if (!dueDate) return '';

    const submittedAt = new Date(submission.submittedAt);
    const due = new Date(dueDate);

    if (submittedAt > due) {
      const diff = submittedAt.getTime() - due.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return `Muộn ${hours} giờ`;
    } else {
      const diff = due.getTime() - submittedAt.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return `Sớm ${hours} giờ`;
    }
  }

  getSubmissionTimingClass(submission: AssignmentSubmission): string {
    const dueDate = this.assignment()?.dueDate;
    if (!dueDate) return '';

    const submittedAt = new Date(submission.submittedAt);
    const due = new Date(dueDate);

    return submittedAt > due ? 'text-red-500' : 'text-green-500';
  }
}