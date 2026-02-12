import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);
  private toast = inject(ToastService);

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

  constructor() {
    const saved = localStorage.getItem('user_settings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
      } catch { /* ignore corrupt data */ }
    }
  }

  saveSettings(): void {
    localStorage.setItem('user_settings', JSON.stringify(this.settings));
    this.toast.success('Đã lưu cài đặt');
  }

  async deleteAccount(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Xóa tài khoản',
      message: 'Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa tài khoản',
      cancelText: 'Hủy',
      variant: 'danger'
    });
    if (confirmed) {
      this.toast.info('Tính năng đang được phát triển');
    }
  }

  exportData(): void {
    this.toast.info('Tính năng đang được phát triển');
  }

  async logoutAllDevices(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Đăng xuất tất cả thiết bị',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi tất cả thiết bị?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      variant: 'warning'
    });
    if (confirmed) {
      this.toast.info('Tính năng đang được phát triển');
    }
  }
}
