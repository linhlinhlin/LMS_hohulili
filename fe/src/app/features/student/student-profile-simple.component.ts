import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-student-profile-simple',
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="p-6">
        <!-- Profile Header -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-8">
          <div class="flex items-center space-x-6">
            <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {{ authService.currentUser()?.name?.charAt(0) }}
            </div>
            <div class="flex-1">
              <h2 class="text-2xl font-bold text-gray-900">{{ authService.currentUser()?.name }}</h2>
              <p class="text-gray-600 mb-2">{{ authService.currentUser()?.email }}</p>
              <div class="flex items-center space-x-4">
                <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {{ authService.currentUser()?.role }}
                </span>
                <span class="text-sm text-gray-500">Tham gia từ: 15/09/2024</span>
              </div>
            </div>
            <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Chỉnh sửa hồ sơ
            </button>
          </div>
        </div>

        <!-- Profile Sections -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Personal Information -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-6">Thông tin cá nhân</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input type="text" value="{{ authService.currentUser()?.name }}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value="{{ authService.currentUser()?.email }}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input type="tel" value="0123456789" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                <input type="date" value="1995-06-15" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <textarea rows="3" 
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Nhập địa chỉ của bạn">123 Đường ABC, Quận XYZ, TP.HCM</textarea>
              </div>
            </div>
            <div class="mt-6">
              <button class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Lưu thay đổi
              </button>
            </div>
          </div>

          <!-- Academic Information -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-6">Thông tin học tập</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Mã học viên</label>
                <input type="text" value="STU001" readonly
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Khóa học</label>
                <input type="text" value="Hàng hải 2024" readonly
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <div class="flex items-center">
                  <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                    Đang học
                  </span>
                  <span class="text-sm text-gray-600">Từ 15/09/2024</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Điểm trung bình</label>
                <div class="flex items-center">
                  <span class="text-2xl font-bold text-blue-600 mr-2">8.2</span>
                  <span class="text-sm text-gray-600">/ 10.0</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Số tín chỉ đã tích lũy</label>
                <div class="flex items-center">
                  <span class="text-xl font-semibold text-gray-900 mr-2">24</span>
                  <span class="text-sm text-gray-600">/ 120 tín chỉ</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div class="bg-blue-500 h-2 rounded-full" style="width: 20%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Course Progress -->
        <div class="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Tiến độ khóa học</h3>
          <div class="space-y-6">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">Navigation Basics</h4>
                <span class="text-sm text-gray-600">75% hoàn thành</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full" style="width: 75%"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>12/16 bài học</span>
                <span>8.5 điểm TB</span>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">Maritime Safety</h4>
                <span class="text-sm text-gray-600">25% hoàn thành</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-500 h-2 rounded-full" style="width: 25%"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>2/8 bài học</span>
                <span>8.8 điểm TB</span>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">Ship Operations</h4>
                <span class="text-sm text-gray-600">100% hoàn thành</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-purple-500 h-2 rounded-full" style="width: 100%"></div>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>15/15 bài học</span>
                <span>7.8 điểm TB</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Achievements -->
        <div class="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Thành tích</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 border border-gray-200 rounded-lg">
              <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h4 class="font-medium text-gray-900 mb-1">Hoàn thành khóa học</h4>
              <p class="text-sm text-gray-600">Ship Operations</p>
            </div>

            <div class="text-center p-4 border border-gray-200 rounded-lg">
              <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h4 class="font-medium text-gray-900 mb-1">Điểm cao nhất</h4>
              <p class="text-sm text-gray-600">9.5/10</p>
            </div>

            <div class="text-center p-4 border border-gray-200 rounded-lg">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h4 class="font-medium text-gray-900 mb-1">Tham gia tích cực</h4>
              <p class="text-sm text-gray-600">8 bài tập hoàn thành</p>
            </div>
          </div>
        </div>

        <!-- Security Settings -->
        <div class="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Bảo mật tài khoản</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 class="font-medium text-gray-900">Đổi mật khẩu</h4>
                <p class="text-sm text-gray-600">Cập nhật mật khẩu để bảo mật tài khoản</p>
              </div>
              <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Đổi mật khẩu
              </button>
            </div>

            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 class="font-medium text-gray-900">Xác thực 2 yếu tố</h4>
                <p class="text-sm text-gray-600">Thêm lớp bảo mật cho tài khoản</p>
              </div>
              <button class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Bật 2FA
              </button>
            </div>

            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 class="font-medium text-gray-900">Lịch sử đăng nhập</h4>
                <p class="text-sm text-gray-600">Xem các phiên đăng nhập gần đây</p>
              </div>
              <button class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Xem lịch sử
              </button>
            </div>
          </div>
        </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentProfileSimpleComponent {
  protected authService = inject(AuthService);
}