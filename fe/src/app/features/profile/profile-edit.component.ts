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
  templateUrl: './profile-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileEditComponent implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  // Component state
  profile = signal<ProfileEdit>({
    fullName: 'Nguyá»…n VÄƒn Háº£i',
    email: 'student@demo.com',
    phone: '0123456789',
    dateOfBirth: '1995-06-15',
    address: '123 ÄÆ°á»ng ABC, Quáº­n 1, TP.HCM',
    bio: 'TĂ´i lĂ  sinh viĂªn nÄƒm 3 chuyĂªn ngĂ nh HĂ ng háº£i táº¡i TrÆ°á»ng Äáº¡i há»c HĂ ng háº£i Viá»‡t Nam.',
    interests: ['An toĂ n hĂ ng háº£i', 'Äiá»u khiá»ƒn tĂ u'],
    learningGoals: [
      'HoĂ n thĂ nh chá»©ng chá»‰ STCW',
      'Äáº¡t Ä‘Æ°á»£c chá»©ng chá»‰ thuyá»n trÆ°á»Ÿng háº¡ng 2'
    ],
    preferredSubjects: ['An toĂ n hĂ ng háº£i', 'Äiá»u khiá»ƒn tĂ u'],
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
    'An toĂ n hĂ ng háº£i',
    'Äiá»u khiá»ƒn tĂ u',
    'Ká»¹ thuáº­t tĂ u biá»ƒn',
    'Luáº­t hĂ ng háº£i',
    'Quáº£n lĂ½ cáº£ng',
    'Logistics hĂ ng háº£i',
    'CĂ´ng nghá»‡ hĂ ng háº£i',
    'MĂ´i trÆ°á»ng biá»ƒn'
  ]);

  availableSubjects = signal<string[]>([
    'An toĂ n hĂ ng háº£i',
    'Äiá»u khiá»ƒn tĂ u',
    'Ká»¹ thuáº­t tĂ u biá»ƒn',
    'Luáº­t hĂ ng háº£i',
    'Quáº£n lĂ½ cáº£ng',
    'Logistics hĂ ng háº£i',
    'CĂ´ng nghá»‡ hĂ ng háº£i',
    'MĂ´i trÆ°á»ng biá»ƒn',
    'Kinh táº¿ hĂ ng háº£i',
    'Tiáº¿ng Anh hĂ ng háº£i'
  ]);

  studyDays = signal<StudyDay[]>([
    { value: 'monday', label: 'Thá»© 2' },
    { value: 'tuesday', label: 'Thá»© 3' },
    { value: 'wednesday', label: 'Thá»© 4' },
    { value: 'thursday', label: 'Thá»© 5' },
    { value: 'friday', label: 'Thá»© 6' },
    { value: 'saturday', label: 'Thá»© 7' },
    { value: 'sunday', label: 'Chá»§ nháº­t' }
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
    console.log('đŸ”§ Profile Edit - Component initialized');
  }

  updateProfile(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      [field]: value
    }));
    console.log('đŸ”§ Profile Edit - Profile field updated:', field, value);
  }

  updateLearningGoal(index: number, value: string): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: p.learningGoals.map((goal, i) => i === index ? value : goal)
    }));
    console.log('đŸ”§ Profile Edit - Learning goal updated:', index, value);
  }

  updateStudySchedule(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      studySchedule: {
        ...p.studySchedule,
        [field]: value
      }
    }));
    console.log('đŸ”§ Profile Edit - Study schedule updated:', field, value);
  }

  updateSocialLink(index: number, field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: p.socialLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
    console.log('đŸ”§ Profile Edit - Social link updated:', index, field, value);
  }

  updateNotifications(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      notifications: {
        ...p.notifications,
        [field]: value
      }
    }));
    console.log('đŸ”§ Profile Edit - Notifications updated:', field, value);
  }

  updatePrivacy(field: string, value: any): void {
    this.profile.update(p => ({
      ...p,
      privacy: {
        ...p.privacy,
        [field]: value
      }
    }));
    console.log('đŸ”§ Profile Edit - Privacy updated:', field, value);
  }

  toggleInterest(interest: string): void {
    this.profile.update(p => ({
      ...p,
      interests: p.interests.includes(interest) 
        ? p.interests.filter(i => i !== interest)
        : [...p.interests, interest]
    }));
    console.log('đŸ”§ Profile Edit - Interest toggled:', interest);
  }

  toggleSubject(subject: string): void {
    this.profile.update(p => ({
      ...p,
      preferredSubjects: p.preferredSubjects.includes(subject) 
        ? p.preferredSubjects.filter(s => s !== subject)
        : [...p.preferredSubjects, subject]
    }));
    console.log('đŸ”§ Profile Edit - Subject toggled:', subject);
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
    console.log('đŸ”§ Profile Edit - Study day toggled:', day);
  }

  addLearningGoal(): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: [...p.learningGoals, '']
    }));
    console.log('đŸ”§ Profile Edit - Learning goal added');
  }

  removeLearningGoal(index: number): void {
    this.profile.update(p => ({
      ...p,
      learningGoals: p.learningGoals.filter((_, i) => i !== index)
    }));
    console.log('đŸ”§ Profile Edit - Learning goal removed:', index);
  }

  addSocialLink(): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: [...p.socialLinks, { platform: 'linkedin', url: '', isPublic: true }]
    }));
    console.log('đŸ”§ Profile Edit - Social link added');
  }

  removeSocialLink(index: number): void {
    this.profile.update(p => ({
      ...p,
      socialLinks: p.socialLinks.filter((_, i) => i !== index)
    }));
    console.log('đŸ”§ Profile Edit - Social link removed:', index);
  }

  resetProfile(): void {
    if (confirm('Báº¡n cĂ³ cháº¯c cháº¯n muá»‘n Ä‘áº·t láº¡i táº¥t cáº£ thĂ´ng tin?')) {
      // Reset to original values
      this.profile.set({
        fullName: 'Nguyá»…n VÄƒn Háº£i',
        email: 'student@demo.com',
        phone: '0123456789',
        dateOfBirth: '1995-06-15',
        address: '123 ÄÆ°á»ng ABC, Quáº­n 1, TP.HCM',
        bio: 'TĂ´i lĂ  sinh viĂªn nÄƒm 3 chuyĂªn ngĂ nh HĂ ng háº£i táº¡i TrÆ°á»ng Äáº¡i há»c HĂ ng háº£i Viá»‡t Nam.',
        interests: ['An toĂ n hĂ ng háº£i', 'Äiá»u khiá»ƒn tĂ u'],
        learningGoals: [
          'HoĂ n thĂ nh chá»©ng chá»‰ STCW',
          'Äáº¡t Ä‘Æ°á»£c chá»©ng chá»‰ thuyá»n trÆ°á»Ÿng háº¡ng 2'
        ],
        preferredSubjects: ['An toĂ n hĂ ng háº£i', 'Äiá»u khiá»ƒn tĂ u'],
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
      console.log('đŸ”§ Profile Edit - Profile reset');
    }
  }

  saveProfile(): void {
    console.log('đŸ”§ Profile Edit - Save profile');
    console.log('đŸ”§ Profile Edit - Profile data:', this.profile());
    
    // Mock save functionality
    alert('ÄĂ£ lÆ°u thĂ´ng tin há»“ sÆ¡ thĂ nh cĂ´ng!');
    
    // Navigate back to profile
    this.router.navigate(['/student/profile']).then(success => {
      if (success) {
        console.log('đŸ”§ Profile Edit - Navigation to profile successful');
      } else {
        console.error('đŸ”§ Profile Edit - Navigation to profile failed');
      }
    });
  }

  goBack(): void {
    console.log('đŸ”§ Profile Edit - Go back');
    this.router.navigate(['/student/profile']).then(success => {
      if (success) {
        console.log('đŸ”§ Profile Edit - Navigation back successful');
      } else {
        console.error('đŸ”§ Profile Edit - Navigation back failed');
      }
    });
  }
}

