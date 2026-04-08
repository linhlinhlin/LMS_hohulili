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
        <div class="flex items-center justify-between p-6 border-b">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Giao b\u00e0i t\u1eadp</h3>
            <p class="text-sm text-gray-500 mt-1">Cho h\u1ecdc vi\u00ean: {{ studentName() }}</p>
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

        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              placeholder="T\u00ecm ki\u1ebfm b\u00e0i t\u1eadp..."
              class="w-full border rounded-lg px-4 py-2 pl-10 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
            />
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">L\u1ecdc theo kh\u00f3a h\u1ecdc</label>
            <select
              [(ngModel)]="selectedCourseId"
              (ngModelChange)="onCourseChange()"
              class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
            >
              <option value="">T\u1ea5t c\u1ea3 kh\u00f3a h\u1ecdc</option>
              @for (course of courses(); track course.id) {
                <option [value]="course.id">{{ course.title }}</option>
              }
            </select>
          </div>

          @if (loading()) {
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0056D2]"></div>
              <span class="ml-3 text-gray-600">\u0110ang t\u1ea3i danh s\u00e1ch b\u00e0i t\u1eadp...</span>
            </div>
          }

          @if (!loading()) {
            <div class="space-y-2">
              <p class="text-sm text-gray-500">
                T\u00ecm th\u1ea5y {{ filteredAssignments().length }} b\u00e0i t\u1eadp
              </p>

              @if (filteredAssignments().length === 0) {
                <div class="text-center py-8 bg-gray-50 rounded-lg">
                  <p class="text-gray-500">Kh\u00f4ng t\u00ecm th\u1ea5y b\u00e0i t\u1eadp ph\u00f9 h\u1ee3p.</p>
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
                            \u0110\u00e3 giao
                          </span>
                        }
                      </div>
                      <p class="text-sm text-gray-600 mt-1">{{ assignment.courseTitle }}</p>
                      <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>H\u1ea1n: {{ formatDate(assignment.dueDate) }}</span>
                        <span>\u0110i\u1ec3m t\u1ed1i \u0111a: {{ assignment.maxScore }}</span>
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

          @if (selectedAssignment()) {
            <div class="border-t pt-4 mt-4">
              <h4 class="font-medium text-gray-900 mb-3">T\u00f9y ch\u1ecdn giao b\u00e0i</h4>

              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useCustomDeadline"
                    [(ngModel)]="useCustomDeadline"
                    class="rounded border-gray-300 text-[#0056D2] focus:ring-[#0056D2]"
                  />
                  <label for="useCustomDeadline" class="text-sm text-gray-700">
                    \u0110\u1eb7t h\u1ea1n n\u1ed9p ri\u00eang cho h\u1ecdc vi\u00ean n\u00e0y
                  </label>
                </div>

                @if (useCustomDeadline) {
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      H\u1ea1n n\u1ed9p ri\u00eang
                    </label>
                    <input
                      type="datetime-local"
                      [(ngModel)]="customDeadline"
                      [min]="minDateTime()"
                      class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2]"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      H\u1ea1n g\u1ed1c: {{ formatDate(selectedAssignment()!.dueDate) }}
                    </p>
                  </div>
                }

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Ghi ch\u00fa (t\u00f9y ch\u1ecdn)
                  </label>
                  <textarea
                    [(ngModel)]="note"
                    placeholder="Ghi ch\u00fa cho vi\u1ec7c giao b\u00e0i t\u1eadp n\u00e0y..."
                    rows="2"
                    maxlength="500"
                    class="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0056D2] focus:border-[#0056D2] resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            (click)="onCancel()"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            H\u1ee7y
          </button>
          <button
            type="button"
            (click)="onConfirm()"
            [disabled]="!canConfirm()"
            class="px-4 py-2 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Giao b\u00e0i t\u1eadp
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AssignTaskModalComponent implements OnInit {
  readonly studentId = input.required<string>();
  readonly studentName = input.required<string>();
  readonly studentCourseIds = input<string[]>([]);

  readonly confirm = output<AssignTaskRequest>();
  readonly cancel = output<void>();

  private distributionService = inject(DistributionService);

  assignments = signal<AvailableAssignment[]>([]);
  courses = signal<{ id: string; title: string }[]>([]);
  loading = signal(false);
  loadError = signal(false);
  selectedAssignment = signal<AvailableAssignment | null>(null);

  searchQuery = '';
  selectedCourseId = '';
  useCustomDeadline = false;
  customDeadline = '';
  note = '';

  filteredAssignments = computed(() => {
    let result = this.assignments();

    if (this.selectedCourseId) {
      result = result.filter(a => a.courseId === this.selectedCourseId);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.courseTitle.toLowerCase().includes(query)
      );
    }

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
    if (!dateString) return 'Kh\u00f4ng gi\u1edbi h\u1ea1n';
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
