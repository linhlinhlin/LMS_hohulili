import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserManagementState } from '../../state/user-management.state';
import { AdminUser } from '../../../../../infrastructure/services/admin.service';

@Component({
  selector: 'app-users-table',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    select.role-select {
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-block;
      box-sizing: border-box;
      min-width: 130px;
      max-width: 200px;
      width: auto;
      line-height: 1.5;
      appearance: auto;
      -webkit-appearance: auto;
      -moz-appearance: auto;
      text-align: left;
      padding-right: 0.75rem;
    }
    select.role-select:hover { border-color: #9CA3AF; }
    select.role-select:focus { outline: none; }
    select.role-select option { padding: 8px 12px; background: white; color: #1f2937; }
    td { overflow: visible; }
  `],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
      <!-- Deletion Loading Overlay -->
      @if (state.isDeletingUser()) {
        <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div class="text-center">
            <div class="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#0056D2] rounded-full animate-spin"></div>
            <p class="mt-4 text-sm text-gray-600 font-medium">Đang xử lý...</p>
          </div>
        </div>
      }

      @if (state.isLoadingUsers()) {
        <div class="p-12 text-center">
          <div class="inline-block">
            <div class="w-12 h-12 border-4 border-gray-200 border-t-[#0056D2] rounded-full animate-spin"></div>
          </div>
          <p class="mt-4 text-sm text-gray-600">Đang tải danh sách người dùng...</p>
        </div>
      } @else if (state.filteredUsers().length === 0) {
        <div class="p-12 text-center">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
          </svg>
          <h3 class="text-base font-medium text-gray-900 mb-2">Không tìm thấy người dùng</h3>
          <p class="text-sm text-gray-600 mb-4">Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác</p>
          <button (click)="state.clearFilters()"
                  class="inline-flex items-center px-4 py-2 bg-[#0056D2] text-white text-sm font-medium rounded hover:bg-[#004BB5] transition-colors">
            Xóa bộ lọc
          </button>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Người dùng</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Vai trò</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Thao tác</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Trạng thái</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Hoạt động cuối</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Thống kê</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              @for (user of state.filteredUsers(); track user.id) {
                <tr class="hover:bg-gray-50 transition-colors">
                  <!-- Người dùng -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <img [src]="user.avatar || state.getDefaultAvatar(user.email)"
                           [alt]="user.name"
                           class="w-10 h-10 rounded-full border border-gray-200">
                      <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                        <div class="text-xs text-gray-500">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                  <!-- Vai trò -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    @if (state.canChangeRole(user)) {
                      <select [ngModel]="user.role"
                              (ngModelChange)="state.onRoleChange(user.id, user.role, $event)"
                              [name]="'user-role-' + user.id"
                              class="role-select px-3 py-1.5 text-xs font-medium rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent cursor-pointer bg-white"
                              [ngClass]="state.getRoleClass(user.role)"
                              title="Click để thay đổi vai trò">
                        @for (roleOpt of state.ROLE_OPTIONS; track roleOpt.value) {
                          <option [value]="roleOpt.value">{{ roleOpt.label }}</option>
                        }
                      </select>
                    } @else {
                      <span class="inline-flex px-3 py-1.5 text-xs font-medium rounded border"
                            [ngClass]="state.getRoleClass(user.role)">
                        {{ state.getRoleText(user.role) }}
                      </span>
                    }
                  </td>
                  <!-- Thao tác -->
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div class="flex items-center justify-center space-x-1">
                      @if (state.canChangeStatus(user)) {
                        <select (change)="onStatusAction(user, $any($event.target).value); $any($event.target).value = ''"
                                class="text-xs px-2 py-1 border border-gray-300 rounded bg-white cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0056D2]"
                                title="Thay đổi trạng thái">
                          <option value="" disabled selected>Trạng thái</option>
                          @if (user.accountStatus !== 'ACTIVE') {
                            <option value="ACTIVE">Kích hoạt</option>
                          }
                          @if (user.accountStatus !== 'BLOCKED') {
                            <option value="BLOCKED">Khóa</option>
                          }
                          @if (user.accountStatus !== 'RESTRICTED') {
                            <option value="RESTRICTED">Hạn chế</option>
                          }
                        </select>
                      }
                      @if (state.canDeleteUser(user)) {
                        <button (click)="state.deleteUser(user.id)"
                                class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Vô hiệu hóa tài khoản">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      }
                    </div>
                  </td>
                  <!-- Trạng thái -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded"
                          [class]="state.getStatusBadgeClass(user.accountStatus)">
                      <span class="w-1.5 h-1.5 rounded-full mr-1.5"
                            [class]="state.getStatusDotClass(user.accountStatus)"></span>
                      {{ state.getStatusLabel(user.accountStatus) }}
                    </span>
                  </td>
                  <!-- Hoạt động cuối -->
                  <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                    {{ user.lastLogin ? state.formatDate(user.lastLogin) : 'Chưa đăng nhập' }}
                  </td>
                  <!-- Thống kê -->
                  <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                    <div class="space-y-1">
                      @if (user.role === 'TEACHER') {
                        <div class="flex items-center">
                          <svg class="w-3 h-3 mr-1.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                          </svg>
                          <span>{{ user.coursesCreated || 0 }} khóa học</span>
                        </div>
                      }
                      @if (user.role === 'STUDENT') {
                        <div class="flex items-center">
                          <svg class="w-3 h-3 mr-1.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                          </svg>
                          <span>{{ user.coursesEnrolled || 0 }} đã đăng ký</span>
                        </div>
                      }
                      <div class="flex items-center">
                        <svg class="w-3 h-3 mr-1.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                        </svg>
                        <span>{{ user.loginCount || 0 }} lần</span>
                      </div>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (state.pagination() && state.pagination()!.totalPages > 1) {
          <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div class="text-sm text-gray-700">
                <p>
                  Hiển thị
                  <span class="font-medium">{{ ((state.pagination()!.page - 1) * state.pagination()!.limit) + 1 }}</span>
                  đến
                  <span class="font-medium">{{ state.getMinValue(state.pagination()!.page * state.pagination()!.limit, state.pagination()!.totalItems) }}</span>
                  trong tổng số
                  <span class="font-medium">{{ state.pagination()!.totalItems }}</span>
                  kết quả
                </p>
              </div>

              <div class="flex items-center space-x-1">
                <nav class="hidden sm:inline-flex rounded-md shadow-sm" aria-label="Pagination">
                  <button (click)="state.goToPage(state.pagination()!.page - 1)"
                          [disabled]="state.pagination()!.page === 1"
                          class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="sr-only">Previous</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>

                  @for (page of state.getVisiblePages(); track page) {
                    <button (click)="state.goToPage(page)"
                            [class]="page === state.pagination()!.page ? 'z-10 bg-[#0056D2]/5 border-[#0056D2] text-[#0056D2] relative inline-flex items-center px-4 py-2 border text-sm font-medium' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium'">
                      {{ page }}
                    </button>
                  }

                  <button (click)="state.goToPage(state.pagination()!.page + 1)"
                          [disabled]="state.pagination()!.page === state.pagination()!.totalPages"
                          class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="sr-only">Next</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class UsersTableComponent {
  readonly state = inject(UserManagementState);

  statusAction = output<{ user: AdminUser; status: string }>();

  onStatusAction(user: AdminUser, status: string): void {
    if (status) {
      this.statusAction.emit({ user, status });
    }
  }
}
