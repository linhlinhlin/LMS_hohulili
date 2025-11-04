import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LessonApi } from '../../../api/client/lesson.api';

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate?: string;
  maxScore: number;
  status: string;
  allowedFileTypes: string[];
  maxFileSize: number; // in MB
  allowLateSubmission: boolean;
}

interface StudentSubmission {
  id?: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  submittedAt?: string;
  grade?: number;
  feedback?: string;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' | 'RETURNED';
}

@Component({
  selector: 'app-student-assignment-view',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ assignment()?.title }}</h1>
          <p class="text-gray-600 mt-1">Bài tập</p>
        </div>
        <a class="px-4 py-2 border rounded hover:bg-gray-50 transition-colors flex items-center gap-2" 
           [routerLink]="['/student/courses', courseId, 'sections', sectionId]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Quay lại bài học
        </a>
      </div>

      <!-- Assignment Info Card -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6" *ngIf="assignment() as a">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ a.maxScore }}</div>
            <div class="text-sm text-blue-500">Điểm tối đa</div>
          </div>
          <div class="text-center p-4 bg-orange-50 rounded-lg" *ngIf="a.dueDate">
            <div class="text-lg font-bold text-orange-600">{{ formatDate(a.dueDate) }}</div>
            <div class="text-sm text-orange-500">Hạn nộp</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-lg font-bold" [class]="getStatusClass()">{{ getStatusText() }}</div>
            <div class="text-sm text-gray-500">Trạng thái</div>
          </div>
        </div>

        <!-- Assignment Description -->
        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Mô tả bài tập</h3>
            <div class="text-gray-700 whitespace-pre-line">{{ a.description }}</div>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Hướng dẫn thực hiện</h3>
            <div class="text-gray-700 whitespace-pre-line">{{ a.instructions }}</div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-2">Yêu cầu nộp bài</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• File được phép: {{ a.allowedFileTypes.join(', ') }}</li>
              <li>• Kích thước tối đa: {{ a.maxFileSize }}MB</li>
              <li *ngIf="a.allowLateSubmission">• Cho phép nộp muộn với điểm trừ</li>
              <li *ngIf="!a.allowLateSubmission">• Không cho phép nộp muộn</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Current Submission Status -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6" *ngIf="submission() as sub">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Trạng thái bài nộp</h2>

        <!-- Not Submitted -->
        <div *ngIf="sub.status === 'NOT_SUBMITTED'" class="text-center py-8">
          <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <p class="text-gray-600">Bạn chưa nộp bài tập này</p>
          <button (click)="startSubmission()" 
                  class="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Bắt đầu làm bài
          </button>
        </div>

        <!-- Submitted -->
        <div *ngIf="sub.status !== 'NOT_SUBMITTED'">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-medium text-gray-900">Bài đã nộp</h3>
              <p class="text-sm text-gray-500">Nộp lúc: {{ formatDate(sub.submittedAt!) }}</p>
            </div>
            <span class="inline-flex px-3 py-1 text-sm font-medium rounded-full"
                  [class]="getSubmissionStatusClass(sub.status)">
              {{ getSubmissionStatusText(sub.status) }}
            </span>
          </div>

          <!-- Submission Content -->
          <div class="space-y-4">
            <div>
              <h4 class="font-medium text-gray-900 mb-2">Nội dung bài làm</h4>
              <div class="bg-gray-50 rounded-lg p-4 whitespace-pre-line">
                {{ sub.content || 'Không có nội dung văn bản.' }}
              </div>
            </div>

            <!-- Attached File -->
            <div *ngIf="sub.fileUrl">
              <h4 class="font-medium text-gray-900 mb-2">File đính kèm</h4>
              <a [href]="sub.fileUrl" target="_blank" 
                 class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                {{ sub.fileName }}
              </a>
            </div>

            <!-- Grade & Feedback -->
            <div *ngIf="sub.status === 'GRADED' && sub.grade !== undefined" class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-green-900">Kết quả chấm điểm</h4>
                <span class="text-2xl font-bold text-green-600">{{ sub.grade }}/{{ assignment()?.maxScore }}</span>
              </div>
              <div *ngIf="sub.feedback" class="text-green-800">
                <strong>Nhận xét:</strong> {{ sub.feedback }}
              </div>
            </div>

            <!-- Edit Button (if not graded) -->
            <div *ngIf="sub.status === 'SUBMITTED'" class="flex gap-3">
              <button (click)="editSubmission()" 
                      class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                Chỉnh sửa bài nộp
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Submission Form Modal -->
      <div *ngIf="showSubmissionForm()" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between p-6 border-b">
            <h3 class="text-lg font-semibold">{{ isEditing() ? 'Chỉnh sửa bài nộp' : 'Nộp bài tập' }}</h3>
            <button (click)="closeSubmissionForm()" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form [formGroup]="submissionForm" (ngSubmit)="submitAssignment()" class="p-6 space-y-6">
            <!-- Content -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nội dung bài làm
              </label>
              <textarea class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px]"
                        formControlName="content"
                        placeholder="Nhập nội dung bài làm của bạn..."></textarea>
            </div>

            <!-- File Upload -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                File đính kèm (tùy chọn)
              </label>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input type="file" #fileInput (change)="onFileSelected($event)" class="hidden" 
                       [accept]="getAllowedFileTypes()">
                <div *ngIf="!selectedFile()">
                  <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <button type="button" (click)="fileInput.click()" 
                          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Chọn file
                  </button>
                  <p class="text-sm text-gray-500 mt-2">
                    Hoặc kéo thả file vào đây ({{ getAllowedFileTypes() }}, tối đa {{ assignment()?.maxFileSize }}MB)
                  </p>
                </div>
                <div *ngIf="selectedFile()" class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">{{ selectedFile()?.name }}</span>
                  <button type="button" (click)="removeFile()" class="text-red-600 hover:text-red-800">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div *ngIf="fileError()" class="text-red-600 text-sm mt-1">{{ fileError() }}</div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
              <button type="submit" 
                      [disabled]="submissionForm.invalid || uploading()"
                      class="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                <span *ngIf="!uploading()">{{ isEditing() ? 'Cập nhật' : 'Nộp bài' }}</span>
                <span *ngIf="uploading()">Đang xử lý...</span>
              </button>
              <button type="button" (click)="closeSubmissionForm()"
                      class="px-6 py-3 border border-gray-300 rounded hover:bg-gray-50">
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAssignmentViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private lessonApi = inject(LessonApi);
  private fb = inject(FormBuilder);

  // Route params
  courseId = '';
  sectionId = '';
  assignmentId = '';

  // State
  loading = signal(true);
  assignment = signal<AssignmentData | null>(null);
  submission = signal<StudentSubmission>({ status: 'NOT_SUBMITTED', content: '' });
  showSubmissionForm = signal(false);
  isEditing = signal(false);
  uploading = signal(false);
  selectedFile = signal<File | null>(null);
  fileError = signal<string>('');

  // Form
  submissionForm = this.fb.group({
    content: ['', [Validators.required, Validators.minLength(10)]]
  });

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.sectionId = this.route.snapshot.paramMap.get('sectionId') || '';
    this.assignmentId = this.route.snapshot.paramMap.get('assignmentId') || '';

    this.loadAssignmentData();
    this.loadStudentSubmission();
  }

  loadAssignmentData(): void {
    // TODO: Call API to load assignment details
    // this.lessonApi.getAssignmentForStudent(this.assignmentId).subscribe({
    //   next: (res) => this.assignment.set(res.data),
    //   error: (err) => console.error('Failed to load assignment:', err)
    // });

    // Mock data for now
    setTimeout(() => {
      this.assignment.set({
        id: this.assignmentId,
        title: 'Bài tập 1: Phân tích hệ thống LMS',
        description: 'Thực hiện phân tích và thiết kế hệ thống LMS theo yêu cầu đã cho.\n\nBài tập này yêu cầu sinh viên:\n- Phân tích yêu cầu hệ thống\n- Thiết kế kiến trúc tổng thể\n- Thiết kế cơ sở dữ liệu\n- Lập kế hoạch triển khai',
        instructions: 'Sinh viên cần nộp:\n1. Báo cáo phân tích (PDF)\n2. Sơ đồ thiết kế (PNG/JPG)\n3. Script cơ sở dữ liệu (SQL)\n\nBáo cáo cần có tối thiểu 10 trang, bao gồm đầy đủ các phần được yêu cầu.',
        dueDate: '2025-10-25T23:59:59',
        maxScore: 100,
        status: 'PUBLISHED',
        allowedFileTypes: ['.pdf', '.doc', '.docx', '.zip', '.rar'],
        maxFileSize: 50,
        allowLateSubmission: true
      });
    }, 500);
  }

  loadStudentSubmission(): void {
    // TODO: Call API to load student submission
    // this.lessonApi.getStudentSubmission(this.assignmentId).subscribe({
    //   next: (res) => this.submission.set(res.data || { status: 'NOT_SUBMITTED', content: '' }),
    //   error: (err) => console.error('Failed to load submission:', err),
    //   complete: () => this.loading.set(false)
    // });

    // Mock data for now
    setTimeout(() => {
      this.submission.set({
        id: '1',
        content: 'Tôi đã hoàn thành phân tích yêu cầu hệ thống LMS theo đề bài. Báo cáo bao gồm:\n\n1. Phân tích yêu cầu chức năng\n2. Phân tích yêu cầu phi chức năng\n3. Thiết kế kiến trúc hệ thống\n4. Thiết kế cơ sở dữ liệu\n5. Kế hoạch triển khai',
        fileUrl: '/uploads/submissions/baocao_lms_student.pdf',
        fileName: 'baocao_lms_analysis.pdf',
        submittedAt: '2025-10-20T14:30:00',
        grade: 85,
        feedback: 'Bài làm tốt, phần phân tích rõ ràng và logic. Thiết kế cơ sở dữ liệu hợp lý. Cần cải thiện thêm phần thiết kế giao diện người dùng.',
        status: 'GRADED'
      });
      this.loading.set(false);
    }, 800);
  }

  startSubmission(): void {
    this.isEditing.set(false);
    this.showSubmissionForm.set(true);
    this.submissionForm.reset();
    this.selectedFile.set(null);
    this.fileError.set('');
  }

  editSubmission(): void {
    const current = this.submission();
    this.isEditing.set(true);
    this.showSubmissionForm.set(true);
    this.submissionForm.patchValue({
      content: current.content
    });
    this.selectedFile.set(null);
    this.fileError.set('');
  }

  closeSubmissionForm(): void {
    this.showSubmissionForm.set(false);
    this.isEditing.set(false);
    this.submissionForm.reset();
    this.selectedFile.set(null);
    this.fileError.set('');
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = this.assignment()?.allowedFileTypes || [];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      this.fileError.set(`File không đúng định dạng. Chỉ chấp nhận: ${allowedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    const maxSize = (this.assignment()?.maxFileSize || 10) * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSize) {
      this.fileError.set(`File quá lớn. Kích thước tối đa: ${this.assignment()?.maxFileSize}MB`);
      return;
    }

    this.selectedFile.set(file);
    this.fileError.set('');
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.fileError.set('');
  }

  submitAssignment(): void {
    if (this.submissionForm.invalid) return;

    this.uploading.set(true);
    const formData = new FormData();
    formData.append('content', this.submissionForm.value.content!);
    formData.append('assignmentId', this.assignmentId);
    
    const file = this.selectedFile();
    if (file) {
      formData.append('file', file);
    }

    // TODO: Call API to submit assignment
    // const apiCall = this.isEditing() 
    //   ? this.lessonApi.updateSubmission(this.submission().id!, formData)
    //   : this.lessonApi.submitAssignment(formData);

    // apiCall.subscribe({
    //   next: (res) => {
    //     this.submission.set(res.data);
    //     this.closeSubmissionForm();
    //   },
    //   error: (err) => {
    //     console.error('Failed to submit assignment:', err);
    //     this.uploading.set(false);
    //   },
    //   complete: () => this.uploading.set(false)
    // });

    // Mock submission for now
    setTimeout(() => {
      const newSubmission: StudentSubmission = {
        id: this.isEditing() ? this.submission().id : '1',
        content: this.submissionForm.value.content!,
        fileUrl: file ? '/uploads/submissions/new_submission.pdf' : undefined,
        fileName: file?.name,
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED'
      };

      this.submission.set(newSubmission);
      this.closeSubmissionForm();
      this.uploading.set(false);
    }, 2000);
  }

  getAllowedFileTypes(): string {
    return this.assignment()?.allowedFileTypes.join(',') || '';
  }

  // Helper methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN');
  }

  getStatusClass(): string {
    const sub = this.submission();
    switch (sub.status) {
      case 'GRADED': return 'text-green-600';
      case 'SUBMITTED': return 'text-blue-600';
      case 'RETURNED': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  }

  getStatusText(): string {
    const sub = this.submission();
    switch (sub.status) {
      case 'GRADED': return 'Đã chấm điểm';
      case 'SUBMITTED': return 'Đã nộp bài';
      case 'RETURNED': return 'Đã trả lại';
      case 'NOT_SUBMITTED': return 'Chưa nộp';
      default: return 'Không xác định';
    }
  }

  getSubmissionStatusClass(status: string): string {
    switch (status) {
      case 'GRADED': return 'bg-green-100 text-green-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'RETURNED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getSubmissionStatusText(status: string): string {
    switch (status) {
      case 'GRADED': return 'Đã chấm điểm';
      case 'SUBMITTED': return 'Đã nộp bài';
      case 'RETURNED': return 'Đã trả lại';
      default: return 'Không xác định';
    }
  }
}