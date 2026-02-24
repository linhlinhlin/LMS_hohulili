import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiClient } from '../../api/client/api-client';

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
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './student-profile-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentProfileEditComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private apiClient = inject(ApiClient);

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
    // Load profile from real API (GET /api/v3/auth/me)
    this.apiClient.getWithResponse<any>('/api/v3/auth/me').subscribe({
      next: (response) => {
        const user = response.data;
        if (user) {
          this.profileForm.patchValue({
            fullName: user.fullName || '',
            email: user.email || '',
            phone: user.phone || '',
            dateOfBirth: user.dateOfBirth || '',
            address: user.address || '',
            bio: user.bio || ''
          });
          if (user.fullName) {
            this.avatarPreview.set(
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=0056D2&color=ffffff&size=150`
            );
          }
        }
      },
      error: () => {
        this.toast.error('Không thể tải thông tin hồ sơ');
      }
    });
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
        this.toast.warning('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toast.warning('Vui lòng chọn file ảnh.');
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

    // Save profile via real API (PUT /api/v3/auth/profile)
    this.apiClient.putWithResponse<any>('/api/v3/auth/profile', {
      fullName: formData.fullName,
      email: formData.email
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveStatus.set('Hồ sơ đã được cập nhật thành công!');
        this.toast.success('Hồ sơ đã được cập nhật');
        setTimeout(() => this.saveStatus.set(null), 3000);
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error('Không thể cập nhật hồ sơ. Vui lòng thử lại.');
      }
    });
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

