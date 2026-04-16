import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemAnalytics } from '../../../infrastructure/services/admin.service';
import { RevenueChartComponent, RevenueData } from './components/revenue-chart.component';
import { PendingApproval } from './dashboard.types';

@Component({
  selector: 'app-admin-system-dashboard',
  imports: [CommonModule, RevenueChartComponent],
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

  // --- Derived state (ADMIN only) ---
  revenueChartData = computed<RevenueData>(() => {
    const dailyAvg = (this.analytics().monthlyRevenue || 0) / 30;
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

  recentActivities = computed(() => {
    const a = this.analytics();
    const items: { id: number; message: string; timestamp: Date }[] = [];
    let seq = 1;
    if (a.pendingCourses > 0) items.push({ id: seq++, message: `${a.pendingCourses} khóa học đang chờ duyệt`, timestamp: new Date() });
    if (a.totalEnrollments > 0) items.push({ id: seq++, message: `${a.totalEnrollments} lượt đăng ký khóa học`, timestamp: new Date() });
    if (a.totalStudents > 0) items.push({ id: seq++, message: `${a.totalStudents} học viên trong hệ thống`, timestamp: new Date() });
    if (a.totalCourses > 0) items.push({ id: seq++, message: `${a.totalCourses} khóa học đã tạo`, timestamp: new Date() });
    if (items.length === 0) items.push({ id: 1, message: 'Chưa có hoạt động nào', timestamp: new Date() });
    return items;
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
