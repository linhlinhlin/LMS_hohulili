import { Injectable, computed, signal } from '@angular/core';
import {
  normalizeVideoQuality,
  type VideoQuality,
} from '../models/video-quality';

export interface OfflineDeviceSettings {
  defaultVideoQuality: VideoQuality;
  downloadOnWifiOnly: boolean;
  autoSyncWhenOnline: boolean;
  persistentStorageRequestedAt: string | null;
  lastManualSyncAt: string | null;
}

const OFFLINE_DEVICE_SETTINGS_KEY = 'lms_offline_device_settings';

const DEFAULT_SETTINGS: OfflineDeviceSettings = {
  defaultVideoQuality: 'STANDARD',
  downloadOnWifiOnly: false,
  autoSyncWhenOnline: true,
  persistentStorageRequestedAt: null,
  lastManualSyncAt: null,
};

@Injectable({ providedIn: 'root' })
export class OfflineDeviceSettingsService {
  readonly settings = signal<OfflineDeviceSettings>(this.readSettings());

  readonly defaultVideoQuality = computed(() => this.settings().defaultVideoQuality);
  readonly downloadOnWifiOnly = computed(() => this.settings().downloadOnWifiOnly);
  readonly autoSyncWhenOnline = computed(() => this.settings().autoSyncWhenOnline);
  readonly persistentStorageRequestedAt = computed(() => this.settings().persistentStorageRequestedAt);
  readonly lastManualSyncAt = computed(() => this.settings().lastManualSyncAt);

  setDefaultVideoQuality(videoQuality: VideoQuality): void {
    this.update({ defaultVideoQuality: videoQuality });
  }

  setDownloadOnWifiOnly(enabled: boolean): void {
    this.update({ downloadOnWifiOnly: enabled });
  }

  setAutoSyncWhenOnline(enabled: boolean): void {
    this.update({ autoSyncWhenOnline: enabled });
  }

  markPersistenceRequested(): void {
    this.update({ persistentStorageRequestedAt: new Date().toISOString() });
  }

  markManualSync(): void {
    this.update({ lastManualSyncAt: new Date().toISOString() });
  }

  private update(patch: Partial<OfflineDeviceSettings>): void {
    const next = {
      ...this.settings(),
      ...patch,
    };
    this.settings.set(next);
    this.persist(next);
  }

  private readSettings(): OfflineDeviceSettings {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_SETTINGS;
    }

    try {
      const raw = localStorage.getItem(OFFLINE_DEVICE_SETTINGS_KEY);
      if (!raw) {
        return DEFAULT_SETTINGS;
      }

      const parsed = JSON.parse(raw) as Partial<OfflineDeviceSettings>;
      return {
        defaultVideoQuality: this.normalizeVideoQuality(parsed.defaultVideoQuality),
        downloadOnWifiOnly: parsed.downloadOnWifiOnly === true,
        autoSyncWhenOnline: parsed.autoSyncWhenOnline !== false,
        persistentStorageRequestedAt: this.normalizeNullableString(parsed.persistentStorageRequestedAt),
        lastManualSyncAt: this.normalizeNullableString(parsed.lastManualSyncAt),
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private persist(settings: OfflineDeviceSettings): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(OFFLINE_DEVICE_SETTINGS_KEY, JSON.stringify(settings));
  }

  private normalizeVideoQuality(value: unknown): VideoQuality {
    return normalizeVideoQuality(value) ?? DEFAULT_SETTINGS.defaultVideoQuality;
  }

  private normalizeNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : null;
  }
}
