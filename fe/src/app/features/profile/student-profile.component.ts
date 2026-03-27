import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../shared/types/user.types';
import { ErrorHandlingService } from '../../shared/services/error-handling.service';
import { LoadingComponent } from '../../shared/components/loading/loading.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StudentEnrollmentService } from '../student/services/enrollment.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  verificationToken: string;
  viewUrl: string;
  downloadUrl: string;
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
  imports: [RouterModule, FormsModule, LoadingComponent, IconComponent],
  template: `
    <!-- Loading State -->
    <app-loading 
      [show]="isLoading()" 
      text="Đang tải hồ sơ cá nhân..."
      subtext="Vui lòng chờ trong giây lát"
      variant="overlay"
      color="blue">
    </app-loading>
    <div class="min-h-screen bg-slate-50">
      <!-- Profile Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
              <div class="relative">
                <img [src]="profile().avatar" [alt]="profile().fullName" 
                     class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm">
                <button (click)="editAvatar()"
                        class="absolute bottom-0 right-0 w-8 h-8 bg-[#0056D2] text-white rounded-full flex items-center justify-center hover:bg-[#004BB5] transition-colors">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                  </svg>
                </button>
              </div>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">{{ profile().fullName }}</h1>
                <p class="text-gray-600 text-lg">{{ profile().studentId }}</p>
                <p class="text-gray-500">{{ profile().email }}</p>
                <div class="flex items-center space-x-4 mt-3">
                  <span class="text-sm bg-[#0056D2]/10 text-[#004BB5] px-3 py-1 rounded-full inline-flex items-center gap-1">
                    <app-icon name="graduation-cap" size="md"/> {{ profile().certificates.length }} chứng chỉ
                  </span>
                  <span class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full inline-flex items-center gap-1">
                    <app-icon name="trophy" size="md"/> {{ profile().achievements.length }} thành tích
                  </span>
                  <span class="text-sm bg-[#0056D2]/10 text-[#0056D2] px-3 py-1 rounded-full inline-flex items-center gap-1">
                    <app-icon name="courses" size="md"/> {{ profile().interests.length }} lĩnh vực quan tâm
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <button (click)="editProfile()"
                      class="px-6 py-3 bg-[#0056D2] text-white rounded-lg hover:bg-[#004BB5] transition-colors font-medium">
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

      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Personal Information -->
            <div class="bg-white rounded-lg shadow-sm p-6">
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
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Mục tiêu học tập</h3>
              <div class="space-y-4">
                @for (goal of profile().learningGoals; track goal) {
                  <div class="flex items-center space-x-3 p-4 bg-[#0056D2]/5 rounded-lg">
                    <div class="w-8 h-8 bg-[#0056D2]/10 rounded-full flex items-center justify-center">
                      <svg class="w-4 h-4 text-[#0056D2]" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <span class="text-gray-900">{{ goal }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Interests -->
            <div class="bg-white rounded-lg shadow-sm p-6">
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
            <div class="bg-white rounded-lg shadow-sm p-6">
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
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Thành tích gần đây</h3>
              <div class="space-y-4">
                @for (achievement of profile().achievements.slice(0, 5); track achievement.id) {
                  <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <app-icon [name]="$any(achievement.icon)" size="md"/>
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
                      class="w-full mt-4 text-[#0056D2] hover:text-[#004BB5] font-medium">
                Xem tất cả thành tích →
              </button>
            </div>

            <!-- Certificates -->
            <div class="bg-white rounded-lg shadow-sm p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-6">Chứng chỉ</h3>
              <div class="space-y-4">
                @for (certificate of profile().certificates.slice(0, 3); track certificate.id) {
                  <div class="p-4 bg-gray-50 rounded-lg">
                    <h4 class="font-medium text-gray-900">{{ certificate.courseName }}</h4>
                    <p class="text-sm text-gray-600">Cấp ngày: {{ formatDate(certificate.issuedAt) }}</p>
                    <div class="flex items-center justify-between mt-2">
                      <span class="text-xs px-2 py-1 rounded-full"
                            [class]="certificate.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        {{ certificate.isValid ? 'Còn hiệu lực' : 'Hết hạn' }}
                      </span>
                      <button (click)="viewCertificate(certificate.id)"
                              class="text-[#0056D2] hover:text-[#004BB5] text-sm">
                        Xem chứng chỉ
                      </button>
                    </div>
                  </div>
                }
              </div>
              <button (click)="viewAllCertificates()"
                      class="w-full mt-4 text-[#0056D2] hover:text-[#004BB5] font-medium">
                Xem tất cả chứng chỉ →
              </button>
            </div>

            <!-- Social Links -->
            @if (profile().socialLinks.length > 0) {
              <div class="bg-white rounded-lg shadow-sm p-6">
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
  private enrollmentService = inject(StudentEnrollmentService);
  private http = inject(HttpClient);

  isLoading = signal<boolean>(true);

  profile = signal<StudentProfile>({
    id: '', userId: '', studentId: '',
    fullName: '', email: '', phone: '',
    dateOfBirth: new Date(), address: '',
    avatar: 'https://ui-avatars.com/api/?name=U&background=3b82f6&color=ffffff&size=150',
    bio: '', interests: [], learningGoals: [], preferredSubjects: [],
    studySchedule: { preferredStudyTime: '', studyDays: [], studyDuration: 0, breakInterval: 0 },
    achievements: [], certificates: [], socialLinks: [],
    createdAt: new Date(), updatedAt: new Date()
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      this.isLoading.set(true);

      const user = this.authService.currentUser();
      const fullName = (user as any)?.fullName || (user as any)?.name || 'Học viên';
      const email = user?.email || '';
      const userId = (user as any)?.id || '';

      // Load enrollment stats
      await this.enrollmentService.loadEnrolledCourses();
      const stats = this.enrollmentService.enrollmentStats();

      // Load certificates from backend
      let certificates: Certificate[] = [];
      try {
        const certResponse: any = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/api/v3/student/certificates`)
        );
        const certData = certResponse?.data || [];
        certificates = certData.map((c: any) => ({
          id: c.id,
          courseId: c.courseId,
          courseName: c.courseName || '',
          issuedAt: new Date(c.issuedAt),
          verificationToken: c.verificationToken,
          viewUrl: `/student/certificate/${c.verificationToken}`,
          downloadUrl: `/api/v3/certificates/${c.id}/download`,
          isValid: true
        }));
      } catch {
        // No certificates yet
      }

      this.profile.set({
        id: userId,
        userId: userId,
        studentId: userId.substring(0, 8).toUpperCase(),
        fullName,
        email,
        phone: '',
        dateOfBirth: new Date(),
        address: '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=3b82f6&color=ffffff&size=150`,
        bio: '',
        interests: [],
        learningGoals: [],
        preferredSubjects: [],
        studySchedule: { preferredStudyTime: '', studyDays: [], studyDuration: 0, breakInterval: 0 },
        achievements: [
          ...(stats.completed > 0 ? [{
            id: 'course-completer',
            title: 'Hoàn thành khóa học',
            description: `Đã hoàn thành ${stats.completed} khóa học`,
            icon: 'graduation-cap',
            earnedAt: new Date(),
            category: 'course' as const
          }] : []),
          ...(stats.total >= 3 ? [{
            id: 'active-learner',
            title: 'Học viên tích cực',
            description: `Đang theo học ${stats.total} khóa học`,
            icon: 'courses',
            earnedAt: new Date(),
            category: 'milestone' as const
          }] : [])
        ],
        certificates,
        socialLinks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      this.errorService.handleApiError(error, 'profile');
    } finally {
      this.isLoading.set(false);
    }
  }

  editProfile(): void {
    this.errorService.showInfo('Tính năng chỉnh sửa hồ sơ sẽ được phát triển trong phiên bản tiếp theo', 'profile');
  }

  editAvatar(): void {
    this.errorService.showInfo('Tính năng chỉnh sửa avatar sẽ được phát triển trong phiên bản tiếp theo', 'avatar');
  }

  goToDashboard(): void {
    this.router.navigate(['/student/courses']).catch(error => {
      this.errorService.handleNavigationError(error, '/student/courses');
    });
  }

  viewAllAchievements(): void {
    this.errorService.showInfo('Tính năng xem tất cả thành tích sẽ được phát triển trong phiên bản tiếp theo', 'achievements');
  }

  viewAllCertificates(): void {
    this.errorService.showInfo('Tính năng xem tất cả chứng chỉ sẽ được phát triển trong phiên bản tiếp theo', 'certificates');
  }

  viewCertificate(certificateId: string): void {
    const certificate = this.profile().certificates.find(cert => cert.id === certificateId);
    if (!certificate) {
      this.errorService.addError({
        message: 'Không tìm thấy chứng chỉ để mở',
        type: 'error',
        context: 'certificate',
      });
      return;
    }

    window.open(certificate.viewUrl, '_blank');
    this.errorService.showSuccess('Chứng chỉ đang được mở trong tab mới', 'certificate');
  }

  downloadCertificate(certificateId: string): void {
    const certificate = this.profile().certificates.find(cert => cert.id === certificateId);
    if (certificate) {
      const link = document.createElement('a');
      link.href = certificate.downloadUrl;
      link.download = `certificate-${certificate.courseName}.pdf`;
      link.click();
      this.errorService.showSuccess('Chứng chỉ đang được tải xuống', 'certificate');
    }
  }

  shareAchievement(achievementId: string): void {
    this.errorService.showInfo('Tính năng chia sẻ thành tích sẽ được phát triển trong phiên bản tiếp theo', 'achievement');
  }

  updateSocialLink(platform: string, url: string): void {
    const socialLinks = this.profile().socialLinks;
    const updatedLinks = socialLinks.map(link => 
      link.platform === platform ? { ...link, url } : link
    );
    this.profile.set({ ...this.profile(), socialLinks: updatedLinks });
    this.errorService.showSuccess(`Đã cập nhật liên kết ${platform}`, 'social');
  }

  toggleSocialLinkVisibility(platform: string): void {
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
