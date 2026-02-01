import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AssignmentDetail, UpdateAssignmentRequest } from '../../../api/client/assignment.api';
import { AssignmentStateService } from './services/assignment-state.service';
import { validateMaxScore } from './utils/assignment-validators';
import { DistributionSelectorComponent, DistributionSettings } from '../assignment-hub/components/distribution-selector.component';
import { CourseApi } from '../../../api/client/course.api';

type AssignmentStatus = 'pending' | 'published' | 'closed' | 'DRAFT' | 'PUBLISHED' | 'CLOSED';

interface EnrolledStudentData {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
}

/**
 * Assignment Editor Component
 * 
 * Form for editing existing assignments with status management.
 * Integrates with AssignmentStateService for state management.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4
 */
@Component({
  selector: 'app-assignment-editor',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, DistributionSelectorComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './assignment-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignmentEditorComponent implements OnInit {
  private assignmentState = inject(AssignmentStateService);
  private courseApi = inject(CourseApi);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Route param
  assignmentId = '';

  // State signals
  assignment = signal<AssignmentDetail | null>(null);
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');
  showDeleteConfirm = signal(false);

  // Distribution state
  enrolledStudents = signal<EnrolledStudentData[]>([]);
  loadingStudents = signal(false);
  distributionSettings = signal<DistributionSettings | null>(null);

  // Original values for change detection
  private originalValues = signal<Record<string, unknown>>({});
  private originalDistributionSettings = signal<DistributionSettings | null>(null);

  // Reactive form
  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    instructions: [''],
    dueDate: [''],
    maxScore: [100, [Validators.min(1), Validators.max(1000)]],
    status: ['pending' as AssignmentStatus]
  });

  // Computed: Check if form has changes
  hasChanges = computed(() => {
    const currentForm = this.form.getRawValue();
    const originalForm = this.originalValues();
    const formChanged = JSON.stringify(currentForm) !== JSON.stringify(originalForm);

    const currentDist = this.distributionSettings();
    const originalDist = this.originalDistributionSettings();
    const distChanged = JSON.stringify(currentDist) !== JSON.stringify(originalDist);

    const result = formChanged || distChanged;
    console.log('hasChanges check:', { formChanged, distChanged, result });
    
    return result;
  });

  ngOnInit(): void {
    // Check current route params first, then parent route params (since this is a child route)
    this.assignmentId = this.route.snapshot.paramMap.get('id') ||
      this.route.parent?.snapshot.paramMap.get('id') || '';

    if (this.assignmentId) {
      this.loadAssignment();
    } else {
      this.error.set('ID bĂ i táº­p khĂ´ng há»£p lá»‡');
    }
  }

  /**
   * Loads assignment data from API
   */
  loadAssignment(): void {
    this.loading.set(true);
    this.error.set('');

    this.assignmentState.loadAssignment(this.assignmentId).subscribe({
      next: () => {
        const assignment = this.assignmentState.currentAssignment();
        if (assignment) {
          this.assignment.set(assignment);
          this.populateForm(assignment);
          this.loadEnrolledStudents(assignment.courseId);
        } else {
          this.error.set('KhĂ´ng tĂ¬m tháº¥y bĂ i táº­p');
        }
      },
      error: (err: unknown) => {
        console.error('Error loading assignment:', err);
        this.error.set('KhĂ´ng thá»ƒ táº£i thĂ´ng tin bĂ i táº­p');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  /**
   * Populates form with assignment data
   */
  private populateForm(assignment: AssignmentDetail): void {
    // Format dueDate for datetime-local input
    let dueDate = '';
    if (assignment.dueDate) {
      const date = new Date(assignment.dueDate);
      dueDate = date.toISOString().slice(0, 16); // Format: yyyy-MM-ddTHH:mm
    }

    // Normalize status
    const status = this.normalizeStatus(assignment.status);

    const values = {
      title: assignment.title,
      description: assignment.description || '',
      instructions: assignment.instructions || '',
      dueDate: dueDate,
      maxScore: assignment.maxScore || 100,
      status: status
    };

    this.form.patchValue(values);
    this.originalValues.set(values);

    // Set distribution settings
    const distSettings: DistributionSettings = {
      distributionType: (assignment.distributionType as 'CLASS' | 'SPECIFIC_STUDENTS' | 'ALL_STUDENTS') || 'ALL_STUDENTS',
      studentIds: assignment.allocatedStudentIds || [],
      classId: assignment.classId || null
    };
    this.distributionSettings.set(distSettings);
    this.originalDistributionSettings.set(distSettings);
  }

  /**
   * Normalizes status to lowercase
   */
  private normalizeStatus(status: string): AssignmentStatus {
    const statusMap: Record<string, AssignmentStatus> = {
      'DRAFT': 'pending',
      'PUBLISHED': 'published',
      'CLOSED': 'closed',
      'pending': 'pending',
      'published': 'published',
      'closed': 'closed'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    console.log('onSubmit called');
    console.log('Form valid:', this.form.valid);
    console.log('Has changes:', this.hasChanges());
    
    if (this.form.invalid) {
      console.log('Form invalid, returning');
      return;
    }

    this.formError.set('');
    this.success.set('');

    const formValue = this.form.getRawValue();
    console.log('Form value:', formValue);

    // Validate maxScore
    if (formValue.maxScore) {
      const validation = validateMaxScore(formValue.maxScore);
      if (!validation.isValid) {
        this.formError.set(validation.errors[0]?.message || 'Äiá»ƒm tá»‘i Ä‘a khĂ´ng há»£p lá»‡');
        return;
      }
    }

    // Convert dueDate to ISO string
    let dueDateInstant: string | undefined;
    if (formValue.dueDate) {
      try {
        const date = new Date(formValue.dueDate);
        dueDateInstant = date.toISOString();
      } catch {
        this.formError.set('Äá»‹nh dáº¡ng ngĂ y háº¡n ná»™p khĂ´ng há»£p lá»‡');
        return;
      }
    }

    this.saving.set(true);

    const distSettings = this.distributionSettings();
    console.log('Distribution settings:', distSettings);

    const request: UpdateAssignmentRequest = {
      title: formValue.title || undefined,
      description: formValue.description || undefined,
      instructions: formValue.instructions || undefined,
      dueDate: dueDateInstant,
      maxScore: formValue.maxScore || undefined,
      status: formValue.status || undefined,
      studentIds: distSettings?.distributionType === 'SPECIFIC_STUDENTS' ? distSettings.studentIds || [] : undefined,
      distributionType: distSettings?.distributionType
    };

    console.log('Update request:', request);
    console.log('Assignment ID:', this.assignmentId);

    this.assignmentState.updateAssignment(this.assignmentId, request).subscribe({
      next: (result: unknown) => {
        console.log('Update result:', result);
        if (result) {
          this.success.set('ÄĂ£ lÆ°u thay Ä‘á»•i!');
          // Update original values
          this.originalValues.set(this.form.getRawValue());
          this.originalDistributionSettings.set(this.distributionSettings());
          // Clear success after 3 seconds
          setTimeout(() => this.success.set(''), 3000);
        } else {
          console.error('Update failed:', this.assignmentState.error());
          this.formError.set(this.assignmentState.error() || 'Cáº­p nháº­t tháº¥t báº¡i');
        }
      },
      error: (err: unknown) => {
        console.error('Error updating assignment:', err);
        this.formError.set('Cáº­p nháº­t bĂ i táº­p tháº¥t báº¡i');
      },
      complete: () => {
        console.log('Update complete');
        this.saving.set(false);
      }
    });
  }

  /**
   * Resets form to original values
   */
  resetForm(): void {
    const original = this.originalValues();
    this.form.patchValue(original);
    this.formError.set('');
    this.success.set('');
  }

  /**
   * Shows delete confirmation modal
   */
  onDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  /**
   * Confirms and executes delete
   */
  confirmDelete(): void {
    this.deleting.set(true);

    this.assignmentState.deleteAssignment(this.assignmentId).subscribe({
      next: (success: unknown) => {
        if (success) {
          this.router.navigate(['/teacher/assignments']);
        } else {
          this.formError.set(this.assignmentState.error() || 'XĂ³a bĂ i táº­p tháº¥t báº¡i');
          this.showDeleteConfirm.set(false);
        }
      },
      error: (err: unknown) => {
        console.error('Error deleting assignment:', err);
        this.formError.set('XĂ³a bĂ i táº­p tháº¥t báº¡i');
        this.showDeleteConfirm.set(false);
      },
      complete: () => {
        this.deleting.set(false);
      }
    });
  }

  // UI Helpers
  getStatusLabel(): string {
    const status = this.form.get('status')?.value;
    const labels: Record<string, string> = {
      'pending': 'NhĂ¡p',
      'published': 'ÄĂ£ xuáº¥t báº£n',
      'closed': 'ÄĂ£ Ä‘Ă³ng'
    };
    return labels[status || ''] || 'KhĂ´ng xĂ¡c Ä‘á»‹nh';
  }

  getStatusBannerClass(): string {
    const status = this.form.get('status')?.value;
    const classes: Record<string, string> = {
      'pending': 'bg-yellow-50',
      'published': 'bg-green-50',
      'closed': 'bg-gray-100'
    };
    return classes[status || ''] || 'bg-gray-50';
  }

  getStatusBadgeClass(): string {
    const status = this.form.get('status')?.value;
    const classes: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'published': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-200 text-gray-800'
    };
    return classes[status || ''] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Loads enrolled students for the course
   */
  private loadEnrolledStudents(courseId: string): void {
    if (!courseId) return;

    this.loadingStudents.set(true);
    this.courseApi.getEnrolledStudents(courseId).subscribe({
      next: (response: { data?: any[] }) => {
        if (response.data) {
          const students: EnrolledStudentData[] = response.data.map(s => ({
            id: s.id,
            name: s.fullName || s.name || 'Unknown',
            email: s.email || '',
            enrolledAt: s.enrolledAt || new Date().toISOString()
          }));
          this.enrolledStudents.set(students);
        }
      },
      error: (err: unknown) => {
        console.error('Error loading enrolled students:', err);
        this.enrolledStudents.set([]);
      },
      complete: () => {
        this.loadingStudents.set(false);
      }
    });
  }

  // Distribution handlers
  onDistributionChange(settings: DistributionSettings): void {
    this.distributionSettings.set(settings);
    // You might want to update form validity or touched state here if needed
  }
}

