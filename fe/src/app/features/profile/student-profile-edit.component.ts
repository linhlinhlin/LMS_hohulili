import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface StudentProfileForm {
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
}

@Component({
  selector: 'app-student-profile-edit',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <div class="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- Header -->
      <div class="bg-white shadow-xl border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()"
                      class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Chỉnh sửa hồ sơ</h1>
                <p class="text-gray-600">Cập nhật thông tin cá nhân và học tập</p>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <button (click)="cancelEdit()"
                      class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                Hủy
              </button>
              
              <button (click)="saveProfile()"
                      [disabled]="!profileForm.valid || isSaving()"
                      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
                @if (isSaving()) {
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang lưu...
                } @else {
                  <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  Lưu thay đổi
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-8">
        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-8">
              <!-- Personal Information -->
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">Thông tin cá nhân</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
                    <input type="text" 
                           formControlName="fullName"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Nhập họ và tên">
                    @if (profileForm.get('fullName')?.invalid && profileForm.get('fullName')?.touched) {
                      <p class="mt-1 text-sm text-red-600">Họ và tên là bắt buộc</p>
                    }
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input type="email" 
                           formControlName="email"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Nhập email">
                    @if (profileForm.get('email')?.invalid && profileForm.get('email')?.touched) {
                      <p class="mt-1 text-sm text-red-600">Email không hợp lệ</p>
                    }
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                    <input type="tel" 
                           formControlName="phone"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="Nhập số điện thoại">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                    <input type="date" 
                           formControlName="dateOfBirth"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                  
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                    <textarea formControlName="address"
                              rows="3"
                              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Nhập địa chỉ"></textarea>
                  </div>
                  
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Giới thiệu bản thân</label>
                    <textarea formControlName="bio"
                              rows="4"
                              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Viết một vài dòng về bản thân..."></textarea>
                  </div>
                </div>
              </div>

              <!-- Learning Goals -->
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">Mục tiêu học tập</h3>
                <div class="space-y-4">
                  @for (goal of learningGoalsArray(); track $index) {
                    <div class="flex items-center space-x-3">
                      <input type="text" 
                             [value]="goal"
                             (input)="updateLearningGoal($index, $event)"
                             class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                             placeholder="Nhập mục tiêu học tập">
                      <button type="button" 
                              (click)="removeLearningGoal($index)"
                              class="p-3 text-red-600 hover:text-red-800 transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                      </button>
                    </div>
                  }
                  <button type="button" 
                          (click)="addLearningGoal()"
                          class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors">
                    <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                    </svg>
                    Thêm mục tiêu học tập
                  </button>
                </div>
              </div>

              <!-- Interests -->
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">Lĩnh vực quan tâm</h3>
                <div class="space-y-4">
                  @for (interest of interestsArray(); track $index) {
                    <div class="flex items-center space-x-3">
                      <input type="text" 
                             [value]="interest"
                             (input)="updateInterest($index, $event)"
                             class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                             placeholder="Nhập lĩnh vực quan tâm">
                      <button type="button" 
                              (click)="removeInterest($index)"
                              class="p-3 text-red-600 hover:text-red-800 transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                      </button>
                    </div>
                  }
                  <button type="button" 
                          (click)="addInterest()"
                          class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors">
                    <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                    </svg>
                    Thêm lĩnh vực quan tâm
                  </button>
                </div>
              </div>

              <!-- Study Schedule -->
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">Lịch học tập</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian học ưa thích</label>
                    <select formControlName="preferredStudyTime"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="06:00-09:00">Sáng sớm (06:00-09:00)</option>
                      <option value="09:00-12:00">Sáng (09:00-12:00)</option>
                      <option value="12:00-15:00">Trưa (12:00-15:00)</option>
                      <option value="15:00-18:00">Chiều (15:00-18:00)</option>
                      <option value="18:00-21:00">Tối (18:00-21:00)</option>
                      <option value="21:00-24:00">Khuya (21:00-24:00)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian học mỗi ngày (giờ)</label>
                    <input type="number" 
                           formControlName="studyDuration"
                           min="1" max="12"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Thời gian nghỉ (phút)</label>
                    <input type="number" 
                           formControlName="breakInterval"
                           min="5" max="60"
                           class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Ngày học trong tuần</label>
                    <div class="space-y-2">
                      @for (day of weekDays; track day.value) {
                        <label class="flex items-center space-x-2">
                          <input type="checkbox" 
                                 [value]="day.value"
                                 (change)="toggleStudyDay(day.value, $event)"
                                 [checked]="isStudyDaySelected(day.value)"
                                 class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                          <span class="text-gray-900">{{ day.label }}</span>
                        </label>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-8">
              <!-- Avatar Upload -->
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">Ảnh đại diện</h3>
                <div class="text-center">
                  <div class="relative inline-block">
                    <img [src]="avatarPreview()" 
                         [alt]="'Avatar preview'"
                         class="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg">
                    <button type="button" 
                            (click)="triggerFileUpload()"
                            class="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                      </svg>
                    </button>
                  </div>
                  <input type="file" 
                         #fileInput
                         (change)="onAvatarSelected($event)"
                         accept="image/*"
                         class="hidden">
                  <p class="text-sm text-gray-600 mt-4">Nhấn vào biểu tượng để thay đổi ảnh đại diện</p>
                  <p class="text-xs text-gray-500">Định dạng: JPG, PNG. Kích thước tối đa: 5MB</p>
                </div>
              </div>

              <!-- Social Links -->
              <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">Liên kết xã hội</h3>
                <div class="space-y-4">
                  @for (link of socialLinksArray(); track $index) {
                    <div class="space-y-3">
                      <div class="flex items-center space-x-3">
                        <input type="text" 
                               [value]="link.platform"
                               (input)="updateSocialLinkPlatform($index, $event)"
                               class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               placeholder="Nền tảng (VD: LinkedIn)">
                        <button type="button" 
                                (click)="removeSocialLink($index)"
                                class="p-3 text-red-600 hover:text-red-800 transition-colors">
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </div>
                      <input type="url" 
                             [value]="link.url"
                             (input)="updateSocialLinkUrl($index, $event)"
                             class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                             placeholder="URL">
                      <label class="flex items-center space-x-2">
                        <input type="checkbox" 
                               [checked]="link.isPublic"
                               (change)="toggleSocialLinkVisibility($index, $event)"
                               class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <span class="text-sm text-gray-700">Hiển thị công khai</span>
                      </label>
                    </div>
                  }
                  <button type="button" 
                          (click)="addSocialLink()"
                          class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors">
                    <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path>
                    </svg>
                    Thêm liên kết xã hội
                  </button>
                </div>
              </div>

              <!-- Save Status -->
              @if (saveStatus()) {
                <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div class="flex items-center space-x-2">
                    <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    <span class="text-green-800 font-medium">{{ saveStatus() }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentProfileEditComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  profileForm: FormGroup;
  isSaving = signal(false);
  saveStatus = signal<string | null>(null);
  avatarPreview = signal('https://ui-avatars.com/api/?name=Student&background=3b82f6&color=ffffff&size=150');

  weekDays = [
    { value: 'monday', label: 'Thứ 2' },
    { value: 'tuesday', label: 'Thứ 3' },
    { value: 'wednesday', label: 'Thứ 4' },
    { value: 'thursday', label: 'Thứ 5' },
    { value: 'friday', label: 'Thứ 6' },
    { value: 'saturday', label: 'Thứ 7' },
    { value: 'sunday', label: 'Chủ nhật' }
  ];

  // Form arrays for dynamic fields
  learningGoalsArray = signal<string[]>(['']);
  interestsArray = signal<string[]>(['']);
  socialLinksArray = signal<{platform: string, url: string, isPublic: boolean}[]>([{platform: '', url: '', isPublic: true}]);
  selectedStudyDays = signal<string[]>(['monday', 'wednesday', 'friday']);

  constructor() {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      dateOfBirth: [''],
      address: [''],
      bio: [''],
      interests: [[]],
      learningGoals: [[]],
      preferredSubjects: [[]],
      studySchedule: this.fb.group({
        preferredStudyTime: ['18:00-21:00'],
        studyDays: [[]],
        studyDuration: [3, [Validators.min(1), Validators.max(12)]],
        breakInterval: [15, [Validators.min(5), Validators.max(60)]]
      }),
      socialLinks: [[]]
    });
  }

  ngOnInit(): void {
    this.loadProfileData();
  }

  private loadProfileData(): void {
    // Load existing profile data
    const mockProfile: StudentProfileForm = {
      fullName: 'Nguyễn Văn Hải',
      email: 'student@demo.com',
      phone: '0123456789',
      dateOfBirth: '1995-06-15',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      bio: 'Tôi là sinh viên năm 3 chuyên ngành Hàng hải...',
      interests: ['An toàn hàng hải', 'Điều khiển tàu', 'Kỹ thuật tàu biển'],
      learningGoals: ['Hoàn thành chứng chỉ STCW', 'Đạt được chứng chỉ thuyền trưởng hạng 2'],
      preferredSubjects: ['An toàn hàng hải', 'Điều khiển tàu'],
      studySchedule: {
        preferredStudyTime: '18:00-21:00',
        studyDays: ['monday', 'wednesday', 'friday'],
        studyDuration: 3,
        breakInterval: 15
      },
      socialLinks: [
        { platform: 'LinkedIn', url: 'https://linkedin.com/in/nguyenvanhai', isPublic: true },
        { platform: 'Facebook', url: 'https://facebook.com/nguyenvanhai', isPublic: false }
      ]
    };

    this.profileForm.patchValue(mockProfile);
    this.learningGoalsArray.set(mockProfile.learningGoals);
    this.interestsArray.set(mockProfile.interests);
    this.socialLinksArray.set(mockProfile.socialLinks);
    this.selectedStudyDays.set(mockProfile.studySchedule.studyDays);
  }

  // Learning Goals Management
  addLearningGoal(): void {
    this.learningGoalsArray.update(goals => [...goals, '']);
  }

  removeLearningGoal(index: number): void {
    this.learningGoalsArray.update(goals => goals.filter((_, i) => i !== index));
  }

  updateLearningGoal(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.learningGoalsArray.update(goals => {
      const newGoals = [...goals];
      newGoals[index] = target.value;
      return newGoals;
    });
  }

  // Interests Management
  addInterest(): void {
    this.interestsArray.update(interests => [...interests, '']);
  }

  removeInterest(index: number): void {
    this.interestsArray.update(interests => interests.filter((_, i) => i !== index));
  }

  updateInterest(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.interestsArray.update(interests => {
      const newInterests = [...interests];
      newInterests[index] = target.value;
      return newInterests;
    });
  }

  // Social Links Management
  addSocialLink(): void {
    this.socialLinksArray.update(links => [...links, {platform: '', url: '', isPublic: true}]);
  }

  removeSocialLink(index: number): void {
    this.socialLinksArray.update(links => links.filter((_, i) => i !== index));
  }

  updateSocialLinkPlatform(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.socialLinksArray.update(links => {
      const newLinks = [...links];
      newLinks[index] = { ...newLinks[index], platform: target.value };
      return newLinks;
    });
  }

  updateSocialLinkUrl(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.socialLinksArray.update(links => {
      const newLinks = [...links];
      newLinks[index] = { ...newLinks[index], url: target.value };
      return newLinks;
    });
  }

  toggleSocialLinkVisibility(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.socialLinksArray.update(links => {
      const newLinks = [...links];
      newLinks[index] = { ...newLinks[index], isPublic: target.checked };
      return newLinks;
    });
  }

  // Study Days Management
  toggleStudyDay(day: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedStudyDays.update(days => {
      if (target.checked) {
        return [...days, day];
      } else {
        return days.filter(d => d !== day);
      }
    });
  }

  isStudyDaySelected(day: string): boolean {
    return this.selectedStudyDays().includes(day);
  }

  // Avatar Management
  triggerFileUpload(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onAvatarSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh.');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // Form Actions
  saveProfile(): void {
    if (!this.profileForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSaving.set(true);
    this.saveStatus.set(null);

    // Prepare form data
    const formData = {
      ...this.profileForm.value,
      interests: this.interestsArray().filter(interest => interest.trim() !== ''),
      learningGoals: this.learningGoalsArray().filter(goal => goal.trim() !== ''),
      socialLinks: this.socialLinksArray().filter(link => link.platform.trim() !== '' && link.url.trim() !== ''),
      studySchedule: {
        ...this.profileForm.value.studySchedule,
        studyDays: this.selectedStudyDays()
      }
    };

    // Simulate API call
    setTimeout(() => {
      console.log('Saving profile:', formData);
      this.isSaving.set(false);
      this.saveStatus.set('Hồ sơ đã được cập nhật thành công!');
      
      // Clear status after 3 seconds
      setTimeout(() => {
        this.saveStatus.set(null);
      }, 3000);
    }, 2000);
  }

  cancelEdit(): void {
    this.router.navigate(['/profile']);
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }
}