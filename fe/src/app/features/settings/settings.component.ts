import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  activeTab = signal('general');
  isSaving = signal(false);

  settings = {
    general: {
      language: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
      dateFormat: 'dd/mm/yyyy',
      autoSave: true
    },
    notifications: {
      email: true,
      push: true,
      newCourses: true,
      assignments: true
    },
    privacy: {
      publicProfile: false,
      showProgress: true,
      allowContact: true
    },
    appearance: {
      theme: 'light',
      fontSize: 'medium',
      animations: true
    }
  };

  saveSettings(): void {
    this.isSaving.set(true);

    // Simulate save operation
    setTimeout(() => {
      this.isSaving.set(false);
      // Show success message
    }, 1000);
  }

  deleteAccount(): void {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.')) {
      // Simulate account deletion
    }
  }

  exportData(): void {
    // Simulate data export
  }

  logoutAllDevices(): void {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả thiết bị?')) {
      // Simulate logout all devices
    }
  }
}
