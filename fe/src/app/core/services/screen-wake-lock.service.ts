import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScreenWakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  readonly isActive = signal(false);

  async acquire(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.isActive.set(true);

      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
        this.isActive.set(false);
      });

      // Re-acquire on visibility change (browser releases on tab switch)
      document.addEventListener('visibilitychange', this.onVisibilityChange);

      return true;
    } catch {
      return false;
    }
  }

  async release(): Promise<void> {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    await this.wakeLock?.release();
    this.wakeLock = null;
    this.isActive.set(false);
  }

  private onVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && this.isActive()) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch {
        // Battery too low or permission denied
      }
    }
  };
}
