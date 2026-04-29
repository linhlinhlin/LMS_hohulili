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

type DetailTabKey = 'assignments' | 'messages';

@Component({
  selector: 'app-student-detail',
  imports: [
    CommonModule,
    RouterModule,
    StudentAssignmentsComponent,
    AssignTaskModalComponent,
    MessagesTabComponent
  ],
  templateUrl: './student-detail.component.html',
  styleUrls: ['./student-detail.component.scss'],
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
  activeTab = signal<DetailTabKey>('assignments');

  readonly tabItems: { key: DetailTabKey; label: string }[] = [
    { key: 'assignments', label: 'Bài tập' },
    { key: 'messages', label: 'Tin nhắn' }
  ];

  constructor() {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'messages') {
      this.activeTab.set('messages');
    }
    this.loadStudent();
  }

  // ===== DATA LOADING =====
  private loadStudent() {
    if (!this.studentId) {
      this.error.set('ID học viên không hợp lệ.');
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
          this.error.set('Không tìm thấy thông tin học viên.');
          this.toast.error('Không tìm thấy thông tin học viên.');
        }
      },
      error: () => {
        this.error.set('Không thể tải thông tin học viên.');
      }
    });
  }

  onReload() {
    this.loadStudent();
  }

  // ===== HELPERS =====
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'Đang học',
      COMPLETED: 'Hoàn thành',
      DROPPED: 'Đã dừng',
      EXPIRED: 'Hết hạn',
      SUSPENDED: 'Tạm khóa'
    };
    return statusMap[status] || status;
  }

  getCourseStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'in-progress': 'Đang học',
      completed: 'Hoàn thành',
      dropped: 'Đã dừng'
    };
    return statusMap[status] || status;
  }

  /**
   * Format date theo standard PAGE_UX_STANDARD §12.3:
   * Hôm nay / Hôm qua / N ngày trước / DD/MM/YYYY.
   */
  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return d.toLocaleDateString('vi-VN');
  }

  // ===== ACTIONS =====
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
        this.toast.error('Không thể xuất báo cáo. Vui lòng thử lại.');
      }
    });
  }

  // ===== ASSIGN TASK MODAL =====
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
        this.toast.success('Đã giao bài tập thành công.');
        this.refreshAssignments();
      },
      error: () => {
        this.closeAssignTaskModal();
        this.toast.error('Không thể giao bài tập. Vui lòng thử lại.');
        this.refreshAssignments();
      }
    });
  }

  onRemoveAssignment(assignment: StudentAssignment): void {
    this.distributionService.removeIndividualAssignment(
      assignment.assignmentId,
      this.studentId
    ).subscribe({
      next: () => {
        this.toast.success('Đã gỡ bài tập khỏi học viên.');
        this.refreshAssignments();
      },
      error: () => {
        this.toast.error('Không thể gỡ bài tập. Vui lòng thử lại.');
      }
    });
  }

  private refreshAssignments(): void {
    const ref = this.studentAssignmentsRef();
    if (ref) ref.refresh();
  }

  getStudentCourseIds(): string[] {
    return this.courseProgress().map(cp => cp.courseId);
  }
}
