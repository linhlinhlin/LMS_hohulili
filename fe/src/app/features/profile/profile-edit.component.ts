import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface ProfileEdit {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  bio: string;
  interests: string[];
  learningGoals: string[];
  preferredSubjects: string[];
  studySchedule: {
    preferredStudyTime: string;
    studyDays: string[];
    studyDuration: number;
    breakInterval: number;
  };
  socialLinks: {
    platform: string;
    url: string;
    isPublic: boolean;
  }[];
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    assignmentReminders: boolean;
    courseUpdates: boolean;
    forumUpdates: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showPhone: boolean;
    showProgress: boolean;
  };
}

interface StudyDay {
  value: string;
  label: string;
}

interface SocialPlatform {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-profile-edit',
  imports: [CommonModule, RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <!-- Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-4xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                </svg>
                <span>Quay lại</span>
              </button>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Chỉnh sửa hồ sơ</h1>
                <p class="text-gray-600">Cập nhật thông tin cá nhân và tùy chọn</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-6 py-8">
        <form (ngSubmit)="saveProfile()" #profileForm="ngForm">
          <div class="space-y-8">
            <!-- Personal Information -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">👤 Thông tin cá nhân</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Full Name -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
                  <input type="text" 
                         [ngModel]="profile().fullName"
                         (ngModelChange)="updateProfile('fullName', $event)"
                         name="fullName"
                         class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         required>
                </div>

                <!-- Email -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input type="email" 
                         [ngModel]="profile().email"
                         (ngModelChange)="updateProfile('email', $event)"
                         name="email"
                         class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         required>
                </div>

                <!-- Phone -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                  <input type="tel" 
                         [ngModel]="profile().phone"
                         (ngModelChange)="updateProfile('phone', $event)"
                         name="phone"
                         class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <!-- Date of Birth -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                  <input type="date" 
                         [ngModel]="profile().dateOfBirth"
                         (ngModelChange)="updateProfile('dateOfBirth', $event)"
                         name="dateOfBirth"
                         class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <!-- Address -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                  <textarea 
                    [ngModel]="profile().address"
                    (ngModelChange)="updateProfile('address', $event)"
                    name="address"
                    rows="3"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"></textarea>
                </div>

                <!-- Bio -->
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Giới thiệu bản thân</label>
                  <textarea 
                    [ngModel]="profile().bio"
                    (ngModelChange)="updateProfile('bio', $event)"
                    name="bio"
                    rows="4"
                    placeholder="Viết một vài dòng giới thiệu về bản thân..."
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"></textarea>
                </div>
              </div>
            </div>

            <!-- Learning Preferences -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">🎓 Sở thích học tập</h2>
              
              <div class="space-y-6">
                <!-- Interests -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Lĩnh vực quan tâm</label>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    @for (interest of availableInterests(); track interest) {
                      <label class="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="checkbox" 
                               [value]="interest"
                               [checked]="profile().interests.includes(interest)"
                               (change)="toggleInterest(interest)"
                               class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="text-sm text-gray-700">{{ interest }}</span>
                      </label>
                    }
                  </div>
                </div>

                <!-- Learning Goals -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Mục tiêu học tập</label>
                  <div class="space-y-3">
                    @for (goal of profile().learningGoals; track $index) {
                      <div class="flex items-center space-x-3">
                        <input type="text" 
                               [ngModel]="profile().learningGoals[$index]"
                               (ngModelChange)="updateLearningGoal($index, $event)"
                               [name]="'goal-' + $index"
                               class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <button type="button" 
                                (click)="removeLearningGoal($index)"
                                class="p-3 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </div>
                    }
                    <button type="button" 
                            (click)="addLearningGoal()"
                            class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
                      + Thêm mục tiêu học tập
                    </button>
                  </div>
                </div>

                <!-- Preferred Subjects -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Môn học ưa thích</label>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    @for (subject of availableSubjects(); track subject) {
                      <label class="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-green-50 cursor-pointer">
                        <input type="checkbox" 
                               [value]="subject"
                               [checked]="profile().preferredSubjects.includes(subject)"
                               (change)="toggleSubject(subject)"
                               class="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500">
                        <span class="text-sm text-gray-700">{{ subject }}</span>
                      </label>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Study Schedule -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">📅 Lịch học tập</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Preferred Study Time -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian học ưa thích</label>
                  <select [ngModel]="profile().studySchedule.preferredStudyTime"
           (ngModelChange)="updateStudySchedule('preferredStudyTime', $event)" 
                          name="preferredStudyTime"
                          class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="morning">Sáng (6:00 - 12:00)</option>
                    <option value="afternoon">Chiều (12:00 - 18:00)</option>
                    <option value="evening">Tối (18:00 - 24:00)</option>
                    <option value="flexible">Linh hoạt</option>
                  </select>
                </div>

                <!-- Study Duration -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian học mỗi ngày (giờ)</label>
                  <input type="number" 
                         [ngModel]="profile().studySchedule.studyDuration"
                         (ngModelChange)="updateStudySchedule('studyDuration', $event)"
                         name="studyDuration"
                         min="1" max="12"
                         class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <!-- Study Days -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ngày học trong tuần</label>
                  <div class="grid grid-cols-2 gap-2">
                    @for (day of studyDays(); track day.value) {
                      <label class="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-purple-50 cursor-pointer">
                        <input type="checkbox" 
                               [value]="day.value"
                               [checked]="profile().studySchedule.studyDays.includes(day.value)"
                               (change)="toggleStudyDay(day.value)"
                               class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500">
                        <span class="text-sm text-gray-700">{{ day.label }}</span>
                      </label>
                    }
                  </div>
                </div>

                <!-- Break Interval -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian nghỉ (phút)</label>
                <input type="number" 
                       [ngModel]="profile().studySchedule.breakInterval"
                       (ngModelChange)="updateStudySchedule('breakInterval', $event)"
                       name="breakInterval"
                       min="5" max="60"
                       class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
            </div>

            <!-- Social Links -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">🔗 Liên kết xã hội</h2>
              
              <div class="space-y-4">
                 @for (link of profile().socialLinks; track $index) {
                  <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                    <select [ngModel]="link.platform"
                            (ngModelChange)="updateSocialLink($index, 'platform', $event)"
                            [name]="'platform-' + $index"
                            class="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      @for (platform of socialPlatforms(); track platform.value) {
                        <option [value]="platform.value">{{ platform.label }}</option>
                      }
                    </select>
                    <input type="url" 
                           [ngModel]="link.url"
                           (ngModelChange)="updateSocialLink($index, 'url', $event)"
                           [name]="'url-' + $index"
                           placeholder="https://..."
                           class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <label class="flex items-center space-x-2">
                      <input type="checkbox" 
                             [ngModel]="link.isPublic"
                             (ngModelChange)="updateSocialLink($index, 'isPublic', $event)"
                             [name]="'isPublic-' + $index"
                             class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                      <span class="text-sm text-gray-700">Công khai</span>
                    </label>
                    <button type="button" 
                            (click)="removeSocialLink($index)"
                            class="p-3 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                      </svg>
                    </button>
                  </div>
                }
                <button type="button" 
                        (click)="addSocialLink()"
                        class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
                      + Thêm liên kết xã hội
                </button>
              </div>
            </div>

            <!-- Notifications -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">🔔 Thông báo</h2>
              
              <div class="space-y-4">
                <label class="flex items-center space-x-3">
                  <input type="checkbox" 
                         [ngModel]="profile().notifications.emailNotifications"
           (ngModelChange)="updateNotifications('emailNotifications', $event)"
                         name="emailNotifications"
                         class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <span class="text-gray-700">Thông báo qua email</span>
                </label>
                
                <label class="flex items-center space-x-3">
                  <input type="checkbox" 
                         [ngModel]="profile().notifications.pushNotifications"
            (ngModelChange)="updateNotifications('pushNotifications', $event)"
                         name="pushNotifications"
                         class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <span class="text-gray-700">Thông báo đẩy</span>
                </label>
                
                <label class="flex items-center space-x-3">
                  <input type="checkbox" 
                         [ngModel]="profile().notifications.assignmentReminders"
          (ngModelChange)="updateNotifications('assignmentReminders', $event)"
                         name="assignmentReminders"
                         class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <span class="text-gray-700">Nhắc nhở bài tập</span>
                </label>
                
                <label class="flex items-center space-x-3">
                  <input type="checkbox" 
                         [ngModel]="profile().notifications.courseUpdates"
                (ngModelChange)="updateNotifications('courseUpdates', $event)"
                         name="courseUpdates"
                         class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <span class="text-gray-700">Cập nhật khóa học</span>
                </label>
                
                <label class="flex items-center space-x-3">
                  <input type="checkbox" 
                         [ngModel]="profile().notifications.forumUpdates"
                 (ngModelChange)="updateNotifications('forumUpdates', $event)"
                         name="forumUpdates"
                         class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <span class="text-gray-700">Cập nhật diễn đàn</span>
                </label>
              </div>
            </div>

            <!-- Privacy Settings -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-xl font-bold text-gray-900 mb-6">🔒 Quyền riêng tư</h2>
              
              <div class="space-y-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Hiển thị hồ sơ</label>
                  <select [ngModel]="profile().privacy.profileVisibility"
                  (ngModelChange)="updatePrivacy('profileVisibility', $event)" 
                          name="profileVisibility"
                          class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="public">Công khai</option>
                    <option value="friends">Bạn bè</option>
                    <option value="private">Riêng tư</option>
                  </select>
                </div>
                
                <div class="space-y-4">
                  <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                            [ngModel]="profile().privacy.showEmail"
                            (ngModelChange)="updatePrivacy('showEmail', $event)"
                           name="showEmail"
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-gray-700">Hiển thị email</span>
                  </label>
                  
                  <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                            [ngModel]="profile().privacy.showPhone"
                            (ngModelChange)="updatePrivacy('showPhone', $event)"
                           name="showPhone"
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-gray-700">Hiển thị số điện thoại</span>
                  </label>
                  
                  <label class="flex items-center space-x-3">
                    <input type="checkbox" 
                           [ngModel]="profile().privacy.showProgress"
                       (ngModelChange)="updatePrivacy('showProgress', $event)"
                           name="showProgress"
                           class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-gray-700">Hiển thị tiến độ học tập</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Submit Actions -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-600">
                  <p>Các thay đổi sẽ được lưu tự động</p>
                  <p>Thông tin cá nhân sẽ được bảo mật</p>
                </div>
                
                <div class="flex space-x-4">
                  <button type="button" 
                          (click)="resetProfile()"
                          class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Đặt lại
                  </button>
                  <button type="submit" 
                          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileEditComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Component state
  profile = signal<ProfileEdit>({
    fullName: 'Nguyễn Văn Hải',
    email: 'student@demo.com',
    phone: '0123456789',
    dateOfBirth: '1995-06-15',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    bio: 'Tôi là sinh viên năm 3 chuyên ngành Hàng hải tại Trường Đại học Hàng hải Việt Nam.',
    interests: ['An toàn hàng hải', 'Điều khiển tàu'],
    learningGoals: [
      'Hoàn thành chứng chỉ STCW',
      'Đạt được chứng chỉ thuyền trưởng hạng 2'
    ],
    preferredSubjects: ['An toàn hàng hải', 'Điều khiển tàu'],
    studySchedule: {
      preferredStudyTime: 'evening',
      studyDays: ['monday', 'wednesday', 'friday', 'sunday'],
      studyDuration: 3,
      breakInterval: 15
    },
    socialLinks: [
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/in/nguyenvanhai',
        isPublic: true
      }
    ],
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      assignmentReminders: true,
      courseUpdates: true,
      forumUpdates: false
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      showProgress: true
    }
  });

  // Mock data
  availableInterests = signal<string[]>([
    'An toàn hàng hải',
    'Điều khiển tàu',
    'Kỹ thuật tàu biển',
    'Luật hàng hải',
    'Quản lý cảng',
    'Logistics hàng hải',
    'Công nghệ hàng hải',
    'Môi trường biển'
  ]);

  availableSubjects = signal<string[]>([
    'An toàn hàng hải',
    'Điều khiển tàu',
    'Kỹ thuật tàu biển',
    'Luật hàng hải',
    'Quản lý cảng',
    'Logistics hàng hải',
    'Công nghệ hàng hải',
    'Môi trường biển',
    'Kinh tế hàng hải',
    'Tiếng Anh hàng hải'
  ]);

  studyDays = signal<StudyDay[]>([
    { value: 'monday', label: 'Thứ 2' },
    { value: 'tuesday', label: 'Thứ 3' },
    { value: 'wednesday', label: 'Thứ 4' },
    { value: 'thursday', label: 'Thứ 5' },
    { value: 'friday', label: 'Thứ 6' },
    { value: 'saturday', label: 'Thứ 7' },
    { value: 'sunday', label: 'Chủ nhật' }
  ]);

  socialPlatforms = signal<SocialPlatform[]>([
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'facebook', label: 'Facebook', icon: '📘' },
    { value: 'twitter', label: 'Twitter', icon: '🐦' },
    { value: 'instagram', label: 'Instagram', icon: '📷' },
    { value: 'youtube', label: 'YouTube', icon: '📺' },
    { value: 'github', label: 'GitHub', icon: '💻' }
  ]);

  ngOnInit(): void {
    console.log('🔧 Profile Edit - Component initialized');
  }

  updateProfile(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      [field]: value
    }));
    console.log('🔧 Profile Edit - Profile field updated:', field, value);
  }

  updateLearningGoal(index: number, value: string): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: p.learningGoals.map((goal, i) => i === index ? value : goal)
    }));
    console.log('🔧 Profile Edit - Learning goal updated:', index, value);
  }

  updateStudySchedule(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      studySchedule: {
        ...p.studySchedule,
        [field]: value
      }
    }));
    console.log('🔧 Profile Edit - Study schedule updated:', field, value);
  }

  updateSocialLink(index: number, field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: p.socialLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
    console.log('🔧 Profile Edit - Social link updated:', index, field, value);
  }

  updateNotifications(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      notifications: {
        ...p.notifications,
        [field]: value
      }
    }));
    console.log('🔧 Profile Edit - Notifications updated:', field, value);
  }

  updatePrivacy(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      privacy: {
        ...p.privacy,
        [field]: value
      }
    }));
    console.log('🔧 Profile Edit - Privacy updated:', field, value);
  }

  toggleInterest(interest: string): void {
    this.profile.update(p => ({
      ...p,
      interests: p.interests.includes(interest) 
        ? p.interests.filter(i => i !== interest)
        : [...p.interests, interest]
    }));
    console.log('🔧 Profile Edit - Interest toggled:', interest);
  }

  toggleSubject(subject: string): void {
    this.profile.update(p => ({
      ...p,
      preferredSubjects: p.preferredSubjects.includes(subject) 
        ? p.preferredSubjects.filter(s => s !== subject)
        : [...p.preferredSubjects, subject]
    }));
    console.log('🔧 Profile Edit - Subject toggled:', subject);
  }

  toggleStudyDay(day: string): void {
    this.profile.update(p => ({
      ...p,
      studySchedule: {
        ...p.studySchedule,
        studyDays: p.studySchedule.studyDays.includes(day) 
          ? p.studySchedule.studyDays.filter(d => d !== day)
          : [...p.studySchedule.studyDays, day]
      }
    }));
    console.log('🔧 Profile Edit - Study day toggled:', day);
  }

  addLearningGoal(): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: [...p.learningGoals, '']
    }));
    console.log('🔧 Profile Edit - Learning goal added');
  }

  removeLearningGoal(index: number): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: p.learningGoals.filter((_, i) => i !== index)
    }));
    console.log('🔧 Profile Edit - Learning goal removed:', index);
  }

  addSocialLink(): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: [...p.socialLinks, { platform: 'linkedin', url: '', isPublic: true }]
    }));
    console.log('🔧 Profile Edit - Social link added');
  }

  removeSocialLink(index: number): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: p.socialLinks.filter((_, i) => i !== index)
    }));
    console.log('🔧 Profile Edit - Social link removed:', index);
  }

  resetProfile(): void {
    if (confirm('Bạn có chắc chắn muốn đặt lại tất cả thông tin?')) {
      // Reset to original values
      this.profile.set({
        fullName: 'Nguyễn Văn Hải',
        email: 'student@demo.com',
        phone: '0123456789',
        dateOfBirth: '1995-06-15',
        address: '123 Đường ABC, Quận 1, TP.HCM',
        bio: 'Tôi là sinh viên năm 3 chuyên ngành Hàng hải tại Trường Đại học Hàng hải Việt Nam.',
        interests: ['An toàn hàng hải', 'Điều khiển tàu'],
        learningGoals: [
          'Hoàn thành chứng chỉ STCW',
          'Đạt được chứng chỉ thuyền trưởng hạng 2'
        ],
        preferredSubjects: ['An toàn hàng hải', 'Điều khiển tàu'],
        studySchedule: {
          preferredStudyTime: 'evening',
          studyDays: ['monday', 'wednesday', 'friday', 'sunday'],
          studyDuration: 3,
          breakInterval: 15
        },
        socialLinks: [
          {
            platform: 'linkedin',
            url: 'https://linkedin.com/in/nguyenvanhai',
            isPublic: true
          }
        ],
        notifications: {
          emailNotifications: true,
          pushNotifications: true,
          assignmentReminders: true,
          courseUpdates: true,
          forumUpdates: false
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showPhone: false,
          showProgress: true
        }
      });
      console.log('🔧 Profile Edit - Profile reset');
    }
  }

  saveProfile(): void {
    console.log('🔧 Profile Edit - Save profile');
    console.log('🔧 Profile Edit - Profile data:', this.profile());
    
    // Mock save functionality
    alert('Đã lưu thông tin hồ sơ thành công!');
    
    // Navigate back to profile
    this.router.navigate(['/student/profile']).then(success => {
      if (success) {
        console.log('🔧 Profile Edit - Navigation to profile successful');
      } else {
        console.error('🔧 Profile Edit - Navigation to profile failed');
      }
    });
  }

  goBack(): void {
    console.log('🔧 Profile Edit - Go back');
    this.router.navigate(['/student/profile']).then(success => {
      if (success) {
        console.log('🔧 Profile Edit - Navigation back successful');
      } else {
        console.error('🔧 Profile Edit - Navigation back failed');
      }
    });
  }
}