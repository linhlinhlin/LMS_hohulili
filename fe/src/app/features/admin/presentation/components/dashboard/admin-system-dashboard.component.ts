import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SystemAnalytics } from '../../../infrastructure/services/admin.service';
import { PendingApproval } from './dashboard.types';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';
import { IconComponent, IconName } from '../../../../../shared/components/icon/icon.component';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  route: string;
  icon: IconName;
}

// Static list — routes verified against fe/src/app/features/admin/admin.routes.ts.
// Replaces the old "Tổng quan nhanh" card which duplicated KPI strip counts
// (F-02 in audit 2026-04-25). Pattern follows Stripe/Linear shortcut panels.
const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'add-user',    label: 'Thêm người dùng',  description: 'Tạo tài khoản giảng viên hoặc học viên',      route: '/admin/users/all',   icon: 'users' },
  { id: 'categories',  label: 'Quản lý danh mục', description: 'Thêm, sửa, xóa danh mục khóa học',             route: '/admin/categories',  icon: 'tag' },
  { id: 'analytics',   label: 'Xem báo cáo',      description: 'Phân tích học viên, doanh thu, tăng trưởng',   route: '/admin/analytics',   icon: 'bar-chart' },
  { id: 'settings',    label: 'Cấu hình hệ thống', description: 'Thiết lập thanh toán, bảo mật, thông báo',    route: '/admin/settings',    icon: 'settings' },
];

@Component({
  selector: 'app-admin-system-dashboard',
  imports: [CommonModule, RouterLink, DialogComponent, IconComponent],
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

  // Shortcut panel — replaces the redundant "Tổng quan nhanh" card.
  quickActions = computed<readonly QuickAction[]>(() => QUICK_ACTIONS);

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
