import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { ApiClient } from '../../../api/client/api-client';

interface TrackConfig {
  lessonId: string;
  sectionId: string;
  duration: number;
  completionThreshold?: number;
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
  private pendingSegments = new Set<number>();

  /** Server-confirmed progress percent (updated after each sync) */
  readonly serverProgress = signal(0);
  /** Server-confirmed completion status */
  readonly serverCompleted = signal(false);

  startTracking(lessonId: string, sectionId: string, duration: number, completionThreshold?: number): void {
    this.stopTracking();
    this.currentConfig = { lessonId, sectionId, duration: Math.ceil(duration), completionThreshold };
    this.segments.clear();
    this.lastSyncedSegments.clear();
    this.pendingSegments.clear();
    this.serverProgress.set(0);
    this.serverCompleted.set(false);

    this.syncInterval = setInterval(() => this.syncToServer(), 10_000);
  }

  recordSecond(currentTime: number): void {
    if (!this.currentConfig) {
      return;
    }

    const second = Math.floor(currentTime);
    if (second >= 0 && second < this.currentConfig.duration) {
      this.segments.add(second);
    }
  }

  syncToServer(): void {
    if (!this.currentConfig || this.segments.size === 0) {
      return;
    }

    const newSegments: number[] = [];
    for (const second of this.segments) {
      if (!this.lastSyncedSegments.has(second) && !this.pendingSegments.has(second)) {
        newSegments.push(second);
      }
    }

    if (newSegments.length === 0) {
      return;
    }

    newSegments.sort((a, b) => a - b);
    const ranges: Array<{ from: number; to: number }> = [];
    let rangeStart = newSegments[0];
    let rangeEnd = newSegments[0];

    for (let index = 1; index < newSegments.length; index++) {
      if (newSegments[index] === rangeEnd + 1) {
        rangeEnd = newSegments[index];
      } else {
        ranges.push({ from: rangeStart, to: rangeEnd + 1 });
        rangeStart = newSegments[index];
        rangeEnd = newSegments[index];
      }
    }
    ranges.push({ from: rangeStart, to: rangeEnd + 1 });

    const lastPosition = Math.max(...Array.from(this.segments));

    for (const range of ranges) {
      this.markRangePending(range.from, range.to);

      this.apiClient.post<TrackResponse>('/api/v3/video-progress/track', {
        lessonId: this.currentConfig.lessonId,
        sectionId: this.currentConfig.sectionId,
        durationSeconds: this.currentConfig.duration,
        fromSecond: range.from,
        toSecond: range.to,
        lastPosition,
        completionThreshold: this.currentConfig.completionThreshold ?? 50,
      }).subscribe({
        next: (response: TrackResponse | any) => {
          if (response?.success && response.data) {
            this.serverProgress.set(response.data.progressPercent || 0);
            this.serverCompleted.set(response.data.completed || false);
          }
          this.markRangeSynced(range.from, range.to);
        },
        error: () => {
          this.unmarkRangePending(range.from, range.to);
        },
      });
    }
  }

  stopTracking(): void {
    if (this.syncInterval) {
      this.syncToServer();
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.currentConfig = null;
    this.segments.clear();
    this.lastSyncedSegments.clear();
    this.pendingSegments.clear();
  }

  getLocalProgress(): number {
    if (!this.currentConfig || this.currentConfig.duration === 0) {
      return 0;
    }

    return (this.segments.size / this.currentConfig.duration) * 100;
  }

  isTracking(): boolean {
    return this.currentConfig !== null;
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }

  private markRangePending(from: number, toExclusive: number): void {
    for (let second = from; second < toExclusive; second++) {
      this.pendingSegments.add(second);
    }
  }

  private unmarkRangePending(from: number, toExclusive: number): void {
    for (let second = from; second < toExclusive; second++) {
      this.pendingSegments.delete(second);
    }
  }

  private markRangeSynced(from: number, toExclusive: number): void {
    for (let second = from; second < toExclusive; second++) {
      this.pendingSegments.delete(second);
      this.lastSyncedSegments.add(second);
    }
  }
}
