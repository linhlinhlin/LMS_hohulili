import { Component, input, output, computed, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SystemAnalytics } from '../../../infrastructure/services/admin.service';
// RevenueChartComponent + RevenueData removed with the synthetic trend chart (#75).
import { PendingApproval } from './dashboard.types';
import { AuthService } from '../../../../../core/services/auth.service';
import { getAdminPortalBase } from '../../../../../core/utils/portal-route.util';
import { DialogComponent } from '../../../../../shared/components/dialog/dialog.component';
import { ActionCardComponent } from '../../../../../shared/components/admin/action-card/action-card.component';
import { DateRangeToggleComponent } from '../../../../../shared/components/admin/date-range-toggle/date-range-toggle.component';

@Component({
  selector: 'app-admin-org-dashboard',
  imports: [CommonModule, RouterModule, DialogComponent, ActionCardComponent, DateRangeToggleComponent],
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
  // F-OA-3: parent owns the selected window so navigation back to the
  // dashboard preserves the choice (mirrors system dashboard pattern).
  windowDays = input<number>(30);

  // --- Outputs to parent ---
  courseApproved = output<string>();
  courseRejected = output<{ id: string; reason: string }>();
  windowDaysChange = output<number>();

  // --- Derived state (ORG_ADMIN only) ---
  pendingCount = computed(() => this.analytics().pendingCourses);
  newStudentsThisMonth = computed(() => this.analytics().userGrowth?.thisMonth || 0);
  activeCourseCount = computed(() => this.analytics().approvedCourses);
  portalBase = computed(() => getAdminPortalBase(this.authService.userRole()));

  // enrollmentTrendData removed (issue #75): was synthetic (dailyAvg + sin wave).
  // Restore when backend exposes a true org-scoped time-series endpoint.

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
