import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AdminService, SystemSettings, GatewayStatus } from '../../infrastructure/services/admin.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-system-settings',
  imports: [FormsModule],
  templateUrl: './system-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemSettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  // State
  activeTab = signal<'general' | 'email' | 'payment' | 'security'>('general');
  isSaving = signal(false);
  settings = signal<SystemSettings | null>(null);
  gatewayStatus = signal<GatewayStatus | null>(null);

  ngOnInit(): void {
    this.loadSettings();
    this.loadGatewayStatus();
  }

  private loadSettings(): void {
    this.adminService.getSettings().subscribe({
      next: (settings) => this.settings.set(settings),
      error: () => this.toast.error('Không thể tải cài đặt hệ thống')
    });
  }

  private loadGatewayStatus(): void {
    this.adminService.getGatewayStatus().subscribe({
      next: (status) => this.gatewayStatus.set(status)
    });
  }

  setActiveTab(tab: 'general' | 'email' | 'payment' | 'security'): void {
    this.activeTab.set(tab);
  }

  saveSettings(): void {
    this.isSaving.set(true);
    if (this.settings()) {
      this.adminService.updateSettings(this.settings()!).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toast.success('Đã lưu cài đặt thành công');
        },
        error: () => {
          this.isSaving.set(false);
          this.toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
        }
      });
    } else {
      this.isSaving.set(false);
    }
  }

  updateGeneralSetting(key: string, value: string | number | boolean): void {
    const currentSettings = this.settings();
    if (currentSettings) {
      const updatedSettings = {
        ...currentSettings,
        general: {
          ...currentSettings.general,
          [key]: value
        }
      };
      this.settings.set(updatedSettings);
    }
  }

  updateEmailSetting(key: string, value: string | number | boolean): void {
    const currentSettings = this.settings();
    if (currentSettings) {
      const updatedSettings = {
        ...currentSettings,
        email: {
          ...currentSettings.email,
          [key]: value
        }
      };
      this.settings.set(updatedSettings);
    }
  }

  updatePaymentSetting(key: string, value: string | number | boolean): void {
    const currentSettings = this.settings();
    if (currentSettings) {
      const updatedSettings = {
        ...currentSettings,
        payment: {
          ...currentSettings.payment,
          [key]: value
        }
      };
      this.settings.set(updatedSettings);
    }
  }

  updateSecuritySetting(key: string, value: string | number | boolean): void {
    const currentSettings = this.settings();
    if (currentSettings) {
      const updatedSettings = {
        ...currentSettings,
        security: {
          ...currentSettings.security,
          [key]: value
        }
      };
      this.settings.set(updatedSettings);
    }
  }
}
