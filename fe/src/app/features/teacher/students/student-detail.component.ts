import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentApi, StudentDetail, StudentCourseProgress, StudentAssignmentSummary } from '../../../api/client/student.api';
import { StudentAssignmentsComponent, StudentAssignment } from './student-assignments.component';
import { AssignTaskModalComponent, AssignTaskRequest } from './assign-task-modal.component';
import { MessagesTabComponent } from './messages-tab.component';
import { DistributionService } from '../../../core/services/distribution.service';

@Component({
  selector: 'app-student-detail',
  imports: [CommonModule, RouterModule, StudentAssignmentsComponent, AssignTaskModalComponent, MessagesTabComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ student()?.name ? 'Học viên: ' + student()!.name : 'Chi tiết học viên' }}
        </h1>
        <a routerLink="/teacher/students" class="text-sm text-gray-600 underline">Quay lại danh sách</a>
      </div>
    
      <!-- Error State -->
      @if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-600">{{ error() }}</p>
          <button (click)="onReload()" class="mt-2 text-blue-600 underline text-sm">Tải lại</button>
        </div>
      }
    
      <!-- Student Info -->
      @if (student()) {
        <div class="bg-white rounded-lg shadow p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="col-span-1 flex items-center gap-4">
              <div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold">
                {{ getInitials(student()!.name) }}
              </div>
              <div>
                <h2 class="text-xl font-semibold text-gray-900">{{ student()!.name }}</h2>
                <p class="text-gray-600">{{ student()!.email }}</p>
                <p class="text-sm text-gray-500">Tham gia: {{ student()!.enrolledAt | date:'dd/MM/yyyy' }}</p>
                <p class="text-sm text-gray-500">Truy cập cuối: {{ student()!.lastAccessed ? (student()!.lastAccessed | date:'dd/MM/yyyy HH:mm') : 'Chưa có' }}</p>
              </div>
            </div>
            <div class="col-span-2">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-600">{{ student()!.progress }}%</div>
                  <div class="text-sm text-gray-500">Tiến độ tổng</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">{{ student()!.averageGrade.toFixed(1) }}</div>
                  <div class="text-sm text-gray-500">Điểm TB</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-purple-600">{{ student()!.completedCourses }}</div>
                  <div class="text-sm text-gray-500">Hoàn thành</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-orange-600">{{ student()!.totalCourses }}</div>
                  <div class="text-sm text-gray-500">Tổng khóa học</div>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between">
                <span class="px-3 py-1 inline-flex text-sm font-semibold rounded-full"
                  [class.bg-green-100]="student()!.status === 'active'"
                  [class.text-green-800]="student()!.status === 'active'"
                  [class.bg-gray-100]="student()!.status === 'inactive'"
                  [class.text-gray-800]="student()!.status === 'inactive'"
                  [class.bg-red-100]="student()!.status === 'suspended'"
                  [class.text-red-800]="student()!.status === 'suspended'">
                  {{ getStatusText(student()!.status) }}
                </span>
                <div class="flex gap-2">
                  <button (click)="sendMessage()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Nhắn tin
                  </button>
                  <button (click)="exportReport()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                    Xuất báo cáo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    
      <!-- Course Progress -->
      @if (student()) {
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Tiến độ khóa học</h3>
          @if (courseProgress().length > 0) {
            <div class="space-y-4">
              @for (course of courseProgress(); track course) {
                <div class="border rounded-lg p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-gray-900">{{ course.courseTitle }}</h4>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full"
                      [class.bg-blue-100]="course.status === 'in-progress'"
                      [class.text-blue-800]="course.status === 'in-progress'"
                      [class.bg-green-100]="course.status === 'completed'"
                      [class.text-green-800]="course.status === 'completed'"
                      [class.bg-gray-100]="course.status === 'dropped'"
                      [class.text-gray-800]="course.status === 'dropped'">
                      {{ getCourseStatusText(course.status) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center">
                      <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="course.progress"></div>
                      </div>
                      <span>{{ course.progress }}%</span>
                    </div>
                    <span>{{ course.completedLessons }}/{{ course.totalLessons }} bài học</span>
                    @if (course.grade) {
                      <span>Điểm: {{ course.grade.toFixed(1) }}</span>
                    }
                    <span>Tham gia: {{ course.enrolledAt | date:'dd/MM/yyyy' }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-gray-500 text-center py-8">Học viên chưa tham gia khóa học nào.</p>
          }
        </div>
      }
    
      <!-- Tabs -->
      @if (student()) {
        <div class="bg-white rounded-lg shadow">
          <!-- Tab Headers -->
          <div class="border-b">
            <nav class="flex -mb-px">
              <button
                (click)="activeTab.set('assignments')"
                class="px-6 py-4 text-sm font-medium border-b-2 transition-colors"
                [class.border-blue-600]="activeTab() === 'assignments'"
                [class.text-blue-600]="activeTab() === 'assignments'"
                [class.border-transparent]="activeTab() !== 'assignments'"
                [class.text-gray-500]="activeTab() !== 'assignments'"
                [class.hover:text-gray-700]="activeTab() !== 'assignments'"
                >
                <span class="flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Bài tập
                </span>
              </button>
              <button
                (click)="activeTab.set('messages')"
                class="px-6 py-4 text-sm font-medium border-b-2 transition-colors"
                [class.border-blue-600]="activeTab() === 'messages'"
                [class.text-blue-600]="activeTab() === 'messages'"
                [class.border-transparent]="activeTab() !== 'messages'"
                [class.text-gray-500]="activeTab() !== 'messages'"
                [class.hover:text-gray-700]="activeTab() !== 'messages'"
                >
                <span class="flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                  Tin nhắn
                </span>
              </button>
            </nav>
          </div>
          <!-- Tab Content -->
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
    
    <!-- Assign Task Modal -->
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

  readonly studentAssignmentsRef = viewChild.required<StudentAssignmentsComponent>('studentAssignments');

  studentId = this.route.snapshot.paramMap.get('id') || '';
  
  student = signal<StudentDetail | null>(null);
  courseProgress = signal<StudentCourseProgress[]>([]);
  assignments = signal<StudentAssignmentSummary[]>([]);
  error = signal('');
  showAssignTaskModal = signal(false);
  activeTab = signal<'assignments' | 'messages'>('assignments');

  constructor() {
    // Check for tab query param
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'messages') {
      this.activeTab.set('messages');
    }
    
    this.loadStudent();
  }

  private loadStudent() {
    if (!this.studentId) {
      this.error.set('ID học viên không hợp lệ');
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
          // Mock data for development
          const mockStudent: StudentDetail = {
            id: this.studentId,
            name: 'Nguyễn Văn An',
            email: 'nguyenvanan@email.com',
            enrolledAt: '2025-09-01T00:00:00Z',
            lastAccessed: '2025-10-13T10:30:00Z',
            progress: 75,
            averageGrade: 8.5,
            status: 'active',
            completedCourses: 2,
            totalCourses: 3,
            courseProgress: [
              {
                courseId: '1',
                courseTitle: 'An toàn Hàng hải Cơ bản',
                enrolledAt: '2025-09-01T00:00:00Z',
                progress: 80,
                completedLessons: 8,
                totalLessons: 10,
                lastAccessed: '2025-10-13T09:00:00Z',
                grade: 8.5,
                status: 'in-progress'
              },
              {
                courseId: '2',
                courseTitle: 'Điều hướng Maritime',
                enrolledAt: '2025-09-15T00:00:00Z',
                progress: 100,
                completedLessons: 6,
                totalLessons: 6,
                lastAccessed: '2025-10-10T16:00:00Z',
                grade: 9.2,
                status: 'completed'
              }
            ],
            assignmentSubmissions: [
              {
                assignmentId: '1',
                assignmentTitle: 'Bài tập về An toàn Hàng hải',
                courseTitle: 'An toàn Hàng hải Cơ bản',
                dueDate: '2025-10-20T23:59:59Z',
                submittedAt: '2025-10-18T14:30:00Z',
                status: 'graded',
                score: 85,
                maxScore: 100,
                feedback: 'Bài làm tốt, cần chú ý thêm về phần SOLAS'
              }
            ],
            analytics: {
              totalStudyTime: 1200,
              averageSessionTime: 45,
              streakDays: 7,
              assignmentsCompleted: 5,
              assignmentsOverdue: 0,
              averageScore: 8.5,
              strongSubjects: ['An toàn hàng hải'],
              improvementAreas: ['Điều hướng'],
              learningActivity: []
            }
          };
          
          this.student.set(mockStudent);
          this.courseProgress.set(mockStudent.courseProgress);
          this.assignments.set(mockStudent.assignmentSubmissions);
        }
      },
      error: () => {
        this.error.set('Không thể tải thông tin học viên');
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
      'active': 'Đang học',
      'inactive': 'Không hoạt động',
      'suspended': 'Tạm khóa'
    };
    return statusMap[status] || status;
  }

  getCourseStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'in-progress': 'Đang học',
      'completed': 'Hoàn thành',
      'dropped': 'Đã bỏ'
    };
    return statusMap[status] || status;
  }

  getAssignmentStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Chưa nộp',
      'submitted': 'Đã nộp',
      'graded': 'Đã chấm',
      'overdue': 'Quá hạn'
    };
    return statusMap[status] || status;
  }

  sendMessage() {
    // Switch to messages tab
    this.activeTab.set('messages');
  }

  exportReport() {
    // TODO: Implement export functionality
    this.studentApi.exportStudentReport(this.studentId, 'pdf').subscribe({
      next: (blob) => {
        // Handle file download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-report-${this.studentId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
      }
    });
  }

  onReload() {
    this.loadStudent();
  }

  // Individual Assignment Methods
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
        // Refresh the assignments list
        const studentAssignmentsRef = this.studentAssignmentsRef();
        if (studentAssignmentsRef) {
          studentAssignmentsRef.refresh();
        }
      },
      error: () => {
        this.closeAssignTaskModal();
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
      },
      error: () => {
      }
    });
  }

  getStudentCourseIds(): string[] {
    return this.courseProgress().map(cp => cp.courseId);
  }
}
