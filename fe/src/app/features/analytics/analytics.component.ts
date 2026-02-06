import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-analytics',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-7xl mx-auto">
          <!-- Header -->
          <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Phân tích học tập</h1>
                <p class="text-gray-600 mt-2">Theo dõi tiến độ và hiệu suất học tập của bạn</p>
              </div>
              <div class="flex space-x-4">
                <select 
                  [(ngModel)]="selectedPeriod"
                  class="px-4 py-2 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                  <option value="quarter">Quý này</option>
                  <option value="year">Năm nay</option>
                </select>
                <button 
                  (click)="refreshAnalytics()"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Làm mới
                </button>
              </div>
            </div>
          </div>

          <!-- Overview Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow-lg p-6">
              <div class="flex items-center">
                <div class="bg-blue-100 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-600">Khóa học đã hoàn thành</p>
                  <p class="text-2xl font-bold text-gray-900">{{ overview.completedCourses }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
              <div class="flex items-center">
                <div class="bg-green-100 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-600">Bài tập đã nộp</p>
                  <p class="text-2xl font-bold text-gray-900">{{ overview.submittedAssignments }}</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
              <div class="flex items-center">
                <div class="bg-purple-100 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-600">Điểm trung bình</p>
                  <p class="text-2xl font-bold text-gray-900">{{ overview.averageScore }}%</p>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow-lg p-6">
              <div class="flex items-center">
                <div class="bg-orange-100 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <p class="text-sm font-medium text-gray-600">Thời gian học</p>
                  <p class="text-2xl font-bold text-gray-900">{{ overview.studyTime }}h</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Charts Section -->
          <div class="grid lg:grid-cols-2 gap-8 mb-8">
            <!-- Progress Chart -->
            <div class="bg-white rounded-lg shadow-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-6">Tiến độ học tập</h2>
              <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div class="text-center">
                  <svg class="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <p class="text-gray-600">Biểu đồ tiến độ học tập</p>
                  <p class="text-sm text-gray-500">Sẽ được tích hợp với thư viện chart</p>
                </div>
              </div>
            </div>

            <!-- Performance Chart -->
            <div class="bg-white rounded-lg shadow-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-6">Hiệu suất theo tháng</h2>
              <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div class="text-center">
                  <svg class="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                  <p class="text-gray-600">Biểu đồ hiệu suất</p>
                  <p class="text-sm text-gray-500">Sẽ được tích hợp với thư viện chart</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Course Progress -->
          <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Tiến độ khóa học</h2>
            <div class="space-y-4">
              @for (course of courseProgress(); track course.id) {
                <div class="border border-gray-800 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-medium text-gray-900">{{ course.name }}</h3>
                    <span class="text-sm text-gray-600">{{ course.progress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      [style.width.%]="course.progress">
                    </div>
                  </div>
                  <div class="flex justify-between text-sm text-gray-600 mt-2">
                    <span>{{ course.completedLessons }}/{{ course.totalLessons }} bài học</span>
                    <span>{{ course.estimatedTime }} giờ còn lại</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Assignment Performance -->
          <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Hiệu suất bài tập</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bài tập</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khóa học</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nộp</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (assignment of assignmentPerformance(); track assignment.id) {
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {{ assignment.title }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ assignment.course }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span 
                          class="px-2 py-1 text-xs font-medium rounded-full"
                          [class]="getScoreClass(assignment.score, assignment.maxScore)">
                          {{ assignment.score }}/{{ assignment.maxScore }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span 
                          class="px-2 py-1 text-xs font-medium rounded-full"
                          [class]="getStatusClass(assignment.status)">
                          {{ getStatusText(assignment.status) }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ assignment.submittedDate }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Study Streak -->
          <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Chuỗi ngày học liên tiếp</h2>
            <div class="flex items-center space-x-4">
              <div class="text-4xl font-bold text-blue-600">{{ studyStreak() }}</div>
              <div>
                <p class="text-lg font-medium text-gray-900">ngày liên tiếp</p>
                <p class="text-sm text-gray-600">Hãy duy trì chuỗi học tập của bạn!</p>
              </div>
            </div>
            <div class="mt-4 flex space-x-1">
              @for (day of getStreakDays(); track day.date) {
                <div 
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                  [class]="day.studied ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'">
                  {{ day.day }}
                </div>
              }
            </div>
          </div>

          <!-- Recommendations -->
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-6">Gợi ý học tập</h2>
            <div class="grid md:grid-cols-2 gap-6">
              @for (recommendation of recommendations(); track recommendation.id) {
                <div class="border border-gray-800 rounded-lg p-4">
                  <div class="flex items-start space-x-3">
                    <div 
                      class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      [class]="getRecommendationClass(recommendation.type)">
                      {{ getRecommendationIcon(recommendation.type) }}
                    </div>
                    <div class="flex-1">
                      <h3 class="font-medium text-gray-900 mb-1">{{ recommendation.title }}</h3>
                      <p class="text-sm text-gray-600 mb-2">{{ recommendation.description }}</p>
                      <button 
                        (click)="followRecommendation(recommendation.id)"
                        class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        {{ recommendation.action }}
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AnalyticsComponent {
  private router = inject(Router);

  selectedPeriod = signal('month');

  overview = {
    completedCourses: 12,
    submittedAssignments: 45,
    averageScore: 85,
    studyTime: 120
  };

  courseProgress = signal([
    {
      id: 1,
      name: 'Khóa học Hàng hải cơ bản',
      progress: 75,
      completedLessons: 15,
      totalLessons: 20,
      estimatedTime: 5
    },
    {
      id: 2,
      name: 'Khóa học An toàn hàng hải',
      progress: 60,
      completedLessons: 12,
      totalLessons: 20,
      estimatedTime: 8
    },
    {
      id: 3,
      name: 'Khóa học Xu hướng hàng hải',
      progress: 90,
      completedLessons: 18,
      totalLessons: 20,
      estimatedTime: 2
    }
  ]);

  assignmentPerformance = signal([
    {
      id: 1,
      title: 'Bài tập 1: Phân tích tình huống',
      course: 'Hàng hải cơ bản',
      score: 85,
      maxScore: 100,
      status: 'graded',
      submittedDate: '2024-01-10'
    },
    {
      id: 2,
      title: 'Quiz 1: Kiến thức cơ bản',
      course: 'Hàng hải cơ bản',
      score: 45,
      maxScore: 50,
      status: 'graded',
      submittedDate: '2024-01-08'
    },
    {
      id: 3,
      title: 'Dự án: Hệ thống an toàn',
      course: 'An toàn hàng hải',
      score: 0,
      maxScore: 200,
      status: 'in-progress',
      submittedDate: '-'
    }
  ]);

  studyStreak = signal(7);

  getStreakDays() {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      days.push({
        date: date.toISOString().split('T')[0],
        day: date.getDate(),
        studied: i < 3 // Simulate some days studied
      });
    }
    
    return days;
  }

  recommendations = signal([
    {
      id: 1,
      type: 'course',
      title: 'Hoàn thành khóa học xu hướng hàng hải',
      description: 'Bạn đã hoàn thành 90% khóa học này. Hãy hoàn thành để nhận chứng chỉ!',
      action: 'Tiếp tục học'
    },
    {
      id: 2,
      type: 'assignment',
      title: 'Nộp bài tập dự án hệ thống an toàn',
      description: 'Bài tập này sắp đến hạn. Hãy nộp sớm để tránh bị trừ điểm.',
      action: 'Xem bài tập'
    },
    {
      id: 3,
      type: 'study',
      title: 'Tăng cường học tập hàng ngày',
      description: 'Hãy duy trì chuỗi học tập 7 ngày liên tiếp để đạt mục tiêu!',
      action: 'Bắt đầu học'
    }
  ]);

  getScoreClass(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'graded': 'bg-green-100 text-green-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-gray-100 text-gray-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'graded': 'Đã chấm',
      'in-progress': 'Đang làm',
      'pending': 'Chưa làm'
    };
    return statusTexts[status] || status;
  }

  getRecommendationClass(type: string): string {
    const classes: { [key: string]: string } = {
      'course': 'bg-blue-500',
      'assignment': 'bg-green-500',
      'study': 'bg-purple-500'
    };
    return classes[type] || 'bg-gray-500';
  }

  getRecommendationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'course': '📚',
      'assignment': '📝',
      'study': '🎯'
    };
    return icons[type] || '💡';
  }

  refreshAnalytics(): void {
    // Simulate refresh
  }

  followRecommendation(id: number): void {
    const recommendation = this.recommendations().find(r => r.id === id);
    if (recommendation) {
      switch (recommendation.type) {
        case 'course':
          this.router.navigate(['/courses']);
          break;
        case 'assignment':
          this.router.navigate(['/assignments']);
          break;
        case 'study':
          this.router.navigate(['/learn']);
          break;
      }
    }
  }
}
