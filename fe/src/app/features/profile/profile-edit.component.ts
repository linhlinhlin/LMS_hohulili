import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiClient } from '../../api/client/api-client';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { firstValueFrom } from 'rxjs';

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
  icon: IconName;
}

@Component({
  selector: 'app-profile-edit',
  imports: [RouterModule, FormsModule, IconComponent],
  templateUrl: './profile-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileEditComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private api = inject(ApiClient);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);

  // Component state
  profile = signal<ProfileEdit>(this.getDefaultProfile());

  // Reference data
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
    { value: 'linkedin', label: 'LinkedIn', icon: 'briefcase' },
    { value: 'facebook', label: 'Facebook', icon: 'book' },
    { value: 'twitter', label: 'Twitter', icon: 'external-link' },
    { value: 'instagram', label: 'Instagram', icon: 'image' },
    { value: 'youtube', label: 'YouTube', icon: 'video' },
    { value: 'github', label: 'GitHub', icon: 'globe' }
  ]);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.profile.update(p => ({
        ...p,
        fullName: user.fullName || p.fullName,
        email: user.email || p.email
      }));
    }
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

  async resetProfile(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Đặt lại hồ sơ',
      message: 'Bạn có chắc chắn muốn đặt lại tất cả thông tin?',
      confirmText: 'Đặt lại',
      cancelText: 'Hủy',
      variant: 'warning'
    });
    if (confirmed) {
      this.profile.set(this.getDefaultProfile());
      this.toast.success('Đã đặt lại hồ sơ');
    }
  }

  private getDefaultProfile(): ProfileEdit {
    const user = this.authService.currentUser();
    return {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: '',
      dateOfBirth: '',
      address: '',
      bio: '',
      interests: [],
      learningGoals: [],
      preferredSubjects: [],
      studySchedule: {
        preferredStudyTime: 'evening',
        studyDays: [],
        studyDuration: 2,
        breakInterval: 15
      },
      socialLinks: [],
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
    };
  }

  async saveProfile(): Promise<void> {
    try {
      const p = this.profile();
      await firstValueFrom(this.api.put('/api/v3/auth/profile', {
        fullName: p.fullName,
        email: p.email
      }));
      this.toast.success('Đã lưu thông tin hồ sơ thành công!');
      this.router.navigate(['/student/profile']);
    } catch {
      this.toast.error('Không thể lưu thông tin hồ sơ');
    }
  }

  goBack(): void {
    this.router.navigate(['/student/profile']);
  }
}

