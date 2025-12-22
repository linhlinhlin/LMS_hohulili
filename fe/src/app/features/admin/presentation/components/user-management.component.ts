import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, CreateUserRequest, UpdateUserRequest } from '../../infrastructure/services/admin.service';
import { UserRole } from '../../../../core/services/auth.service';
import * as XLSX from 'xlsx';

interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
}

interface BulkImportProgress {
  isImporting: boolean;
  progress: number;
  currentStep: string;
  result?: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    errors: string[];
  };
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  styles: [`
    /* Coursera-inspired clean styles */
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

    select.role-select:hover {
      border-color: #9CA3AF;
    }

    select.role-select:focus {
      outline: none;
    }

    select.role-select option {
      padding: 8px 12px;
      background: white;
      color: #1f2937;
    }

    /* Table cell overflow */
    td { overflow: visible; }
  `],
  template: `
    <!-- Modern Coursera-inspired Layout -->
    <div class="min-h-screen bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <!-- Clean Header Section -->
        <div class="mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <!-- Title Section -->
            <div>
              <h1 class="text-2xl font-bold text-gray-900 mb-1">Quản lý người dùng</h1>
              <p class="text-sm text-gray-600">Quản lý và theo dõi tất cả người dùng trong hệ thống</p>
            </div>
            <!-- Action Buttons - Coursera Style -->
            <div class="flex flex-col sm:flex-row gap-3">
              <button (click)="openCreateUserModal()"
                      class="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                Thêm người dùng
              </button>
              <button (click)="openBulkImportModal()"
                      class="inline-flex items-center justify-center px-4 py-2.5 bg-white text-gray-700 text-sm font-medium rounded border border-gray-300 hover:bg-gray-50 transition-colors">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
                Import Excel
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Cards - Coursera Style -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <!-- Total Users Card -->
          <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tổng người dùng</p>
                <p class="text-2xl font-bold text-gray-900">{{ totalUsers() }}</p>
                <p class="text-xs text-gray-600 mt-2">{{ activeUsers() }} đang hoạt động</p>
              </div>
              <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
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
                <p class="text-2xl font-bold text-gray-900">{{ totalTeachers() }}</p>
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
                <p class="text-2xl font-bold text-gray-900">{{ totalStudents() }}</p>
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
                <p class="text-2xl font-bold text-gray-900">{{ totalAdmins() }}</p>
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

        <!-- Search and Filter - Coursera Style -->
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
                       [value]="searchQuery()"
                       (input)="onSearchInput($any($event.target).value)"
                       placeholder="Tìm kiếm theo tên hoặc email..."
                       class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
            <!-- Filter Controls -->
            <div class="flex flex-col sm:flex-row gap-3">
              <!-- Role Filter -->
              <select [value]="roleFilter()"
                      (change)="onRoleFilterChange($any($event.target).value)"
                      class="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên</option>
                <option value="TEACHER">Giảng viên</option>
                <option value="STUDENT">Học viên</option>
              </select>
              <!-- Status Filter -->
              <select [value]="statusFilter()"
                      (change)="onStatusFilterChange($any($event.target).value)"
                      class="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </div>
          <!-- Results Count -->
          <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-xs text-gray-600">
              Hiển thị <span class="font-medium text-gray-900">{{ filteredUsers().length }}</span> 
              trong tổng số <span class="font-medium text-gray-900">{{ totalUsers() }}</span> người dùng
            </p>
          </div>
        </div>

        <!-- Users Table - Coursera Style -->
        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
          <!-- Deletion Loading Overlay -->
          @if (isDeletingUser()) {
            <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div class="text-center">
                <div class="inline-block w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p class="mt-4 text-sm text-gray-600 font-medium">Đang xử lý...</p>
              </div>
            </div>
          }
          
          @if (isLoadingUsers()) {
            <div class="p-12 text-center">
              <div class="inline-block">
                <div class="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <p class="mt-4 text-sm text-gray-600">Đang tải danh sách người dùng...</p>
            </div>
          } @else if (filteredUsers().length === 0) {
            <div class="p-12 text-center">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
              </svg>
              <h3 class="text-base font-medium text-gray-900 mb-2">Không tìm thấy người dùng</h3>
              <p class="text-sm text-gray-600 mb-4">Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khóa khác</p>
              <button (click)="clearFilters()" 
                      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                Xóa bộ lọc
              </button>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Người dùng
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Thao tác
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Hoạt động cuối
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Thống kê
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">
                  @for (user of filteredUsers(); track user.id) {
                    <tr class="hover:bg-gray-50 transition-colors">
                      <!-- Người dùng -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <img [src]="user.avatar || getDefaultAvatar(user.email)" 
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
                        <select [ngModel]="user.role"
                                (ngModelChange)="onRoleChange(user.id, user.role, $event)"
                                [name]="'user-role-' + user.id"
                                class="role-select px-3 py-1.5 text-xs font-medium rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer bg-white"
                                [ngClass]="getRoleClass(user.role)"
                                title="Click để thay đổi vai trò">
                          @for (roleOpt of ROLE_OPTIONS; track roleOpt.value) {
                            <option [value]="roleOpt.value">{{ roleOpt.label }}</option>
                          }
                        </select>
                      </td>
                      <!-- Thao tác -->
                      <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div class="flex items-center justify-center space-x-1">
                          <button (click)="toggleUserStatus(user.id)"
                                  [class]="user.isActive ? 'p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors' : 'p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors'"
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
                                  class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Vô hiệu hóa tài khoản">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                      <!-- Trạng thái -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded"
                              [class]="user.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200'">
                          <span class="w-1.5 h-1.5 rounded-full mr-1.5"
                                [class]="user.isActive ? 'bg-green-500' : 'bg-gray-400'"></span>
                          {{ user.isActive ? 'Hoạt động' : 'Không hoạt động' }}
                        </span>
                      </td>
                      <!-- Hoạt động cuối -->
                      <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {{ user.lastLogin ? formatDate(user.lastLogin) : 'Chưa đăng nhập' }}
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
            @if (pagination() && pagination()!.totalPages > 1) {
              <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div class="text-sm text-gray-700">
                    <p>
                      Hiển thị
                      <span class="font-medium">{{ ((pagination()!.page - 1) * pagination()!.limit) + 1 }}</span>
                      đến
                      <span class="font-medium">{{ getMinValue(pagination()!.page * pagination()!.limit, pagination()!.totalItems) }}</span>
                      trong tổng số
                      <span class="font-medium">{{ pagination()!.totalItems }}</span>
                      kết quả
                    </p>
                  </div>

                  <div class="flex items-center space-x-1">
                    <!-- Mobile pagination -->
                    <div class="flex sm:hidden">
                      <button (click)="goToPage(pagination()!.page - 1)"
                              [disabled]="pagination()!.page === 1"
                              class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        Trước
                      </button>
                      <button (click)="goToPage(pagination()!.page + 1)"
                              [disabled]="pagination()!.page === pagination()!.totalPages"
                              class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        Sau
                      </button>
                    </div>

                    <!-- Desktop pagination -->
                    <nav class="hidden sm:inline-flex rounded-md shadow-sm" aria-label="Pagination">
                      <button (click)="goToPage(pagination()!.page - 1)"
                              [disabled]="pagination()!.page === 1"
                              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span class="sr-only">Previous</span>
                        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </button>

                      @for (page of getVisiblePages(); track page) {
                        <button (click)="goToPage(page)"
                                [class]="page === pagination()!.page ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium'">
                          {{ page }}
                        </button>
                      }

                      <button (click)="goToPage(pagination()!.page + 1)"
                              [disabled]="pagination()!.page === pagination()!.totalPages"
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
          }

          <!-- Empty State -->
          @if (filteredUsers().length === 0 && !isLoadingUsers()) {
            <div class="text-center py-12">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 8v1h1.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8v-1a5 5 0 00-5 5v1h9.93z"></path>
              </svg>
              <h3 class="text-base font-medium text-gray-900 mb-2">Không có người dùng nào</h3>
              <p class="text-sm text-gray-600 mb-6">Bắt đầu thêm người dùng đầu tiên</p>
              <button (click)="openCreateUserModal()"
                      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                </svg>
                Thêm người dùng
              </button>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Create User Modal - Coursera Style -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40" (click)="closeCreateUserModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900">
                Thêm người dùng mới
              </h3>
              <button (click)="closeCreateUserModal()"
                      class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Body -->
            <form (ngSubmit)="createUser()" class="p-6 space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Tên người dùng <span class="text-red-500">*</span>
                </label>
                <input type="text"
                       [(ngModel)]="newUserName"
                       name="name"
                       required
                       placeholder="Nhập tên đầy đủ"
                       class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email <span class="text-red-500">*</span>
                </label>
                <input type="email"
                       [(ngModel)]="newUserEmail"
                       name="email"
                       required
                       placeholder="example@domain.com"
                       class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Vai trò <span class="text-red-500">*</span>
                </label>
                <select [(ngModel)]="newUserRole"
                        name="role"
                        required
                        class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
                  <option value="">Chọn vai trò</option>
                  <option value="ADMIN">Quản trị viên</option>
                  <option value="TEACHER">Giảng viên</option>
                  <option value="STUDENT">Học viên</option>
                </select>
              </div>

              <!-- Info Note -->
              <div class="bg-blue-50 border border-blue-200 rounded p-3">
                <div class="flex">
                  <svg class="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                  </svg>
                  <p class="text-xs text-blue-700">
                    Mật khẩu mặc định là <span class="font-semibold">Password123!</span>. Người dùng nên đổi mật khẩu sau lần đăng nhập đầu tiên.
                  </p>
                </div>
              </div>
            </form>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button (click)="closeCreateUserModal()"
                      type="button"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button (click)="createUser()"
                      type="button"
                      [disabled]="!newUserName() || !newUserEmail() || !newUserRole()"
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Tạo người dùng
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Edit User Modal - Coursera Style -->
    @if (isEditModalOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40" (click)="closeEditModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
          <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 class="text-xl font-semibold text-gray-900">
                Chỉnh sửa người dùng
              </h3>
              <button (click)="closeEditModal()"
                      class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tên</label>
                <input type="text"
                       [(ngModel)]="editingUserName"
                       class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email"
                       [(ngModel)]="editingUserEmail"
                       class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                <select [(ngModel)]="editingUserRole"
                        class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
                  <option value="STUDENT">Học viên</option>
                  <option value="TEACHER">Giảng viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button (click)="closeEditModal()"
                      type="button"
                      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button (click)="saveUserEdit()"
                      type="button"
                      class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Bulk Import Modal - Part 1 -->
    @if (isBulkImportModalOpen()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50">
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
                      <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                      </svg>
                      <div class="text-sm text-blue-700">
                        <p class="font-medium mb-2">Định dạng file Excel yêu cầu:</p>
                        <ul class="list-disc list-inside space-y-1 text-xs mb-3">
                          <li>Cột A: Username (bắt buộc) - Tên đăng nhập</li>
                          <li>Cột B: Email (bắt buộc) - Địa chỉ email</li>
                          <li>Cột C: Full Name (bắt buộc) - Họ tên đầy đủ</li>
                          <li>Cột D: Password (tùy chọn) - Mật khẩu</li>
                          <li>Cột E: Department (tùy chọn) - Phòng ban/Khoa</li>
                        </ul>
                        <div class="bg-blue-100 border border-blue-300 rounded p-2 mb-2">
                          <p class="text-xs font-medium">
                            🔐 Mật khẩu mặc định: <span class="font-bold">Password123!</span>
                          </p>
                          <p class="text-xs mt-1">
                            Nếu file Excel không có cột Password, tất cả tài khoản sẽ dùng mật khẩu này.
                          </p>
                        </div>
                        <button (click)="downloadTemplate()"
                                class="text-blue-600 hover:text-blue-800 underline text-xs font-medium">
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
                      <option value="STUDENT">Học viên</option>
                      <option value="TEACHER">Giảng viên</option>
                      <option value="ADMIN">Quản trị viên</option>
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
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                            <div class="mt-4">
                              <label for="file-upload" class="cursor-pointer">
                                <span class="mt-2 block text-sm font-medium text-gray-900">Kéo thả file vào đây hoặc</span>
                                <span class="mt-1 block text-sm text-blue-600 hover:text-blue-500">chọn file từ máy tính</span>
                              </label>
                              <input id="file-upload" name="file-upload" type="file" class="sr-only" accept=".xlsx,.xls" (change)="onFileSelected($event)">
                            </div>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Progress Bar -->
                    @if (bulkImportProgress().isImporting) {
                      <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                          <span class="text-gray-600">{{ bulkImportProgress().currentStep }}</span>
                          <span class="text-gray-600">{{ bulkImportProgress().progress }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                               [style.width.%]="bulkImportProgress().progress"></div>
                        </div>
                      </div>
                    }

                    <!-- Import Results -->
                    @if (bulkImportProgress().result) {
                      <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-medium text-gray-900 mb-2">Kết quả import:</h4>
                        <div class="grid grid-cols-3 gap-4 text-sm">
                          <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">{{ bulkImportProgress().result?.totalRows }}</div>
                            <div class="text-gray-600">Tổng dòng</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">{{ bulkImportProgress().result?.successfulImports }}</div>
                            <div class="text-gray-600">Thành công</div>
                          </div>
                          <div class="text-center">
                            <div class="text-2xl font-bold text-red-600">{{ bulkImportProgress().result?.failedImports }}</div>
                            <div class="text-gray-600">Thất bại</div>
                          </div>
                        </div>

                        @if (bulkImportProgress().result!.errors.length > 0) {
                          <div class="mt-4">
                            <h5 class="font-medium text-red-700 mb-2">Lỗi chi tiết:</h5>
                            <div class="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                              <ul class="text-xs text-red-700 space-y-1">
                                @for (error of bulkImportProgress().result!.errors; track $index) {
                                  <li>• {{ error }}</li>
                                }
                              </ul>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button (click)="startBulkImport()"
                      [disabled]="!selectedFile() || bulkImportProgress().isImporting"
                      class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                @if (bulkImportProgress().isImporting) {
                  <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang import...
                } @else {
                  Import ngay
                }
              </button>
              <button (click)="closeBulkImportModal()"
                      [disabled]="bulkImportProgress().isImporting"
                      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                @if (bulkImportProgress().result) {
                  Đóng
                } @else {
                  Hủy
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})

export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  // Role options - Single source of truth
  readonly ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Quản trị viên' },
    { value: 'TEACHER', label: 'Giảng viên' },
    { value: 'STUDENT', label: 'Học viên' }
  ] as const;

  // Make UserRole available in template
  UserRole = UserRole;

  // Filter states
  searchQuery = signal('');
  roleFilter = signal('');
  statusFilter = signal('');

  // Modal states
  showCreateModal = signal(false);
  isEditModalOpen = signal(false);
  isBulkImportModalOpen = signal(false);

  // Create user form
  newUserName = signal('');
  newUserEmail = signal('');
  newUserRole = signal('');

  // Edit user form
  editingUserId = signal('');
  editingUserName = signal('');
  editingUserEmail = signal('');
  editingUserRole = signal('');

  // Bulk import
  selectedFile = signal<File | null>(null);
  defaultImportRole = signal('STUDENT');
  bulkImportProgress = signal<BulkImportProgress>({
    isImporting: false,
    progress: 0,
    currentStep: '',
    result: undefined
  });

  // Pagination
  currentPage = signal(1);
  pagination = signal<PaginationInfo | null>(null);

  // Local users signal - synced with AdminService
  private _localUsers = signal<AdminUser[]>([]);

  // Computed properties
  isLoadingUsers = signal(false);
  isDeletingUser = signal(false);

  totalUsers = this.adminService.totalUsers;
  totalTeachers = this.adminService.totalTeachers;
  totalStudents = this.adminService.totalStudents;
  totalAdmins = this.adminService.totalAdminsCount;
  activeUsers = this.adminService.activeUsersCount;

  // Client-side filtering (because backend doesn't support it)
  filteredUsers = computed(() => {
    let users = this._localUsers();
    console.log('[CLIENT FILTER] Starting with users:', users.length);

    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      users = users.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
      console.log('[CLIENT FILTER] After search:', users.length);
    }

    // Filter by role
    if (this.roleFilter()) {
      const roleToFilter = this.roleFilter();
      users = users.filter(user => user.role === roleToFilter);
      console.log('[CLIENT FILTER] After role filter (' + roleToFilter + '):', users.length);
    }

    // Filter by status
    if (this.statusFilter()) {
      const isActive = this.statusFilter() === 'active';
      users = users.filter(user => user.isActive === isActive);
      console.log('[CLIENT FILTER] After status filter:', users.length);
    }

    console.log('[CLIENT FILTER] Final filtered users:', users.length);
    return users;
  });

  ngOnInit(): void {
    this.loadUsers(1);
  }

  // Load users with pagination
  loadUsers(page: number = 1, limit: number = 10): void {
    this.currentPage.set(page);
    this.isLoadingUsers.set(true);

    const params: any = {
      page: page,
      limit: limit
    };

    // Add search filter
    if (this.searchQuery()) {
      params.search = this.searchQuery();
    }

    // Add role filter
    if (this.roleFilter()) {
      params.role = this.roleFilter();
      console.log('[FILTER] Role filter active:', this.roleFilter());
    }

    // Add status filter
    if (this.statusFilter()) {
      params.status = this.statusFilter();
      console.log('[FILTER] Status filter active:', this.statusFilter());
    }

    console.log('[LOAD USERS] Final params being sent to backend:', params);
    console.log('[FILTER] Current filter state:', {
      search: this.searchQuery(),
      role: this.roleFilter(),
      status: this.statusFilter()
    });

    // getUsers returns Promise, not Observable - use .then()/.catch()
    this.adminService.getUsers(params).subscribe({
      next: (response: { data: AdminUser[]; pagination: any }) => {
        console.log('✅ Users loaded successfully:', response);
        console.log('📊 Response data:', response.data);
        console.log('📊 First user:', response.data?.[0]);

        // Normalize roles to uppercase for consistent filtering
        const normalizedUsers = (response.data || []).map((user: any) => ({
          ...user,
          role: (user.role || 'STUDENT').toUpperCase()
        }));

        console.log('📊 After normalize:', normalizedUsers[0]?.role);
        console.log('[ADMIN] Normalized users count:', normalizedUsers.length);

        // Update local users signal
        this._localUsers.set(normalizedUsers);

        // Update pagination info from response
        const total = response.pagination?.totalItems || response.pagination?.totalElements || normalizedUsers.length;
        this.pagination.set({
          page: page,
          limit: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit) || 1,
          first: page === 1,
          last: page === Math.ceil(total / limit)
        });

        this.isLoadingUsers.set(false);
      },
      error: (error: any) => {
        console.error('❌ Error loading users:', error);
        this.isLoadingUsers.set(false);
        alert('Không thể tải danh sách người dùng. Vui lòng thử lại.');
      }
    });
  }

  // Search and filter handlers
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    // Reset to page 1 when searching
    this.loadUsers(1);
  }

  onRoleFilterChange(value: string): void {
    console.log('[FILTER CHANGE] Role filter changed to:', value);
    this.roleFilter.set(value);
    console.log('[FILTER CHANGE] Role filter signal now:', this.roleFilter());
    // Reset to page 1 when filtering
    this.loadUsers(1);
  }

  onStatusFilterChange(value: string): void {
    console.log('[FILTER CHANGE] Status filter changed to:', value);
    this.statusFilter.set(value);
    console.log('[FILTER CHANGE] Status filter signal now:', this.statusFilter());
    // Reset to page 1 when filtering
    this.loadUsers(1);
  }

  onSearchChange(): void {
    // Reset to page 1 when searching
    this.loadUsers(1);
  }

  onFilterChange(): void {
    // Reset to page 1 when filtering
    this.loadUsers(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('');
    this.statusFilter.set('');
    this.loadUsers(1);
  }

  // Pagination methods
  goToPage(page: number): void {
    const paginationInfo = this.pagination();
    if (page >= 1 && page <= (paginationInfo?.totalPages || 1)) {
      this.loadUsers(page);
    }
  }

  getVisiblePages(): number[] {
    const paginationInfo = this.pagination();
    if (!paginationInfo) return [];

    const currentPage = paginationInfo.page;
    const totalPages = paginationInfo.totalPages;
    const pages: number[] = [];

    // Show max 5 pages around current page
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Create User Modal
  openCreateUserModal(): void {
    this.showCreateModal.set(true);
    this.newUserName.set('');
    this.newUserEmail.set('');
    this.newUserRole.set('');
  }

  closeCreateUserModal(): void {
    this.showCreateModal.set(false);
  }

  createUser(): void {
    if (!this.newUserName() || !this.newUserEmail() || !this.newUserRole()) {
      return;
    }

    const request: CreateUserRequest = {
      username: this.newUserEmail().split('@')[0],
      email: this.newUserEmail(),
      password: 'Password123!', // Default password
      fullName: this.newUserName(),
      role: this.newUserRole() as 'ADMIN' | 'TEACHER' | 'STUDENT'
    };

    this.adminService.createUser(request).subscribe({
      next: (response) => {
        console.log('User created successfully:', response);
        this.closeCreateUserModal();
        this.loadUsers(this.currentPage());
        alert('Người dùng đã được tạo thành công!');
      },
      error: (error) => {
        console.error('Error creating user:', error);
        alert('Không thể tạo người dùng. Vui lòng thử lại.');
      }
    });
  }

  // Edit User Modal
  editUser(user: AdminUser): void {
    this.editingUserId.set(user.id);
    this.editingUserName.set(user.name);
    this.editingUserEmail.set(user.email);
    this.editingUserRole.set(user.role);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  saveUserEdit(): void {
    const userId = this.editingUserId();
    if (!userId) return;

    const request: UpdateUserRequest = {
      email: this.editingUserEmail(),
      fullName: this.editingUserName(),
      role: this.editingUserRole() as 'ADMIN' | 'TEACHER' | 'STUDENT'
    };

    this.adminService.updateUser(userId, request).subscribe({
      next: (response) => {
        console.log('User updated successfully:', response);
        this.closeEditModal();
        this.loadUsers(this.currentPage());
        alert('Người dùng đã được cập nhật thành công!');
      },
      error: (error) => {
        console.error('Error updating user:', error);
        alert('Không thể cập nhật người dùng. Vui lòng thử lại.');
      }
    });
  }

  // User Actions
  toggleUserStatus(userId: string): void {
    this.adminService.toggleUserStatus(userId).subscribe({
      next: (response) => {
        console.log('User status toggled:', response);
        this.loadUsers(this.currentPage());
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        alert('Không thể thay đổi trạng thái người dùng. Vui lòng thử lại.');
      }
    });
  }

  deleteUser(userId: string): void {
    if (!confirm('Bạn có chắc chắn muốn vô hiệu hóa người dùng này?')) {
      return;
    }

    this.isDeletingUser.set(true);

    this.adminService.deleteUser(userId).subscribe({
      next: (response) => {
        const currentPageInfo = this.pagination();
        const currentFilteredCount = this.filteredUsers().length;

        let targetPage = this.currentPage();
        if (currentFilteredCount === 1 && currentPageInfo && currentPageInfo.page > 1) {
          targetPage = currentPageInfo.page - 1;
        }

        this.loadUsers(targetPage);
        this.isDeletingUser.set(false);
        alert('Người dùng đã được vô hiệu hóa');
      },
      error: (error) => {
        console.error('Error disabling user:', error);
        this.isDeletingUser.set(false);
        alert('Không thể vô hiệu hóa người dùng. Vui lòng thử lại.');
      }
    });
  }

  onRoleChange(userId: string, oldRole: string, newRole: string): void {
    console.log('[ROLE CHANGE]', { userId, oldRole, newRole, oldType: typeof oldRole, newType: typeof newRole });

    // If role didn't actually change, do nothing
    if (oldRole === newRole) {
      console.log('[ROLE CHANGE] No change detected');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn thay đổi vai trò người dùng thành ${this.getRoleText(newRole)}?`)) {
      // Revert UI without reload - update local state only
      const users = this._localUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx > -1) {
        users[idx] = { ...users[idx], role: oldRole };
        this._localUsers.set([...users]);
      }
      return;
    }

    // Call API to update user role
    this.adminService.updateUser(userId, { role: newRole as 'ADMIN' | 'TEACHER' | 'STUDENT' }).subscribe({
      next: (response) => {
        console.log('User role updated:', response);
        alert(`Vai trò đã được thay đổi thành ${this.getRoleText(newRole)} thành công!`);

        // Update local state for smooth UI
        const users = this._localUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx > -1) {
          users[idx] = { ...users[idx], role: newRole };
          this._localUsers.set([...users]);
        }

        // Optional: reload to sync with backend
        // this.loadUsers(this.currentPage());
      },
      error: (error) => {
        console.error('Error updating user role:', error);
        alert('Không thể thay đổi vai trò. Vui lòng thử lại.');

        // Revert to old role on error
        const users = this._localUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx > -1) {
          users[idx] = { ...users[idx], role: oldRole };
          this._localUsers.set([...users]);
        }
      }
    });
  }

  // Bulk Import Modal
  openBulkImportModal(): void {
    this.isBulkImportModalOpen.set(true);
    this.selectedFile.set(null);
    this.defaultImportRole.set('STUDENT');
    this.bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: '',
      result: undefined
    });
  }

  closeBulkImportModal(): void {
    this.isBulkImportModalOpen.set(false);
    this.selectedFile.set(null);
    this.bulkImportProgress.set({
      isImporting: false,
      progress: 0,
      currentStep: '',
      result: undefined
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
  }

  startBulkImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.bulkImportProgress.set({
      isImporting: true,
      progress: 10,
      currentStep: 'Đang đọc file Excel...',
      result: undefined
    });

    // Read Excel file
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

        console.log('Excel data parsed:', jsonData);

        if (jsonData.length === 0) {
          this.bulkImportProgress.set({
            isImporting: false,
            progress: 0,
            currentStep: 'Lỗi',
            result: {
              totalRows: 0,
              successfulImports: 0,
              failedImports: 0,
              errors: ['File Excel không có dữ liệu']
            }
          });
          return;
        }

        // Process users one by one
        this.processUsersSequentially(jsonData);

      } catch (error: any) {
        console.error('Error reading Excel:', error);
        this.bulkImportProgress.set({
          isImporting: false,
          progress: 0,
          currentStep: 'Lỗi đọc file',
          result: {
            totalRows: 0,
            successfulImports: 0,
            failedImports: 0,
            errors: ['Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.']
          }
        });
      }
    };

    reader.onerror = () => {
      this.bulkImportProgress.set({
        isImporting: false,
        progress: 0,
        currentStep: 'Lỗi đọc file',
        result: {
          totalRows: 0,
          successfulImports: 0,
          failedImports: 0,
          errors: ['Không thể đọc file']
        }
      });
    };

    reader.readAsArrayBuffer(file);
  }

  private async processUsersSequentially(users: any[]): Promise<void> {
    const totalUsers = users.length;
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const progress = Math.round(((i + 1) / totalUsers) * 100);

      this.bulkImportProgress.update(state => ({
        ...state,
        progress,
        currentStep: `Đang tạo người dùng ${i + 1}/${totalUsers}...`
      }));

      try {
        // Map Excel columns to user data
        const createRequest: CreateUserRequest = {
          username: userData['Username'] || userData['Tên đăng nhập'] || userData['Email']?.split('@')[0] || `user${Date.now()}`,
          email: userData['Email'] || userData['email'] || '',
          password: userData['Password'] || userData['Mật khẩu'] || 'Password123!',
          fullName: userData['Full Name'] || userData['Họ tên'] || userData['Name'] || '',
          role: (userData['Role'] || userData['Vai trò'] || this.defaultImportRole()).toUpperCase() as 'ADMIN' | 'TEACHER' | 'STUDENT'
        };

        // Validate required fields
        if (!createRequest.email || !createRequest.fullName) {
          failCount++;
          errors.push(`Dòng ${i + 1}: Thiếu email hoặc họ tên`);
          continue;
        }

        // Create user via API
        await new Promise<void>((resolve, reject) => {
          this.adminService.createUser(createRequest).subscribe({
            next: () => {
              successCount++;
              resolve();
            },
            error: (error) => {
              failCount++;
              const friendlyError = this.formatBulkImportError(error, createRequest.email);
              errors.push(`Dòng ${i + 1}: ${friendlyError}`);
              resolve(); // Continue even if one fails
            }
          });
        });

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        failCount++;
        errors.push(`Dòng ${i + 1}: ${error.message || 'Lỗi không xác định'}`);
      }
    }

    // Final result
    this.bulkImportProgress.set({
      isImporting: false,
      progress: 100,
      currentStep: 'Hoàn thành',
      result: {
        totalRows: totalUsers,
        successfulImports: successCount,
        failedImports: failCount,
        errors: errors.slice(0, 10) // Show max 10 errors
      }
    });

    // Reload users list
    this.loadUsers(this.currentPage());

    // Auto close after 3 seconds if all successful
    if (failCount === 0) {
      setTimeout(() => {
        this.closeBulkImportModal();
      }, 3000);
    }
  }

  // Keep old method for reference but not used
  private startBulkImportViaAPI(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.bulkImportProgress.set({
      isImporting: true,
      progress: 20,
      currentStep: 'Đang upload file...',
      result: undefined
    });

    this.adminService.bulkImportUsers(file, this.defaultImportRole() as 'ADMIN' | 'TEACHER' | 'STUDENT').subscribe({
      next: (response: any) => {
        console.log('Bulk import completed:', response);

        this.bulkImportProgress.set({
          isImporting: false,
          progress: 100,
          currentStep: 'Hoàn thành',
          result: {
            totalRows: response.data?.totalRows || 0,
            successfulImports: response.data?.successfulImports || 0,
            failedImports: response.data?.failedImports || 0,
            errors: response.data?.errors || []
          }
        });

        this.loadUsers(this.currentPage());

        // Auto close after 3 seconds if successful
        if (response.data?.failedImports === 0) {
          setTimeout(() => {
            this.closeBulkImportModal();
          }, 3000);
        }
      },
      error: (error) => {
        console.error('Bulk import failed:', error);
        this.bulkImportProgress.set({
          isImporting: false,
          progress: 0,
          currentStep: 'Lỗi khi import',
          result: {
            totalRows: 0,
            successfulImports: 0,
            failedImports: 0,
            errors: [error.message || 'Import thất bại. Vui lòng thử lại.']
          }
        });
      }
    });
  }

  downloadTemplate(): void {
    try {
      // Create sample data for template
      const templateData = [
        {
          'Username': 'nguyenvana',
          'Email': 'nguyenvana@student.edu.vn',
          'Full Name': 'Nguyễn Văn A',
          'Department': 'Khoa Hàng hải'
        },
        {
          'Username': 'tranthib',
          'Email': 'tranthib@student.edu.vn',
          'Full Name': 'Trần Thị B',
          'Department': 'Khoa Hàng hải'
        }
      ];

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `user_import_template_${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

      console.log('Template downloaded successfully');
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Không thể tải template. Vui lòng thử lại.');
    }
  }

  // Helper Methods
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getRoleClass(role: string): string {
    // Coursera-inspired subtle colors
    switch (role) {
      case 'ADMIN':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'TEACHER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'STUDENT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  getRoleText(role: string): string {
    return this.ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
  }

  getDefaultAvatar(email: string): string {
    const name = email.split('@')[0];
    // Coursera-style blue avatar
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0056D2&color=ffffff&size=150`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatBulkImportError(error: any, email: string): string {
    // Extract meaningful error message from API response
    let errorMessage = '';

    // Try to get error from different possible locations
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'Lỗi không xác định';
    }

    // Clean up common error patterns
    errorMessage = errorMessage
      .replace(/^Server Error:\s*undefined\s*-\s*/i, '') // Remove "Server Error: undefined - "
      .replace(/^Error:\s*/i, '') // Remove "Error: " prefix
      .replace(/^undefined\s*-\s*/i, ''); // Remove "undefined - " prefix

    // Make specific errors more user-friendly
    if (errorMessage.includes('Username đã tồn tại') || errorMessage.includes('username already exists')) {
      const username = email.split('@')[0];
      return `Email "${email}" đã được sử dụng (username: ${username})`;
    }

    if (errorMessage.includes('Email đã tồn tại') || errorMessage.includes('email already exists')) {
      return `Email "${email}" đã tồn tại trong hệ thống`;
    }

    if (errorMessage.includes('Invalid email') || errorMessage.includes('email không hợp lệ')) {
      return `Email "${email}" không hợp lệ`;
    }

    if (errorMessage.includes('Required field') || errorMessage.includes('Thiếu thông tin')) {
      return `Thiếu thông tin bắt buộc`;
    }

    // Return cleaned error message with email context
    return `${email}: ${errorMessage}`;
  }
}

