import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { ApiClient } from '../../../api/client/api-client';

interface TrackConfig {
  lessonId: string;
  sectionId: string;
  duration: number;
}

interface TrackResponse {
  success: boolean;
  data: {
    watchedSeconds: number;
    progressPercent: number;
    completed: boolean;
    lastPosition: number;
  };
}

@Injectable({ providedIn: 'root' })
export class WatchedSegmentsTracker implements OnDestroy {
  private apiClient = inject(ApiClient);
  private segments = new Set<number>();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private currentConfig: TrackConfig | null = null;
  private lastSyncedSegments = new Set<number>();

  /** Server-confirmed progress percent (updated after each sync) */
  readonly serverProgress = signal(0);
  /** Server-confirmed completion status */
  readonly serverCompleted = signal(false);

  startTracking(lessonId: string, sectionId: string, duration: number): void {
    this.stopTracking();
    this.currentConfig = { lessonId, sectionId, duration: Math.ceil(duration) };
    this.segments.clear();
    this.lastSyncedSegments.clear();
    this.serverProgress.set(0);
    this.serverCompleted.set(false);

    this.syncInterval = setInterval(() => this.syncToServer(), 10_000);
  }

  recordSecond(currentTime: number): void {
    if (!this.currentConfig) return;
    const second = Math.floor(currentTime);
    if (second >= 0 && second < this.currentConfig.duration) {
      this.segments.add(second);
    }
  }

  syncToServer(): void {
    if (!this.currentConfig || this.segments.size === 0) return;

    const newSegments: number[] = [];
    for (const s of this.segments) {
      if (!this.lastSyncedSegments.has(s)) {
        newSegments.push(s);
      }
    }

    if (newSegments.length === 0) return;

    // Find contiguous ranges from new segments
    newSegments.sort((a, b) => a - b);
    const ranges: { from: number; to: number }[] = [];
    let rangeStart = newSegments[0];
    let rangeEnd = newSegments[0];

    for (let i = 1; i < newSegments.length; i++) {
      if (newSegments[i] === rangeEnd + 1) {
        rangeEnd = newSegments[i];
      } else {
        ranges.push({ from: rangeStart, to: rangeEnd + 1 });
        rangeStart = newSegments[i];
        rangeEnd = newSegments[i];
      }
    }
    ranges.push({ from: rangeStart, to: rangeEnd + 1 });

    const lastPosition = Math.max(...Array.from(this.segments));

    // Send each range (BE accumulates via BitSet, order doesn't matter)
    for (const range of ranges) {
      this.apiClient.post<TrackResponse>('/api/v3/video-progress/track', {
        lessonId: this.currentConfig.lessonId,
        sectionId: this.currentConfig.sectionId,
        durationSeconds: this.currentConfig.duration,
        fromSecond: range.from,
        toSecond: range.to,
        lastPosition
      }).subscribe({
        next: (res: any) => {
          if (res?.success && res.data) {
            this.serverProgress.set(res.data.progressPercent || 0);
            this.serverCompleted.set(res.data.completed || false);
          }
        },
        error: () => {
          // Silent fail — segments stay in local Set, will retry next sync
        }
      });
    }

    // Mark synced
    for (const s of newSegments) {
      this.lastSyncedSegments.add(s);
    }
  }

  stopTracking(): void {
    if (this.syncInterval) {
      this.syncToServer(); // Final sync
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.currentConfig = null;
    this.segments.clear();
    this.lastSyncedSegments.clear();
  }

  getLocalProgress(): number {
    if (!this.currentConfig || this.currentConfig.duration === 0) return 0;
    return (this.segments.size / this.currentConfig.duration) * 100;
  }

  isTracking(): boolean {
    return this.currentConfig !== null;
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }
}
