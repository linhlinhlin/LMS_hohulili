import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SystemAnalytics } from '../../../infrastructure/services/admin.service';
import { RevenueChartComponent, RevenueData } from './components/revenue-chart.component';
import { PendingApproval } from './dashboard.types';

@Component({
  selector: 'app-admin-org-dashboard',
  imports: [CommonModule, RouterModule, RevenueChartComponent],
  templateUrl: './admin-org-dashboard.component.html',
  styleUrl: './admin-org-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrgDashboardComponent {
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

  // --- Actions ---
  approveCourse(courseId: string): void {
    this.courseApproved.emit(courseId);
  }

  rejectCourse(courseId: string): void {
    const reason = prompt('Nhập lý do từ chối khóa học:');
    if (reason?.trim()) {
      this.courseRejected.emit({ id: courseId, reason: reason.trim() });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }
}
