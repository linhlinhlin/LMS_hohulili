import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { ClassService } from '../../../../state/class.service';
import { firstValueFrom } from 'rxjs';
import { ClassSummary } from '../../../../shared/types/course.types';
import {
  DistributionType,
  EnrolledStudent,
} from '../utils/allocation-utils';

export interface DistributionSettings {
  distributionType: DistributionType;
  studentIds: string[] | null;
  classId?: string | null;
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
  templateUrl: './distribution-selector.component.html',
})

export class DistributionSelectorComponent implements OnInit {
  // Signal inputs
  enrolledStudents = input<EnrolledStudent[]>([]);
  initialDistributionType = input<DistributionType>('ALL_STUDENTS');
  initialStudentIds = input<string[]>([]);
  individualStudentIds = input<string[]>([]); // Students with individual assignments
  courseId = input<string | null>(null);
  initialClassId = input<string | null>(null);

  // Signal output
  distributionChange = output<DistributionSettings>();

  private classService = inject(ClassService);

  // State
  viewMode = signal<ViewMode>('assigned');
  distributionType = signal<DistributionType>('ALL_STUDENTS');
  selectedStudentIds = signal<string[]>([]);
  availableClasses = signal<ClassSummary[]>([]);
  selectedClassId = signal<string | null>(null);
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
      (s: EnrolledStudent) =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
    );
  });

  assignedStudents = computed(() => {
    const students = this.enrolledStudents();
    if (this.distributionType() === 'ALL_STUDENTS') {
      return students;
    }
    if (this.distributionType() === 'CLASS') {
      // In a real app, we might want to filter enrolled students by the selected class
      // However, for just viewing, we might need to fetch students of that class specifically
      // or just show "All students in local class"
      // For now, let's just return empty or a placeholder if we don't have the enrollment info here
      return [];
    }
    const selectedIds = this.selectedStudentIds();
    return students.filter((s: EnrolledStudent) => selectedIds.includes(s.id));
  });

  selectedClassName = computed(() => {
    const classId = this.selectedClassId();
    const cls = this.availableClasses().find((c: ClassSummary) => c.id === classId);
    return cls ? cls.name : 'ChÆ°a chá»n lá»›p';
  });

  unassignedStudents = computed(() => {
    const students = this.enrolledStudents();
    if (this.distributionType() === 'ALL_STUDENTS') {
      return [];
    }
    const selectedIds = this.selectedStudentIds();
    return students.filter((s: EnrolledStudent) => !selectedIds.includes(s.id));
  });

  selectedCount = computed(() => {
    if (this.distributionType() === 'ALL_STUDENTS') {
      return this.enrolledStudents().length;
    }
    return this.selectedStudentIds().length;
  });

  ngOnInit(): void {
    this.distributionType.set(this.initialDistributionType());
    this.selectedStudentIds.set(this.initialStudentIds());
    this.selectedClassId.set(this.initialClassId());

    const courseId = this.courseId();
    if (courseId) {
      this.loadClasses(courseId);
    }

    // Start in assigned view if there are already assigned students
    if (this.initialStudentIds().length > 0 || this.initialClassId() || this.initialDistributionType() === 'ALL_STUDENTS') {
      this.viewMode.set('assigned');
    } else {
      this.viewMode.set('manage');
    }
  }

  private async loadClasses(courseId: string) {
    try {
      const classes = await firstValueFrom(this.classService.getClassesByCourse(courseId));
      this.availableClasses.set(classes);
    } catch (error) {
      console.error('Failed to load classes for distribution selector:', error);
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
    this.selectedStudentIds.set(current.filter((id: string) => id !== studentId));
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

    if (type !== 'SPECIFIC_STUDENTS') {
      this.selectedStudentIds.set([]);
    }

    if (type !== 'CLASS') {
      this.selectedClassId.set(null);
    }

    this.emitChange();
  }

  onClassChange(classId: string): void {
    this.selectedClassId.set(classId);
    this.validateAndEmit();
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
      this.selectedStudentIds.set(current.filter((id: string) => id !== studentId));
    }

    this.validateAndEmit();
  }

  isSelected(studentId: string): boolean {
    return this.selectedStudentIds().includes(studentId);
  }

  isIndividualAssignment(studentId: string): boolean {
    return this.individualStudentIds().includes(studentId);
  }

  selectAll(): void {
    const allIds = this.filteredStudents().map((s: EnrolledStudent) => s.id);
    const current = new Set(this.selectedStudentIds());
    allIds.forEach((id: string) => current.add(id));
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
      this.errorMessage.set('Vui lĂ²ng chá»n Ă­t nháº¥t má»™t há»c viĂªn');
    } else if (
      this.distributionType() === 'CLASS' &&
      !this.selectedClassId()
    ) {
      this.showError.set(true);
      this.errorMessage.set('Vui lĂ²ng chá»n má»™t lá»›p há»c');
    } else {
      this.showError.set(false);
    }

    this.emitChange();
  }

  private emitChange(): void {
    this.distributionChange.emit({
      distributionType: this.distributionType(),
      studentIds:
        this.distributionType() === 'SPECIFIC_STUDENTS'
          ? this.selectedStudentIds()
          : null,
      classId: this.selectedClassId(),
    });
  }

  // Public method for parent to validate
  validate(): boolean {
    if (
      this.distributionType() === 'SPECIFIC_STUDENTS' &&
      this.selectedStudentIds().length === 0
    ) {
      this.showError.set(true);
      this.errorMessage.set('Vui lĂ²ng chá»n Ă­t nháº¥t má»™t há»c viĂªn');
      return false;
    }
    if (
      this.distributionType() === 'CLASS' &&
      !this.selectedClassId()
    ) {
      this.showError.set(true);
      this.errorMessage.set('Vui lĂ²ng chá»n má»™t lá»›p há»c');
      return false;
    }
    return true;
  }

  // Get current settings
  getSettings(): DistributionSettings {
    return {
      distributionType: this.distributionType(),
      studentIds:
        this.distributionType() === 'SPECIFIC_STUDENTS'
          ? this.selectedStudentIds()
          : null,
      classId: this.selectedClassId(),
    };
  }
}

