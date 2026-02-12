import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';

@Component({
  selector: 'app-user-search-filter',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Search Input -->
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <input type="text"
                   [value]="state.searchQuery()"
                   (input)="state.onSearchInput($any($event.target).value)"
                   placeholder="Tìm kiếm theo tên hoặc email..."
                   class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent">
          </div>
        </div>
        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row gap-3">
          <!-- Role Filter -->
          <select [value]="state.roleFilter()"
                  (change)="state.onRoleFilterChange($any($event.target).value)"
                  class="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent bg-white">
            <option value="">Tất cả vai trò</option>
            @for (roleOpt of state.ROLE_OPTIONS; track roleOpt.value) {
              <option [value]="roleOpt.value">{{ roleOpt.label }}</option>
            }
          </select>
          <!-- Status Filter -->
          <select [value]="state.statusFilter()"
                  (change)="state.onStatusFilterChange($any($event.target).value)"
                  class="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent bg-white">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>
      </div>
      <!-- Results Count -->
      <div class="mt-3 pt-3 border-t border-gray-200">
        <p class="text-xs text-gray-600">
          Hiển thị <span class="font-medium text-gray-900">{{ state.filteredUsers().length }}</span>
          trong tổng số <span class="font-medium text-gray-900">{{ state.totalUsers() }}</span> người dùng
        </p>
      </div>
    </div>
  `
})
export class UserSearchFilterComponent {
  readonly state = inject(UserManagementState);
}
