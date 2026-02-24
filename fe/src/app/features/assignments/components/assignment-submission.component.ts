import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FileUploadComponent } from '../../../shared/components/file-upload/file-upload.component';
import { AssignmentApi, StudentAssignmentResponse } from '../../../api/client/assignment.api';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-assignment-submission',
  imports: [ReactiveFormsModule, FileUploadComponent],
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <!-- Assignment Info -->
      @if (assignment()) {
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 class="text-2xl font-bold text-gray-900 mb-4">{{ assignment()!.title }}</h1>
          <p class="text-gray-600 mb-4">{{ assignment()!.description || assignment()!.instructions }}</p>

          <div class="bg-[#0056D2]/5 border border-[#0056D2]/20 rounded-lg p-4 mb-4">
            <h3 class="font-semibold text-[#004BB5] mb-2">Thông tin bài tập:</h3>
            <ul class="text-sm text-[#004BB5] space-y-1">
              <li>• Khóa học: {{ assignment()!.courseName }}</li>
              @if (assignment()!.dueDate) {
                <li>• Hạn nộp: {{ formatDate(assignment()!.dueDate!) }}</li>
              }
              <li>• Điểm tối đa: {{ assignment()!.maxScore }}</li>
              @if (assignment()!.allowLateSubmission) {
                <li>• Cho phép nộp muộn</li>
              }
            </ul>
          </div>
        </div>
      } @else if (isLoadingAssignment()) {
        <div class="bg-white rounded-xl shadow-lg p-12 mb-6 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2] mx-auto mb-4"></div>
          <p class="text-gray-600">Đang tải bài tập...</p>
        </div>
      }

      <!-- Submission Form -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">Nộp bài tập</h2>

        <form [formGroup]="submissionForm" (ngSubmit)="onSubmit()">
          <!-- Content -->
          <div class="mb-6">
            <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
              Nội dung bài làm
            </label>
            <textarea
              id="content"
              formControlName="content"
              rows="8"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent"
              placeholder="Nhập nội dung bài làm của bạn...">
            </textarea>
          </div>

          <!-- File Upload -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tải lên file bài làm (tùy chọn)
            </label>
            <app-file-upload>
            </app-file-upload>
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end space-x-4">
            <button
              type="button"
              (click)="goBack()"
              class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0056D2]">
              Quay lại
            </button>
            <button
              type="submit"
              [disabled]="submissionForm.invalid || isSubmitting()"
              class="px-6 py-2 bg-[#0056D2] text-white rounded-md hover:bg-[#004BB5] focus:outline-none focus:ring-2 focus:ring-[#0056D2] disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isSubmitting()) {
                <span class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang nộp...
                </span>
              } @else {
                Nộp bài
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class AssignmentSubmissionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private assignmentApi = inject(AssignmentApi);
  private toast = inject(ToastService);

  assignment = signal<StudentAssignmentResponse | null>(null);
  submissionForm!: FormGroup;
  isSubmitting = signal(false);
  isLoadingAssignment = signal(false);

  ngOnInit(): void {
    this.initializeForm();
    this.loadAssignment();
  }

  private initializeForm(): void {
    this.submissionForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  private loadAssignment(): void {
    const assignmentId = this.route.snapshot.paramMap.get('id');
    if (!assignmentId) return;

    this.isLoadingAssignment.set(true);
    this.assignmentApi.getStudentAssignmentDetail(assignmentId).subscribe({
      next: (response) => {
        if (response.data) {
          this.assignment.set(response.data);
        }
        this.isLoadingAssignment.set(false);
      },
      error: () => {
        this.isLoadingAssignment.set(false);
        this.toast.error('Không thể tải bài tập');
      }
    });
  }

  onSubmit(): void {
    if (this.submissionForm.invalid) return;

    const assignmentId = this.route.snapshot.paramMap.get('id');
    if (!assignmentId) return;

    this.isSubmitting.set(true);
    const content = this.submissionForm.get('content')?.value;

    this.assignmentApi.submitStudentAssignment(assignmentId, { content }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success('Nộp bài tập thành công!');
        this.router.navigate(['/assignments']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Không thể nộp bài. Vui lòng thử lại.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/assignments']);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  }
}
