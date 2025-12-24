import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-teacher-sidebar-simple',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="w-64 bg-white shadow-lg h-full flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Teacher Portal</h2>
            <p class="text-sm text-gray-600">{{ authService.currentUser()?.fullName || authService.currentUser()?.name }}</p>
          </div>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <!-- Dashboard -->
        <a routerLink="/teacher/dashboard" 
           routerLinkActive="bg-blue-100 text-blue-700"
           class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
          </svg>
          <span class="font-medium">Dashboard</span>
        </a>

        <!-- Courses -->
        <a routerLink="/teacher/courses" 
           routerLinkActive="bg-blue-100 text-blue-700"
           class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          <span class="font-medium">Khóa học</span>
        </a>

        <!-- Assessments Section (Expanded) -->
        <div class="space-y-1">
          <div class="flex items-center px-4 py-3 text-gray-900 rounded-lg bg-gray-50">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <span class="font-semibold">Bài tập & Chấm điểm</span>
          </div>
          
          <div class="pl-12 space-y-1">
            <!-- 1.1 Bài tập tự luận -->
            <a routerLink="/teacher/assessments/assignments" 
               routerLinkActive="text-blue-700 font-medium"
               class="block py-2 text-sm text-gray-600 hover:text-blue-600">
              1.1 Bài tập tự luận
            </a>

            <!-- 1.2 Thư viện Rubric -->
            <a routerLink="/teacher/assessments/rubrics" 
               routerLinkActive="text-blue-700 font-medium"
               class="block py-2 text-sm text-gray-600 hover:text-blue-600">
              1.2 Thư viện Rubric
            </a>

            <!-- Divider -->
            <div class="my-2 border-t border-gray-200"></div>

            <!-- 1.3 Ngân hàng câu hỏi -->
            <a routerLink="/teacher/assessments/question-bank" 
               routerLinkActive="text-blue-700 font-medium"
               class="block py-2 text-sm text-gray-600 hover:text-blue-600">
              1.3 Ngân hàng câu hỏi
            </a>

            <!-- 1.4 Bài tập trắc nghiệm -->
            <a routerLink="/teacher/assessments/quizzes" 
               routerLinkActive="text-blue-700 font-medium"
               class="block py-2 text-sm text-gray-600 hover:text-blue-600">
              1.4 Bài tập trắc nghiệm
            </a>
          </div>
        </div>

        <!-- Students -->
        <a routerLink="/teacher/students" 
           routerLinkActive="bg-blue-100 text-blue-700"
           class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
          <span class="font-medium">Học viên</span>
        </a>

        <!-- Analytics -->
        <a routerLink="/teacher/analytics" 
           routerLinkActive="bg-blue-100 text-blue-700"
           class="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <span class="font-medium">Phân tích</span>
        </a>
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-gray-200">
        <button (click)="logout()" 
                class="w-full flex items-center px-4 py-3 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          <span class="font-medium">Đăng xuất</span>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeacherSidebarSimpleComponent {
  protected authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}