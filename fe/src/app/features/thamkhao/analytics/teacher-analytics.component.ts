import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherService } from '../services/teacher.service';

export interface AnalyticsMetric {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  icon: string;
  color: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }[];
}

@Component({
  selector: 'app-teacher-analytics',
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="space-y-8">
      <!-- Key Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (metric of keyMetrics(); track metric.id) {
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                   [class]="metric.color">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  @switch (metric.icon) {
                    @case ('students') {
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                    }
                    @case ('courses') {
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                    }
                    @case ('revenue') {
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"></path>
                    }
                    @case ('rating') {
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                    }
                  }
                </svg>
              </div>
              <div class="flex items-center space-x-1"
                   [class]="getTrendClass(metric.trend)">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  @if (metric.trend === 'up') {
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  } @else if (metric.trend === 'down') {
                    <path fill-rule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  } @else {
                    <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                  }
                </svg>
                <span class="text-sm font-medium">{{ metric.trendPercentage }}%</span>
              </div>
            </div>
            <div>
              <h3 class="text-2xl font-bold text-gray-900 mb-1">{{ formatValue(metric.value, metric.unit) }}</h3>
              <p class="text-sm text-gray-600">{{ metric.title }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Charts Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Revenue Chart -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Doanh thu theo tháng</h3>
          <div class="h-64 flex items-end justify-between space-x-2">
            @for (data of revenueChartData(); track $index) {
              <div class="flex flex-col items-center space-y-2">
                <div class="w-8 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t"
                     [style.height.px]="data.value * 2">
                </div>
                <span class="text-xs text-gray-600">{{ data.label }}</span>
                <span class="text-xs font-medium text-gray-900">{{ formatCurrency(data.value) }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Student Engagement Chart -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Tương tác học viên</h3>
          <div class="space-y-4">
            @for (engagement of studentEngagement(); track engagement.course) {
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-900">{{ engagement.course }}</h4>
                  <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div class="bg-green-600 h-2 rounded-full" 
                         [style.width.%]="engagement.engagement"></div>
                  </div>
                </div>
                <span class="text-sm font-medium text-gray-900 ml-4">{{ engagement.engagement }}%</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Course Performance Table -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-6">Hiệu suất khóa học</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khóa học</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Học viên</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoàn thành</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đánh giá</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              @for (course of coursePerformance(); track course.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <img [src]="course.thumbnail" [alt]="course.title" class="w-10 h-10 rounded-lg object-cover">
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">{{ course.title }}</div>
                        <div class="text-sm text-gray-500">{{ course.category }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ course.students }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div class="bg-blue-600 h-2 rounded-full" [style.width.%]="course.completionRate"></div>
                      </div>
                      <span class="text-sm text-gray-900">{{ course.completionRate }}%</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span class="text-sm text-gray-900">{{ course.rating }}/5</span>
                      <svg class="w-4 h-4 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{{ formatCurrency(course.revenue) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherAnalyticsComponent implements OnInit {
  protected teacherService = inject(TeacherService);

  // Mock analytics data
  private _keyMetrics = signal<AnalyticsMetric[]>([]);
  private _revenueChartData = signal<{label: string, value: number}[]>([]);
  private _studentEngagement = signal<{course: string, engagement: number}[]>([]);
  private _coursePerformance = signal<any[]>([]);

  readonly keyMetrics = computed(() => this._keyMetrics());
  readonly revenueChartData = computed(() => this._revenueChartData());
  readonly studentEngagement = computed(() => this._studentEngagement());
  readonly coursePerformance = computed(() => this._coursePerformance());

  ngOnInit(): void {
    this.loadAnalyticsData();
  }

  private loadAnalyticsData(): void {
    // Key Metrics
    const metrics: AnalyticsMetric[] = [
      {
        id: 'total_students',
        title: 'Tổng học viên',
        value: this.teacherService.totalStudents(),
        previousValue: 95,
        unit: '',
        trend: 'up',
        trendPercentage: 12,
        icon: 'students',
        color: 'bg-blue-500'
      },
      {
        id: 'total_courses',
        title: 'Khóa học',
        value: this.teacherService.courses().length,
        previousValue: 2,
        unit: '',
        trend: 'up',
        trendPercentage: 50,
        icon: 'courses',
        color: 'bg-green-500'
      },
      {
        id: 'total_revenue',
        title: 'Doanh thu',
        value: this.teacherService.totalRevenue(),
        previousValue: 150000000,
        unit: 'VND',
        trend: 'up',
        trendPercentage: 15,
        icon: 'revenue',
        color: 'bg-purple-500'
      },
      {
        id: 'average_rating',
        title: 'Đánh giá TB',
        value: 4.7,
        previousValue: 4.5,
        unit: '/5',
        trend: 'up',
        trendPercentage: 4,
        icon: 'rating',
        color: 'bg-orange-500'
      }
    ];

    // Revenue Chart Data
    const revenueData = [
      { label: 'T1', value: 120000000 },
      { label: 'T2', value: 150000000 },
      { label: 'T3', value: 180000000 },
      { label: 'T4', value: 200000000 },
      { label: 'T5', value: 220000000 },
      { label: 'T6', value: 250000000 },
      { label: 'T7', value: 280000000 },
      { label: 'T8', value: 300000000 },
      { label: 'T9', value: 320000000 }
    ];

    // Student Engagement Data
    const engagementData = [
      { course: 'Kỹ thuật Tàu biển Cơ bản', engagement: 85 },
      { course: 'An toàn Hàng hải', engagement: 78 },
      { course: 'Quản lý Cảng biển', engagement: 72 }
    ];

    // Course Performance Data
    const performanceData = this.teacherService.courses().map(course => ({
      id: course.id,
      title: course.title,
      category: this.getCategoryName(course.category),
      thumbnail: course.thumbnail,
      students: course.students,
      completionRate: Math.floor(Math.random() * 30) + 70, // 70-100%
      rating: course.rating,
      revenue: course.revenue
    }));

    this._keyMetrics.set(metrics);
    this._revenueChartData.set(revenueData);
    this._studentEngagement.set(engagementData);
    this._coursePerformance.set(performanceData);
  }

  private getCategoryName(category: string): string {
    const categoryMap: Record<string, string> = {
      'engineering': 'Kỹ thuật',
      'safety': 'An toàn',
      'navigation': 'Hàng hải',
      'logistics': 'Logistics',
      'law': 'Luật',
      'certificates': 'Chứng chỉ'
    };
    return categoryMap[category] || category;
  }

  formatValue(value: number, unit: string): string {
    if (unit === 'VND') {
      return this.formatCurrency(value);
    }
    return `${value}${unit}`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getTrendClass(trend: string): string {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }
}