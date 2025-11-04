import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../shared/types/user.types';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

interface StudentProfile {
  id: string;
  userId: string;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  address: string;
  avatar: string;
  bio: string;
  interests: string[];
  learningGoals: string[];
  preferredSubjects: string[];
  studySchedule: StudySchedule;
  achievements: Achievement[];
  certificates: Certificate[];
  socialLinks: SocialLink[];
  createdAt: Date;
  updatedAt: Date;
}

interface StudySchedule {
  preferredStudyTime: string;
  studyDays: string[];
  studyDuration: number; // hours per day
  breakInterval: number; // minutes
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'course' | 'quiz' | 'streak' | 'social' | 'milestone';
}

interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  issuedAt: Date;
  certificateUrl: string;
  isValid: boolean;
  expiryDate?: Date;
}

interface SocialLink {
  platform: string;
  url: string;
  isPublic: boolean;
}

@Component({
  selector: 'app-student-profile',
  imports: [CommonModule, RouterModule, FormsModule, LoadingComponent],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải hồ sơ cá nhân..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- Profile Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-6 py-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <div class="relative">
                <img [src]="profile().avatar" [alt]="profile().fullName" 
                     class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg">
                <button (click)="editAvatar()"
                        class="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                  </svg>
                </button>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">{{ profile().fullName }}</h1>
                <p class="text-gray-600 text-lg">{{ profile().studentId }}</p>
                <p class="text-gray-500">{{ profile().email }}</p>
                <div class="flex items-center space-x-4 mt-3">
                  <span class="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    🎓 {{ profile().certificates.length }} chứng chỉ
                  </span>
                  <span class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    🏆 {{ profile().achievements.length }} thành tích
                  </span>
                  <span class="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                    📚 {{ profile().interests.length }} lĩnh vực quan tâm
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <button (click)="editProfile()"
                      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                </svg>
                Chỉnh sửa hồ sơ
              </button>
              
              <button (click)="goToDashboard()"
                      class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 1 1 0 00.2-.285.985.985 0 00.15-.76V9.397zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"></path>
                </svg>
                Về Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Personal Information -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Thông tin cá nhân</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                  <p class="text-gray-900">{{ profile().fullName }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Mã sinh viên</label>
                  <p class="text-gray-900">{{ profile().studentId }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <p class="text-gray-900">{{ profile().email }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                  <p class="text-gray-900">{{ profile().phone || 'Chưa cập nhật' }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                  <p class="text-gray-900">{{ formatDate(profile().dateOfBirth) }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                  <p class="text-gray-900">{{ profile().address || 'Chưa cập nhật' }}</p>
                </div>
              </div>
              
              @if (profile().bio) {
                <div class="mt-6">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Giới thiệu bản thân</label>
                  <p class="text-gray-900 leading-relaxed">{{ profile().bio }}</p>
                </div>
              }
            </div>

            <!-- Learning Goals -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Mục tiêu học tập</h3>
              <div class="space-y-4">
                @for (goal of profile().learningGoals; track goal) {
                  <div class="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <span class="text-gray-900">{{ goal }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Interests -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Lĩnh vực quan tâm</h3>
              <div class="flex flex-wrap gap-3">
                @for (interest of profile().interests; track interest) {
                  <span class="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {{ interest }}
                  </span>
                }
              </div>
            </div>

            <!-- Study Schedule -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Lịch học tập</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian học ưa thích</label>
                  <p class="text-gray-900">{{ profile().studySchedule.preferredStudyTime }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ngày học trong tuần</label>
                  <p class="text-gray-900">{{ profile().studySchedule.studyDays.join(', ') }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian học mỗi ngày</label>
                  <p class="text-gray-900">{{ profile().studySchedule.studyDuration }} giờ</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian nghỉ</label>
                  <p class="text-gray-900">{{ profile().studySchedule.breakInterval }} phút</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-8">
            <!-- Achievements -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Thành tích gần đây</h3>
              <div class="space-y-4">
                @for (achievement of profile().achievements.slice(0, 5); track achievement.id) {
                  <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                    <div class="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <span class="text-lg">{{ achievement.icon }}</span>
                    </div>
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900">{{ achievement.title }}</h4>
                      <p class="text-sm text-gray-600">{{ achievement.description }}</p>
                      <p class="text-xs text-gray-500">{{ formatDate(achievement.earnedAt) }}</p>
                    </div>
                  </div>
                }
              </div>
              <button (click)="viewAllAchievements()"
                      class="w-full mt-4 text-blue-600 hover:text-blue-800 font-medium">
                Xem tất cả thành tích →
              </button>
            </div>

            <!-- Certificates -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Chứng chỉ</h3>
              <div class="space-y-4">
                @for (certificate of profile().certificates.slice(0, 3); track certificate.id) {
                  <div class="p-4 bg-gray-50 rounded-xl">
                    <h4 class="font-medium text-gray-900">{{ certificate.courseName }}</h4>
                    <p class="text-sm text-gray-600">Cấp ngày: {{ formatDate(certificate.issuedAt) }}</p>
                    <div class="flex items-center justify-between mt-2">
                      <span class="text-xs px-2 py-1 rounded-full"
                            [class]="certificate.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        {{ certificate.isValid ? 'Còn hiệu lực' : 'Hết hạn' }}
                      </span>
                      <button (click)="viewCertificate(certificate.id)"
                              class="text-blue-600 hover:text-blue-800 text-sm">
                        Xem chứng chỉ
                      </button>
                    </div>
                  </div>
                }
              </div>
              <button (click)="viewAllCertificates()"
                      class="w-full mt-4 text-blue-600 hover:text-blue-800 font-medium">
                Xem tất cả chứng chỉ →
              </button>
            </div>

            <!-- Social Links -->
            @if (profile().socialLinks.length > 0) {
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">Liên kết xã hội</h3>
                <div class="space-y-3">
                  @for (link of profile().socialLinks; track link.platform) {
                    <div class="flex items-center space-x-3">
                      <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                      <span class="text-gray-900">{{ link.platform }}</span>
                    </div>
                  }
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
export class StudentProfileComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private errorService = inject(ErrorHandlingService);

  // Loading state
  isLoading = signal<boolean>(true);

  // Mock profile data
  profile = signal<StudentProfile>({
    id: 'profile-1',
    userId: 'user-1',
    studentId: 'SV2024001',
    fullName: this.authService.currentUser()?.fullName || 'Nguyễn Văn Hải',
    email: this.authService.currentUser()?.email || 'student@demo.com',
    phone: '0123456789',
    dateOfBirth: new Date('1995-06-15'),
    address: '123 Đường ABC, Quận 1, TP.HCM',
    avatar: this.authService.currentUser()?.avatar || 'https://ui-avatars.com/api/?name=Nguyen+Van+Hai&background=3b82f6&color=ffffff&size=150',
    bio: 'Tôi là sinh viên năm 3 chuyên ngành Hàng hải tại Trường Đại học Hàng hải Việt Nam. Tôi có niềm đam mê với ngành hàng hải và mong muốn trở thành một thuyền trưởng chuyên nghiệp.',
    interests: ['An toàn hàng hải', 'Điều khiển tàu', 'Kỹ thuật tàu biển', 'Luật hàng hải', 'Quản lý cảng'],
    learningGoals: [
      'Hoàn thành chứng chỉ STCW',
      'Đạt được chứng chỉ thuyền trưởng hạng 2',
      'Học thêm về công nghệ hàng hải hiện đại',
      'Nâng cao kỹ năng tiếng Anh chuyên ngành'
    ],
    preferredSubjects: ['An toàn hàng hải', 'Điều khiển tàu', 'Kỹ thuật tàu biển'],
    studySchedule: {
      preferredStudyTime: '19:00 - 22:00',
      studyDays: ['Thứ 2', 'Thứ 4', 'Thứ 6', 'Chủ nhật'],
      studyDuration: 3,
      breakInterval: 15
    },
    achievements: [
      {
        id: 'achievement-1',
        title: 'Học viên chăm chỉ',
        description: 'Học liên tiếp 7 ngày',
        icon: '🔥',
        earnedAt: new Date('2024-09-10'),
        category: 'streak'
      },
      {
        id: 'achievement-2',
        title: 'Quiz Master',
        description: 'Đạt điểm cao trong 5 quiz liên tiếp',
        icon: '🏆',
        earnedAt: new Date('2024-09-08'),
        category: 'quiz'
      },
      {
        id: 'achievement-3',
        title: 'Course Completer',
        description: 'Hoàn thành khóa học đầu tiên',
        icon: '🎓',
        earnedAt: new Date('2024-09-05'),
        category: 'course'
      }
    ],
    certificates: [
      {
        id: 'cert-1',
        courseId: 'course-1',
        courseName: 'Kỹ thuật Tàu biển Cơ bản',
        issuedAt: new Date('2024-08-15'),
        certificateUrl: '/certificates/cert-1.pdf',
        isValid: true
      },
      {
        id: 'cert-2',
        courseId: 'course-2',
        courseName: 'An toàn Hàng hải',
        issuedAt: new Date('2024-07-20'),
        certificateUrl: '/certificates/cert-2.pdf',
        isValid: true
      }
    ],
    socialLinks: [
      {
        platform: 'LinkedIn',
        url: 'https://linkedin.com/in/nguyenvanhai',
        isPublic: true
      },
      {
        platform: 'Facebook',
        url: 'https://facebook.com/nguyenvanhai',
        isPublic: false
      }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-15')
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Simulate loading profile data
      await this.simulateProfileLoading();
      
      console.log('🔧 Student Profile - Component initialized');
      console.log('🔧 Student Profile - Profile data loaded:', this.profile());
      
      this.errorService.showSuccess('Hồ sơ cá nhân đã được tải thành công!', 'profile');
      
    } catch (error) {
      this.errorService.handleApiError(error, 'profile');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async simulateProfileLoading(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  editProfile(): void {
    console.log('🔧 Student Profile - Edit profile');
    this.errorService.showInfo('Tính năng chỉnh sửa hồ sơ sẽ được phát triển trong phiên bản tiếp theo', 'profile');
  }

  editAvatar(): void {
    console.log('🔧 Student Profile - Edit avatar');
    this.errorService.showInfo('Tính năng chỉnh sửa avatar sẽ được phát triển trong phiên bản tiếp theo', 'avatar');
  }

  goToDashboard(): void {
    console.log('🔧 Student Profile - Go to dashboard');
    this.router.navigate(['/student/dashboard']).catch(error => {
      this.errorService.handleNavigationError(error, '/student/dashboard');
    });
  }

  viewAllAchievements(): void {
    console.log('🔧 Student Profile - View all achievements');
    this.errorService.showInfo('Tính năng xem tất cả thành tích sẽ được phát triển trong phiên bản tiếp theo', 'achievements');
  }

  viewAllCertificates(): void {
    console.log('🔧 Student Profile - View all certificates');
    this.errorService.showInfo('Tính năng xem tất cả chứng chỉ sẽ được phát triển trong phiên bản tiếp theo', 'certificates');
  }

  viewCertificate(certificateId: string): void {
    console.log('🔧 Student Profile - View certificate:', certificateId);
    // Open certificate in new tab
    window.open(`/certificates/${certificateId}`, '_blank');
    this.errorService.showSuccess('Chứng chỉ đang được mở trong tab mới', 'certificate');
  }

  downloadCertificate(certificateId: string): void {
    console.log('🔧 Student Profile - Download certificate:', certificateId);
    const certificate = this.profile().certificates.find(cert => cert.id === certificateId);
    if (certificate) {
      const link = document.createElement('a');
      link.href = certificate.certificateUrl;
      link.download = `certificate-${certificate.courseName}.pdf`;
      link.click();
      this.errorService.showSuccess('Chứng chỉ đang được tải xuống', 'certificate');
    }
  }

  shareAchievement(achievementId: string): void {
    console.log('🔧 Student Profile - Share achievement:', achievementId);
    this.errorService.showInfo('Tính năng chia sẻ thành tích sẽ được phát triển trong phiên bản tiếp theo', 'achievement');
  }

  updateSocialLink(platform: string, url: string): void {
    console.log('🔧 Student Profile - Update social link:', platform, url);
    const socialLinks = this.profile().socialLinks;
    const updatedLinks = socialLinks.map(link => 
      link.platform === platform ? { ...link, url } : link
    );
    this.profile.set({ ...this.profile(), socialLinks: updatedLinks });
    this.errorService.showSuccess(`Đã cập nhật liên kết ${platform}`, 'social');
  }

  toggleSocialLinkVisibility(platform: string): void {
    console.log('🔧 Student Profile - Toggle social link visibility:', platform);
    const socialLinks = this.profile().socialLinks;
    const updatedLinks = socialLinks.map(link => 
      link.platform === platform ? { ...link, isPublic: !link.isPublic } : link
    );
    this.profile.set({ ...this.profile(), socialLinks: updatedLinks });
    this.errorService.showSuccess(`Đã thay đổi quyền riêng tư cho ${platform}`, 'social');
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN');
  }
}