import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../api/client/api-client';
import { ToastService } from '../../../core/services/toast.service';

interface TeacherAnalytics {
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

@Component({
  selector: 'app-teacher-analytics',
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Phân tích</h1>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span class="ml-3 text-gray-600">Đang tải...</span>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Tổng khóa học</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">{{ analytics()?.totalCourses ?? 0 }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ analytics()?.activeCourses ?? 0 }} đang hoạt động</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Tổng học viên</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">{{ analytics()?.totalStudents ?? 0 }}</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Doanh thu</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">{{ (analytics()?.totalRevenue ?? 0) | number:'1.0-0' }} đ</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Đánh giá TB</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">{{ analytics()?.averageRating ?? 0 }}/5</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Chờ chấm điểm</p>
            <p class="mt-2 text-2xl font-semibold text-amber-600">{{ analytics()?.pendingGrading ?? 0 }}</p>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Hiệu quả khóa học</h2>
          @if (analytics()?.coursePerformance?.length) {
            <div class="space-y-4">
              @for (c of analytics()!.coursePerformance; track c.courseId) {
                <div>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900">{{ c.courseTitle }}</p>
                      <p class="text-sm text-gray-500">{{ c.enrolledStudents }} học viên • {{ c.reviewCount }} đánh giá • Rating {{ c.averageRating }}/5</p>
                    </div>
                    <div class="w-40 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div class="bg-indigo-500 h-2" [style.width.%]="(c.averageRating / 5) * 100"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-gray-500 text-center py-8">Chưa có dữ liệu khóa học</p>
          }
        </div>
      }
    </div>
    `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherAnalyticsComponent implements OnInit {
  private apiClient = inject(ApiClient);
  private toast = inject(ToastService);

  analytics = signal<TeacherAnalytics | null>(null);
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.apiClient.get<any>('/api/v3/teacher/analytics')
      );
      const data = response.data || response;
      this.analytics.set(data);
    } catch {
      this.analytics.set(null);
      this.toast.error('Không thể tải dữ liệu phân tích. Vui lòng thử lại.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
