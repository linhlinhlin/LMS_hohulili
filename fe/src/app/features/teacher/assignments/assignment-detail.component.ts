import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AssignmentApi } from '../../../api/client/assignment.api';
import { AssignmentDetail, SubmissionSummary } from '../../../api/client/assignment.api';

@Component({
  selector: 'app-assignment-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-6xl mx-auto p-6 space-y-6" *ngIf="!loading(); else loadingTemplate">
      <!-- Assignment Header -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ assignment()?.title }}</h1>
            <div class="text-sm text-gray-500 space-y-1">
              <div>Khóa học: <span class="font-medium">{{ assignment()?.courseTitle }}</span></div>
              <div>Hạn nộp: <span class="font-medium">{{ formatDateTime(assignment()?.dueDate) }}</span></div>
              <div>Trạng thái: <span 
                [class]="getStatusClass(assignment()?.status)"
                class="px-2 py-1 rounded text-xs font-medium">
                {{ getStatusText(assignment()?.status) }}
              </span></div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <a [routerLink]="'/teacher/assignments/' + assignmentId() + '/edit'" 
               class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Chỉnh sửa
            </a>
            <a routerLink="/teacher/assignments" 
               class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Quay lại
            </a>
          </div>
        </div>
        
        <!-- Description -->
        <div class="mb-4" *ngIf="assignment()?.description">
          <h3 class="font-semibold text-gray-900 mb-2">Mô tả</h3>
          <p class="text-gray-700">{{ assignment()?.description }}</p>
        </div>

        <!-- Instructions -->
        <div class="mb-4" *ngIf="assignment()?.instructions">
          <h3 class="font-semibold text-gray-900 mb-2">Hướng dẫn</h3>
          <div class="text-gray-700 whitespace-pre-wrap">{{ assignment()?.instructions }}</div>
        </div>

        <!-- Attachments -->
        <div *ngIf="assignment()?.attachments && assignment()!.attachments!.length > 0">
          <h3 class="font-semibold text-gray-900 mb-2">Tài liệu đính kèm</h3>
          <div class="space-y-2">
            <div *ngFor="let attachment of assignment()?.attachments" 
                 class="flex items-center justify-between p-3 border rounded">
              <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="font-medium">{{ attachment.fileName }}</span>
              </div>
              <a [href]="attachment.fileUrl" 
                 target="_blank"
                 class="text-blue-600 hover:text-blue-800 text-sm">
                Tải về
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-6 text-center">
          <div class="text-2xl font-bold text-blue-600">{{ assignment()?.totalStudents || 0 }}</div>
          <div class="text-sm text-gray-500">Tổng học sinh</div>
        </div>
        <div class="bg-white rounded-lg shadow p-6 text-center">
          <div class="text-2xl font-bold text-green-600">{{ submissionStats().submitted }}</div>
          <div class="text-sm text-gray-500">Đã nộp</div>
        </div>
        <div class="bg-white rounded-lg shadow p-6 text-center">
          <div class="text-2xl font-bold text-yellow-600">{{ submissionStats().graded }}</div>
          <div class="text-sm text-gray-500">Đã chấm điểm</div>
        </div>
        <div class="bg-white rounded-lg shadow p-6 text-center">
          <div class="text-2xl font-bold text-red-600">{{ submissionStats().pending }}</div>
          <div class="text-sm text-gray-500">Chưa nộp</div>
        </div>
      </div>

      <!-- Submissions Table -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">Bài nộp của học sinh</h2>
            <div class="flex items-center space-x-2">
              <button class="px-3 py-1 text-sm border rounded" (click)="exportSubmissions()">
                Xuất Excel
              </button>
              <select class="text-sm border rounded px-2 py-1" [(ngModel)]="filterStatus" (ngModelChange)="loadSubmissions()">
                <option value="">Tất cả trạng thái</option>
                <option value="submitted">Đã nộp</option>
                <option value="graded">Đã chấm</option>
                <option value="pending">Chưa nộp</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học sinh</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nộp</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm số</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let submission of submissions(); trackBy: trackBySubmissionId">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <img class="h-10 w-10 rounded-full" 
                           [src]="submission.studentAvatar || '/assets/images/default-avatar.png'" 
                           [alt]="submission.studentName">
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ submission.studentName }}</div>
                      <div class="text-sm text-gray-500">{{ submission.studentEmail }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    [class]="getSubmissionStatusClass(submission.status)"
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                    {{ getSubmissionStatusText(submission.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ submission.submittedAt ? formatDateTime(submission.submittedAt) : '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span *ngIf="submission.grade !== null; else noGrade" class="font-medium">
                    {{ submission.grade }}/{{ assignment()?.maxPoints || 100 }}
                  </span>
                  <ng-template #noGrade>-</ng-template>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-2">
                    <a *ngIf="submission.status !== 'pending'" 
                       [routerLink]="'/teacher/assignments/' + assignmentId() + '/submissions/' + submission.id"
                       class="text-blue-600 hover:text-blue-900">
                      Xem bài
                    </a>
                    <button *ngIf="submission.status === 'submitted'" 
                            (click)="gradeSubmission(submission.id)"
                            class="text-green-600 hover:text-green-900">
                      Chấm điểm
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Empty state -->
          <div *ngIf="submissions().length === 0" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Không có bài nộp</h3>
            <p class="mt-1 text-sm text-gray-500">Chưa có học sinh nào nộp bài tập này.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading template -->
    <ng-template #loadingTemplate>
      <div class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600">Đang tải...</span>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentDetailComponent implements OnInit {
  // Input
  assignmentId = input.required<string>();
  
  // Injected services
  private assignmentApi = inject(AssignmentApi);
  
  // State
  loading = signal(true);
  assignment = signal<AssignmentDetail | null>(null);
  submissions = signal<SubmissionSummary[]>([]);
  filterStatus = signal('');
  
  // Computed
  submissionStats = computed(() => {
    const subs = this.submissions();
    const total = this.assignment()?.totalStudents || 0;
    
    const submitted = subs.filter(s => s.status !== 'pending').length;
    const graded = subs.filter(s => s.status === 'graded').length;
    const pending = total - submitted;
    
    return { submitted, graded, pending, total };
  });

  ngOnInit() {
    this.loadAssignmentDetail();
    this.loadSubmissions();
  }

  loadAssignmentDetail() {
    this.loading.set(true);
    this.assignmentApi.getAssignmentById(this.assignmentId()).subscribe({
      next: (response) => {
        if (response.data) {
          this.assignment.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading assignment:', error);
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  loadSubmissions() {
    const params = this.filterStatus() ? { status: this.filterStatus() } : undefined;
    this.assignmentApi.getSubmissionsByAssignment(
      this.assignmentId(),
      params
    ).subscribe({
      next: (response) => {
        if (response.data) {
          this.submissions.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading submissions:', error);
      }
    });
  }

  gradeSubmission(submissionId: string) {
    // Navigate to grading interface
    // this.router.navigate(['/teacher/assignments', this.assignmentId(), 'submissions', submissionId, 'grade']);
  }

  exportSubmissions() {
    this.assignmentApi.exportSubmissions(this.assignmentId()).subscribe({
      next: (blob) => {
        // Download the Excel file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `submissions_${this.assignment()?.title}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting submissions:', error);
      }
    });
  }

  // Helper methods
  trackBySubmissionId(_index: number, submission: SubmissionSummary): string {
    return submission.id;
  }

  formatDateTime(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status?: string): string {
    switch (status) {
      case 'published': return 'Đã xuất bản';
      case 'pending': return 'Đang chờ';
      case 'closed': return 'Đã đóng';
      default: return 'Không xác định';
    }
  }

  getSubmissionStatusClass(status: string): string {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'graded': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'late': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getSubmissionStatusText(status: string): string {
    switch (status) {
      case 'submitted': return 'Đã nộp';
      case 'graded': return 'Đã chấm';
      case 'pending': return 'Chưa nộp';
      case 'late': return 'Nộp muộn';
      default: return 'Không xác định';
    }
  }
}