import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-assignment-work-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-4xl mx-auto px-6 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <div>
                <h1 class="text-xl font-semibold text-gray-900">{{ assignment()?.title || 'Bài tập' }}</h1>
                <p class="text-sm text-gray-600">{{ assignment()?.courseName || 'Khóa học' }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button (click)="saveDraft()"
                      [disabled]="isSubmitting()"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                Lưu nháp
              </button>
              <button (click)="submitAssignment()"
                      [disabled]="!canSubmit() || isSubmitting()"
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50">
                @if (isSubmitting()) {
                  <span>Đang nộp...</span>
                } @else {
                  Nộp bài
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Main Editor Area -->
          <div class="lg:col-span-2">
            <!-- Assignment Info -->
            @if (assignment()) {
              <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Thông tin bài tập</h2>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="font-medium text-gray-700">Hạn nộp:</span>
                    <span class="ml-2">{{ formatDate(assignment()!.dueDate) }}</span>
                  </div>
                  <div>
                    <span class="font-medium text-gray-700">Điểm tối đa:</span>
                    <span class="ml-2">{{ assignment()!.maxGrade }} điểm</span>
                  </div>
                </div>
                @if (assignment()!.description) {
                  <div class="mt-4 pt-4 border-t border-gray-200">
                    <h3 class="font-medium text-gray-900 mb-2">Mô tả</h3>
                    <div class="text-sm text-gray-700" [innerHTML]="assignment()!.description"></div>
                  </div>
                }
              </div>
            }

            <!-- Submission Form -->
            <form [formGroup]="submissionForm" class="bg-white rounded-lg border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Nội dung bài làm</h3>

              <div class="mb-4">
                <textarea formControlName="content"
                          rows="12"
                          placeholder="Nhập nội dung bài làm của bạn..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-vertical"></textarea>
              </div>

              <!-- File Upload Section -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Tệp đính kèm</label>
                <input type="file"
                       multiple
                       (change)="onFileSelected($event)"
                       class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">

                @if (attachedFiles().length > 0) {
                  <div class="mt-3 space-y-2">
                    @for (file of attachedFiles(); track file.name) {
                      <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span class="text-sm text-gray-700">{{ file.name }}</span>
                        <button (click)="removeFile(file)" class="text-red-600 hover:text-red-800">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Submit Button -->
              <div class="flex justify-end">
                <button type="button"
                        (click)="submitAssignment()"
                        [disabled]="!canSubmit() || isSubmitting()"
                        class="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (isSubmitting()) {
                    <span>Đang nộp bài...</span>
                  } @else {
                    Nộp bài
                  }
                </button>
              </div>
            </form>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Submission Status -->
            <div class="bg-white rounded-lg border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Trạng thái nộp bài</h3>
              <div class="flex items-center space-x-2">
                @if (submissionStatus() === 'submitted') {
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span class="text-sm font-medium text-green-600">Đã nộp</span>
                } @else {
                  <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                  <span class="text-sm font-medium text-orange-600">Chưa nộp</span>
                }
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-white rounded-lg border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Hành động nhanh</h3>
              <div class="space-y-3">
                <button (click)="saveDraft()"
                        class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
                  Lưu nháp
                </button>
                <button (click)="submitAssignment()"
                        [disabled]="!canSubmit()"
                        class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  Nộp bài
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AssignmentWorkPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Component state
  assignment = signal<any>(null);
  isSubmitting = signal<boolean>(false);
  submissionStatus = signal<'draft' | 'submitted'>('draft');
  attachedFiles = signal<File[]>([]);

  // Form
  submissionForm = this.fb.group({
    content: ['', [Validators.required, Validators.minLength(10)]]
  });

  // Computed
  canSubmit = computed(() => {
    const form = this.submissionForm;
    const content = form.get('content')?.value;
    return form.valid && content && content.trim().length > 0 && !this.isSubmitting();
  });

  ngOnInit(): void {
    this.loadAssignment();
  }

  private loadAssignment(): void {
    const assignmentId = this.route.snapshot.params['id'];
    // Mock assignment data
    this.assignment.set({
      id: assignmentId,
      title: 'Bài tập mẫu về kỹ thuật tàu biển',
      courseName: 'Kỹ thuật Tàu biển Cơ bản',
      description: '<p>Hoàn thành bài tập về các hệ thống động lực của tàu biển.</p>',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxGrade: 100
    });
  }

  goBack(): void {
    this.router.navigate(['/student/assignments']);
  }

  async saveDraft(): Promise<void> {
    if (this.isSubmitting()) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Đã lưu nháp thành công!');
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu nháp');
    }
  }

  async submitAssignment(): Promise<void> {
    if (!this.canSubmit() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.submissionStatus.set('submitted');
      alert('Bài tập đã được nộp thành công!');
      this.router.navigate(['/student/assignments']);
    } catch (error) {
      alert('Có lỗi xảy ra khi nộp bài');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (files) {
      const currentFiles = this.attachedFiles();
      const newFiles = Array.from(files);

      // Check file size (10MB limit)
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`Tệp ${file.name} quá lớn. Kích thước tối đa là 10MB.`);
          return false;
        }
        return true;
      });

      this.attachedFiles.set([...currentFiles, ...validFiles]);
    }
  }

  removeFile(file: File): void {
    const currentFiles = this.attachedFiles();
    this.attachedFiles.set(currentFiles.filter(f => f !== file));
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}