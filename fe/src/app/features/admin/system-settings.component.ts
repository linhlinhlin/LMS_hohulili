import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, SystemSettings } from './infrastructure/services/admin.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-system-settings',
  imports: [CommonModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Loading State - Temporarily disabled -->
    <!-- <app-loading 
      [show]="adminService.isLoading" 
      text="Đang tải cài đặt hệ thống..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="red">
    </app-loading> -->

    <div class="bg-gradient-to-br from-slate-50 via-red-50 to-pink-100 min-h-screen">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">⚙️ Cài đặt hệ thống</h1>
              <p class="text-gray-600">Cấu hình và quản lý các thiết lập hệ thống LMS</p>
            </div>
            <button (click)="saveSettings()"
                    [disabled]="isSaving()"
                    class="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isSaving()) {
                <svg class="w-4 h-4 inline mr-2 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                </svg>
                Đang lưu...
              } @else {
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Lưu cài đặt
              }
            </button>
          </div>
        </div>

        <!-- Settings Tabs -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <!-- Tab Navigation -->
          <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8 px-6">
              <button (click)="setActiveTab('general')"
                      class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                      [class]="activeTab() === 'general' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                </svg>
                Tổng quan
              </button>
              <button (click)="setActiveTab('email')"
                      class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                      [class]="activeTab() === 'email' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                </svg>
                Email
              </button>
              <button (click)="setActiveTab('payment')"
                      class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                      [class]="activeTab() === 'payment' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"></path>
                </svg>
                Thanh toán
              </button>
              <button (click)="setActiveTab('security')"
                      class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                      [class]="activeTab() === 'security' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'">
                <svg class="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                </svg>
                Bảo mật
              </button>
            </nav>
          </div>

          <!-- Tab Content -->
          <div class="p-6">
            @if (activeTab() === 'general') {
              <!-- General Settings -->
              <div class="space-y-6">
                <h3 class="text-lg font-semibold text-gray-900">Cài đặt tổng quan</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Tên trang web</label>
                    <input type="text" 
                           [ngModel]="settings()?.general?.siteName || ''"
                           (ngModelChange)="updateGeneralSetting('siteName', $event)"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Mô tả trang web</label>
                    <input type="text" 
                           [ngModel]="settings()?.general?.siteDescription || ''"
                           (ngModelChange)="updateGeneralSetting('siteDescription', $event)"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 class="font-medium text-gray-900">Chế độ bảo trì</h4>
                      <p class="text-sm text-gray-600">Tạm thời vô hiệu hóa trang web để bảo trì</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" 
                             [ngModel]="settings()?.general?.maintenanceMode || false"
                             (ngModelChange)="updateGeneralSetting('maintenanceMode', $event)"
                             class="sr-only peer">
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 class="font-medium text-gray-900">Cho phép đăng ký</h4>
                      <p class="text-sm text-gray-600">Cho phép người dùng mới đăng ký tài khoản</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" 
                             [ngModel]="settings()?.general?.allowRegistration || false"
                             (ngModelChange)="updateGeneralSetting('allowRegistration', $event)"
                             class="sr-only peer">
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 class="font-medium text-gray-900">Yêu cầu xác thực email</h4>
                      <p class="text-sm text-gray-600">Yêu cầu người dùng xác thực email khi đăng ký</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" 
                             [ngModel]="settings()?.general?.requireEmailVerification || false"
                             (ngModelChange)="updateGeneralSetting('requireEmailVerification', $event)"
                             class="sr-only peer">
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            }

            @if (activeTab() === 'email') {
              <!-- Email Settings -->
              <div class="space-y-6">
                <h3 class="text-lg font-semibold text-gray-900">Cài đặt email</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                    <input type="text" 
                           [ngModel]="settings()?.email?.smtpHost || ''"
                           (ngModelChange)="updateEmailSetting('smtpHost', $event)"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                    <input type="number" 
                           [ngModel]="settings()?.email?.smtpPort || 587"
                           (ngModelChange)="updateEmailSetting('smtpPort', $event)"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">SMTP User</label>
                    <input type="text" 
                           [ngModel]="settings()?.email?.smtpUser || ''"
                           (ngModelChange)="updateEmailSetting('smtpUser', $event)"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
                    <input type="password" 
                           [ngModel]="settings()?.email?.smtpPassword || ''"
                           (ngModelChange)="updateEmailSetting('smtpPassword', $event)"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                    <input type="email" 
                           [ngModel]="settings()?.email?.fromEmail || ''"
                           (ngModelChange)="updateEmailSetting('fromEmail', $event)"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                    <input type="text" 
                           [ngModel]="settings()?.email?.fromName || ''"
                           (ngModelChange)="updateEmailSetting('fromName', $event)"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="flex">
                    <svg class="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                      <h4 class="text-sm font-medium text-blue-800">Lưu ý về cài đặt email</h4>
                      <p class="text-sm text-blue-700 mt-1">Đảm bảo thông tin SMTP chính xác để hệ thống có thể gửi email thông báo và xác thực.</p>
                    </div>
                  </div>
                </div>
              </div>
            }

            @if (activeTab() === 'payment') {
              <!-- Payment Settings -->
              <div class="space-y-6">
                <h3 class="text-lg font-semibold text-gray-900">Cài đặt thanh toán</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Stripe Public Key</label>
                    <input type="text" 
                           [ngModel]="settings()?.payment?.stripePublicKey || ''"
                           (ngModelChange)="updatePaymentSetting('stripePublicKey', $event)"
                           placeholder="pk_test_..."
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Stripe Secret Key</label>
                    <input type="password" 
                           [ngModel]="settings()?.payment?.stripeSecretKey || ''"
                           (ngModelChange)="updatePaymentSetting('stripeSecretKey', $event)"
                           placeholder="sk_test_..."
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">PayPal Client ID</label>
                    <input type="text" 
                           [ngModel]="settings()?.payment?.paypalClientId || ''"
                           (ngModelChange)="updatePaymentSetting('paypalClientId', $event)"
                           placeholder="client_id_..."
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">PayPal Client Secret</label>
                    <input type="password" 
                           [ngModel]="settings()?.payment?.paypalClientSecret || ''"
                           (ngModelChange)="updatePaymentSetting('paypalClientSecret', $event)"
                           placeholder="client_secret_..."
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Đơn vị tiền tệ</label>
                    <select [ngModel]="settings()?.payment?.currency || 'VND'"
                            (ngModelChange)="updatePaymentSetting('currency', $event)"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                      <option value="VND">VND (Việt Nam Đồng)</option>
                      <option value="USD">USD (US Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>
                </div>

                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div class="flex">
                    <svg class="w-5 h-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                      <h4 class="text-sm font-medium text-yellow-800">Cảnh báo bảo mật</h4>
                      <p class="text-sm text-yellow-700 mt-1">Không bao giờ chia sẻ thông tin API key với người khác. Sử dụng environment variables trong production.</p>
                    </div>
                  </div>
                </div>
              </div>
            }

            @if (activeTab() === 'security') {
              <!-- Security Settings -->
              <div class="space-y-6">
                <h3 class="text-lg font-semibold text-gray-900">Cài đặt bảo mật</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian hết hạn phiên (giờ)</label>
                    <input type="number" 
                           [ngModel]="settings()?.security?.sessionTimeout || 24"
                           (ngModelChange)="updateSecuritySetting('sessionTimeout', $event)"
                           min="1"
                           max="168"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Số lần đăng nhập tối đa</label>
                    <input type="number" 
                           [ngModel]="settings()?.security?.maxLoginAttempts || 5"
                           (ngModelChange)="updateSecuritySetting('maxLoginAttempts', $event)"
                           min="3"
                           max="10"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Độ dài mật khẩu tối thiểu</label>
                    <input type="number" 
                           [ngModel]="settings()?.security?.passwordMinLength || 8"
                           (ngModelChange)="updateSecuritySetting('passwordMinLength', $event)"
                           min="6"
                           max="20"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500">
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 class="font-medium text-gray-900">Yêu cầu xác thực hai yếu tố</h4>
                      <p class="text-sm text-gray-600">Yêu cầu người dùng sử dụng 2FA để tăng cường bảo mật</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" 
                             [ngModel]="settings()?.security?.requireTwoFactor || false"
                             (ngModelChange)="updateSecuritySetting('requireTwoFactor', $event)"
                             class="sr-only peer">
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>

                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div class="flex">
                    <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                      <h4 class="text-sm font-medium text-red-800">Cài đặt bảo mật quan trọng</h4>
                      <p class="text-sm text-red-700 mt-1">Thay đổi các cài đặt bảo mật có thể ảnh hưởng đến trải nghiệm người dùng. Hãy cân nhắc kỹ trước khi thay đổi.</p>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemSettingsComponent implements OnInit {
  protected adminService = inject(AdminService);

  // State
  activeTab = signal<'general' | 'email' | 'payment' | 'security'>('general');
  isSaving = signal(false);
  settings = signal<SystemSettings | null>(null);

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.adminService.getSettings().subscribe({
      next: (data: SystemSettings) => {
        this.settings.set(data);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading settings:', error);
      }
    });
  }

  setActiveTab(tab: 'general' | 'email' | 'payment' | 'security'): void {
    this.activeTab.set(tab);
  }

  saveSettings(): void {
    this.isSaving.set(true);
    const currentSettings = this.settings();
    if (currentSettings) {
      this.adminService.updateSettings(currentSettings).subscribe({
        next: (response: { message: string }) => {
          console.log('Settings saved:', response.message);
          this.isSaving.set(false);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error saving settings:', error);
          this.isSaving.set(false);
        }
      });
    }
  }

  // Helper methods for updating settings
  updateGeneralSetting(key: string, value: any): void {
    const currentSettings = this.settings();
    if (currentSettings) {
      this.settings.set({
        ...currentSettings,
        general: {
          ...currentSettings.general,
          [key]: value
        }
      });
    }
  }

  updateEmailSetting(key: string, value: any): void {
    const currentSettings = this.settings();
    if (currentSettings) {
      this.settings.set({
        ...currentSettings,
        email: {
          ...currentSettings.email,
          [key]: value
        }
      });
    }
  }

  updatePaymentSetting(key: string, value: any): void {
    const currentSettings = this.settings();
    if (currentSettings) {
      this.settings.set({
        ...currentSettings,
        payment: {
          ...currentSettings.payment,
          [key]: value
        }
      });
    }
  }

  updateSecuritySetting(key: string, value: any): void {
    const currentSettings = this.settings();
    if (currentSettings) {
      this.settings.set({
        ...currentSettings,
        security: {
          ...currentSettings.security,
          [key]: value
        }
      });
    }
  }
}