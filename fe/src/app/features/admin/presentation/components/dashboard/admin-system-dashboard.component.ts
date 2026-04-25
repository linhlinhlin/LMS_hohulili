import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemAnalytics } from '../../../infrastructure/services/admin.service';
import { PendingApproval } from './dashboard.types';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';

interface QuickSummaryItem {
  id: string;
  message: string;
}

@Component({
  selector: 'app-admin-system-dashboard',
  imports: [CommonModule, DialogComponent],
  templateUrl: './admin-system-dashboard.component.html',
  styleUrl: './admin-system-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSystemDashboardComponent {
  // --- Inputs from parent ---
  analytics = input.required<SystemAnalytics>();
  pendingApprovals = input.required<PendingApproval[]>();
  isLoading = input.required<boolean>();
  isLoadingPending = input.required<boolean>();

  // --- Outputs to parent ---
  courseApproved = output<string>();
  courseRejected = output<{ id: string; reason: string }>();

  // Snapshot summary derived from analytics counts. Replaces the previous
  // "Hoạt động gần đây" feed which faked timestamps via `new Date()` —
  // misleading because none of these items represent a real activity log.
  quickSummary = computed<QuickSummaryItem[]>(() => {
    const a = this.analytics();
    const items: QuickSummaryItem[] = [];
    if (a.pendingCourses > 0) items.push({ id: 'pending', message: `${a.pendingCourses} khóa học đang chờ duyệt` });
    if (a.totalEnrollments > 0) items.push({ id: 'enrollments', message: `${a.totalEnrollments} lượt đăng ký khóa học` });
    if (a.totalStudents > 0) items.push({ id: 'students', message: `${a.totalStudents} học viên trong hệ thống` });
    if (a.totalCourses > 0) items.push({ id: 'courses', message: `${a.totalCourses} khóa học đã tạo` });
    return items;
  });

  // --- Reject modal state (mirrors org-admin pattern from PR #145) ---
  rejectModalOpen = signal(false);
  private pendingRejectId = signal<string | null>(null);
  pendingRejectName = signal('');
  rejectReason = signal('');
  rejecting = signal(false);
  rejectReasonValid = computed(() => this.rejectReason().trim().length >= 10);

  // --- Actions ---
  approveCourse(courseId: string): void {
    this.courseApproved.emit(courseId);
  }

  openRejectModal(courseId: string, courseName: string): void {
    this.pendingRejectId.set(courseId);
    this.pendingRejectName.set(courseName);
    this.rejectReason.set('');
    this.rejectModalOpen.set(true);
  }

  closeRejectModal(): void {
    this.rejectModalOpen.set(false);
    this.pendingRejectId.set(null);
    this.pendingRejectName.set('');
    this.rejectReason.set('');
  }

  confirmReject(): void {
    const id = this.pendingRejectId();
    if (!id || !this.rejectReasonValid() || this.rejecting()) return;
    this.courseRejected.emit({ id, reason: this.rejectReason().trim() });
    this.closeRejectModal();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }
}
