/**
 * Assign Task Modal Component
 *
 * Modal để giao bài tập riêng cho học viên cụ thể.
 * Features:
 * - Hiển thị danh sách bài tập có sẵn từ các khóa học của học viên
 * - Tìm kiếm và filter bài tập
 * - Cho phép đặt deadline riêng
 * - Xác nhận và tạo allocation
 *
 * @requirements 2.2, 2.3
 */
import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
  OnInit,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DistributionService } from '../../../core/services/distribution.service';

export interface AvailableAssignment {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  dueDate: string | null;
  maxScore: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  alreadyAssigned: boolean;
}

export interface AssignTaskRequest {
  assignmentId: string;
  studentId: string;
  customDeadline?: string;
  note?: string;
}

@Component({
  selector: 'app-assign-task-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Giao bài tập</h3>
            <p class="text-sm text-gray-500 mt-1">Cho học viên: {{ studentName() }}</p>
          </div>
          <button
            (click)="onCancel()"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- Search -->
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              placeholder="Tìm kiếm bài tập..."
              class="w-full border rounded-lg px-4 py-2 pl-10 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
            />
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <!-- Course Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Lọc theo khóa học</label>
            <select
              [(ngModel)]="selectedCourseId"
              (ngModelChange)="onCourseChange()"
              class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
            >
              <option value="">Tất cả khóa học</option>
              @for (course of courses(); track course.id) {
                <option [value]="course.id">{{ course.title }}</option>
              }
            </select>
          </div>

          <!-- Loading State -->
          @if (loading()) {
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
              <span class="ml-3 text-gray-600">Đang tải danh sách bài tập...</span>
            </div>
          }

          <!-- Assignment List -->
          @if (!loading()) {
            <div class="space-y-2">
              <p class="text-sm text-gray-500">
                Tìm thấy {{ filteredAssignments().length }} bài tập
              </p>
              
              @if (filteredAssignments().length === 0) {
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                  <p class="text-gray-500">Không tìm thấy bài tập phù hợp.</p>
                </div>
              }

              @for (assignment of filteredAssignments(); track assignment.id) {
                <div 
                  class="border rounded-lg p-4 cursor-pointer transition-all"
                  [class.border-[#0056D2]]="selectedAssignment()?.id === assignment.id"
                  [class.bg-[#0056D2]/5]="selectedAssignment()?.id === assignment.id"
                  [class.opacity-50]="assignment.alreadyAssigned"
                  [class.cursor-not-allowed]="assignment.alreadyAssigned"
                  (click)="!assignment.alreadyAssigned && selectAssignment(assignment)"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <h4 class="font-medium text-gray-900">{{ assignment.title }}</h4>
                        @if (assignment.alreadyAssigned) {
                          <span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            Đã giao
                          </span>
                        }
                      </div>
                      <p class="text-sm text-gray-600 mt-1">{{ assignment.courseTitle }}</p>
                      <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Hạn: {{ formatDate(assignment.dueDate) }}</span>
                        <span>Điểm tối đa: {{ assignment.maxScore }}</span>
                      </div>
                    </div>
                    
                    @if (selectedAssignment()?.id === assignment.id) {
                      <svg class="w-6 h-6 text-[#0056D2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
                      </svg>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Custom Deadline -->
          @if (selectedAssignment()) {
            <div class="border-t pt-4 mt-4">
              <h4 class="font-medium text-gray-900 mb-3">Tùy chọn giao bài</h4>
              
              <div class="space-y-4">
                <!-- Custom Deadline Toggle -->
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useCustomDeadline"
                    [(ngModel)]="useCustomDeadline"
                    class="rounded border-gray-300 text-[#0056D2] focus:ring-[#0056D2]"
                  />
                  <label for="useCustomDeadline" class="text-sm text-gray-700">
                    Đặt hạn nộp riêng cho học viên này
                  </label>
                </div>

                @if (useCustomDeadline) {
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Hạn nộp riêng
                    </label>
                    <input
                      type="datetime-local"
                      [(ngModel)]="customDeadline"
                      [min]="minDateTime()"
                      class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      Hạn gốc: {{ formatDate(selectedAssignment()!.dueDate) }}
                    </p>
                  </div>
                }

                <!-- Note -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    [(ngModel)]="note"
                    placeholder="Ghi chú cho việc giao bài tập này..."
                    rows="2"
                    maxlength="500"
                    class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            (click)="onCancel()"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            (click)="onConfirm()"
            [disabled]="!canConfirm()"
            class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Giao bài tập
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AssignTaskModalComponent implements OnInit {
  // Signal inputs (Angular v20+)
  readonly studentId = input.required<string>();
  readonly studentName = input.required<string>();
  readonly studentCourseIds = input<string[]>([]);

  // Output functions (Angular v20+)
  readonly confirm = output<AssignTaskRequest>();
  readonly cancel = output<void>();

  private distributionService = inject(DistributionService);

  // State
  assignments = signal<AvailableAssignment[]>([]);
  courses = signal<{ id: string; title: string }[]>([]);
  loading = signal(false);
  loadError = signal(false);
  selectedAssignment = signal<AvailableAssignment | null>(null);

  // Form state
  searchQuery = '';
  selectedCourseId = '';
  useCustomDeadline = false;
  customDeadline = '';
  note = '';

  // Computed
  filteredAssignments = computed(() => {
    let result = this.assignments();

    // Filter by course
    if (this.selectedCourseId) {
      result = result.filter(a => a.courseId === this.selectedCourseId);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.courseTitle.toLowerCase().includes(query)
      );
    }

    // Only show published assignments
    result = result.filter(a => a.status === 'PUBLISHED');

    return result;
  });

  canConfirm = computed(() => {
    return this.selectedAssignment() !== null && !this.selectedAssignment()?.alreadyAssigned;
  });

  ngOnInit(): void {
    this.loadAssignments();
  }

  private loadAssignments(): void {
    this.loading.set(true);

    // Load available assignments for the student's courses
    this.distributionService.getAvailableAssignments(this.studentId()).subscribe({
      next: (data) => {
        this.assignments.set(data.assignments || []);
        this.courses.set(data.courses || []);
        this.loading.set(false);
      },
      error: () => {
        this.assignments.set([]);
        this.courses.set([]);
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  selectAssignment(assignment: AvailableAssignment): void {
    if (assignment.alreadyAssigned) return;

    this.selectedAssignment.set(assignment);

    // Set default custom deadline to assignment's due date
    if (assignment.dueDate) {
      this.customDeadline = this.formatDateTimeLocal(assignment.dueDate);
    }
  }

  onSearchChange(): void {
    // Trigger re-filter via computed
  }

  onCourseChange(): void {
    // Trigger re-filter via computed
  }

  minDateTime(): string {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return this.formatDateTimeLocal(now.toISOString());
  }

  onConfirm(): void {
    const assignment = this.selectedAssignment();
    if (!assignment) return;

    const request: AssignTaskRequest = {
      assignmentId: assignment.id,
      studentId: this.studentId(),
    };

    if (this.useCustomDeadline && this.customDeadline) {
      request.customDeadline = new Date(this.customDeadline).toISOString();
    }

    if (this.note.trim()) {
      request.note = this.note.trim();
    }

    this.confirm.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'Không giới hạn';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatDateTimeLocal(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
