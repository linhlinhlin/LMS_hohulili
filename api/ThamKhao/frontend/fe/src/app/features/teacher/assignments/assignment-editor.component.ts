import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AssignmentApi, AssignmentDetail, UpdateAssignmentRequest } from '../../../api/client/assignment.api';

@Component({
  selector: 'app-assignment-editor',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="max-w-3xl mx-auto p-6 space-y-6" *ngIf="assignmentId">
      <h1 class="text-2xl font-bold text-gray-900">
        {{ loading() ? 'Đang tải...' : 'Chỉnh sửa bài tập' }}
      </h1>

      <div class="text-center text-red-600" *ngIf="error() && !loading()">
        {{ error() }}
                <button (click)="onReload()" class="ml-2 text-blue-600 underline text-sm">Tải lại</button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="bg-white rounded-lg shadow p-6 space-y-4" *ngIf="!loading() && !error()">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
          <input formControlName="title" type="text" class="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea formControlName="description" rows="4" class="w-full border rounded px-3 py-2"></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hướng dẫn làm bài</label>
          <textarea formControlName="instructions" rows="6" class="w-full border rounded px-3 py-2"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hạn nộp</label>
            <input formControlName="dueDate" type="date" class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select formControlName="status" class="w-full border rounded px-3 py-2">
              <option value="pending">Nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="closed">Đã đóng</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button type="submit" [disabled]="form.invalid || submitting()" class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {{ submitting() ? 'Đang lưu...' : 'Lưu thay đổi' }}
          </button>
          <a [routerLink]="['/teacher/assignments', assignmentId, 'submissions']" class="text-sm text-indigo-600">Xem bài nộp</a>
          <a routerLink="/teacher/assignments" class="text-sm text-gray-600 underline">Quay lại danh sách</a>
          <span class="text-green-700" *ngIf="success()">{{ success() }}</span>
          <span class="text-red-600" *ngIf="error() && !loading()">{{ error() }}</span>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentEditorComponent {
  private assignmentApi = inject(AssignmentApi);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  assignmentId = this.route.snapshot.paramMap.get('id') || '';
  submitting = signal(false);
  success = signal('');
  error = signal('');
  loading = signal(true);
  assignment = signal<AssignmentDetail | null>(null);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    instructions: [''],
    dueDate: [''],
    status: ['pending', [Validators.required]]
  });

  constructor() {
    this.loadAssignment();
  }

  private loadAssignment() {
    if (!this.assignmentId) {
      this.error.set('ID bài tập không hợp lệ');
      return;
    }

    this.loading.set(true);
    this.assignmentApi.getAssignmentById(this.assignmentId).subscribe({
      next: (response) => {
        if (response.data) {
          const assignment = response.data;
          this.assignment.set(assignment);
          
          // Parse date for form input
          let dueDate = '';
          if (assignment.dueDate) {
            const date = new Date(assignment.dueDate);
            dueDate = date.toISOString().split('T')[0]; // Format: yyyy-MM-dd
          }
          
          this.form.patchValue({
            title: assignment.title,
            description: assignment.description || '',
            instructions: assignment.instructions || '',
            dueDate: dueDate,
            status: assignment.status
          });
        }
      },
      error: (error) => {
        console.error('Error loading assignment:', error);
        this.error.set('Không thể tải thông tin bài tập');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.success.set('');
    this.error.set('');

    const formValue = this.form.getRawValue();
    const request: UpdateAssignmentRequest = {
      title: formValue.title || undefined,
      description: formValue.description || undefined,
      instructions: formValue.instructions || undefined,
      dueDate: formValue.dueDate || undefined
    };

    this.assignmentApi.updateAssignment(this.assignmentId, request).subscribe({
      next: (response) => {
        if (response.data) {
          this.assignment.set(response.data);
          this.success.set('Đã lưu thay đổi thành công!');
        }
      },
      error: (error) => {
        console.error('Error updating assignment:', error);
        this.error.set(error?.error?.message || 'Cập nhật bài tập thất bại');
      },
      complete: () => {
        this.submitting.set(false);
      }
    });
  }

  onReload() {
    this.loadAssignment();
  }
}