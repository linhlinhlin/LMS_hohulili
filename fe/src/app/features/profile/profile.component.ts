import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="container mx-auto px-4">
        <div class="max-w-4xl mx-auto">
          <!-- Header -->
          <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
                <p class="text-gray-600 mt-2">Quản lý thông tin cá nhân và cài đặt tài khoản</p>
              </div>
              <div class="flex space-x-4">
                <button 
                  (click)="toggleEditMode()"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  {{ isEditMode() ? 'Hủy' : 'Chỉnh sửa' }}
                </button>
                <button 
                  (click)="saveProfile()"
                  [disabled]="!isEditMode()"
                  class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>

          <div class="grid lg:grid-cols-3 gap-8">
            <!-- Profile Info -->
            <div class="lg:col-span-2 space-y-8">
              <!-- Basic Information -->
              <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-6">Thông tin cơ bản</h2>
                
                <form class="space-y-6">
                  <div class="grid md:grid-cols-2 gap-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                      <input 
                        type="text" 
                        [(ngModel)]="profileData.name"
                        [readonly]="!isEditMode()"
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        name="name">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input 
                        type="email" 
                        [(ngModel)]="profileData.email"
                        [readonly]="!isEditMode()"
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        name="email">
                    </div>
                  </div>

                  <div class="grid md:grid-cols-2 gap-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                      <input 
                        type="tel" 
                        [(ngModel)]="profileData.phone"
                        [readonly]="!isEditMode()"
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        name="phone">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                      <input 
                        type="date" 
                        [(ngModel)]="profileData.birthDate"
                        [readonly]="!isEditMode()"
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        name="birthDate">
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                    <textarea 
                      [(ngModel)]="profileData.address"
                      [readonly]="!isEditMode()"
                      rows="3"
                      class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      name="address"></textarea>
                  </div>
                </form>
              </div>

              <!-- Professional Information -->
              <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-6">Thông tin nghề nghiệp</h2>
                
                <form class="space-y-6">
                  <div class="grid md:grid-cols-2 gap-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                      <select 
                        [(ngModel)]="profileData.role"
                        [disabled]="!isEditMode()"
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        name="role">
                        <option value="student">Học viên</option>
                        <option value="teacher">Giảng viên</option>
                        <option value="admin">Quản trị viên</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Công ty/Tổ chức</label>
                      <input 
                        type="text" 
                        [(ngModel)]="profileData.organization"
                        [readonly]="!isEditMode()"
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        name="organization">
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Kinh nghiệm</label>
                    <textarea 
                      [(ngModel)]="profileData.experience"
                      [readonly]="!isEditMode()"
                      rows="4"
                      class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      name="experience"
                      placeholder="Mô tả kinh nghiệm làm việc của bạn..."></textarea>
                  </div>
                </form>
              </div>

              <!-- Change Password -->
              <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-6">Đổi mật khẩu</h2>
                
                <form class="space-y-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Mật khẩu hiện tại</label>
                    <input 
                      type="password" 
                      [(ngModel)]="passwordData.currentPassword"
                      class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      name="currentPassword">
                  </div>
                  
                  <div class="grid md:grid-cols-2 gap-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới</label>
                      <input 
                        type="password" 
                        [(ngModel)]="passwordData.newPassword"
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        name="newPassword">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Xác nhận mật khẩu</label>
                      <input 
                        type="password" 
                        [(ngModel)]="passwordData.confirmPassword"
                        class="w-full px-4 py-3 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        name="confirmPassword">
                    </div>
                  </div>

                  <button 
                    type="button"
                    (click)="changePassword()"
                    class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
                    Đổi mật khẩu
                  </button>
                </form>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-8">
              <!-- Avatar -->
              <div class="bg-white rounded-lg shadow-lg p-6 text-center">
                <div class="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-900">{{ profileData.name }}</h3>
                <p class="text-gray-600">{{ getRoleDisplayName(profileData.role) }}</p>
                <button 
                  (click)="uploadAvatar()"
                  class="mt-4 text-blue-600 hover:text-blue-800 text-sm">
                  Thay đổi ảnh đại diện
                </button>
              </div>

              <!-- Statistics -->
              <div class="bg-white rounded-lg shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Thống kê học tập</h3>
                <div class="space-y-4">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Khóa học đã hoàn thành</span>
                    <span class="font-semibold text-blue-600">{{ stats.completedCourses }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Bài tập đã nộp</span>
                    <span class="font-semibold text-green-600">{{ stats.submittedAssignments }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Quiz đã làm</span>
                    <span class="font-semibold text-purple-600">{{ stats.completedQuizzes }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Điểm trung bình</span>
                    <span class="font-semibold text-orange-600">{{ stats.averageScore }}%</span>
                  </div>
                </div>
              </div>

              <!-- Quick Actions -->
              <div class="bg-white rounded-lg shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
                <div class="space-y-3">
                  <button 
                    (click)="goToCourses()"
                    class="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                      </svg>
                      <span>Khóa học của tôi</span>
                    </div>
                  </button>
                  <button 
                    (click)="goToAssignments()"
                    class="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span>Bài tập</span>
                    </div>
                  </button>
                  <button 
                    (click)="goToAnalytics()"
                    class="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                      <span>Phân tích</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  isEditMode = signal(false);
  isSaving = signal(false);

  profileData = {
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    phone: '0123456789',
    birthDate: '1990-01-01',
    address: '123 Đường ABC, Quận XYZ, TP.HCM',
    role: 'student',
    organization: 'Công ty ABC',
    experience: '5 năm kinh nghiệm trong lĩnh vực hàng hải...'
  };

  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  stats = {
    completedCourses: 12,
    submittedAssignments: 45,
    completedQuizzes: 38,
    averageScore: 85
  };

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      'student': 'Học viên',
      'teacher': 'Giảng viên',
      'admin': 'Quản trị viên'
    };
    return roleMap[role] || role;
  }

  toggleEditMode(): void {
    this.isEditMode.update(mode => !mode);
  }

  saveProfile(): void {
    this.isSaving.set(true);
    
    // Simulate save operation
    setTimeout(() => {
      this.isSaving.set(false);
      this.isEditMode.set(false);
      // Show success message
    }, 1000);
  }

  changePassword(): void {
    if (this.passwordData.newPassword === this.passwordData.confirmPassword) {
      // Simulate password change
      console.log('Password changed');
      this.passwordData = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
    }
  }

  uploadAvatar(): void {
    // Simulate avatar upload
    console.log('Upload avatar');
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
  }

  goToAssignments(): void {
    this.router.navigate(['/assignments']);
  }

  goToAnalytics(): void {
    this.router.navigate(['/analytics']);
  }
}
