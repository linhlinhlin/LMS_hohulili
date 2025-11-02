import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-hero',
  imports: [CommonModule],
  template: `
    <!-- Hero Welcome Section - Full Width -->
    <div class="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white w-full relative overflow-hidden">
      <!-- Background Pattern - Non-interactive -->
      <div class="absolute inset-0 opacity-10 pointer-events-none">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="waves" x="0" y="0" width="100" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 20 Q25 0 50 20 T100 20 V0 H0 Z" fill="currentColor"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#waves)"/>
        </svg>
      </div>

      <div class="relative z-10 w-full px-6 py-12">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div class="flex-1">
            <div class="flex items-center space-x-4 mb-4">
              <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div>
                <h1 class="text-2xl lg:text-3xl font-bold">Chào mừng, {{ userName() }}!</h1>
                <p class="text-blue-100">Tiếp tục hành trình học tập hàng hải của bạn</p>
              </div>
            </div>

            <!-- Achievement Badges -->
            <div class="flex flex-wrap items-center gap-3">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                🔥 {{ currentStreak() }} ngày học liên tiếp
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                ⭐ Level {{ currentLevel() }}
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-400/20 text-yellow-100">
                🏆 {{ achievementsCount() }} thành tích
              </span>
            </div>
          </div>

          <!-- Quick Stats Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div class="text-2xl font-bold">{{ enrolledCoursesCount() }}</div>
              <div class="text-sm text-blue-200">Khóa học</div>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div class="text-2xl font-bold">{{ completedCoursesCount() }}</div>
              <div class="text-sm text-blue-200">Hoàn thành</div>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div class="text-2xl font-bold">{{ totalStudyTime() }}h</div>
              <div class="text-sm text-blue-200">Giờ học</div>
            </div>
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <div class="text-2xl font-bold">{{ averageGrade() }}</div>
              <div class="text-sm text-blue-200">Điểm TB</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DashboardHeroComponent {
  userName = input<string>('Người dùng');
  currentStreak = input<number>(0);
  currentLevel = input<number>(1);
  achievementsCount = input<number>(0);
  enrolledCoursesCount = input<number>(0);
  completedCoursesCount = input<number>(0);
  totalStudyTime = input<number>(0);
  averageGrade = input<number>(0);
}