import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AdminService, SystemSettings } from '../../infrastructure/services/admin.service';
import { LoadingComponent } from '../../../../shared/components/loading/loading.component';

@Component({
  selector: 'app-system-settings',
  imports: [FormsModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './system-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemSettingsComponent implements OnInit {
  protected adminService = inject(AdminService);

  // State
  activeTab = signal<'general' | 'email' | 'payment' | 'security'>('general');
  isSaving = signal(false);
  settings = signal<SystemSettings | null>(null);

  // Computed properties
  // settings = computed(() => this.adminService.settings()); // Removed, using signal instead

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.adminService.getSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
      },
      error: () => {
      }
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
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
    } else {
      this.isSaving.set(false);
    }
  }

  // Helper methods for updating settings
  updateGeneralSetting(key: string, value: any): void {
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

  updateEmailSetting(key: string, value: any): void {
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

  updatePaymentSetting(key: string, value: any): void {
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

  updateSecuritySetting(key: string, value: any): void {
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

