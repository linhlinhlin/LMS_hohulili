import { Component, input, output, computed, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SystemAnalytics } from '../../../infrastructure/services/admin.service';
import { RevenueChartComponent, RevenueData } from './components/revenue-chart.component';
import { PendingApproval } from './dashboard.types';
import { AuthService } from '../../../../../core/services/auth.service';
import { getAdminPortalBase } from '../../../../../core/utils/portal-route.util';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';

@Component({
  selector: 'app-admin-org-dashboard',
  imports: [CommonModule, RouterModule, RevenueChartComponent, DialogComponent],
  templateUrl: './admin-org-dashboard.component.html',
  styleUrl: './admin-org-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrgDashboardComponent {
  private authService = inject(AuthService);

  // --- Inputs from parent ---
  analytics = input.required<SystemAnalytics>();
  pendingApprovals = input.required<PendingApproval[]>();
  isLoading = input.required<boolean>();
  isLoadingPending = input.required<boolean>();

  // --- Outputs to parent ---
  courseApproved = output<string>();
  courseRejected = output<{ id: string; reason: string }>();

  // --- Derived state (ORG_ADMIN only) ---
  pendingCount = computed(() => this.analytics().pendingCourses);
  newStudentsThisMonth = computed(() => this.analytics().userGrowth?.thisMonth || 0);
  activeCourseCount = computed(() => this.analytics().approvedCourses);
  portalBase = computed(() => getAdminPortalBase(this.authService.userRole()));

  enrollmentTrendData = computed<RevenueData>(() => {
    const dailyAvg = (this.analytics().totalEnrollments || 0) / 30;
    const labels: string[] = [];
    const data: number[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      labels.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
      data.push(Math.max(0, Math.floor(dailyAvg + Math.sin(i * 0.7) * dailyAvg * 0.3)));
    }
    return { labels, data };
  });

  // --- Reject modal state ---
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
