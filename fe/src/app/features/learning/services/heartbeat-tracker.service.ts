import { Injectable, inject, OnDestroy } from '@angular/core';
import { LearningActivityApi } from '../../../api/client/learning-activity.api';

/**
 * HeartbeatTracker — Coursera-style time-on-task measurement.
 *
 * Sends a heartbeat every 30 seconds while the student is actively
 * engaged with content (video playing, reading text, doing quiz).
 * Uses Page Visibility API to pause when tab is hidden.
 *
 * Usage:
 *   tracker.start(lessonId, sectionId, 'VIDEO');
 *   // ... student interacts with content ...
 *   tracker.stop(); // on navigate away or section change
 */
@Injectable({ providedIn: 'root' })
export class HeartbeatTracker implements OnDestroy {
  private api = inject(LearningActivityApi);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentConfig: {
    lessonId: string;
    sectionId: string | null;
    contentType: string;
  } | null = null;

  private secondsSinceLastBeat = 0;
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler = () => this.onVisibilityChange();
  private isPageVisible = true;

  private static readonly HEARTBEAT_INTERVAL = 30; // seconds

  start(lessonId: string, sectionId: string | null, contentType: string): void {
    this.stop();
    this.currentConfig = { lessonId, sectionId, contentType };
    this.secondsSinceLastBeat = 0;
    this.isPageVisible = true;

    // 1-second tick to count active time
    this.tickIntervalId = setInterval(() => {
      if (this.isPageVisible) {
        this.secondsSinceLastBeat++;
        if (this.secondsSinceLastBeat >= HeartbeatTracker.HEARTBEAT_INTERVAL) {
          this.sendHeartbeat();
        }
      }
    }, 1000);

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  stop(): void {
    // Send final heartbeat with remaining seconds
    if (this.currentConfig && this.secondsSinceLastBeat > 0) {
      this.sendHeartbeat();
    }

    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.currentConfig = null;
    this.secondsSinceLastBeat = 0;
  }

  private sendHeartbeat(): void {
    if (!this.currentConfig || this.secondsSinceLastBeat === 0) return;

    const seconds = this.secondsSinceLastBeat;
    this.secondsSinceLastBeat = 0;

    this.api.recordHeartbeat({
      lessonId: this.currentConfig.lessonId,
      sectionId: this.currentConfig.sectionId,
      timeSpentSeconds: seconds,
      contentType: this.currentConfig.contentType
    }).subscribe({
      error: () => {} // Silent fail — next heartbeat will compensate
    });
  }

  private onVisibilityChange(): void {
    this.isPageVisible = !document.hidden;
    // Send heartbeat when tab becomes hidden (flush accumulated time)
    if (!this.isPageVisible && this.secondsSinceLastBeat > 0) {
      this.sendHeartbeat();
    }
  }

  isTracking(): boolean {
    return this.currentConfig !== null;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
