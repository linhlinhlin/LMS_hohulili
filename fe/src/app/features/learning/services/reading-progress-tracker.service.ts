import { Injectable, inject } from '@angular/core';
import { LearningActivityApi } from '../../../api/client/learning-activity.api';

/**
 * ReadingProgressTracker — Intersection Observer-based scroll tracking.
 *
 * Tracks how far a student has scrolled through text content.
 * When >= 80% of the content has been scrolled into view,
 * auto-marks the section as complete (edX/Coursera pattern).
 *
 * Architecture:
 * - Splits text container into virtual "chunks" (every 200px)
 * - Uses IntersectionObserver to detect which chunks are visible
 * - Calculates overall % of content seen
 * - At 80%+: fires completion callback + records to server
 */
@Injectable({ providedIn: 'root' })
export class ReadingProgressTracker {
  private api = inject(LearningActivityApi);
  private observer: IntersectionObserver | null = null;
  private sentinels: HTMLElement[] = [];
  private visibleSentinels = new Set<number>();
  private totalSentinels = 0;
  private completionFired = false;
  private onComplete: (() => void) | null = null;
  private currentConfig: {
    lessonId: string;
    sectionId: string;
  } | null = null;

  private static readonly COMPLETION_THRESHOLD = 0.8; // 80%
  private static readonly SENTINEL_SPACING_PX = 200;

  /**
   * Start tracking scroll progress for a text container.
   *
   * @param container The scrollable element containing text content
   * @param lessonId  Current lesson ID
   * @param sectionId Current section ID
   * @param onComplete Callback when 80%+ has been read
   */
  startTracking(
    container: HTMLElement,
    lessonId: string,
    sectionId: string,
    onComplete: () => void
  ): void {
    this.stopTracking();
    this.currentConfig = { lessonId, sectionId };
    this.onComplete = onComplete;
    this.completionFired = false;
    this.visibleSentinels.clear();

    // Create sentinel elements throughout the content
    const contentHeight = container.scrollHeight;
    this.totalSentinels = Math.max(
      1,
      Math.ceil(contentHeight / ReadingProgressTracker.SENTINEL_SPACING_PX)
    );

    for (let i = 0; i < this.totalSentinels; i++) {
      const sentinel = document.createElement('div');
      sentinel.style.cssText = 'height:1px;width:100%;pointer-events:none;position:relative;';
      sentinel.dataset['sentinelIndex'] = String(i);

      // Insert at evenly spaced positions
      const targetOffset = i * ReadingProgressTracker.SENTINEL_SPACING_PX;
      const children = container.children;
      let inserted = false;

      // Walk through children to find correct insertion point
      let accHeight = 0;
      for (let c = 0; c < children.length; c++) {
        accHeight += (children[c] as HTMLElement).offsetHeight || 0;
        if (accHeight >= targetOffset && !inserted) {
          container.insertBefore(sentinel, children[c + 1] || null);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        container.appendChild(sentinel);
      }
      this.sentinels.push(sentinel);
    }

    // Create IntersectionObserver
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        root: null, // viewport
        threshold: 0.1
      }
    );

    for (const sentinel of this.sentinels) {
      this.observer.observe(sentinel);
    }
  }

  stopTracking(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Remove sentinel elements from DOM
    for (const sentinel of this.sentinels) {
      sentinel.remove();
    }
    this.sentinels = [];
    this.visibleSentinels.clear();
    this.totalSentinels = 0;
    this.completionFired = false;
    this.onComplete = null;
    this.currentConfig = null;
  }

  getProgress(): number {
    if (this.totalSentinels === 0) return 0;
    return (this.visibleSentinels.size / this.totalSentinels) * 100;
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const index = Number(
        (entry.target as HTMLElement).dataset['sentinelIndex']
      );
      if (entry.isIntersecting) {
        this.visibleSentinels.add(index);
      }
      // Don't remove — once seen, always counted
    }

    const progress = this.getProgress();

    // Check completion threshold
    if (
      !this.completionFired &&
      progress >= ReadingProgressTracker.COMPLETION_THRESHOLD * 100
    ) {
      this.completionFired = true;

      // Record to server
      if (this.currentConfig) {
        this.api
          .recordReadingProgress({
            lessonId: this.currentConfig.lessonId,
            sectionId: this.currentConfig.sectionId,
            scrollPercent: progress
          })
          .subscribe({ error: () => {} });
      }

      // Fire callback
      this.onComplete?.();
    }
  }
}
