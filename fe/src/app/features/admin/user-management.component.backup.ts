import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser, CreateUserRequest, UpdateUserRequest } from './infrastructure/services/admin.service';
import { UserRole } from '../../core/services/auth.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State - Temporarily disabled -->
    <!-- <app-loading 
      [show]="adminService.isLoading" 
      text="Đang tải dữ liệu người dùng..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="red">
    </app-loading> -->

    <div class="bg-gradient-to-br from-slate-50 via-red-50 to-pink-100 min-h-screen">
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">👥 Quản lý người dùng</h1>
              <p class="text-gray-600">Quản lý và theo dõi tất cả người dùng trong hệ thống</p>
            </div>
            <button (click)="openCreateUserModal()"
                    class="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
              <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
              </svg>
              Thêm người dùng
            </button>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
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
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
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
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hoạt động cuối
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thống kê
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (user of filteredUsers(); track user.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img [src]="user.avatar" 
                             [alt]="user.name"
                             class="w-10 h-10 rounded-full">
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                          <div class="text-sm text-gray-500">{{ user.email }}</div>
                          @if (user.studentId) {
                            <div class="text-xs text-gray-400">{{ user.studentId }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-3 py-1 text-xs font-medium rounded-full"
                            [class]="getRoleClass(user.role)">
                        {{ getRoleText(user.role) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-3 py-1 text-xs font-medium rounded-full"
                            [class]="user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        {{ user.isActive ? 'Hoạt động' : 'Không hoạt động' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {{ user.lastLogin ? formatDate(user.lastLogin) : 'Chưa đăng nhập' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      @if (user.role === 'teacher') {
                        <div>{{ user.coursesCreated }} khóa học</div>
                      } @else if (user.role === 'student') {
                        <div>{{ user.coursesEnrolled }} khóa học</div>
                        <div>{{ formatCurrency(user.totalSpent || 0) }}</div>
                      } @else {
                        <div>{{ user.loginCount }} lần đăng nhập</div>
                      }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div class="flex items-center justify-end space-x-2">
                        <button (click)="editUser(user)"
                                class="text-indigo-600 hover:text-indigo-900">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                          </svg>
                        </button>
                        <button (click)="toggleUserStatus(user.id)"
                                [class]="user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'">
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
                                class="text-red-600 hover:text-red-900">
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
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  protected adminService = inject(AdminService);
  
  // Make UserRole available in template
  UserRole = UserRole;

  // Filter states
  searchQuery = signal('');
  roleFilter = signal('');
  statusFilter = signal('');

  // Modal state
  showCreateModal = signal(false);
  isEditModalOpen = signal(false);
  newUser = signal<Partial<AdminUser>>({
    name: '',
    email: '',
    role: UserRole.STUDENT,
    department: ''
  });

  // Edit modal state
  editingUser = signal<AdminUser | null>(null);

  // Computed properties
  totalUsers = computed(() => this.adminService.totalUsers());
  totalTeachers = computed(() => this.adminService.totalTeachers());
  totalStudents = computed(() => this.adminService.totalStudents());
  totalAdmins = computed(() => this.adminService.totalAdminsCount());
  activeUsers = computed(() => this.adminService.activeUsersCount());

  filteredUsers = computed(() => {
    let users = this.adminService.users();
    
    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      users = users.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.studentId && user.studentId.toLowerCase().includes(query))
      );
    }
    
    // Filter by role
    if (this.roleFilter()) {
      users = users.filter(user => user.role === this.roleFilter());
    }
    
    // Filter by status
    if (this.statusFilter()) {
      const isActive = this.statusFilter() === 'active';
      users = users.filter(user => user.isActive === isActive);
    }
    
    return users;
  });

  // Pagination state
  currentPage = signal(1);
  pageSize = signal(10);
  totalUsersCount = signal(0);

  // Loading state
  isLoadingUsers = signal(false);

  ngOnInit(): void {
    console.log('UserManagementComponent: ngOnInit called');
    
    // 🔐 CHECK AUTHENTICATION STATUS
    console.log('🔐 ========== AUTHENTICATION DEBUG ==========');
    const token = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const user = localStorage.getItem('user');
    console.log('🔐 Token in localStorage:', token ? '✅ EXISTS (length: ' + token.length + ')' : '❌ MISSING');
    console.log('🔐 RefreshToken in localStorage:', refreshToken ? '✅ EXISTS' : '❌ MISSING');
    console.log('🔐 User in localStorage:', user ? '✅ EXISTS' : '❌ MISSING');
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        console.log('🔐 Parsed user:', parsedUser);
      } catch (e) {
        console.log('🔐 Error parsing user:', e);
      }
    }
    console.log('🔐 ==========================================');
    
    console.log('UserManagementComponent: adminService.isLoading initial:', this.adminService.isLoading);
    this.loadUsers();
  }

  loadUsers(page: number = 1): void {
    console.log('[USER MANAGEMENT] 🔍 Loading users - page:', page);
    this.isLoadingUsers.set(true);
    
    const params = {
      page,
      limit: this.pageSize(),
      search: this.searchQuery() || undefined
    };
    
    console.log('[USER MANAGEMENT] 📤 Calling adminService.getUsers with params:', params);
    
    this.adminService.getUsers(params).subscribe({
      next: (result: { data: AdminUser[]; pagination: any }) => {
        console.log('[USER MANAGEMENT] ✅ Users loaded successfully:', result);
        this.currentPage.set(page);
        this.totalUsersCount.set(result.pagination?.totalItems || result.data.length);
        this.isLoadingUsers.set(false);
      },
      error: (error: any) => {
        console.error('[USER MANAGEMENT] ❌ Failed to load users:', error);
        this.isLoadingUsers.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.currentPage.set(1);
    this.loadUsers(1);
  }

  onPageChange(page: number): void {
    this.loadUsers(page);
  }

  openCreateUserModal(): void {
    console.log('UserManagementComponent: openCreateUserModal called');
    this.showCreateModal.set(true);
    console.log('UserManagementComponent: showCreateModal set to true');
    this.newUser.set({
      name: '',
      email: '',
      role: UserRole.STUDENT,
      department: ''
    });
  }

  closeCreateUserModal(): void {
    console.log('UserManagementComponent: closeCreateUserModal called');
    this.showCreateModal.set(false);
    console.log('UserManagementComponent: showCreateModal set to false');
  }

  createUser(): void {
    const userData = this.newUser();
    if (userData.name && userData.email && userData.role) {
      console.log('[USER MANAGEMENT] 🔨 Creating user:', userData);
      
      // Map UserRole enum to backend role format
      let backendRole: 'ADMIN' | 'TEACHER' | 'STUDENT';
      switch (userData.role) {
        case UserRole.ADMIN:
          backendRole = 'ADMIN';
          break;
        case UserRole.TEACHER:
          backendRole = 'TEACHER';
          break;
        case UserRole.STUDENT:
        default:
          backendRole = 'STUDENT';
          break;
      }
      
      // Map to the expected interface
      const createData: CreateUserRequest = {
        username: userData.email.split('@')[0], // Use email prefix as username
        email: userData.email,
        password: 'Password123!', // Default password, user should change later
        fullName: userData.name,
        role: backendRole
      };
      
      console.log('[USER MANAGEMENT] 📤 Sending create request:', createData);
      
      this.adminService.createUser(createData).subscribe({
        next: (response: { message: string; data: AdminUser }) => {
          console.log('[USER MANAGEMENT] ✅ User created successfully:', response);
          this.closeCreateUserModal();
          this.loadUsers(this.currentPage());
        },
        error: (error: any) => {
          console.error('[USER MANAGEMENT] ❌ Error creating user:', error);
          alert('Lỗi tạo người dùng: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  updateNewUser(key: string, value: any): void {
    this.newUser.update(user => ({
      ...user,
      [key]: value
    }));
  }

  editUser(user: AdminUser): void {
    // Set the user to edit and open modal
    this.editingUser.set(user);
    this.isEditModalOpen.set(true);
  }

  toggleUserStatus(userId: string): void {
    console.log('[USER MANAGEMENT] 🔄 Toggling user status:', userId);
    
    this.adminService.toggleUserStatus(userId).subscribe({
      next: (response: { message: string; data: AdminUser }) => {
        console.log('[USER MANAGEMENT] ✅ User status toggled:', response);
        this.loadUsers(this.currentPage());
      },
      error: (error: any) => {
        console.error('[USER MANAGEMENT] ❌ Error toggling user status:', error);
        alert('Lỗi thay đổi trạng thái: ' + (error.error?.message || error.message));
      }
    });
  }

  deleteUser(userId: string): void {
    if (confirm('Bạn có chắc chắn muốn vô hiệu hóa người dùng này?')) {
      console.log('[USER MANAGEMENT] 🗑️ Deleting user:', userId);
      
      this.adminService.deleteUser(userId).subscribe({
        next: (response: { message: string }) => {
          console.log('[USER MANAGEMENT] ✅ User deleted:', response);
          this.loadUsers(this.currentPage());
        },
        error: (error: any) => {
          console.error('[USER MANAGEMENT] ❌ Error deleting user:', error);
          alert('Lỗi xóa người dùng: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  // Edit modal methods
  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingUser.set(null);
  }

  saveUserEdit(): void {
    const user = this.editingUser();
    if (!user) return;

    console.log('[USER MANAGEMENT] 💾 Saving user edit:', user);
    
    // Map UserRole enum to backend role format
    let backendRole: 'ADMIN' | 'TEACHER' | 'STUDENT';
    switch (user.role) {
      case UserRole.ADMIN:
        backendRole = 'ADMIN';
        break;
      case UserRole.TEACHER:
        backendRole = 'TEACHER';
        break;
      case UserRole.STUDENT:
      default:
        backendRole = 'STUDENT';
        break;
    }
    
    const updateData: UpdateUserRequest = {
      email: user.email,
      fullName: user.name,
      role: backendRole,
      enabled: user.isActive
    };
    
    this.adminService.updateUser(user.id, updateData).subscribe({
      next: (response: { message: string; data: AdminUser }) => {
        console.log('[USER MANAGEMENT] ✅ User updated:', response);
        this.closeEditModal();
        this.loadUsers(this.currentPage());
      },
      error: (error: any) => {
        console.error('[USER MANAGEMENT] ❌ Error updating user:', error);
        alert('Lỗi cập nhật người dùng: ' + (error.error?.message || error.message));
      }
    });
  }

  updateEditingUser(field: keyof AdminUser, value: any): void {
    const user = this.editingUser();
    if (user) {
      this.editingUser.set({
        ...user,
        [field]: value
      });
    }
  }

  formatDate(date: string | Date): string {
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
    switch (role.toUpperCase()) {
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
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'TEACHER':
        return 'Giảng viên';
      case 'STUDENT':
        return 'Học viên';
      default:
        return 'Không xác định';
    }
  }
}