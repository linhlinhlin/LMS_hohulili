import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Settings Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Cài đặt</h1>
          <p class="text-sm text-gray-500">Tùy chỉnh tài khoản và tùy chọn cá nhân</p>
        </div>
        <button 
          (click)="saveSettings()"
          [disabled]="isSaving()"
          class="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium">
          {{ isSaving() ? 'Đang lưu...' : 'Lưu cài đặt' }}
        </button>
      </div>
    </div>

    <!-- Settings Content -->
    <div class="px-6">

      <div class="grid lg:grid-cols-3 gap-8">
        <!-- Settings Navigation -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Danh mục cài đặt</h3>
                <nav class="space-y-2">
                  <button 
                    (click)="activeTab.set('general')"
                    [class]="activeTab() === 'general' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
                    class="w-full text-left p-3 rounded-lg transition-colors">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      <span>Cài đặt chung</span>
                    </div>
                  </button>
                  <button 
                    (click)="activeTab.set('notifications')"
                    [class]="activeTab() === 'notifications' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
                    class="w-full text-left p-3 rounded-lg transition-colors">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4.5 19.5a15 15 0 01-1.44-7.5 15 15 0 011.44-7.5M19.5 4.5a15 15 0 011.44 7.5 15 15 0 01-1.44 7.5"></path>
                      </svg>
                      <span>Thông báo</span>
                    </div>
                  </button>
                  <button 
                    (click)="activeTab.set('privacy')"
                    [class]="activeTab() === 'privacy' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
                    class="w-full text-left p-3 rounded-lg transition-colors">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      <span>Bảo mật</span>
                    </div>
                  </button>
                  <button 
                    (click)="activeTab.set('appearance')"
                    [class]="activeTab() === 'appearance' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
                    class="w-full text-left p-3 rounded-lg transition-colors">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"></path>
                      </svg>
                      <span>Giao diện</span>
                    </div>
                  </button>
                  <button 
                    (click)="activeTab.set('account')"
                    [class]="activeTab() === 'account' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
                    class="w-full text-left p-3 rounded-lg transition-colors">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      <span>Tài khoản</span>
                    </div>
                  </button>
                </nav>
              </div>
            </div>

        <!-- Settings Content -->
        <div class="lg:col-span-2">
          <!-- General Settings -->
          @if (activeTab() === 'general') {
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 class="text-xl font-semibold text-gray-900 mb-6">Cài đặt chung</h2>
                  
                  <div class="space-y-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ</label>
                      <select 
                        [(ngModel)]="settings.general.language"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Múi giờ</label>
                      <select 
                        [(ngModel)]="settings.general.timezone"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                        <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                        <option value="UTC">UTC (GMT+0)</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Định dạng ngày tháng</label>
                      <select 
                        [(ngModel)]="settings.general.dateFormat"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                        <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                        <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                        <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Tự động lưu tiến độ</h3>
                        <p class="text-sm text-gray-600">Tự động lưu tiến độ học tập mỗi 5 phút</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.general.autoSave"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              }

              <!-- Notifications Settings -->
              @if (activeTab() === 'notifications') {
                <div class="bg-white rounded-lg shadow-lg p-6">
                  <h2 class="text-xl font-semibold text-gray-900 mb-6">Cài đặt thông báo</h2>
                  
                  <div class="space-y-6">
                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Thông báo email</h3>
                        <p class="text-sm text-gray-600">Nhận thông báo qua email</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.notifications.email"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Thông báo push</h3>
                        <p class="text-sm text-gray-600">Nhận thông báo push trên trình duyệt</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.notifications.push"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Thông báo khóa học mới</h3>
                        <p class="text-sm text-gray-600">Thông báo khi có khóa học mới</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.notifications.newCourses"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Thông báo bài tập</h3>
                        <p class="text-sm text-gray-600">Thông báo về bài tập và deadline</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.notifications.assignments"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              }

              <!-- Privacy Settings -->
              @if (activeTab() === 'privacy') {
                <div class="bg-white rounded-lg shadow-lg p-6">
                  <h2 class="text-xl font-semibold text-gray-900 mb-6">Cài đặt bảo mật</h2>
                  
                  <div class="space-y-6">
                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Hiển thị hồ sơ công khai</h3>
                        <p class="text-sm text-gray-600">Cho phép người khác xem hồ sơ của bạn</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.privacy.publicProfile"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Hiển thị tiến độ học tập</h3>
                        <p class="text-sm text-gray-600">Cho phép người khác xem tiến độ học tập của bạn</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.privacy.showProgress"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Cho phép liên hệ</h3>
                        <p class="text-sm text-gray-600">Cho phép người khác liên hệ với bạn</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.privacy.allowContact"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              }

              <!-- Appearance Settings -->
              @if (activeTab() === 'appearance') {
                <div class="bg-white rounded-lg shadow-lg p-6">
                  <h2 class="text-xl font-semibold text-gray-900 mb-6">Cài đặt giao diện</h2>
                  
                  <div class="space-y-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Chủ đề</label>
                      <div class="grid grid-cols-2 gap-4">
                        <label class="relative cursor-pointer">
                          <input 
                            type="radio" 
                            [(ngModel)]="settings.appearance.theme"
                            value="light"
                            class="sr-only peer">
                          <div class="p-4 border-2 border-gray-800 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50">
                            <div class="text-center">
                              <div class="w-8 h-8 bg-yellow-400 rounded-full mx-auto mb-2"></div>
                              <span class="text-sm font-medium">Sáng</span>
                            </div>
                          </div>
                        </label>
                        <label class="relative cursor-pointer">
                          <input 
                            type="radio" 
                            [(ngModel)]="settings.appearance.theme"
                            value="dark"
                            class="sr-only peer">
                          <div class="p-4 border-2 border-gray-800 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50">
                            <div class="text-center">
                              <div class="w-8 h-8 bg-gray-800 rounded-full mx-auto mb-2"></div>
                              <span class="text-sm font-medium">Tối</span>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Kích thước font</label>
                      <select 
                        [(ngModel)]="settings.appearance.fontSize"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                        <option value="small">Nhỏ</option>
                        <option value="medium">Trung bình</option>
                        <option value="large">Lớn</option>
                      </select>
                    </div>

                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-medium text-gray-900">Hiệu ứng chuyển động</h3>
                        <p class="text-sm text-gray-600">Bật/tắt hiệu ứng chuyển động</p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          [(ngModel)]="settings.appearance.animations"
                          class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-800 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              }

              <!-- Account Settings -->
              @if (activeTab() === 'account') {
                <div class="bg-white rounded-lg shadow-lg p-6">
                  <h2 class="text-xl font-semibold text-gray-900 mb-6">Quản lý tài khoản</h2>
                  
                  <div class="space-y-6">
                    <div class="border border-gray-300 rounded-lg p-4">
                      <h3 class="text-lg font-medium text-gray-900 mb-2">Xóa tài khoản</h3>
                      <p class="text-sm text-gray-600 mb-4">Xóa vĩnh viễn tài khoản và tất cả dữ liệu liên quan</p>
                      <button 
                        (click)="deleteAccount()"
                        class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                        Xóa tài khoản
                      </button>
                    </div>

                    <div class="border border-gray-300 rounded-lg p-4">
                      <h3 class="text-lg font-medium text-gray-900 mb-2">Xuất dữ liệu</h3>
                      <p class="text-sm text-gray-600 mb-4">Tải xuống tất cả dữ liệu cá nhân của bạn</p>
                      <button 
                        (click)="exportData()"
                        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Xuất dữ liệu
                      </button>
                    </div>

                    <div class="border border-gray-300 rounded-lg p-4">
                      <h3 class="text-lg font-medium text-gray-900 mb-2">Đăng xuất tất cả thiết bị</h3>
                      <p class="text-sm text-gray-600 mb-4">Đăng xuất khỏi tất cả thiết bị đã đăng nhập</p>
                      <button 
                        (click)="logoutAllDevices()"
                        class="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                        Đăng xuất tất cả
                      </button>
                    </div>
                  </div>
                </div>
              }
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  activeTab = signal('general');
  isSaving = signal(false);

  settings = {
    general: {
      language: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
      dateFormat: 'dd/mm/yyyy',
      autoSave: true
    },
    notifications: {
      email: true,
      push: true,
      newCourses: true,
      assignments: true
    },
    privacy: {
      publicProfile: false,
      showProgress: true,
      allowContact: true
    },
    appearance: {
      theme: 'light',
      fontSize: 'medium',
      animations: true
    }
  };

  saveSettings(): void {
    this.isSaving.set(true);
    
    // Simulate save operation
    setTimeout(() => {
      this.isSaving.set(false);
      // Show success message
    }, 1000);
  }

  deleteAccount(): void {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.')) {
      // Simulate account deletion
      console.log('Account deleted');
    }
  }

  exportData(): void {
    // Simulate data export
    console.log('Data exported');
  }

  logoutAllDevices(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả thiết bị?')) {
      // Simulate logout all devices
      console.log('Logged out from all devices');
    }
  }
}
