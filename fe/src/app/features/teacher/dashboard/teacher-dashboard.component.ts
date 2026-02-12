import { Component, inject, computed, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { TeacherService } from '../infrastructure/services/teacher.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiClient } from '../../../api/client/api-client';
import { TeacherCourse } from '../types/teacher.types';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-teacher-dashboard',
  imports: [RouterModule, IconComponent],
  styles: [`
    .td-accent-top { border-top: 3px solid #0056D2; }
    .td-thumb-placeholder { background-color: #E3F2FD; }
    .td-kpi-divider { position: relative; }
    .td-kpi-divider::after {
      content: '';
      position: absolute;
      right: 0;
      top: 20%;
      height: 60%;
      width: 1px;
      background: #F3F4F6;
    }
    .td-kpi-divider:last-child::after { display: none; }
  `],
  template: `
    <div class="min-h-screen bg-slate-50">
      <!-- Header -->
      <div class="bg-white" style="border-bottom:1px solid #F3F4F6">
        <div class="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900 tracking-tight">{{ getGreeting() }}, {{ getUserFirstName() }}</h1>
            <p class="text-sm text-gray-400 mt-1">Tổng quan hoạt động giảng dạy</p>
          </div>
          <a routerLink="/teacher/course-creation"
             class="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium transition-colors hover:opacity-90"
             class="bg-[#0056D2] rounded-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Tạo khóa học
          </a>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-6">
        <!-- KPI Panel — unified, no individual cards -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#0056D2] mb-6">
          <div class="grid grid-cols-2 lg:grid-cols-4">
            @for (kpi of kpiItems(); track kpi.label) {
              <div class="td-kpi-divider p-5 lg:p-6">
                <p class="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{{ kpi.label }}</p>
                @if (isLoadingAnalytics()) {
                  <div class="h-8 w-16 animate-pulse mt-1" style="background:#F9FAFB"></div>
                } @else {
                  <p class="text-3xl font-semibold text-gray-900">{{ kpi.value }}</p>
                }
              </div>
            }
          </div>
        </div>

        <!-- Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Course List Panel -->
          <div class="lg:col-span-2">
            <div class="bg-white" style="border:1px solid #F3F4F6">
              <!-- Panel Header -->
              <div class="px-5 py-4 flex items-center justify-between" style="border-bottom:1px solid #F3F4F6">
                <h2 class="text-sm font-semibold text-gray-900">Khóa học của tôi</h2>
                @if (teacher.courses().length > 5) {
                  <a routerLink="/teacher/courses"
                     class="text-sm font-medium hover:underline" style="color:#0056D2">
                    Tất cả ({{ teacher.courses().length }})
                  </a>
                }
              </div>

              <!-- Loading -->
              @if (teacher.isLoading()) {
                @for (i of [1, 2, 3, 4]; track i) {
                  <div class="px-5 py-4 flex items-center gap-4 animate-pulse" style="border-bottom:1px solid #FAFAFA">
                    <div class="w-14 h-14 flex-shrink-0" style="background:#F9FAFB"></div>
                    <div class="flex-1">
                      <div class="h-4 w-3/5 mb-2" style="background:#F3F4F6"></div>
                      <div class="h-3 w-2/5" style="background:#F9FAFB"></div>
                    </div>
                  </div>
                }
              }

              <!-- Error -->
              @if (teacher.error() && !teacher.isLoading()) {
                <div class="px-5 py-12 text-center">
                  <svg class="w-8 h-8 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                  </svg>
                  <p class="text-sm text-gray-500 mb-1">Không thể tải dữ liệu</p>
                  <p class="text-xs text-gray-400 mb-4">{{ teacher.error() }}</p>
                  <button (click)="retryLoad()"
                    class="text-sm font-medium hover:underline" style="color:#0056D2">
                    Thử lại
                  </button>
                </div>
              }

              <!-- Empty -->
              @if (!teacher.isLoading() && !teacher.error() && teacher.courses().length === 0) {
                <div class="px-5 py-14 text-center">
                  <svg class="w-10 h-10 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                  </svg>
                  <h3 class="text-sm font-semibold text-gray-900 mb-1">Chưa có khóa học</h3>
                  <p class="text-xs text-gray-400 mb-5">Tạo khóa học đầu tiên để bắt đầu giảng dạy</p>
                  <a routerLink="/teacher/course-creation"
                     class="text-sm font-medium hover:underline" style="color:#0056D2">
                    Tạo khóa học mới →
                  </a>
                </div>
              }

              <!-- Course Rows -->
              @if (!teacher.isLoading() && !teacher.error() && courses().length > 0) {
                @for (course of courses(); track course.id; let last = $last) {
                  <div class="px-5 py-3.5 flex items-center gap-4 cursor-pointer transition-colors hover:bg-[#FAFAFA] group"
                       [style.border-bottom]="last ? 'none' : '1px solid #F9FAFB'"
                       (click)="goToCourse(course.id)">

                    <!-- Thumbnail -->
                    <div class="w-14 h-14 flex-shrink-0 overflow-hidden">
                      @if (course.thumbnail) {
                        <img [src]="course.thumbnail" [alt]="course.title"
                             class="w-full h-full object-cover" loading="lazy"
                             (error)="onThumbError($event)">
                      } @else {
                        <div class="w-full h-full td-thumb-placeholder flex items-center justify-center">
                          <svg class="w-6 h-6" style="color:rgba(0,86,210,0.35)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                          </svg>
                        </div>
                      }
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                      <h3 class="text-sm font-medium text-gray-900 truncate transition-colors" style="line-height:1.4">
                        {{ course.title }}
                      </h3>
                      <div class="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                        @if (course.code) {
                          <span class="font-mono">{{ course.code }}</span>
                          <span class="text-gray-200">·</span>
                        }
                        <span>{{ course.enrolledStudents }} học viên</span>
                        @if (course.modules) {
                          <span class="text-gray-200">·</span>
                          <span>{{ course.modules }} chương</span>
                        }
                        @if (course.lessons) {
                          <span class="text-gray-200">·</span>
                          <span>{{ course.lessons }} bài</span>
                        }
                        @if (course.rating > 0) {
                          <span class="text-gray-200">·</span>
                          <span style="color:#D97706" class="inline-flex items-center gap-0.5"><app-icon name="star" size="xs" class="text-yellow-500"/> {{ course.rating.toFixed(1) }}</span>
                        }
                      </div>
                    </div>

                    <!-- Status + Meta -->
                    <div class="flex-shrink-0 text-right hidden sm:block">
                      <span [class]="getStatusClasses(course.originalStatus)"
                            class="text-[11px] font-medium px-2 py-0.5 inline-block" style="border-radius:2px">
                        {{ getStatusLabel(course.originalStatus) }}
                      </span>
                      <p class="text-[11px] text-gray-300 mt-1.5">{{ formatDate(course.updatedAt || course.createdAt) }}</p>
                    </div>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">

            <!-- Status Distribution -->
            @if (!teacher.isLoading() && teacher.courses().length > 0) {
              <div class="bg-white" style="border:1px solid #F3F4F6">
                <div class="px-5 py-4" style="border-bottom:1px solid #F3F4F6">
                  <h3 class="text-sm font-semibold text-gray-900">Trạng thái</h3>
                </div>

                <!-- Proportional bar -->
                <div class="px-5 pt-4">
                  <div class="h-1 flex overflow-hidden" style="background:#F3F4F6">
                    @if (statusPercent('PUBLISHED') + statusPercent('APPROVED') > 0) {
                      <div class="h-full" style="background:#10b981" [style.width.%]="statusPercent('PUBLISHED') + statusPercent('APPROVED')"></div>
                    }
                    @if (statusPercent('PENDING') > 0) {
                      <div class="h-full" style="background:#f59e0b" [style.width.%]="statusPercent('PENDING')"></div>
                    }
                    @if (statusPercent('DRAFT') > 0) {
                      <div class="h-full" style="background:#9ca3af" [style.width.%]="statusPercent('DRAFT')"></div>
                    }
                    @if (statusPercent('REJECTED') > 0) {
                      <div class="h-full" style="background:#ef4444" [style.width.%]="statusPercent('REJECTED')"></div>
                    }
                  </div>
                </div>

                <div class="px-5 py-4">
                  @for (item of statusItems(); track item.status) {
                    @if (item.count > 0) {
                      <div class="flex items-center justify-between py-1.5">
                        <span class="text-sm text-gray-500">{{ item.label }}</span>
                        <span class="text-sm font-semibold" [style.color]="item.color">{{ item.count }}</span>
                      </div>
                    }
                  }
                </div>
              </div>
            }

            <!-- Course Performance -->
            @if (analytics().coursePerformance.length > 0) {
              <div class="bg-white" style="border:1px solid #F3F4F6">
                <div class="px-5 py-4" style="border-bottom:1px solid #F3F4F6">
                  <h3 class="text-sm font-semibold text-gray-900">Hiệu suất</h3>
                </div>
                @for (perf of analytics().coursePerformance.slice(0, 4); track perf.courseId; let last = $last) {
                  <div class="px-5 py-3" [style.border-bottom]="last ? 'none' : '1px solid #FAFAFA'">
                    <p class="text-sm text-gray-800 truncate">{{ perf.courseTitle }}</p>
                    <div class="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{{ perf.enrolledStudents }} học viên</span>
                      @if (perf.averageRating > 0) {
                        <span style="color:#D97706" class="inline-flex items-center gap-0.5"><app-icon name="star" size="xs" class="text-yellow-500"/> {{ perf.averageRating.toFixed(1) }}</span>
                      }
                    </div>
                  </div>
                }
                <a routerLink="/teacher/analytics"
                   class="block px-5 py-3 text-center text-xs font-medium transition-colors hover:bg-[#FAFAFA]"
                   style="color:#0056D2;border-top:1px solid #F3F4F6">
                  Xem phân tích chi tiết →
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
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

  courses = computed(() => this.teacher.courses().slice(0, 6));

  kpiItems = computed(() => [
    { label: 'Khóa học', value: this.analytics().totalCourses.toString() },
    { label: 'Học viên', value: this.analytics().totalStudents.toString() },
    { label: 'Chờ chấm điểm', value: this.analytics().pendingGrading.toString() },
    { label: 'Đánh giá TB', value: this.formatRating(this.analytics().averageRating) }
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
      'APPROVED': 'bg-emerald-50 text-emerald-700',
      'PUBLISHED': 'bg-emerald-50 text-emerald-700',
      'PENDING': 'bg-amber-50 text-amber-700',
      'DRAFT': 'bg-gray-100 text-gray-500',
      'REJECTED': 'bg-red-50 text-red-700',
      'ARCHIVED': 'bg-gray-100 text-gray-400'
    };
    return m[status] || 'bg-gray-100 text-gray-500';
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
