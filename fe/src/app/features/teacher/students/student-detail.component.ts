import { Component, ChangeDetectionStrategy, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  StudentApi,
  StudentDetail,
  StudentCourseProgress,
  StudentAssignmentSummary
} from '../../../api/client/student.api';
import { StudentAssignmentsComponent, StudentAssignment } from './student-assignments.component';
import { AssignTaskModalComponent, AssignTaskRequest } from './assign-task-modal.component';
import { MessagesTabComponent } from './messages-tab.component';
import { DistributionService } from '../../../core/services/distribution.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-student-detail',
  imports: [
    CommonModule,
    RouterModule,
    StudentAssignmentsComponent,
    AssignTaskModalComponent,
    MessagesTabComponent
  ],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ student()?.name ? 'H\u1ecdc vi\u00ean: ' + student()!.name : 'Chi ti\u1ebft h\u1ecdc vi\u00ean' }}
        </h1>
        <a routerLink="/teacher/students" class="text-sm text-gray-600 underline">Quay l\u1ea1i danh s\u00e1ch</a>
      </div>

      @if (error()) {
        <div class="rounded-lg border border-red-200 bg-red-50 p-4">
          <p class="text-red-600">{{ error() }}</p>
          <button (click)="onReload()" class="mt-2 text-sm text-[#0056D2] underline">T\u1ea3i l\u1ea1i</button>
        </div>
      }

      @if (student()) {
        <div class="rounded-lg bg-white p-6 shadow">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div class="col-span-1 flex items-center gap-4">
              <div class="flex h-20 w-20 items-center justify-center rounded-full bg-[#0056D2] text-xl font-bold text-white">
                {{ getInitials(student()!.name) }}
              </div>
              <div>
                <h2 class="text-xl font-semibold text-gray-900">{{ student()!.name }}</h2>
                <p class="text-gray-600">{{ student()!.email }}</p>
                <p class="text-sm text-gray-500">
                  Tham gia:
                  {{ student()!.enrolledAt ? (student()!.enrolledAt | date:'dd/MM/yyyy') : 'Ch\u01b0a c\u00f3' }}
                </p>
                <p class="text-sm text-gray-500">
                  Truy c\u1eadp cu\u1ed1i:
                  {{ student()!.lastAccessed ? (student()!.lastAccessed | date:'dd/MM/yyyy HH:mm') : 'Ch\u01b0a c\u00f3' }}
                </p>
              </div>
            </div>

            <div class="col-span-2">
              <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-[#0056D2]">{{ student()!.progress }}%</div>
                  <div class="text-sm text-gray-500">Ti\u1ebfn \u0111\u1ed9 t\u1ed5ng</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">{{ student()!.averageGrade.toFixed(1) }}</div>
                  <div class="text-sm text-gray-500">\u0110i\u1ec3m TB</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-purple-600">{{ student()!.completedCourses }}</div>
                  <div class="text-sm text-gray-500">Ho\u00e0n th\u00e0nh</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-orange-600">{{ student()!.totalCourses }}</div>
                  <div class="text-sm text-gray-500">T\u1ed5ng kh\u00f3a h\u1ecdc</div>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between gap-3">
                <span
                  class="inline-flex rounded-full px-3 py-1 text-sm font-semibold"
                  [class.bg-green-100]="student()!.status === 'ACTIVE'"
                  [class.text-green-800]="student()!.status === 'ACTIVE'"
                  [class.bg-blue-100]="student()!.status === 'COMPLETED'"
                  [class.text-blue-800]="student()!.status === 'COMPLETED'"
                  [class.bg-gray-100]="student()!.status === 'DROPPED' || student()!.status === 'EXPIRED'"
                  [class.text-gray-800]="student()!.status === 'DROPPED' || student()!.status === 'EXPIRED'"
                  [class.bg-red-100]="student()!.status === 'SUSPENDED'"
                  [class.text-red-800]="student()!.status === 'SUSPENDED'"
                >
                  {{ getStatusText(student()!.status) }}
                </span>

                <div class="flex gap-2">
                  <button
                    (click)="sendMessage()"
                    class="rounded-lg bg-[#0056D2] px-4 py-2 text-sm text-white hover:bg-[#004BB5]"
                  >
                    Nh\u1eafn tin
                  </button>
                  <button
                    (click)="exportReport()"
                    class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Xu\u1ea5t b\u00e1o c\u00e1o
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      @if (student()) {
        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="mb-4 text-lg font-semibold text-gray-900">Ti\u1ebfn \u0111\u1ed9 kh\u00f3a h\u1ecdc</h3>

          @if (courseProgress().length > 0) {
            <div class="space-y-4">
              @for (course of courseProgress(); track course.courseId) {
                <div class="rounded-lg border p-4">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <h4 class="font-medium text-gray-900">{{ course.courseTitle }}</h4>
                    <span
                      class="rounded-full px-2 py-1 text-xs font-semibold"
                      [class.bg-[#0056D2]/10]="course.status === 'in-progress'"
                      [class.text-[#004BB5]]="course.status === 'in-progress'"
                      [class.bg-green-100]="course.status === 'completed'"
                      [class.text-green-800]="course.status === 'completed'"
                      [class.bg-gray-100]="course.status === 'dropped'"
                      [class.text-gray-800]="course.status === 'dropped'"
                    >
                      {{ getCourseStatusText(course.status) }}
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center">
                      <div class="mr-2 h-2 w-24 rounded-full bg-gray-200">
                        <div class="h-2 rounded-full bg-[#0056D2]" [style.width.%]="course.progress"></div>
                      </div>
                      <span>{{ course.progress }}%</span>
                    </div>
                    <span>{{ course.completedLessons }}/{{ course.totalLessons }} b\u00e0i h\u1ecdc</span>
                    @if (course.grade !== null && course.grade !== undefined) {
                      <span>\u0110i\u1ec3m: {{ course.grade.toFixed(1) }}</span>
                    }
                    <span>Tham gia: {{ course.enrolledAt | date:'dd/MM/yyyy' }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="py-8 text-center text-gray-500">H\u1ecdc vi\u00ean ch\u01b0a tham gia kh\u00f3a h\u1ecdc n\u00e0o.</p>
          }
        </div>
      }

      @if (student()) {
        <div class="rounded-lg bg-white shadow">
          <div class="border-b">
            <nav class="-mb-px flex">
              <button
                (click)="activeTab.set('assignments')"
                class="border-b-2 px-6 py-4 text-sm font-medium transition-colors"
                [class.border-[#0056D2]]="activeTab() === 'assignments'"
                [class.text-[#0056D2]]="activeTab() === 'assignments'"
                [class.border-transparent]="activeTab() !== 'assignments'"
                [class.text-gray-500]="activeTab() !== 'assignments'"
                [class.hover:text-gray-700]="activeTab() !== 'assignments'"
              >
                <span class="flex items-center gap-2">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  B\u00e0i t\u1eadp
                </span>
              </button>
              <button
                (click)="activeTab.set('messages')"
                class="border-b-2 px-6 py-4 text-sm font-medium transition-colors"
                [class.border-[#0056D2]]="activeTab() === 'messages'"
                [class.text-[#0056D2]]="activeTab() === 'messages'"
                [class.border-transparent]="activeTab() !== 'messages'"
                [class.text-gray-500]="activeTab() !== 'messages'"
                [class.hover:text-gray-700]="activeTab() !== 'messages'"
              >
                <span class="flex items-center gap-2">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    ></path>
                  </svg>
                  Tin nh\u1eafn
                </span>
              </button>
            </nav>
          </div>

          <div class="p-6">
            @if (activeTab() === 'assignments') {
              <app-student-assignments
                #studentAssignments
                [studentId]="studentId"
                [studentName]="student()!.name"
                (assignTask)="openAssignTaskModal()"
                (removeAssignment)="onRemoveAssignment($event)"
              ></app-student-assignments>
            }

            @if (activeTab() === 'messages') {
              <app-messages-tab
                [studentId]="studentId"
                [studentName]="student()!.name"
              ></app-messages-tab>
            }
          </div>
        </div>
      }
    </div>

    @if (showAssignTaskModal()) {
      <app-assign-task-modal
        [studentId]="studentId"
        [studentName]="student()!.name"
        [studentCourseIds]="getStudentCourseIds()"
        (confirm)="onAssignTaskConfirm($event)"
        (cancel)="closeAssignTaskModal()"
      ></app-assign-task-modal>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentDetailComponent {
  private route = inject(ActivatedRoute);
  private studentApi = inject(StudentApi);
  private distributionService = inject(DistributionService);
  private toast = inject(ToastService);

  readonly studentAssignmentsRef = viewChild.required<StudentAssignmentsComponent>('studentAssignments');

  studentId = this.route.snapshot.paramMap.get('id') || '';

  student = signal<StudentDetail | null>(null);
  courseProgress = signal<StudentCourseProgress[]>([]);
  assignments = signal<StudentAssignmentSummary[]>([]);
  error = signal('');
  showAssignTaskModal = signal(false);
  activeTab = signal<'assignments' | 'messages'>('assignments');

  constructor() {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'messages') {
      this.activeTab.set('messages');
    }

    this.loadStudent();
  }

  private loadStudent() {
    if (!this.studentId) {
      this.error.set('ID h\u1ecdc vi\u00ean kh\u00f4ng h\u1ee3p l\u1ec7.');
      return;
    }

    this.error.set('');

    this.studentApi.getStudentDetail(this.studentId).subscribe({
      next: (response) => {
        if (response.data) {
          this.student.set(response.data);
          this.courseProgress.set(response.data.courseProgress || []);
          this.assignments.set(response.data.assignmentSubmissions || []);
        } else {
          this.error.set('Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin h\u1ecdc vi\u00ean.');
          this.toast.error('Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin h\u1ecdc vi\u00ean.');
        }
      },
      error: () => {
        this.error.set('Kh\u00f4ng th\u1ec3 t\u1ea3i th\u00f4ng tin h\u1ecdc vi\u00ean.');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: '\u0110ang h\u1ecdc',
      COMPLETED: 'Ho\u00e0n th\u00e0nh',
      DROPPED: '\u0110\u00e3 d\u1eebng',
      EXPIRED: 'H\u1ebft h\u1ea1n',
      SUSPENDED: 'T\u1ea1m kh\u00f3a'
    };
    return statusMap[status] || status;
  }

  getCourseStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'in-progress': '\u0110ang h\u1ecdc',
      completed: 'Ho\u00e0n th\u00e0nh',
      dropped: '\u0110\u00e3 d\u1eebng'
    };
    return statusMap[status] || status;
  }

  getAssignmentStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Ch\u01b0a n\u1ed9p',
      submitted: '\u0110\u00e3 n\u1ed9p',
      graded: '\u0110\u00e3 ch\u1ea5m',
      overdue: 'Qu\u00e1 h\u1ea1n'
    };
    return statusMap[status] || status;
  }

  sendMessage() {
    this.activeTab.set('messages');
  }

  exportReport() {
    this.studentApi.exportStudentReport(this.studentId, 'pdf').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-report-${this.studentId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.toast.error('Kh\u00f4ng th\u1ec3 xu\u1ea5t b\u00e1o c\u00e1o. Vui l\u00f2ng th\u1eed l\u1ea1i.');
      }
    });
  }

  onReload() {
    this.loadStudent();
  }

  openAssignTaskModal(): void {
    this.showAssignTaskModal.set(true);
  }

  closeAssignTaskModal(): void {
    this.showAssignTaskModal.set(false);
  }

  onAssignTaskConfirm(request: AssignTaskRequest): void {
    this.distributionService.assignIndividualTask(
      request.assignmentId,
      request.studentId,
      request.customDeadline,
      request.note
    ).subscribe({
      next: () => {
        this.closeAssignTaskModal();
        this.toast.success('\u0110\u00e3 giao b\u00e0i t\u1eadp th\u00e0nh c\u00f4ng.');
        const studentAssignmentsRef = this.studentAssignmentsRef();
        if (studentAssignmentsRef) {
          studentAssignmentsRef.refresh();
        }
      },
      error: () => {
        this.closeAssignTaskModal();
        this.toast.error('Kh\u00f4ng th\u1ec3 giao b\u00e0i t\u1eadp. Vui l\u00f2ng th\u1eed l\u1ea1i.');
        const studentAssignmentsRef = this.studentAssignmentsRef();
        if (studentAssignmentsRef) {
          studentAssignmentsRef.refresh();
        }
      }
    });
  }

  onRemoveAssignment(assignment: StudentAssignment): void {
    this.distributionService.removeIndividualAssignment(
      assignment.assignmentId,
      this.studentId
    ).subscribe({
      next: () => {
        this.toast.success('\u0110\u00e3 g\u1ee1 b\u00e0i t\u1eadp kh\u1ecfi h\u1ecdc vi\u00ean.');
        const studentAssignmentsRef = this.studentAssignmentsRef();
        if (studentAssignmentsRef) {
          studentAssignmentsRef.refresh();
        }
      },
      error: () => {
        this.toast.error('Kh\u00f4ng th\u1ec3 g\u1ee1 b\u00e0i t\u1eadp. Vui l\u00f2ng th\u1eed l\u1ea1i.');
      }
    });
  }

  getStudentCourseIds(): string[] {
    return this.courseProgress().map(cp => cp.courseId);
  }
}
