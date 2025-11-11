import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserManagementService, AdminUser, UserRole } from './user-management.service';
import { LoadingComponent } from '../shared/components/loading/loading.component';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State -->
    <app-loading
      [show]="userManagementService.isLoading()"
      text="Đang tải dữ liệu người dùng..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="red">
    </app-loading>

    <div class="bg-gray-50 min-h-screen">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-auto">
        <!-- Header with Actions -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 class="text-2xl lg:text-3xl font-bold text-gray-900">👥 Quản lý người dùng</h1>
              <p class="text-gray-600 mt-1">Quản lý và theo dõi tất cả người dùng trong hệ thống</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <button (click)="openCreateUserModal()"
                      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                Thêm người dùng
              </button>
              <button (click)="openBulkImportModal()"
                      class="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-200">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
                Import Excel
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Tổng người dùng</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalUsers() }}</p>
                <p class="text-sm text-red-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  +{{ activeUsers() }} đang hoạt động
                </p>
              </div>
              <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-purple-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Giảng viên</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalTeachers() }}</p>
                <p class="text-sm text-purple-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Hoạt động
                </p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Học viên</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalStudents() }}</p>
                <p class="text-sm text-blue-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Đang học
                </p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-green-500">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 mb-1">Quản trị viên</p>
                <p class="text-3xl font-bold text-gray-900">{{ totalAdmins() }}</p>
                <p class="text-sm text-green-600 flex items-center mt-1">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Quản lý hệ thống
                </p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter and Search -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-1">
              <input type="text"
                     [(ngModel)]="searchQuery"
                     placeholder="Tìm kiếm người dùng..."
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
            </div>
            <div class="flex gap-4">
              <select [(ngModel)]="roleFilter"
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option value="">Tất cả vai trò</option>
                <option value="admin">Quản trị viên</option>
                <option value="teacher">Giảng viên</option>
                <option value="student">Học viên</option>
              </select>
              <select [(ngModel)]="statusFilter"
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <div class="overflow-x-auto w-full">
            <table class="min-w-full divide-y divide-gray-200 table-fixed">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/6">
                    Người dùng
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Vai trò
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Trạng thái
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Hoạt động cuối
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Thống kê
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (user of filteredUsers(); track user.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-4">
                      <div class="flex items-center">
                        <img [src]="user.avatar"
                             [alt]="user.name"
                             class="w-10 h-10 rounded-full flex-shrink-0">
                        <div class="ml-3 min-w-0 flex-1">
                          <div class="text-sm font-medium text-gray-900 truncate">{{ user.name }}</div>
                          <div class="text-sm text-gray-500 truncate">{{ user.email }}</div>
                          @if (user.studentId) {
                            <div class="text-xs text-gray-400 truncate">{{ user.studentId }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-4">
                      <span class="px-2 py-1 text-xs font-medium rounded-full"
                            [class]="getRoleClass(user.role)">
                        {{ getRoleText(user.role) }}
                      </span>
                    </td>
                    <td class="px-4 py-4">
                      <span class="px-2 py-1 text-xs font-medium rounded-full"
                            [class]="user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        {{ user.isActive ? 'Hoạt động' : 'Không hoạt động' }}
                      </span>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-500">
                      {{ formatDate(user.lastLogin) }}
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-500">
                      @if (user.role === 'teacher') {
                        <div>{{ user.coursesCreated }} khóa học</div>
                      } @else if (user.role === 'student') {
                        <div>{{ user.coursesEnrolled }} khóa học</div>
                        <div>{{ formatCurrency(user.totalSpent || 0) }}</div>
                      } @else {
                        <div>{{ user.loginCount }} lần đăng nhập</div>
                      }
                    </td>
                    <td class="px-4 py-4 text-right">
                      <div class="flex items-center justify-end space-x-1">
                        <button (click)="editUser(user)"
                                class="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                                title="Chỉnh sửa">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                          </svg>
                        </button>
                        <button (click)="toggleUserStatus(user.id)"
                                [class]="user.isActive ? 'p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded' : 'p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded'"
                                [title]="user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'">
                          @if (user.isActive) {
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"></path>
                            </svg>
                          } @else {
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                          }
                        </button>
                        <button (click)="deleteUser(user.id)"
                                class="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                title="Xóa">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (userManagementService.pagination() && userManagementService.pagination()!.totalPages > 1) {
            <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="text-sm text-gray-700">
                  <p>
                    Hiển thị
                    <span class="font-medium">{{ (userManagementService.pagination()!.number * userManagementService.pagination()!.size) + 1 }}</span>
                    đến
                    <span class="font-medium">{{ getMinValue((userManagementService.pagination()!.number + 1) * userManagementService.pagination()!.size, userManagementService.pagination()!.totalElements) }}</span>
                    trong tổng số
                    <span class="font-medium">{{ userManagementService.pagination()!.totalElements }}</span>
                    kết quả
                  </p>
                </div>
                <div class="flex items-center space-x-1">
                  <!-- Mobile pagination -->
                  <div class="flex sm:hidden">
                    <button (click)="goToPage(userManagementService.pagination()!.number)"
                            [disabled]="userManagementService.pagination()!.first"
                            class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      Trước
                    </button>
                    <button (click)="goToPage(userManagementService.pagination()!.number + 2)"
                            [disabled]="userManagementService.pagination()!.last"
                            class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      Sau
                    </button>
                  </div>

                  <!-- Desktop pagination -->
                  <nav class="hidden sm:inline-flex rounded-md shadow-sm" aria-label="Pagination">
                    <button (click)="goToPage(userManagementService.pagination()!.number)"
                            [disabled]="userManagementService.pagination()!.first"
                            class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span class="sr-only">Previous</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>

                    @for (page of getVisiblePages(); track page) {
                      <button (click)="goToPage(page)"
                              [class]="page === userManagementService.pagination()!.number + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium'"
                              class="relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                        {{ page }}
                      </button>
                    }

                    <button (click)="goToPage(userManagementService.pagination()!.number + 2)"
                            [disabled]="userManagementService.pagination()!.last"
                            class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                      <span class="sr-only">Next</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (filteredUsers().length === 0) {
          <div class="text-center py-12">
            <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Không có người dùng nào</h3>
            <p class="text-gray-500 mb-6">Bắt đầu thêm người dùng đầu tiên</p>
            <button (click)="openCreateUserModal()"
                    class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Thêm người dùng
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Create User Modal -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto" (click)="closeCreateUserModal()">
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" (click)="$event.stopPropagation()">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Thêm người dùng mới
                </h3>

                <form (ngSubmit)="createUser()" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tên người dùng *</label>
                    <input type="text"
                           [ngModel]="newUser().name || ''"
                           (ngModelChange)="updateNewUser('name', $event)"
                           name="name"
                           required
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email"
                           [ngModel]="newUser().email || ''"
                           (ngModelChange)="updateNewUser('email', $event)"
                           name="email"
                           required
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                    <select [ngModel]="newUser().role || ''"
                            (ngModelChange)="updateNewUser('role', $event)"
                            name="role"
                            required
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                      <option value="">Chọn vai trò</option>
                      <option value="admin">Quản trị viên</option>
                      <option value="teacher">Giảng viên</option>
                      <option value="student">Học viên</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                    <input type="text"
                           [ngModel]="newUser().department || ''"
                           (ngModelChange)="updateNewUser('department', $event)"
                           name="department"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button (click)="createUser()"
                    [disabled]="!newUser().name || !newUser().email || !newUser().role"
                    class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Tạo người dùng
            </button>
            <button (click)="closeCreateUserModal()"
                    class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Hủy
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Edit User Modal -->
    @if (isEditModalOpen()) {
      <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div class="mt-3">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Chỉnh sửa người dùng</h3>
              <button (click)="closeEditModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                <input type="text"
                       [ngModel]="editingUser()?.name"
                       (ngModelChange)="updateEditingUser('name', $event)"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email"
                       [ngModel]="editingUser()?.email"
                       (ngModelChange)="updateEditingUser('email', $event)"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select [ngModel]="editingUser()?.role"
                        (ngModelChange)="updateEditingUser('role', $event)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option [ngValue]="UserRole.STUDENT">Học viên</option>
                  <option [ngValue]="UserRole.TEACHER">Giảng viên</option>
                  <option [ngValue]="UserRole.ADMIN">Quản trị</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Khoa/Phòng ban</label>
                <input type="text"
                       [ngModel]="editingUser()?.department"
                       (ngModelChange)="updateEditingUser('department', $event)"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              </div>

              @if (editingUser()?.role === UserRole.STUDENT) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Mã sinh viên</label>
                  <input type="text"
                         [ngModel]="editingUser()?.studentId"
                         (ngModelChange)="updateEditingUser('studentId', $event)"
                         class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                </div>
              }
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button (click)="closeEditModal()"
                      class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
                Hủy
              </button>
              <button (click)="saveUserEdit()"
                      class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Bulk Import Modal -->
    @if (isBulkImportModalOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Import người dùng từ Excel
                  </h3>

                  <!-- Template Info -->
                   <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                     <div class="flex">
                       <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                         <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                       </svg>
                       <div class="text-sm text-blue-700">
                         <p class="font-medium mb-1">Định dạng file Excel yêu cầu:</p>
                         <ul class="list-disc list-inside space-y-1 text-xs">
                           <li>Cột A: Username (bắt buộc) - Tên đăng nhập</li>
                           <li>Cột B: Email (bắt buộc) - Địa chỉ email</li>
                           <li>Cột C: Full Name (bắt buộc) - Họ tên đầy đủ</li>
                           <li>Cột D: Department (tùy chọn) - Phòng ban/Khoa</li>
                         </ul>
                         <button (click)="downloadTemplate()"
                                 class="mt-2 text-blue-600 hover:text-blue-800 underline text-xs">
                           Tải template mẫu
                         </button>
                       </div>
                     </div>
                   </div>

                   <!-- Role Selection -->
                   <div class="mb-4">
                     <label class="block text-sm font-medium text-gray-700 mb-2">
                       Chọn vai trò cho tất cả người dùng được import
                     </label>
                     <select [(ngModel)]="defaultImportRole"
                             name="importRole"
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                       <option [ngValue]="UserRole.STUDENT">Học viên</option>
                       <option [ngValue]="UserRole.TEACHER">Giảng viên</option>
                       <option [ngValue]="UserRole.ADMIN">Quản trị viên</option>
                     </select>
                     <p class="text-xs text-gray-500 mt-1">
                       Tất cả người dùng trong file Excel sẽ được gán vai trò này
                     </p>
                   </div>

                  <!-- File Upload -->
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Chọn file Excel (.xlsx hoặc .xls)
                      </label>
                      <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                        @if (selectedFile()) {
                          <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <div class="mt-4">
                              <p class="text-sm font-medium text-gray-900">{{ selectedFile()?.name }}</p>
                              <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                            </div>
                            <button (click)="removeFile()"
                                    class="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                              Chọn file khác
                            </button>
                          </div>
                        } @else {
                          <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0