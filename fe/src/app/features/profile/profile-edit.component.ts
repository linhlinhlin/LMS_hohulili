import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

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
  imports: [RouterModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './profile-edit.component.html',
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
    { value: 'linkedin', label: 'LinkedIn', icon: 'đŸ’¼' },
    { value: 'facebook', label: 'Facebook', icon: 'đŸ“˜' },
    { value: 'twitter', label: 'Twitter', icon: 'đŸ¦' },
    { value: 'instagram', label: 'Instagram', icon: 'đŸ“·' },
    { value: 'youtube', label: 'YouTube', icon: 'đŸ“º' },
    { value: 'github', label: 'GitHub', icon: 'đŸ’»' }
  ]);

  ngOnInit(): void {
  }

  updateProfile(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      [field]: value
    }));
  }

  updateLearningGoal(index: number, value: string): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: p.learningGoals.map((goal, i) => i === index ? value : goal)
    }));
  }

  updateStudySchedule(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      studySchedule: {
        ...p.studySchedule,
        [field]: value
      }
    }));
  }

  updateSocialLink(index: number, field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: p.socialLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  }

  updateNotifications(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      notifications: {
        ...p.notifications,
        [field]: value
      }
    }));
  }

  updatePrivacy(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      privacy: {
        ...p.privacy,
        [field]: value
      }
    }));
  }

  toggleInterest(interest: string): void {
    this.profile.update(p => ({
      ...p,
      interests: p.interests.includes(interest) 
        ? p.interests.filter(i => i !== interest)
        : [...p.interests, interest]
    }));
  }

  toggleSubject(subject: string): void {
    this.profile.update(p => ({
      ...p,
      preferredSubjects: p.preferredSubjects.includes(subject) 
        ? p.preferredSubjects.filter(s => s !== subject)
        : [...p.preferredSubjects, subject]
    }));
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
  }

  addLearningGoal(): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: [...p.learningGoals, '']
    }));
  }

  removeLearningGoal(index: number): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: p.learningGoals.filter((_, i) => i !== index)
    }));
  }

  addSocialLink(): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: [...p.socialLinks, { platform: 'linkedin', url: '', isPublic: true }]
    }));
  }

  removeSocialLink(index: number): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: p.socialLinks.filter((_, i) => i !== index)
    }));
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
    }
  }

  saveProfile(): void {
    // Mock save functionality
    alert('Đã lưu thông tin hồ sơ thành công!');
    
    // Navigate back to profile
    this.router.navigate(['/student/profile']);
  }

  goBack(): void {
    this.router.navigate(['/student/profile']);
  }
}

