import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'course' | 'quiz' | 'streak' | 'social';
}

interface Course {
  id: string;
  title: string;
  deadline?: string;
}

@Component({
  selector: 'app-dashboard-sidebar',
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Upcoming Deadlines -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <svg class="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Deadline sắp tới
        </h3>

        <div class="space-y-3">
          @for (course of getUpcomingDeadlines().slice(0, 3); track course.id) {
            <div class="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <h4 class="font-medium text-gray-900 text-sm mb-1">{{ course.title }}</h4>
              <p class="text-xs text-orange-700">{{ formatDate(course.deadline) }}</p>
            </div>
          }

          @if (getUpcomingDeadlines().length === 0) {
            <div class="text-center py-4">
              <svg class="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-sm text-gray-500">Không có deadline</p>
            </div>
          }
        </div>
      </div>

      <!-- Recent Achievements -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Thành tích</h3>
        <div class="space-y-3">
          @for (achievement of achievements().slice(0, 3); track achievement.id) {
            <div class="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <span class="text-lg">{{ achievement.icon }}</span>
              <div>
                <h4 class="font-medium text-gray-900 text-sm">{{ achievement.title }}</h4>
                <p class="text-xs text-gray-600">{{ formatDate(achievement.earnedAt.toISOString()) }}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardSidebarComponent {
  enrolledCourses = input<Course[]>([]);
  achievements = input<Achievement[]>([]);

  getUpcomingDeadlines(): Course[] {
    return this.enrolledCourses().filter(course => course.deadline);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}