import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DistributionType,
  EnrolledStudent,
} from '../utils/allocation-utils';

export interface DistributionSettings {
  distributionType: DistributionType;
  studentIds: string[] | null;
}

export type ViewMode = 'assigned' | 'manage';

/**
 * Distribution Selector Component
 *
 * Professional LMS-style assignment distribution management.
 * Features:
 * - View assigned students list with status
 * - Add/remove students from assignment
 * - Bulk assignment operations
 * - Switch between "All Students" and "Specific Students" modes
 *
 * @requirements 1.1, 1.2, 1.3
 */
@Component({
  selector: 'app-distribution-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <!-- Header with tabs -->
      <div class="border-b border-gray-200">
        <div class="flex items-center justify-between px-6 py-4">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ viewMode() === 'assigned' ? 'Học viên được giao bài' : 'Quản lý phân phối' }}
          </h3>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">
              {{ selectedCount() }}/{{ enrolledStudents().length }} học viên
            </span>
            <button
              type="button"
              (click)="toggleViewMode()"
              class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
              [class.bg-blue-100]="viewMode() === 'manage'"
              [class.text-blue-700]="viewMode() === 'manage'"
              [class.bg-gray-100]="viewMode() === 'assigned'"
              [class.text-gray-700]="viewMode() === 'assigned'"
            >
              {{ viewMode() === 'assigned' ? 'Chỉnh sửa' : 'Xem danh sách' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Assigned Students View -->
      @if (viewMode() === 'assigned') {
        <div class="p-6 space-y-4">
          <!-- Distribution Type Badge -->
          <div class="flex items-center gap-2">
            @if (distributionType() === 'ALL_STUDENTS') {
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Tất cả học viên trong khóa học
              </span>
            } @else {
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                Học viên được chọn ({{ selectedStudentIds().length }})
              </span>
            }
          </div>

          <!-- Assigned Students Table -->
          <div class="border rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học viên</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  @if (distributionType() === 'SPECIFIC_STUDENTS') {
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  }
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (student of assignedStudents(); track student.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3">
                      <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                          {{ getInitials(student.name) }}
                        </div>
                        <span class="ml-3 font-medium text-gray-900">{{ student.name }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-500">{{ student.email }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Đã giao
                      </span>
                    </td>
                    @if (distributionType() === 'SPECIFIC_STUDENTS') {
                      <td class="px-4 py-3 text-center">
                        <button
                          type="button"
                          (click)="removeStudent(student.id)"
                          class="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Bỏ giao
                        </button>
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                      <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                      </svg>
                      <p>Chưa có học viên nào được giao bài tập</p>
                      <button
                        type="button"
                        (click)="toggleViewMode()"
                        class="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Giao bài ngay →
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Quick Stats -->
          @if (assignedStudents().length > 0) {
            <div class="grid grid-cols-3 gap-4 pt-2">
              <div class="text-center p-3 bg-blue-50 rounded-lg">
                <p class="text-2xl font-bold text-blue-600">{{ assignedStudents().length }}</p>
                <p class="text-xs text-gray-600">Đã giao</p>
              </div>
              <div class="text-center p-3 bg-gray-50 rounded-lg">
                <p class="text-2xl font-bold text-gray-600">{{ unassignedStudents().length }}</p>
                <p class="text-xs text-gray-600">Chưa giao</p>
              </div>
              <div class="text-center p-3 bg-green-50 rounded-lg">
                <p class="text-2xl font-bold text-green-600">{{ enrolledStudents().length }}</p>
                <p class="text-xs text-gray-600">Tổng học viên</p>
              </div>
            </div>
          }
        </div>
      }

      <!-- Manage Distribution View -->
      @if (viewMode() === 'manage') {
        <div class="p-6 space-y-4">
          <!-- Distribution Type Selection -->
          <div class="space-y-3">
            <label
              class="flex items-center p-4 border rounded-lg cursor-pointer transition-all"
              [class.border-blue-500]="distributionType() === 'ALL_STUDENTS'"
              [class.bg-blue-50]="distributionType() === 'ALL_STUDENTS'"
              [class.border-gray-200]="distributionType() !== 'ALL_STUDENTS'"
            >
              <input
                type="radio"
                name="distributionType"
                value="ALL_STUDENTS"
                [checked]="distributionType() === 'ALL_STUDENTS'"
                (change)="onDistributionTypeChange('ALL_STUDENTS')"
                class="w-4 h-4 text-blue-600"
              />
              <div class="ml-3 flex-1">
                <span class="font-medium text-gray-900">Tất cả học viên</span>
                <p class="text-sm text-gray-500 mt-1">
                  Tự động giao cho tất cả {{ enrolledStudents().length }} học viên
                  trong khóa học (bao gồm học viên mới đăng ký sau)
                </p>
              </div>
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
            </label>

            <label
              class="flex items-center p-4 border rounded-lg cursor-pointer transition-all"
              [class.border-blue-500]="distributionType() === 'SPECIFIC_STUDENTS'"
              [class.bg-blue-50]="distributionType() === 'SPECIFIC_STUDENTS'"
              [class.border-gray-200]="distributionType() !== 'SPECIFIC_STUDENTS'"
            >
              <input
                type="radio"
                name="distributionType"
                value="SPECIFIC_STUDENTS"
                [checked]="distributionType() === 'SPECIFIC_STUDENTS'"
                (change)="onDistributionTypeChange('SPECIFIC_STUDENTS')"
                class="w-4 h-4 text-blue-600"
              />
              <div class="ml-3 flex-1">
                <span class="font-medium text-gray-900">Học viên cụ thể</span>
                <p class="text-sm text-gray-500 mt-1">
                  Chọn từng học viên để giao bài tập riêng
                </p>
              </div>
              <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
            </label>
          </div>

          <!-- Student Selection (only shown when SPECIFIC_STUDENTS) -->
          @if (distributionType() === 'SPECIFIC_STUDENTS') {
            <div class="border-t pt-4 space-y-3">
              <!-- Search Input -->
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearchChange($event)"
                  placeholder="Tìm kiếm học viên..."
                  class="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>

              <!-- Quick Actions -->
              <div class="flex gap-2">
                <button
                  type="button"
                  (click)="selectAll()"
                  class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  (click)="deselectAll()"
                  class="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                >
                  Bỏ chọn tất cả
                </button>
              </div>

              <!-- Student List -->
              <div class="max-h-64 overflow-y-auto border rounded-lg divide-y">
                @for (student of filteredStudents(); track student.id) {
                  <label class="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="isSelected(student.id)"
                      (change)="toggleStudent(student.id)"
                      class="w-4 h-4 text-blue-600 rounded"
                    />
                    <div class="ml-3 flex-1">
                      <span class="font-medium text-gray-900">{{ student.name }}</span>
                      <span class="text-sm text-gray-500 ml-2">{{ student.email }}</span>
                    </div>
                    @if (isSelected(student.id)) {
                      <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        Đã chọn
                      </span>
                    }
                  </label>
                } @empty {
                  <div class="p-4 text-center text-gray-500">
                    Không tìm thấy học viên nào
                  </div>
                }
              </div>

              <!-- Selected Count -->
              @if (selectedStudentIds().length > 0) {
                <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span class="text-sm text-blue-700">
                    Đã chọn {{ selectedStudentIds().length }} học viên
                  </span>
                  <button
                    type="button"
                    (click)="deselectAll()"
                    class="text-sm text-blue-600 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>
              }
            </div>
          }

          <!-- Validation Error -->
          @if (showError()) {
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600">{{ errorMessage() }}</p>
            </div>
          }

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              (click)="toggleViewMode()"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
            >
              Hủy
            </button>
            <button
              type="button"
              (click)="saveAndViewAssigned()"
              class="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      }
    </div>
  `,
})

export class DistributionSelectorComponent implements OnInit {
  @Input() enrolledStudents = signal<EnrolledStudent[]>([]);
  @Input() initialDistributionType: DistributionType = 'ALL_STUDENTS';
  @Input() initialStudentIds: string[] = [];
  @Input() individualStudentIds: string[] = []; // Students with individual assignments

  @Output() distributionChange = new EventEmitter<DistributionSettings>();

  // State
  viewMode = signal<ViewMode>('assigned');
  distributionType = signal<DistributionType>('ALL_STUDENTS');
  selectedStudentIds = signal<string[]>([]);
  searchQuery = '';
  searchSignal = signal('');
  showError = signal(false);
  errorMessage = signal('');

  // Computed
  filteredStudents = computed(() => {
    const query = this.searchSignal().toLowerCase();
    const students = this.enrolledStudents();

    if (!query) return students;

    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
    );
  });

  assignedStudents = computed(() => {
    const students = this.enrolledStudents();
    if (this.distributionType() === 'ALL_STUDENTS') {
      return students;
    }
    const selectedIds = this.selectedStudentIds();
    return students.filter((s) => selectedIds.includes(s.id));
  });

  unassignedStudents = computed(() => {
    const students = this.enrolledStudents();
    if (this.distributionType() === 'ALL_STUDENTS') {
      return [];
    }
    const selectedIds = this.selectedStudentIds();
    return students.filter((s) => !selectedIds.includes(s.id));
  });

  selectedCount = computed(() => {
    if (this.distributionType() === 'ALL_STUDENTS') {
      return this.enrolledStudents().length;
    }
    return this.selectedStudentIds().length;
  });

  ngOnInit(): void {
    this.distributionType.set(this.initialDistributionType);
    this.selectedStudentIds.set(this.initialStudentIds);
    
    // Start in assigned view if there are already assigned students
    if (this.initialStudentIds.length > 0 || this.initialDistributionType === 'ALL_STUDENTS') {
      this.viewMode.set('assigned');
    } else {
      this.viewMode.set('manage');
    }
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'assigned' ? 'manage' : 'assigned');
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  removeStudent(studentId: string): void {
    const current = this.selectedStudentIds();
    this.selectedStudentIds.set(current.filter((id) => id !== studentId));
    this.emitChange();
  }

  saveAndViewAssigned(): void {
    if (this.validate()) {
      this.emitChange();
      this.viewMode.set('assigned');
    }
  }

  onDistributionTypeChange(type: DistributionType): void {
    this.distributionType.set(type);
    this.showError.set(false);

    if (type === 'ALL_STUDENTS') {
      this.selectedStudentIds.set([]);
    }

    this.emitChange();
  }

  onSearchChange(query: string): void {
    this.searchSignal.set(query);
  }

  toggleStudent(studentId: string): void {
    const current = this.selectedStudentIds();
    const index = current.indexOf(studentId);

    if (index === -1) {
      this.selectedStudentIds.set([...current, studentId]);
    } else {
      this.selectedStudentIds.set(current.filter((id) => id !== studentId));
    }

    this.validateAndEmit();
  }

  isSelected(studentId: string): boolean {
    return this.selectedStudentIds().includes(studentId);
  }

  isIndividualAssignment(studentId: string): boolean {
    return this.individualStudentIds.includes(studentId);
  }

  selectAll(): void {
    const allIds = this.filteredStudents().map((s) => s.id);
    const current = new Set(this.selectedStudentIds());
    allIds.forEach((id) => current.add(id));
    this.selectedStudentIds.set(Array.from(current));
    this.validateAndEmit();
  }

  deselectAll(): void {
    this.selectedStudentIds.set([]);
    this.validateAndEmit();
  }

  private validateAndEmit(): void {
    if (
      this.distributionType() === 'SPECIFIC_STUDENTS' &&
      this.selectedStudentIds().length === 0
    ) {
      this.showError.set(true);
      this.errorMessage.set('Vui lòng chọn ít nhất một học viên');
    } else {
      this.showError.set(false);
    }

    this.emitChange();
  }

  private emitChange(): void {
    this.distributionChange.emit({
      distributionType: this.distributionType(),
      studentIds:
        this.distributionType() === 'ALL_STUDENTS'
          ? null
          : this.selectedStudentIds(),
    });
  }

  // Public method for parent to validate
  validate(): boolean {
    if (
      this.distributionType() === 'SPECIFIC_STUDENTS' &&
      this.selectedStudentIds().length === 0
    ) {
      this.showError.set(true);
      this.errorMessage.set('Vui lòng chọn ít nhất một học viên');
      return false;
    }
    return true;
  }

  // Get current settings
  getSettings(): DistributionSettings {
    return {
      distributionType: this.distributionType(),
      studentIds:
        this.distributionType() === 'ALL_STUDENTS'
          ? null
          : this.selectedStudentIds(),
    };
  }
}
