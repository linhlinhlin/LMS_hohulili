import { Component, inject, computed, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiClient } from '../../../api/client/api-client';
import { TeacherCourse } from '../types/teacher.types';
import { firstValueFrom } from 'rxjs';

type TabKey = 'all' | 'approved' | 'draft' | 'pending';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-teacher-dashboard',
  imports: [RouterModule],
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit {
  protected teacher = inject(TeacherService);
  private authService = inject(AuthService);
  private apiClient = inject(ApiClient);
  private router = inject(Router);

  isLoadingAnalytics = signal(true);
  analytics = signal<DashboardAnalytics>({
    totalCourses: 0,
    activeCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    averageRating: 0,
    pendingGrading: 0,
    coursePerformance: []
  });

  // Tab state
  activeTab = signal<TabKey>('all');

  readonly tabItems: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'draft', label: 'Nháp' },
    { key: 'pending', label: 'Chờ duyệt' }
  ];

  private readonly DISPLAY_LIMIT = 4;

  filteredCourses = computed(() => {
    const tab = this.activeTab();
    const courses = this.teacher.courses();
    const filtered = tab === 'all' ? courses : courses.filter(c => this.matchTab(c.originalStatus, tab));
    return this.sortByRecent(filtered).slice(0, this.DISPLAY_LIMIT);
  });

  totalFilteredCount = computed(() => {
    const tab = this.activeTab();
    const courses = this.teacher.courses();
    if (tab === 'all') return courses.length;
    return courses.filter(c => this.matchTab(c.originalStatus, tab)).length;
  });

  hasMoreCourses = computed(() => this.totalFilteredCount() > this.DISPLAY_LIMIT);

  footerText = computed(() => {
    const shown = Math.min(this.DISPLAY_LIMIT, this.totalFilteredCount());
    const total = this.totalFilteredCount();
    const tab = this.activeTab();
    const suffix = this.getTabSuffix(tab);
    return `Hiển thị ${shown}/${total} khóa học ${suffix}`;
  });

  kpiItems = computed(() => [
    { label: 'Khóa học', value: this.analytics().totalCourses.toString(), icon: 'book' as const, iconClass: 'icon-blue' },
    { label: 'Học viên', value: this.analytics().totalStudents.toString(), icon: 'users' as const, iconClass: 'icon-green' },
    { label: 'Chờ chấm điểm', value: this.analytics().pendingGrading.toString(), icon: 'clipboard' as const, iconClass: 'icon-amber' },
    { label: 'Đánh giá TB', value: this.formatRating(this.analytics().averageRating), icon: 'star' as const, iconClass: 'icon-yellow' }
  ]);

  statusItems = computed(() => {
    const courses = this.teacher.courses();
    return [
      { status: 'PUBLISHED', label: 'Đã xuất bản', count: this.countStatus(courses, 'PUBLISHED'), color: '#10b981' },
      { status: 'APPROVED', label: 'Đã duyệt', count: this.countStatus(courses, 'APPROVED'), color: '#22c55e' },
      { status: 'PENDING', label: 'Chờ duyệt', count: this.countStatus(courses, 'PENDING'), color: '#f59e0b' },
      { status: 'DRAFT', label: 'Nháp', count: this.countStatus(courses, 'DRAFT'), color: '#9ca3af' },
      { status: 'REJECTED', label: 'Từ chối', count: this.countStatus(courses, 'REJECTED'), color: '#ef4444' },
      { status: 'ARCHIVED', label: 'Lưu trữ', count: this.countStatus(courses, 'ARCHIVED'), color: '#6b7280' }
    ];
  });

  ngOnInit(): void {
    // Mark body as loaded to prevent FOUC (critical.scss hides .dashboard-container until loaded)
    if (typeof document !== 'undefined') {
      document.body.classList.add('loaded');
    }
    this.teacher.loadMyCourses();
    this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    this.isLoadingAnalytics.set(true);
    try {
      const res = await firstValueFrom(
        this.apiClient.get<any>('/api/v3/teacher/analytics')
      );
      const data = res?.data || res || {};
      this.analytics.set({
        totalCourses: data.totalCourses || 0,
        activeCourses: data.activeCourses || 0,
        totalStudents: data.totalStudents || 0,
        totalRevenue: data.totalRevenue || 0,
        averageRating: data.averageRating || 0,
        pendingGrading: data.pendingGrading || 0,
        coursePerformance: data.coursePerformance || []
      });
    } catch {
      this.analytics.update(a => ({ ...a, totalCourses: this.teacher.totalCourses() }));
    } finally {
      this.isLoadingAnalytics.set(false);
    }
  }

  retryLoad(): void {
    this.teacher.loadMyCourses();
    this.loadAnalytics();
  }

  switchTab(tab: TabKey): void {
    this.activeTab.set(tab);
  }

  getTabCount(tabKey: TabKey): number {
    const courses = this.teacher.courses();
    return courses.filter(c => this.matchTab(c.originalStatus, tabKey)).length;
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  getUserFirstName(): string {
    const name = this.authService.currentUser()?.name || 'Giảng viên';
    return name.split(' ').pop() || name;
  }

  getUserInitials(): string {
    const user = this.authService.currentUser();
    const fullName = user?.name || 'GV';
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  formatRating(v: number): string {
    return v > 0 ? v.toFixed(1) : '—';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (days === 0) return 'Hôm nay';
      if (days === 1) return 'Hôm qua';
      if (days < 7) return `${days} ngày trước`;
      return d.toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  }

  getStatusClasses(status: string): string {
    const m: Record<string, string> = {
      'APPROVED': 'badge-approved',
      'PUBLISHED': 'badge-published',
      'PENDING': 'badge-pending',
      'DRAFT': 'badge-draft',
      'REJECTED': 'badge-rejected',
      'ARCHIVED': 'badge-archived'
    };
    return 'status-badge ' + (m[status] || 'badge-draft');
  }

  getStatusLabel(status: string): string {
    const m: Record<string, string> = {
      'APPROVED': 'Đã duyệt',
      'PUBLISHED': 'Xuất bản',
      'PENDING': 'Chờ duyệt',
      'DRAFT': 'Nháp',
      'REJECTED': 'Từ chối',
      'ARCHIVED': 'Lưu trữ'
    };
    return m[status] || status;
  }

  onThumbError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  statusPercent(status: string): number {
    const total = this.teacher.courses().length;
    if (total === 0) return 0;
    return (this.countStatus(this.teacher.courses(), status) / total) * 100;
  }

  goToCourse(courseId: string): void {
    this.router.navigate(['/teacher/courses', courseId, 'editor']);
  }

  private sortByRecent(courses: TeacherCourse[]): TeacherCourse[] {
    return [...courses].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }

  private getTabSuffix(tab: TabKey): string {
    switch (tab) {
      case 'approved': return 'đã duyệt';
      case 'draft': return 'nháp';
      case 'pending': return 'chờ duyệt';
      default: return 'gần nhất';
    }
  }

  private matchTab(status: string, tab: TabKey): boolean {
    switch (tab) {
      case 'approved': return status === 'APPROVED' || status === 'PUBLISHED';
      case 'draft': return status === 'DRAFT';
      case 'pending': return status === 'PENDING';
      default: return true;
    }
  }

  private countStatus(courses: TeacherCourse[], status: string): number {
    return courses.filter(c => c.originalStatus === status).length;
  }
}

interface DashboardAnalytics {
  totalCourses: number;
  activeCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: number;
  pendingGrading: number;
  coursePerformance: CoursePerformanceItem[];
}

interface CoursePerformanceItem {
  courseId: string;
  courseTitle: string;
  enrolledStudents: number;
  averageRating: number;
  reviewCount: number;
}
