import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, CreateUserRequest, UpdateUserRequest } from './infrastructure/services/admin.service';
import { UserRole } from '../../core/services/auth.service';
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
    /* Role select: normalize sizing and prevent clipping of native dropdown */
    select.role-select {
      cursor: pointer;
      transition: all 0.12s ease;
      /* sizing to ensure the selected label is visible and the native dropdown aligns */
      display: inline-block;
      box-sizing: border-box;
      min-width: 140px;
      max-width: 220px;
      width: auto;
      line-height: 1.5;
      appearance: auto;
      -webkit-appearance: auto;
      -moz-appearance: auto;
      /* make sure text is left-aligned and not clipped */
      text-align: left;
      padding-right: 0.75rem;
    }

    select.role-select:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    }

    select.role-select:focus {
      outline: none;
    }

    select.role-select option {
      padding: 8px 12px;
      background: white;
      color: #1f2937;
    }

    /* Ensure table cells allow dropdowns to overflow when rendered by the browser */
    td { overflow: visible; }
  `],
  template: `
    <div class="bg-gray-50 min-h-screen">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                     [value]="searchQuery()"
                     (input)="onSearchInput($any($event.target).value)"
                     placeholder="Tìm kiếm người dùng..."
                     class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
            </div>
            <div class="flex gap-4">
              <select [value]="roleFilter()"
                      (change)="onRoleFilterChange($any($event.target).value)"
                      class="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                <option value="">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên</option>
                <option value="TEACHER">Giảng viên</option>
                <option value="STUDENT">Học viên</option>
              </select>
              <select [value]="statusFilter()"
                      (change)="onStatusFilterChange($any($event.target).value)"
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
          @if (isLoadingUsers()) {
            <div class="p-8 text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p class="mt-4 text-gray-600">Đang tải danh sách người dùng...</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người dùng
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hoạt động cuối
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thống kê
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (user of filteredUsers(); track user.id) {
                    <tr class="hover:bg-gray-50 transition-colors">
                      <!-- Người dùng -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <img [src]="user.avatar || getDefaultAvatar(user.email)" 
                               [alt]="user.name"
                               class="w-10 h-10 rounded-full">
                          <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                            <div class="text-sm text-gray-500">{{ user.email }}</div>
                          </div>
                        </div>
                      </td>
                      <!-- Vai trò -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <!-- Debug: {{ user.name }} - Role: {{ user.role }} ({{ typeof user.role }}) -->
                        <select [ngModel]="user.role"
                                (ngModelChange)="onRoleChange(user.id, user.role, $event)"
                                [name]="'user-role-' + user.id"
                                class="role-select px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                                [ngClass]="getRoleClass(user.role)"
                                title="Click để thay đổi vai trò">
                          @for (roleOpt of ROLE_OPTIONS; track roleOpt.value) {
                            <option [value]="roleOpt.value">{{ roleOpt.label }}</option>
                          }
                        </select>
                      </td>
                      <!-- Thao tác -->
                      <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div class="flex items-center justify-center space-x-2">
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
                      <!-- Trạng thái -->
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-3 py-1 text-xs font-medium rounded-full"
                              [class]="user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                          {{ user.isActive ? 'Hoạt động' : 'Không hoạt động' }}
                        </span>
                      </td>
                      <!-- Hoạt động cuối -->
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {{ user.lastLogin ? formatDate(user.lastLogin) : 'Chưa đăng nhập' }}
                      </td>
                      <!-- Thống kê -->
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div class="space-y-1">
                          @if (user.role === 'TEACHER') {
                            <div class="flex items-center text-xs">
                              <svg class="w-3 h-3 mr-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                              </svg>
                              {{ user.coursesCreated || 0 }} khóa học
                            </div>
                          }
                          @if (user.role === 'STUDENT') {
                            <div class="flex items-center text-xs">
                              <svg class="w-3 h-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                              </svg>
                              {{ user.coursesEnrolled || 0 }} đã đăng ký
                            </div>
                          }
                          <div class="flex items-center text-xs">
                            <svg class="w-3 h-3 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                            </svg>
                            {{ user.loginCount || 0 }} lần đăng nhập
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
    </div>

    <!-- Create User Modal -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50" (click)="closeCreateUserModal()">
        <div class="flex items-center justify-center min-h-screen p-4">
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
                             [(ngModel)]="newUserName"
                             name="name"
                             required
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email"
                             [(ngModel)]="newUserEmail"
                             name="email"
                             required
                             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                      <select [(ngModel)]="newUserRole"
                              name="role"
                              required
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                        <option value="">Chọn vai trò</option>
                        <option value="ADMIN">Quản trị viên</option>
                        <option value="TEACHER">Giảng viên</option>
                        <option value="STUDENT">Học viên</option>
                      </select>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button (click)="createUser()"
                      [disabled]="!newUserName || !newUserEmail || !newUserRole"
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
                       [(ngModel)]="editingUserName"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email"
                       [(ngModel)]="editingUserEmail"
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select [(ngModel)]="editingUserRole"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="STUDENT">Học viên</option>
                  <option value="TEACHER">Giảng viên</option>
                  <option value="ADMIN">Quản trị</option>
                </select>
              </div>
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

    this.adminService.getUsers(params).subscribe({
      next: (response) => {
        console.log('✅ Users loaded successfully:', response);
        console.log('📊 First user role:', response.data?.[0]?.role, 'Type:', typeof response.data?.[0]?.role);
        
        // Normalize roles to uppercase
        const normalizedUsers = (response.data || []).map((user: any) => ({
          ...user,
          role: user.role?.toUpperCase() || user.role
        }));
        
        console.log('📊 After normalize:', normalizedUsers[0]?.role);
        
        // Update local users signal
        this._localUsers.set(normalizedUsers);
        
        // Update pagination info
        if (response.pagination) {
          this.pagination.set({
            page: response.pagination.page || page,
            limit: response.pagination.limit || limit,
            totalItems: response.pagination.totalItems || 0,
            totalPages: response.pagination.totalPages || 1,
            first: page === 1,
            last: page === (response.pagination.totalPages || 1)
          });
        }
        
        this.isLoadingUsers.set(false);
      },
      error: (error) => {
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
      password: '123456', // Default password
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
    if (!confirm('Bạn có chắc chắn muốn vô hiệu hóa người dùng này? Người dùng sẽ không thể đăng nhập vào hệ thống.')) {
      return;
    }

    this.adminService.deleteUser(userId).subscribe({
      next: (response) => {
        console.log('User disabled:', response);
        this.loadUsers(this.currentPage());
        alert('Người dùng đã được vô hiệu hóa thành công!');
      },
      error: (error) => {
        console.error('Error disabling user:', error);
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
              errors.push(`Dòng ${i + 1} (${createRequest.email}): ${error.message || 'Lỗi tạo người dùng'}`);
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
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'TEACHER':
        return 'bg-purple-100 text-purple-800';
      case 'STUDENT':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getRoleText(role: string): string {
    return this.ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
  }

  getDefaultAvatar(email: string): string {
    const name = email.split('@')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=dc2626&color=ffffff&size=150`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
