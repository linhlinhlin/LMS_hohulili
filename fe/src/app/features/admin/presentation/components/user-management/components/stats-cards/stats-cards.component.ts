import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-user-stats-cards',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Total Users Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng người dùng</p>
            <p class="text-2xl font-bold text-gray-900">{{ state.totalUsers() }}</p>
            <p class="text-xs text-gray-600 mt-2">{{ state.activeUsers() }} đang hoạt động</p>
          </div>
          <div class="w-10 h-10 bg-[#0056D2]/5 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-[#0056D2]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Teachers Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Giảng viên</p>
            <p class="text-2xl font-bold text-gray-900">{{ state.totalTeachers() }}</p>
            <p class="text-xs text-gray-600 mt-2">Đang giảng dạy</p>
          </div>
          <div class="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Students Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Học viên</p>
            <p class="text-2xl font-bold text-gray-900">{{ state.totalStudents() }}</p>
            <p class="text-xs text-gray-600 mt-2">Đang học tập</p>
          </div>
          <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Admins Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quản trị viên</p>
            <p class="text-2xl font-bold text-gray-900">{{ state.totalAdmins() }}</p>
            <p class="text-xs text-gray-600 mt-2">Quản lý hệ thống</p>
          </div>
          <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UserStatsCardsComponent {
  readonly state = inject(UserManagementState);
}
