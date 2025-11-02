import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

interface LearningAnalytics {
  totalStudyTime: number; // in hours
  coursesCompleted: number;
  averageScore: number;
  learningStreak: number; // days
  weakAreas: string[];
  strongAreas: string[];
  recommendedCourses: string[];
  studyPatterns: StudyPattern[];
  performanceTrend: PerformanceData[];
  skillDevelopment: SkillProgress[];
}

interface StudyPattern {
  dayOfWeek: string;
  averageHours: number;
  peakHours: string[];
  preferredSubjects: string[];
}

interface PerformanceData {
  date: string;
  score: number;
  timeSpent: number;
  course: string;
}

interface SkillProgress {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  progress: number;
  lastUpdated: Date;
}

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  category: string;
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
}

@Component({
  selector: 'app-student-analytics',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải phân tích học tập..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="purple">
    </app-loading>
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- Analytics Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Phân tích Học tập</h1>
                <p class="text-gray-600">Thống kê chi tiết về quá trình học tập của bạn</p>
              </div>
            </div>
            
            <!-- Time Period Selector -->
            <div class="flex items-center space-x-4">
              <select [(ngModel)]="selectedPeriod" 
                      (ngModelChange)="updateAnalytics()"
                      class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="7">7 ngày qua</option>
                <option value="30">30 ngày qua</option>
                <option value="90">3 tháng qua</option>
                <option value="365">1 năm qua</option>
              </select>
              
              <button (click)="exportReport()"
                      class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
                Xuất báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Key Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Total Study Time -->
          <div class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng giờ học</p>
                <p class="text-3xl font-bold text-gray-900">{{ analytics().totalStudyTime }}h</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +2.5h tuần này
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Courses Completed -->
          <div class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Khóa học hoàn thành</p>
                <p class="text-3xl font-bold text-gray-900">{{ analytics().coursesCompleted }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +1 tháng này
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Average Score -->
          <div class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Điểm trung bình</p>
                <p class="text-3xl font-bold text-gray-900">{{ analytics().averageScore }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +0.3 tháng này
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Learning Streak -->
          <div class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Chuỗi học tập</p>
                <p class="text-3xl font-bold text-gray-900">{{ analytics().learningStreak }} ngày</p>
                <p class="text-sm text-orange-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  🔥 Streak cao nhất
                </p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Analytics Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Performance Trend Chart -->
          <div class="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-6">Xu hướng Hiệu suất</h3>
            <div class="h-80 flex items-center justify-center bg-gray-50 rounded-xl">
              <div class="text-center">
                <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
                <p class="text-gray-600">Performance Chart sẽ được tích hợp với Chart.js</p>
                <p class="text-sm text-gray-500 mt-2">Hiển thị xu hướng điểm số theo thời gian</p>
              </div>
            </div>
          </div>

          <!-- Study Patterns -->
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-6">Thói quen Học tập</h3>
            <div class="space-y-4">
              @for (pattern of analytics().studyPatterns; track pattern.dayOfWeek) {
                <div class="p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-900">{{ pattern.dayOfWeek }}</h4>
                    <span class="text-sm text-gray-600">{{ pattern.averageHours }}h</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                         [style.width.%]="(pattern.averageHours / 8) * 100"></div>
                  </div>
                  <div class="mt-2 text-sm text-gray-600">
                    <p>Giờ cao điểm: {{ pattern.peakHours.join(', ') }}</p>
                    <p>Môn ưa thích: {{ pattern.preferredSubjects.join(', ') }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Skill Development -->
          <div class="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-6">Phát triển Kỹ năng</h3>
            <div class="space-y-4">
              @for (skill of analytics().skillDevelopment; track skill.skill) {
                <div class="p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold text-gray-900">{{ skill.skill }}</h4>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm text-gray-600">Level {{ skill.currentLevel }}</span>
                      <span class="text-sm text-gray-500">/ {{ skill.targetLevel }}</span>
                    </div>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500" 
                         [style.width.%]="skill.progress"></div>
                  </div>
                  <div class="flex justify-between text-sm text-gray-600 mt-2">
                    <span>{{ skill.progress }}% hoàn thành</span>
                    <span>Cập nhật: {{ formatDate(skill.lastUpdated) }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Learning Goals -->
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-6">Mục tiêu Học tập</h3>
            <div class="space-y-4">
              @for (goal of learningGoals(); track goal.id) {
                <div class="p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-900">{{ goal.title }}</h4>
                    <span class="text-sm text-gray-600">{{ goal.progress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                         [style.width.%]="goal.progress"></div>
                  </div>
                  <p class="text-sm text-gray-600 mb-2">{{ goal.description }}</p>
                  <div class="flex justify-between text-xs text-gray-500">
                    <span>Mục tiêu: {{ formatDate(goal.targetDate) }}</span>
                    <span>{{ getCompletedMilestones(goal.milestones) }}/{{ goal.milestones.length }} milestones</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Weak & Strong Areas -->
          <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Weak Areas -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Lĩnh vực Cần Cải thiện</h3>
              <div class="space-y-3">
                @for (area of analytics().weakAreas; track area) {
                  <div class="flex items-center space-x-3 p-3 bg-red-50 rounded-xl">
                    <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <span class="text-gray-900">{{ area }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Strong Areas -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Điểm Mạnh</h3>
              <div class="space-y-3">
                @for (area of analytics().strongAreas; track area) {
                  <div class="flex items-center space-x-3 p-3 bg-green-50 rounded-xl">
                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <span class="text-gray-900">{{ area }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Recommended Courses -->
          <div class="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-6">Khóa học Được Đề xuất</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (course of analytics().recommendedCourses; track course) {
                <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                        <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 class="font-semibold text-gray-900">{{ course }}</h4>
                      <p class="text-sm text-gray-600">Dựa trên phân tích học tập</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentAnalyticsComponent implements OnInit {
  private router = inject(Router);
  private errorService = inject(ErrorHandlingService);

  // Loading state
  isLoading = signal<boolean>(true);
  selectedPeriod = signal(30);

  // Mock analytics data
  analytics = signal<LearningAnalytics>({
    totalStudyTime: 45.5,
    coursesCompleted: 3,
    averageScore: 8.7,
    learningStreak: 12,
    weakAreas: [
      'Luật Hàng hải Quốc tế',
      'Quản lý Rủi ro',
      'Kỹ thuật Điện tử Tàu'
    ],
    strongAreas: [
      'An toàn Hàng hải',
      'Điều khiển Tàu',
      'Kỹ thuật Cơ khí Tàu'
    ],
    recommendedCourses: [
      'Luật Hàng hải Quốc tế Nâng cao',
      'Quản lý Rủi ro Hàng hải',
      'Kỹ thuật Điện tử Tàu Cơ bản'
    ],
    studyPatterns: [
      {
        dayOfWeek: 'Thứ 2',
        averageHours: 2.5,
        peakHours: ['19:00-21:00'],
        preferredSubjects: ['An toàn', 'Kỹ thuật']
      },
      {
        dayOfWeek: 'Thứ 3',
        averageHours: 3.2,
        peakHours: ['20:00-22:00'],
        preferredSubjects: ['Điều khiển', 'Luật']
      },
      {
        dayOfWeek: 'Thứ 4',
        averageHours: 1.8,
        peakHours: ['18:00-20:00'],
        preferredSubjects: ['Kỹ thuật']
      },
      {
        dayOfWeek: 'Thứ 5',
        averageHours: 2.9,
        peakHours: ['19:00-21:00'],
        preferredSubjects: ['An toàn', 'Quản lý']
      },
      {
        dayOfWeek: 'Thứ 6',
        averageHours: 4.1,
        peakHours: ['19:00-23:00'],
        preferredSubjects: ['Tất cả']
      },
      {
        dayOfWeek: 'Thứ 7',
        averageHours: 3.5,
        peakHours: ['14:00-18:00'],
        preferredSubjects: ['Kỹ thuật', 'Điều khiển']
      },
      {
        dayOfWeek: 'Chủ nhật',
        averageHours: 2.1,
        peakHours: ['10:00-12:00'],
        preferredSubjects: ['Luật', 'Quản lý']
      }
    ],
    performanceTrend: [
      { date: '2024-09-01', score: 8.2, timeSpent: 2.5, course: 'An toàn Hàng hải' },
      { date: '2024-09-05', score: 8.5, timeSpent: 3.0, course: 'Kỹ thuật Tàu biển' },
      { date: '2024-09-10', score: 8.8, timeSpent: 2.8, course: 'Điều khiển Tàu' },
      { date: '2024-09-15', score: 8.9, timeSpent: 3.2, course: 'Quản lý Cảng' },
      { date: '2024-09-20', score: 8.7, timeSpent: 2.9, course: 'Luật Hàng hải' }
    ],
    skillDevelopment: [
      {
        skill: 'An toàn Hàng hải',
        currentLevel: 8,
        targetLevel: 10,
        progress: 80,
        lastUpdated: new Date('2024-09-20')
      },
      {
        skill: 'Kỹ thuật Tàu biển',
        currentLevel: 7,
        targetLevel: 9,
        progress: 78,
        lastUpdated: new Date('2024-09-18')
      },
      {
        skill: 'Điều khiển Tàu',
        currentLevel: 6,
        targetLevel: 8,
        progress: 75,
        lastUpdated: new Date('2024-09-15')
      },
      {
        skill: 'Luật Hàng hải',
        currentLevel: 5,
        targetLevel: 8,
        progress: 63,
        lastUpdated: new Date('2024-09-12')
      }
    ]
  });

  learningGoals = signal<LearningGoal[]>([
    {
      id: 'goal-1',
      title: 'Hoàn thành chứng chỉ STCW',
      description: 'Đạt được chứng chỉ an toàn hàng hải quốc tế',
      targetDate: new Date('2024-12-31'),
      progress: 60,
      category: 'certification',
      milestones: [
        { id: 'm1', title: 'Hoàn thành khóa An toàn', completed: true, completedAt: new Date('2024-08-15') },
        { id: 'm2', title: 'Thi đậu bài kiểm tra', completed: true, completedAt: new Date('2024-09-01') },
        { id: 'm3', title: 'Thực hành tại cảng', completed: false },
        { id: 'm4', title: 'Nộp hồ sơ chứng chỉ', completed: false }
      ]
    },
    {
      id: 'goal-2',
      title: 'Học 100 giờ trong năm',
      description: 'Mục tiêu học tập hàng năm',
      targetDate: new Date('2024-12-31'),
      progress: 45,
      category: 'study',
      milestones: [
        { id: 'm1', title: 'Học 25 giờ quý 1', completed: true, completedAt: new Date('2024-03-31') },
        { id: 'm2', title: 'Học 25 giờ quý 2', completed: true, completedAt: new Date('2024-06-30') },
        { id: 'm3', title: 'Học 25 giờ quý 3', completed: false },
        { id: 'm4', title: 'Học 25 giờ quý 4', completed: false }
      ]
    }
  ]);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private async loadAnalytics(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Simulate loading analytics data
      await this.simulateAnalyticsLoading();
      
      console.log('🔧 Student Analytics - Component initialized');
      console.log('🔧 Student Analytics - Analytics data loaded:', this.analytics());
      console.log('🔧 Student Analytics - Learning goals:', this.learningGoals().length);
      
      this.errorService.showSuccess('Phân tích học tập đã được tải thành công!', 'analytics');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'analytics');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateAnalyticsLoading(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  updateAnalytics(): void {
    // Update analytics based on selected period
    console.log('🔧 Student Analytics - Updating analytics for period:', this.selectedPeriod());
    this.errorService.showInfo(`Đang cập nhật phân tích cho ${this.selectedPeriod()} ngày qua`, 'analytics');
    // In real implementation, this would fetch new data based on selected period
  }

  exportReport(): void {
    // Export analytics report
    console.log('🔧 Student Analytics - Exporting analytics report');
    
    // Simulate report generation
    const reportData = {
      analytics: this.analytics(),
      goals: this.learningGoals(),
      period: this.selectedPeriod(),
      generatedAt: new Date()
    };
    
    // Create and download report
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `learning-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    this.errorService.showSuccess('Báo cáo đã được tải xuống thành công!', 'export');
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }

  getCompletedMilestones(milestones: Milestone[]): number {
    return milestones.filter(m => m.completed).length;
  }
}