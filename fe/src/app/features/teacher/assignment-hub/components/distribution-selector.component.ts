import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClassService } from '../../../../state/class.service';
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

@Component({
  selector: 'app-distribution-selector',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './distribution-selector.component.html',
})
export class DistributionSelectorComponent {
  enrolledStudents = input<EnrolledStudent[]>([]);
  initialDistributionType = input<DistributionType>('ALL_STUDENTS');
  initialStudentIds = input<string[]>([]);
  individualStudentIds = input<string[]>([]);
  courseId = input<string | null>(null);
  initialClassId = input<string | null>(null);
  supportsClassDistribution = input<boolean>(true);

  distributionChange = output<DistributionSettings>();

  private classService = inject(ClassService);

  viewMode = signal<ViewMode>('assigned');
  distributionType = signal<DistributionType>('ALL_STUDENTS');
  selectedStudentIds = signal<string[]>([]);
  availableClasses = signal<ClassSummary[]>([]);
  selectedClassId = signal<string | null>(null);
  classStudents = signal<EnrolledStudent[]>([]);
  loadingClassStudents = signal(false);
  searchQuery = '';
  searchSignal = signal('');
  showError = signal(false);
  errorMessage = signal('');

  filteredStudents = computed(() => {
    const query = this.searchSignal().toLowerCase();
    const students = this.enrolledStudents();

    if (!query) {
      return students;
    }

    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
    );
  });

  assignedStudents = computed(() => {
    const students = this.enrolledStudents();

    if (this.distributionType() === 'ALL_STUDENTS') {
      return students;
    }

    if (this.distributionType() === 'CLASS') {
      return this.classStudents();
    }

    const selectedIds = this.selectedStudentIds();
    return students.filter((student) => selectedIds.includes(student.id));
  });

  selectedClassName = computed(() => {
    const classId = this.selectedClassId();
    const learningClass = this.availableClasses().find((item) => item.id === classId);
    return learningClass ? learningClass.name : 'Chua chon lop';
  });

  unassignedStudents = computed(() => {
    const students = this.enrolledStudents();

    if (this.distributionType() === 'ALL_STUDENTS') {
      return [];
    }

    if (this.distributionType() === 'CLASS') {
      const classStudentIds = new Set(this.classStudents().map((student) => student.id));
      return students.filter((student) => !classStudentIds.has(student.id));
    }

    const selectedIds = this.selectedStudentIds();
    return students.filter((student) => !selectedIds.includes(student.id));
  });

  selectedCount = computed(() => {
    if (this.distributionType() === 'ALL_STUDENTS') {
      return this.enrolledStudents().length;
    }

    if (this.distributionType() === 'CLASS') {
      return this.classStudents().length;
    }

    return this.selectedStudentIds().length;
  });

  availableDistributionTypes = computed<DistributionType[]>(() => (
    this.supportsClassDistribution()
      ? ['ALL_STUDENTS', 'CLASS', 'SPECIFIC_STUDENTS']
      : ['ALL_STUDENTS']
  ));

  constructor() {
    effect(
      () => {
        const courseId = this.courseId();

        if (!courseId) {
          this.availableClasses.set([]);
          return;
        }

        void this.loadClasses(courseId);
      },
      { allowSignalWrites: true }
    );

    effect(
      () => {
        const distributionType = this.initialDistributionType();
        const studentIds = [...this.initialStudentIds()];
        const classId = this.initialClassId();
        const supportsClassDistribution = this.supportsClassDistribution();

        const normalizedDistributionType = supportsClassDistribution
          ? distributionType
          : 'ALL_STUDENTS';
        const normalizedStudentIds = supportsClassDistribution ? studentIds : [];
        const normalizedClassId = supportsClassDistribution ? classId : null;

        this.distributionType.set(normalizedDistributionType);
        this.selectedStudentIds.set(normalizedStudentIds);
        this.selectedClassId.set(normalizedClassId);
        this.showError.set(false);

        this.viewMode.set(
          normalizedDistributionType === 'ALL_STUDENTS' || normalizedStudentIds.length > 0 || !!normalizedClassId
            ? 'assigned'
            : 'manage'
        );

        if (normalizedDistributionType === 'CLASS' && normalizedClassId) {
          void this.loadClassStudents(normalizedClassId);
        } else {
          this.classStudents.set([]);
        }
      },
      { allowSignalWrites: true }
    );

    effect(
      () => {
        if (this.supportsClassDistribution()) {
          return;
        }

        if (this.distributionType() !== 'ALL_STUDENTS') {
          this.distributionType.set('ALL_STUDENTS');
        }

        if (this.selectedStudentIds().length > 0) {
          this.selectedStudentIds.set([]);
        }

        if (this.selectedClassId() !== null) {
          this.selectedClassId.set(null);
        }

        if (this.classStudents().length > 0) {
          this.classStudents.set([]);
        }
      },
      { allowSignalWrites: true }
    );
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'assigned' ? 'manage' : 'assigned');
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  removeStudent(studentId: string): void {
    this.selectedStudentIds.set(
      this.selectedStudentIds().filter((id) => id !== studentId)
    );
    this.emitChange();
  }

  saveAndViewAssigned(): void {
    if (this.validate()) {
      this.emitChange();
      this.viewMode.set('assigned');
    }
  }

  onDistributionTypeChange(type: DistributionType): void {
    if (!this.availableDistributionTypes().includes(type)) {
      return;
    }

    this.distributionType.set(type);
    this.showError.set(false);

    if (type !== 'SPECIFIC_STUDENTS') {
      this.selectedStudentIds.set([]);
    }

    if (type !== 'CLASS') {
      this.selectedClassId.set(null);
      this.classStudents.set([]);
    }

    this.emitChange();
  }

  onClassChange(classId: string | null): void {
    const normalizedClassId = classId || null;
    this.selectedClassId.set(normalizedClassId);

    if (normalizedClassId) {
      void this.loadClassStudents(normalizedClassId);
    } else {
      this.classStudents.set([]);
    }

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
      this.selectedStudentIds.set(current.filter((id) => id !== studentId));
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
    const allIds = this.filteredStudents().map((student) => student.id);
    const current = new Set(this.selectedStudentIds());
    allIds.forEach((id) => current.add(id));
    this.selectedStudentIds.set(Array.from(current));
    this.validateAndEmit();
  }

  deselectAll(): void {
    this.selectedStudentIds.set([]);
    this.validateAndEmit();
  }

  validate(): boolean {
    if (
      this.distributionType() === 'SPECIFIC_STUDENTS' &&
      this.selectedStudentIds().length === 0
    ) {
      this.showError.set(true);
      this.errorMessage.set('Vui long chon it nhat mot hoc vien');
      return false;
    }

    if (this.distributionType() === 'CLASS' && !this.selectedClassId()) {
      this.showError.set(true);
      this.errorMessage.set('Vui long chon mot lop hoc');
      return false;
    }

    this.showError.set(false);
    return true;
  }

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

  private async loadClasses(courseId: string): Promise<void> {
    try {
      const classes = await firstValueFrom(this.classService.getClassesByCourse(courseId));
      this.availableClasses.set(classes ?? []);
    } catch {
      this.availableClasses.set([]);
    }
  }

  private async loadClassStudents(classId: string): Promise<void> {
    this.loadingClassStudents.set(true);

    try {
      const response = await firstValueFrom(this.classService.getClassStudents(classId));
      const students = this.mapClassStudents(response);
      this.classStudents.set(students);
    } catch {
      this.classStudents.set([]);
    } finally {
      this.loadingClassStudents.set(false);
    }
  }

  private mapClassStudents(response: unknown): EnrolledStudent[] {
    const items = Array.isArray(response)
      ? response
      : Array.isArray((response as { content?: unknown[] } | null)?.content)
        ? ((response as { content: unknown[] }).content)
        : [];

    const enrolledById = new Map(
      this.enrolledStudents().map((student) => [student.id, student])
    );

    return items.map((item) => {
      const source = item as Record<string, unknown>;
      const studentId = String(source['studentId'] ?? source['id'] ?? '');
      const fallbackStudent = enrolledById.get(studentId);
      return {
        id: studentId,
        name: String(
          source['studentName'] ??
            source['fullName'] ??
            source['name'] ??
            fallbackStudent?.name ??
            'Unknown'
        ),
        email: String(
          source['studentEmail'] ??
            source['email'] ??
            fallbackStudent?.email ??
            ''
        ),
        enrolledAt: String(
          source['enrolledAt'] ??
            source['createdAt'] ??
            fallbackStudent?.enrolledAt ??
            ''
        ),
      };
    });
  }

  private validateAndEmit(): void {
    this.validate();
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
}
