import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ClassSummary } from '../../../../../../shared/types/course.types';

export interface ClassSelectionResult {
  classId: string;
  className: string;
}

@Component({
  selector: 'app-class-selection-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="class-selection-dialog">
      <div class="dialog-header">
        <h2 class="text-lg font-bold text-gray-900">Chọn lớp học để xếp học viên</h2>
        <p class="text-sm text-gray-500 mt-1">
          Bạn đang xếp <span class="font-bold text-[#0056D2]">{{ studentCount() }}</span> học viên
        </p>
      </div>

      <!-- Empty State -->
      @if (availableClasses().length === 0) {
        <div class="empty-state text-center py-8">
          <mat-icon class="text-5xl text-gray-300">school</mat-icon>
          <p class="text-sm text-gray-500 mt-3">Không có lớp học đang mở</p>
          <p class="text-xs text-gray-400 mt-1">Vui lòng tạo lớp học mới hoặc mở lại lớp đã đóng</p>
        </div>
      }

      <!-- Class List -->
      @if (availableClasses().length > 0) {
        <div class="class-list space-y-2 max-h-64 overflow-y-auto">
          @for (cls of availableClasses(); track cls.id) {
            <button
              (click)="selectClass(cls)"
              [class.selected]="selectedClassId() === cls.id"
              class="class-item w-full p-4 rounded-xl border border-gray-200 hover:border-[#0056D2] hover:bg-[#0056D2]/5 transition-all text-left">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="font-bold text-gray-900">{{ cls.name }}</h3>
                  <p class="text-xs text-gray-500 mt-0.5">{{ cls.code }}</p>
                  @if (cls.scheduleType === 'SEMESTER' && cls.semester) {
                    <span class="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 rounded uppercase">
                      {{ cls.semester }}
                    </span>
                  }
                </div>
                <div class="text-right ml-4">
                  <div class="text-sm font-bold"
                       [class.text-red-600]="(cls.capacityPercent ?? 0) >= 100"
                       [class.text-amber-600]="(cls.capacityPercent ?? 0) >= 80 && (cls.capacityPercent ?? 0) < 100"
                       [class.text-gray-700]="(cls.capacityPercent ?? 0) < 80">
                    {{ cls.studentCount || 0 }}/{{ cls.maxStudents }}
                  </div>
                  <div class="w-16 h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                    <div class="h-full rounded-full"
                         [style.width.%]="cls.capacityPercent ?? 0"
                         [class.bg-red-500]="(cls.capacityPercent ?? 0) >= 100"
                         [class.bg-amber-400]="(cls.capacityPercent ?? 0) >= 80 && (cls.capacityPercent ?? 0) < 100"
                         [class.bg-[#0056D2]]="(cls.capacityPercent ?? 0) < 80">
                    </div>
                  </div>
                </div>
                <mat-icon *ngIf="selectedClassId() === cls.id" class="ml-3 text-[#0056D2]">check_circle</mat-icon>
              </div>
            </button>
          }
        </div>
      }

      <!-- Footer -->
      <div class="dialog-footer mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
        <button
          mat-button
          (click)="dialogRef.close()"
          class="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">
          Hủy
        </button>
        <button
          mat-raised-button
          (click)="confirm()"
          [disabled]="!selectedClassId()"
          class="px-6 py-2.5 font-bold bg-[#0056D2] text-white hover:bg-[#004BB5] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl">
          Xếp {{ studentCount() }} học viên
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 480px;
    }
    .class-selection-dialog {
      padding: 24px;
    }
    .class-item {
      background: white;
      cursor: pointer;
    }
    .class-item.selected {
      border-color: #0056D2;
      background: rgba(0, 86, 210, 0.1);
    }
    .dialog-footer button {
      border-radius: 8px;
    }
  `]
})
export class ClassSelectionDialogComponent {
  dialogRef = inject(MatDialogRef<ClassSelectionDialogComponent>);

  // Inputs
  classes = input.required<ClassSummary[]>();
  studentCount = input.required<number>();

  // State
  selectedClassId = signal<string>('');

  // Computed - only OPEN classes
  availableClasses = signal<ClassSummary[]>([]);

  constructor() {
    // Filter only OPEN classes
    this.availableClasses.update(() => {
      return this.classes().filter(c => c.status !== 'CLOSED' && c.status !== 'CANCELLED');
    });
  }

  selectClass(cls: ClassSummary) {
    this.selectedClassId.set(cls.id);
  }

  confirm() {
    if (!this.selectedClassId()) return;

    const selectedClass = this.classes().find(c => c.id === this.selectedClassId());
    if (selectedClass) {
      this.dialogRef.close({
        classId: selectedClass.id,
        className: selectedClass.name
      });
    }
  }
}
