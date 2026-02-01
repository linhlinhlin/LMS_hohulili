import {
  Component,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeadlineOverrideRequest,
  validateOverrideDate,
  validateOverrideReason,
  formatDeadline,
  calculateDaysExtended,
} from '../utils/deadline-utils';

export interface StudentInfo {
  id: string;
  name: string;
  email: string;
}

/**
 * Deadline Override Modal Component
 *
 * Modal để gia hạn deadline cho học viên cụ thể.
 * Includes validation và audit trail support.
 *
 * @requirements 4.1, 4.2, 4.3
 */
@Component({
  selector: 'app-deadline-override-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          (click)="close()"
        ></div>

        <!-- Modal -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            class="relative bg-white rounded-xl shadow-xl max-w-md w-full transform transition-all"
            (click)="$event.stopPropagation()"
          >
            <!-- Header -->
            <div class="px-6 py-4 border-b">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900">
                  Gia hạn deadline
                </h3>
                <button
                  (click)="close()"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Body -->
            <div class="px-6 py-4 space-y-4">
              <!-- Student Info -->
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="text-sm text-gray-500">Học viên</p>
                <p class="font-medium text-gray-900">{{ student()?.name }}</p>
                <p class="text-sm text-gray-600">{{ student()?.email }}</p>
              </div>

              <!-- Current Deadline -->
              <div class="bg-blue-50 rounded-lg p-4">
                <p class="text-sm text-blue-600">Hạn nộp hiện tại</p>
                <p class="font-medium text-blue-900">
                  {{ formatDate(originalDeadline()) }}
                </p>
              </div>

              <!-- New Deadline -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Hạn nộp mới <span class="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  [(ngModel)]="newDeadline"
                  (ngModelChange)="onDeadlineChange()"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  [class.border-red-500]="dateError()"
                />
                @if (dateError()) {
                  <p class="mt-1 text-sm text-red-600">{{ dateError() }}</p>
                }
                @if (newDeadline && !dateError()) {
                  <p class="mt-1 text-sm text-green-600">
                    Gia hạn thêm {{ getDaysExtended() }} ngày
                  </p>
                }
              </div>

              <!-- Reason -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Lý do gia hạn <span class="text-red-500">*</span>
                </label>
                <textarea
                  [(ngModel)]="reason"
                  (ngModelChange)="onReasonChange()"
                  rows="3"
                  placeholder="Nhập lý do gia hạn (ví dụ: Học viên ốm, đi biển đột xuất...)"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  [class.border-red-500]="reasonError()"
                ></textarea>
                @if (reasonError()) {
                  <p class="mt-1 text-sm text-red-600">{{ reasonError() }}</p>
                }
                <p class="mt-1 text-xs text-gray-500">
                  {{ reason.length }}/200 ký tự (tối thiểu 10)
                </p>
              </div>

              <!-- Audit Notice -->
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <p class="text-sm text-yellow-800 font-medium">Lưu ý STCW</p>
                    <p class="text-xs text-yellow-700 mt-1">
                      Thao tác này sẽ được ghi lại trong Audit Log theo quy định đào tạo hàng hải.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                (click)="close()"
                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                (click)="submit()"
                [disabled]="!isValid() || loading()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                @if (loading()) {
                  <span class="flex items-center gap-2">
                    <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </span>
                } @else {
                  Xác nhận gia hạn
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class DeadlineOverrideModalComponent {
  // Signal inputs (Angular v20+)
  readonly student = input<StudentInfo | null>(null);
  readonly assignmentId = input<string>('');
  readonly originalDeadline = input<string>('');

  // Output functions (Angular v20+)
  readonly confirmed = output<DeadlineOverrideRequest>();
  readonly closed = output<void>();

  // State
  isOpen = signal(false);
  loading = signal(false);
  newDeadline = '';
  reason = '';
  dateError = signal<string | null>(null);
  reasonError = signal<string | null>(null);

  open(): void {
    this.isOpen.set(true);
    this.reset();
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  reset(): void {
    this.newDeadline = '';
    this.reason = '';
    this.dateError.set(null);
    this.reasonError.set(null);
    this.loading.set(false);
  }

  onDeadlineChange(): void {
    if (!this.newDeadline) {
      this.dateError.set(null);
      return;
    }

    const validation = validateOverrideDate(this.newDeadline);
    this.dateError.set(validation.error || null);
  }

  onReasonChange(): void {
    if (!this.reason) {
      this.reasonError.set(null);
      return;
    }

    const validation = validateOverrideReason(this.reason);
    this.reasonError.set(validation.error || null);
  }

  isValid(): boolean {
    if (!this.newDeadline || !this.reason) return false;

    const dateValidation = validateOverrideDate(this.newDeadline);
    const reasonValidation = validateOverrideReason(this.reason);

    return dateValidation.isValid && reasonValidation.isValid;
  }

  getDaysExtended(): number {
    const orig = this.originalDeadline();
    if (!this.newDeadline || !orig) return 0;
    return calculateDaysExtended(orig, this.newDeadline);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return formatDeadline(dateString);
  }

  submit(): void {
    const studentVal = this.student();
    if (!this.isValid() || !studentVal) return;

    this.loading.set(true);

    const request: DeadlineOverrideRequest = {
      assignmentId: this.assignmentId(),
      studentId: studentVal.id,
      studentName: studentVal.name,
      newDeadline: new Date(this.newDeadline).toISOString(),
      reason: this.reason.trim(),
    };

    this.confirmed.emit(request);

    // Parent component should call close() after handling
    setTimeout(() => {
      this.loading.set(false);
      this.close();
    }, 500);
  }
}




